-- Durga Puja community app schema.
-- Run in the Supabase SQL editor (or `supabase db push`). All writes go through the
-- Next.js server using the service-role key; the anon key may only read public tables.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Programmes
-- ---------------------------------------------------------------------------
create table public.programmes (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    type text not null check (type in ('musical_chair', 'singing', 'dance', 'drawing', 'other')),
    title_en text not null,
    title_bn text,
    description_en text,
    description_bn text,
    rules_en text,
    rules_bn text,
    cover_image_url text,
    venue text,
    starts_at timestamptz,
    ends_at timestamptz,
    status text not null default 'upcoming'
        check (status in ('upcoming', 'ongoing', 'completed', 'cancelled')),
    registration_open boolean not null default false,
    voting_open boolean not null default false,
    hide_vote_counts boolean not null default false,
    order_locked boolean not null default false,
    max_participants integer,
    admin_notes text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index programmes_starts_at_idx on public.programmes (starts_at);

-- ---------------------------------------------------------------------------
-- Registrations (public: shown on lineups) + private details (never readable by anon)
-- ---------------------------------------------------------------------------
create table public.registrations (
    id uuid primary key default gen_random_uuid(),
    programme_id uuid not null references public.programmes (id) on delete cascade,
    name text not null,
    sequence_no integer,
    performance_status text not null default 'waiting'
        check (performance_status in ('waiting', 'on_stage', 'done', 'absent')),
    created_at timestamptz not null default now()
);

create index registrations_programme_idx on public.registrations (programme_id, sequence_no);

create table public.registration_contacts (
    registration_id uuid primary key references public.registrations (id) on delete cascade,
    programme_id uuid not null references public.programmes (id) on delete cascade,
    phone text not null,
    name_key text not null,
    age integer,
    guardian_name text,
    notes text
);

-- Same phone may register siblings, but not the same person twice.
create unique index registration_contacts_dedupe_idx
    on public.registration_contacts (programme_id, phone, name_key);

-- ---------------------------------------------------------------------------
-- Songs
-- ---------------------------------------------------------------------------
create table public.songs (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    artist text,
    category text not null default 'other'
        check (category in ('mahalaya', 'agomoni', 'dhunuchi', 'bhajan', 'modern', 'bollywood', 'other')),
    source text not null check (source in ('youtube', 'cloudinary')),
    youtube_id text,
    audio_url text,
    cloudinary_public_id text,
    duration_sec numeric,
    pool text not null check (pool in ('music_page', 'musical_chair')),
    featured boolean not null default false,
    active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    check (
        (source = 'youtube' and youtube_id is not null)
        or (source = 'cloudinary' and audio_url is not null)
    )
);

create index songs_pool_idx on public.songs (pool, active, sort_order);

create table public.song_requests (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    artist text,
    link text,
    requested_by text,
    normalized_key text not null unique,
    request_count integer not null default 1,
    status text not null default 'pending'
        check (status in ('pending', 'rejected', 'added')),
    song_id uuid references public.songs (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index song_requests_song_idx on public.song_requests (song_id);

create table public.musical_chair_rounds (
    id uuid primary key default gen_random_uuid(),
    programme_id uuid not null references public.programmes (id) on delete cascade,
    round_no integer not null,
    song_id uuid references public.songs (id) on delete set null,
    song_title text,
    start_offset_sec numeric,
    play_duration_sec numeric,
    eliminated_name text,
    created_at timestamptz not null default now()
);

create index musical_chair_rounds_programme_idx
    on public.musical_chair_rounds (programme_id, round_no);
create index musical_chair_rounds_song_idx on public.musical_chair_rounds (song_id);

-- ---------------------------------------------------------------------------
-- Drawing competition
-- ---------------------------------------------------------------------------
create table public.drawings (
    id uuid primary key default gen_random_uuid(),
    programme_id uuid not null references public.programmes (id) on delete cascade,
    child_name text not null,
    age integer,
    title text,
    image_url text not null,
    cloudinary_public_id text,
    width integer,
    height integer,
    vote_count integer not null default 0,
    last_vote_at timestamptz,
    created_at timestamptz not null default now()
);

create index drawings_programme_idx on public.drawings (programme_id);

create table public.votes (
    id uuid primary key default gen_random_uuid(),
    programme_id uuid not null references public.programmes (id) on delete cascade,
    drawing_id uuid not null references public.drawings (id) on delete cascade,
    voter_hash text not null,
    created_at timestamptz not null default now(),
    unique (programme_id, voter_hash)
);

create index votes_drawing_idx on public.votes (drawing_id);

-- ---------------------------------------------------------------------------
-- Results, feedback, settings, rate limits
-- ---------------------------------------------------------------------------
create table public.results (
    id uuid primary key default gen_random_uuid(),
    programme_id uuid not null references public.programmes (id) on delete cascade,
    position integer not null,
    name text not null,
    score text,
    remark text,
    created_at timestamptz not null default now()
);

create index results_programme_idx on public.results (programme_id, position);

create table public.feedback (
    id uuid primary key default gen_random_uuid(),
    name text,
    contact text,
    kind text not null check (kind in ('suggestion', 'complaint', 'appreciation')),
    message text not null,
    status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
    created_at timestamptz not null default now()
);

create table public.settings (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz not null default now()
);

create table public.rate_limits (
    key text primary key,
    window_start timestamptz not null default now(),
    count integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Functions (callable only by the service role)
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger programmes_touch before update on public.programmes
    for each row execute function public.touch_updated_at();
create trigger song_requests_touch before update on public.song_requests
    for each row execute function public.touch_updated_at();

-- Returns 'ok' | 'already_voted' | 'closed' | 'not_found'
create or replace function public.cast_vote(p_drawing_id uuid, p_voter_hash text)
returns text
language plpgsql as $$
declare
    v_programme uuid;
    v_open boolean;
begin
    select d.programme_id, p.voting_open
    into v_programme, v_open
    from public.drawings d
    join public.programmes p on p.id = d.programme_id
    where d.id = p_drawing_id;

    if v_programme is null then
        return 'not_found';
    end if;
    if not v_open then
        return 'closed';
    end if;

    insert into public.votes (programme_id, drawing_id, voter_hash)
    values (v_programme, p_drawing_id, p_voter_hash)
    on conflict (programme_id, voter_hash) do nothing;

    if not found then
        return 'already_voted';
    end if;

    update public.drawings
    set vote_count = vote_count + 1, last_vote_at = now()
    where id = p_drawing_id;

    return 'ok';
end;
$$;

-- Inserts a request, or bumps the count if the same song was already requested.
create or replace function public.request_song(
    p_title text,
    p_artist text,
    p_link text,
    p_requested_by text,
    p_normalized_key text
)
returns public.song_requests
language plpgsql as $$
declare
    v_row public.song_requests;
begin
    insert into public.song_requests as r (title, artist, link, requested_by, normalized_key)
    values (p_title, p_artist, p_link, p_requested_by, p_normalized_key)
    on conflict (normalized_key) do update
        set request_count = r.request_count + 1
    returning * into v_row;
    return v_row;
end;
$$;

-- Fixed-window rate limiter. Returns true when the call is allowed.
create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql as $$
declare
    v_count integer;
begin
    insert into public.rate_limits as r (key, window_start, count)
    values (p_key, now(), 1)
    on conflict (key) do update set
        count = case
            when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
            else r.count + 1
        end,
        window_start = case
            when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
            else r.window_start
        end
    returning count into v_count;
    return v_count <= p_max;
end;
$$;

revoke execute on function public.cast_vote(uuid, text) from public, anon, authenticated;
revoke execute on function public.request_song(text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, text) to service_role;
grant execute on function public.request_song(text, text, text, text, text) to service_role;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Row level security: anon may read public tables (needed for Realtime), nothing else.
-- ---------------------------------------------------------------------------
alter table public.programmes enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_contacts enable row level security;
alter table public.songs enable row level security;
alter table public.song_requests enable row level security;
alter table public.musical_chair_rounds enable row level security;
alter table public.drawings enable row level security;
alter table public.votes enable row level security;
alter table public.results enable row level security;
alter table public.feedback enable row level security;
alter table public.settings enable row level security;
alter table public.rate_limits enable row level security;

-- Grants: depending on the project's Data API defaults, new tables may or may not be exposed
-- automatically. Be explicit either way: anon can only SELECT the public tables, and only the
-- server (service_role) can write. Policies below then limit which rows anon can see.
revoke all on all tables in schema public from anon, authenticated;
grant select on
    public.programmes,
    public.registrations,
    public.songs,
    public.song_requests,
    public.musical_chair_rounds,
    public.drawings,
    public.results
to anon;
grant all on all tables in schema public to service_role;

create policy "public read" on public.programmes for select to anon, authenticated using (true);
create policy "public read" on public.registrations for select to anon, authenticated using (true);
create policy "public read" on public.songs for select to anon, authenticated using (active);
create policy "public read" on public.song_requests for select to anon, authenticated
    using (status <> 'rejected');
create policy "public read" on public.musical_chair_rounds for select to anon, authenticated using (true);
create policy "public read" on public.drawings for select to anon, authenticated using (true);
create policy "public read" on public.results for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
    public.programmes,
    public.registrations,
    public.song_requests,
    public.musical_chair_rounds,
    public.drawings,
    public.results;
