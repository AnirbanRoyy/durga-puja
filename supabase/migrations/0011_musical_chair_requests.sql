-- Musical chair: visitors request YouTube songs and upvote them; the admin adds the good ones to the
-- game's song pool. Same idea as the pandal stream, but per programme and without a play queue.

create table public.musical_chair_requests (
    id uuid primary key default gen_random_uuid(),
    programme_id uuid not null references public.programmes (id) on delete cascade,
    youtube_id text not null,
    title text not null,
    channel text,
    thumbnail_url text,
    requested_by text not null,
    status text not null default 'pending' check (status in ('pending', 'added', 'rejected')),
    upvotes integer not null default 1,
    song_id uuid references public.songs (id) on delete set null,
    created_at timestamptz not null default now(),
    unique (programme_id, youtube_id)
);
create index musical_chair_requests_song_idx on public.musical_chair_requests (song_id);

-- One upvote per browser per song. Private: never readable by the public API.
create table public.musical_chair_votes (
    request_id uuid not null references public.musical_chair_requests (id) on delete cascade,
    voter_hash text not null,
    created_at timestamptz not null default now(),
    primary key (request_id, voter_hash)
);

-- Who requested what, by hashed network address (the per-network request limit). Private.
create table public.musical_chair_request_log (
    id uuid primary key default gen_random_uuid(),
    programme_id uuid not null references public.programmes (id) on delete cascade,
    ip_hash text not null,
    request_id uuid references public.musical_chair_requests (id) on delete set null,
    created_at timestamptz not null default now()
);
create index musical_chair_request_log_ip_idx on public.musical_chair_request_log (programme_id, ip_hash);
create index musical_chair_request_log_request_idx on public.musical_chair_request_log (request_id);

alter table public.musical_chair_requests enable row level security;
alter table public.musical_chair_votes enable row level security;
alter table public.musical_chair_request_log enable row level security;

revoke all on public.musical_chair_requests, public.musical_chair_votes, public.musical_chair_request_log
    from anon, authenticated;
grant select on public.musical_chair_requests to anon, authenticated;
grant all on public.musical_chair_requests, public.musical_chair_votes, public.musical_chair_request_log
    to service_role;

create policy "public read" on public.musical_chair_requests for select to anon, authenticated
    using (status <> 'rejected');

alter publication supabase_realtime add table public.musical_chair_requests;

create function public.musical_chair_requests_used(p_programme_id uuid, p_ip_hash text)
returns integer
language sql
stable
set search_path = ''
as $$
    select count(*)::integer from public.musical_chair_request_log
    where programme_id = p_programme_id and ip_hash = p_ip_hash;
$$;

-- Adds a request or upvotes one that is already waiting. Adding uses one of the network's p_limit
-- requests; upvoting is free. A song already in the game's pool is not requested again.
create function public.request_musical_chair_song(
    p_programme_id uuid,
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
    r public.musical_chair_requests;
    v_inserted integer;
begin
    perform pg_advisory_xact_lock(hashtext('mc_request:' || p_programme_id || ':' || p_ip_hash));

    if exists (
        select 1 from public.songs
        where pool = 'musical_chair' and active and youtube_id = p_youtube_id
    ) then
        return 'in_pool';
    end if;

    select * into r from public.musical_chair_requests
    where programme_id = p_programme_id and youtube_id = p_youtube_id
    for update;

    if found then
        if r.status = 'rejected' then
            return 'rejected';
        end if;
        if r.status = 'added' then
            return 'in_pool';
        end if;
        insert into public.musical_chair_votes (request_id, voter_hash) values (r.id, p_voter_hash)
        on conflict do nothing;
        get diagnostics v_inserted = row_count;
        if v_inserted = 0 then
            return 'already_requested';
        end if;
        update public.musical_chair_requests set upvotes = upvotes + 1 where id = r.id;
        return 'upvoted';
    end if;

    if public.musical_chair_requests_used(p_programme_id, p_ip_hash) >= p_limit then
        return 'limit_reached';
    end if;

    insert into public.musical_chair_requests
        (programme_id, youtube_id, title, channel, thumbnail_url, requested_by)
    values (p_programme_id, p_youtube_id, p_title, p_channel, p_thumbnail_url, p_requested_by)
    on conflict (programme_id, youtube_id) do nothing
    returning * into r;
    if r.id is null then
        return 'already_requested';
    end if;
    insert into public.musical_chair_votes (request_id, voter_hash) values (r.id, p_voter_hash);
    insert into public.musical_chair_request_log (programme_id, ip_hash, request_id)
    values (p_programme_id, p_ip_hash, r.id);
    return 'added';
end;
$$;

create function public.upvote_musical_chair_request(p_request_id uuid, p_voter_hash text)
returns text
language plpgsql
set search_path = ''
as $$
declare
    v_status text;
    v_inserted integer;
begin
    select status into v_status from public.musical_chair_requests where id = p_request_id;
    if v_status is null then
        return 'not_found';
    end if;
    if v_status <> 'pending' then
        return 'closed';
    end if;
    insert into public.musical_chair_votes (request_id, voter_hash) values (p_request_id, p_voter_hash)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then
        return 'already_voted';
    end if;
    update public.musical_chair_requests set upvotes = upvotes + 1 where id = p_request_id;
    return 'ok';
end;
$$;

revoke execute on function public.musical_chair_requests_used(uuid, text) from public, anon, authenticated;
revoke execute on function public.request_musical_chair_song(uuid, text, text, text, text, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.upvote_musical_chair_request(uuid, text) from public, anon, authenticated;
grant execute on function public.musical_chair_requests_used(uuid, text) to service_role;
grant execute on function public.request_musical_chair_song(uuid, text, text, text, text, text, text, text, integer) to service_role;
grant execute on function public.upvote_musical_chair_request(uuid, text) to service_role;
