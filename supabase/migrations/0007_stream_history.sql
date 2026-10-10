-- Pandal stream: a cap on requests per network, and played songs that can be requested again.

-- How many times each song has played this edition (the history shows "played 2×").
alter table public.stream_requests add column play_count integer not null default 0;
update public.stream_requests set play_count = 1 where status = 'played';

-- Who added or re-requested what, by hashed network address. Private: never readable by the public API.
create table public.stream_request_log (
    id uuid primary key default gen_random_uuid(),
    year integer not null references public.editions (year) on update cascade,
    ip_hash text not null,
    request_id uuid references public.stream_requests (id) on delete set null,
    created_at timestamptz not null default now()
);
create index stream_request_log_year_ip_idx on public.stream_request_log (year, ip_hash);

alter table public.stream_request_log enable row level security;
revoke all on public.stream_request_log from anon, authenticated;
grant all on public.stream_request_log to service_role;

create or replace function public.stream_requests_used(p_year integer, p_ip_hash text)
returns integer
language sql
stable
set search_path = ''
as $$
    select count(*)::integer from public.stream_request_log where year = p_year and ip_hash = p_ip_hash;
$$;

-- Adds a request, upvotes a song already waiting, or puts a played song back up for approval.
-- Adding and re-requesting each use one of the network's p_limit requests; upvoting is free.
-- A new overload: the 7-argument version stays for already-deployed code and can be dropped later.
create function public.request_stream_song(
    p_year integer,
    p_youtube_id text,
    p_title text,
    p_channel text,
    p_thumbnail_url text,
    p_requested_by text,
    p_voter_hash text,
    p_ip_hash text,
    p_limit integer
) returns text
language plpgsql
set search_path = ''
as $$
declare
    r public.stream_requests;
    v_inserted integer;
begin
    -- Serialise requests from one network so two quick taps can't both slip under the limit.
    perform pg_advisory_xact_lock(hashtext('stream_request:' || p_year || ':' || p_ip_hash));

    select * into r from public.stream_requests
    where year = p_year and youtube_id = p_youtube_id
    for update;

    if found and r.status in ('pending', 'approved') then
        insert into public.stream_votes (request_id, voter_hash) values (r.id, p_voter_hash)
        on conflict do nothing;
        get diagnostics v_inserted = row_count;
        if v_inserted = 0 then
            return 'already_requested';
        end if;
        update public.stream_requests set upvotes = upvotes + 1 where id = r.id;
        return 'upvoted';
    end if;

    if found and r.status = 'rejected' then
        return 'rejected';
    end if;

    if public.stream_requests_used(p_year, p_ip_hash) >= p_limit then
        return 'limit_reached';
    end if;

    if found then
        -- Played before: back to the approval list with fresh upvotes.
        delete from public.stream_votes where request_id = r.id;
        update public.stream_requests
        set status = 'pending', upvotes = 1, requested_by = p_requested_by, created_at = now(),
            approved_at = null
        where id = r.id;
        insert into public.stream_votes (request_id, voter_hash) values (r.id, p_voter_hash);
        insert into public.stream_request_log (year, ip_hash, request_id) values (p_year, p_ip_hash, r.id);
        return 'rerequested';
    end if;

    insert into public.stream_requests (year, youtube_id, title, channel, thumbnail_url, requested_by)
    values (p_year, p_youtube_id, p_title, p_channel, p_thumbnail_url, p_requested_by)
    on conflict (year, youtube_id) do nothing
    returning * into r;
    if r.id is null then
        -- Someone on another network added the same song a moment ago.
        return 'already_requested';
    end if;
    insert into public.stream_votes (request_id, voter_hash) values (r.id, p_voter_hash);
    insert into public.stream_request_log (year, ip_hash, request_id) values (p_year, p_ip_hash, r.id);
    return 'added';
end;
$$;

-- Same as before, but counts plays.
create or replace function public.advance_stream(p_year integer) returns void
language plpgsql
set search_path = ''
as $$
declare
    s public.stream_state;
    v_next uuid;
begin
    perform public.ensure_stream_state(p_year);
    select * into s from public.stream_state where year = p_year for update;
    if s.now_playing_id is not null then
        update public.stream_requests
        set status = 'played', played_at = now(), play_count = play_count + 1
        where id = s.now_playing_id;
    end if;
    v_next := coalesce(s.up_next_id, public.pick_stream_song(p_year, s.now_playing_id));
    update public.stream_state
    set now_playing_id = v_next,
        up_next_id = case when v_next is null then null else public.pick_stream_song(p_year, v_next) end,
        updated_at = now()
    where year = p_year;
end;
$$;

revoke execute on function public.stream_requests_used(integer, text) from public, anon, authenticated;
revoke execute on function public.request_stream_song(integer, text, text, text, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.stream_requests_used(integer, text) to service_role;
grant execute on function public.request_stream_song(integer, text, text, text, text, text, text, text, integer) to service_role;
