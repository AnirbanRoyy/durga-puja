-- Pandal stream: visitors request YouTube songs and upvote them, the admin approves, and the admin's
-- phone (on the pandal speaker) plays the approved songs in weighted-random order. "Up next" is
-- chosen in advance so everybody can see it.

create table public.stream_requests (
    id uuid primary key default gen_random_uuid(),
    year integer not null references public.editions (year) on update cascade,
    youtube_id text not null,
    title text not null,
    channel text,
    thumbnail_url text,
    requested_by text not null,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'played')),
    upvotes integer not null default 1,
    created_at timestamptz not null default now(),
    approved_at timestamptz,
    played_at timestamptz,
    unique (year, youtube_id)
);
create index stream_requests_year_status_idx on public.stream_requests (year, status);

-- One upvote per browser per song. Private: never readable by the public API.
create table public.stream_votes (
    request_id uuid not null references public.stream_requests (id) on delete cascade,
    voter_hash text not null,
    created_at timestamptz not null default now(),
    primary key (request_id, voter_hash)
);

create table public.stream_state (
    year integer primary key references public.editions (year) on update cascade,
    is_streaming boolean not null default false,
    now_playing_id uuid references public.stream_requests (id) on delete set null,
    up_next_id uuid references public.stream_requests (id) on delete set null,
    updated_at timestamptz not null default now()
);

alter table public.stream_requests enable row level security;
alter table public.stream_votes enable row level security;
alter table public.stream_state enable row level security;

revoke all on public.stream_requests, public.stream_votes, public.stream_state from anon, authenticated;
grant select on public.stream_requests, public.stream_state to anon, authenticated;
grant all on public.stream_requests, public.stream_votes, public.stream_state to service_role;

create policy "public read" on public.stream_requests for select to anon, authenticated
    using (status <> 'rejected');
create policy "public read" on public.stream_state for select to anon, authenticated using (true);

alter publication supabase_realtime add table public.stream_requests, public.stream_state;

-- Weighted random choice among approved, unplayed songs: a song with n upvotes is (1 + n) times as
-- likely as a song with none. (Exponential-clock sampling: the smallest -ln(u)/w wins.)
create or replace function public.pick_stream_song(p_year integer, p_exclude uuid)
returns uuid
language sql
set search_path = ''
as $$
    select r.id
    from public.stream_requests r
    where r.year = p_year
      and r.status = 'approved'
      and (p_exclude is null or r.id <> p_exclude)
    order by (-ln(1 - random())) / (1 + r.upvotes) asc
    limit 1;
$$;

-- Adds a request, or an upvote when the same video is already listed for this year.
create or replace function public.request_stream_song(
    p_year integer,
    p_youtube_id text,
    p_title text,
    p_channel text,
    p_thumbnail_url text,
    p_requested_by text,
    p_voter_hash text
) returns text
language plpgsql
set search_path = ''
as $$
declare
    v_id uuid;
    v_status text;
    v_inserted integer;
begin
    insert into public.stream_requests (year, youtube_id, title, channel, thumbnail_url, requested_by)
    values (p_year, p_youtube_id, p_title, p_channel, p_thumbnail_url, p_requested_by)
    on conflict (year, youtube_id) do nothing
    returning id into v_id;

    if v_id is not null then
        insert into public.stream_votes (request_id, voter_hash) values (v_id, p_voter_hash);
        return 'added';
    end if;

    select id, status into v_id, v_status
    from public.stream_requests where year = p_year and youtube_id = p_youtube_id;
    if v_status in ('rejected', 'played') then
        return v_status;
    end if;

    insert into public.stream_votes (request_id, voter_hash) values (v_id, p_voter_hash)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then
        return 'already_requested';
    end if;
    update public.stream_requests set upvotes = upvotes + 1 where id = v_id;
    return 'upvoted';
end;
$$;

create or replace function public.upvote_stream_request(p_request_id uuid, p_voter_hash text)
returns text
language plpgsql
set search_path = ''
as $$
declare
    v_status text;
    v_inserted integer;
begin
    select status into v_status from public.stream_requests where id = p_request_id;
    if v_status is null then
        return 'not_found';
    end if;
    if v_status not in ('pending', 'approved') then
        return 'closed';
    end if;
    insert into public.stream_votes (request_id, voter_hash) values (p_request_id, p_voter_hash)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then
        return 'already_voted';
    end if;
    update public.stream_requests set upvotes = upvotes + 1 where id = p_request_id;
    return 'ok';
end;
$$;

create or replace function public.ensure_stream_state(p_year integer) returns void
language sql
set search_path = ''
as $$
    insert into public.stream_state (year) values (p_year) on conflict (year) do nothing;
$$;

-- Admin: approve (joins the queue; fills "Up next" / "Now playing" if the stream is running and empty).
create or replace function public.approve_stream_request(p_request_id uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
    r public.stream_requests;
    s public.stream_state;
begin
    select * into r from public.stream_requests where id = p_request_id;
    if not found then
        raise exception 'request_not_found';
    end if;
    update public.stream_requests
    set status = 'approved', approved_at = coalesce(approved_at, now())
    where id = p_request_id and status in ('pending', 'rejected');

    perform public.ensure_stream_state(r.year);
    select * into s from public.stream_state where year = r.year for update;
    if s.is_streaming and s.now_playing_id is null then
        update public.stream_state
        set now_playing_id = p_request_id, up_next_id = public.pick_stream_song(r.year, p_request_id), updated_at = now()
        where year = r.year;
    elsif s.up_next_id is null and s.now_playing_id is not null then
        update public.stream_state
        set up_next_id = public.pick_stream_song(r.year, s.now_playing_id), updated_at = now()
        where year = r.year;
    end if;
end;
$$;

create or replace function public.reject_stream_request(p_request_id uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
    r public.stream_requests;
    s public.stream_state;
begin
    select * into r from public.stream_requests where id = p_request_id;
    if not found then
        raise exception 'request_not_found';
    end if;
    update public.stream_requests set status = 'rejected' where id = p_request_id;
    perform public.ensure_stream_state(r.year);
    select * into s from public.stream_state where year = r.year for update;
    if s.up_next_id = p_request_id then
        update public.stream_state
        set up_next_id = public.pick_stream_song(r.year, s.now_playing_id), updated_at = now()
        where year = r.year;
    end if;
end;
$$;

-- Moves to the next song: the finished one is marked played, "Up next" starts, and a new "Up next" is drawn.
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
        update public.stream_requests set status = 'played', played_at = now() where id = s.now_playing_id;
    end if;
    v_next := coalesce(s.up_next_id, public.pick_stream_song(p_year, s.now_playing_id));
    update public.stream_state
    set now_playing_id = v_next,
        up_next_id = case when v_next is null then null else public.pick_stream_song(p_year, v_next) end,
        updated_at = now()
    where year = p_year;
end;
$$;

create or replace function public.start_stream(p_year integer) returns void
language plpgsql
set search_path = ''
as $$
declare
    s public.stream_state;
    v_now uuid;
begin
    perform public.ensure_stream_state(p_year);
    select * into s from public.stream_state where year = p_year for update;
    v_now := coalesce(s.now_playing_id, s.up_next_id, public.pick_stream_song(p_year, null));
    update public.stream_state
    set is_streaming = true,
        now_playing_id = v_now,
        up_next_id = case when v_now is null then null else public.pick_stream_song(p_year, v_now) end,
        updated_at = now()
    where year = p_year;
end;
$$;

create or replace function public.stop_stream(p_year integer) returns void
language plpgsql
set search_path = ''
as $$
begin
    perform public.ensure_stream_state(p_year);
    update public.stream_state set is_streaming = false, updated_at = now() where year = p_year;
end;
$$;

-- Admin override of the random pick.
create or replace function public.set_stream_up_next(p_year integer, p_request_id uuid) returns void
language plpgsql
set search_path = ''
as $$
begin
    perform public.ensure_stream_state(p_year);
    if not exists (
        select 1 from public.stream_requests where id = p_request_id and year = p_year and status = 'approved'
    ) then
        raise exception 'not_approved';
    end if;
    update public.stream_state set up_next_id = p_request_id, updated_at = now() where year = p_year;
end;
$$;

revoke execute on function public.pick_stream_song(integer, uuid) from public, anon, authenticated;
revoke execute on function public.request_stream_song(integer, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.upvote_stream_request(uuid, text) from public, anon, authenticated;
revoke execute on function public.ensure_stream_state(integer) from public, anon, authenticated;
revoke execute on function public.approve_stream_request(uuid) from public, anon, authenticated;
revoke execute on function public.reject_stream_request(uuid) from public, anon, authenticated;
revoke execute on function public.advance_stream(integer) from public, anon, authenticated;
revoke execute on function public.start_stream(integer) from public, anon, authenticated;
revoke execute on function public.stop_stream(integer) from public, anon, authenticated;
revoke execute on function public.set_stream_up_next(integer, uuid) from public, anon, authenticated;
grant execute on function public.pick_stream_song(integer, uuid) to service_role;
grant execute on function public.request_stream_song(integer, text, text, text, text, text, text) to service_role;
grant execute on function public.upvote_stream_request(uuid, text) to service_role;
grant execute on function public.ensure_stream_state(integer) to service_role;
grant execute on function public.approve_stream_request(uuid) to service_role;
grant execute on function public.reject_stream_request(uuid) to service_role;
grant execute on function public.advance_stream(integer) to service_role;
grant execute on function public.start_stream(integer) to service_role;
grant execute on function public.stop_stream(integer) to service_role;
grant execute on function public.set_stream_up_next(integer, uuid) to service_role;
