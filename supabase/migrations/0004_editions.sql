-- One row per year's Puja ("edition"). Programmes belong to an edition; registrations, drawings,
-- votes, results and musical chair rounds hang off programmes, so they follow automatically.
-- Exactly one edition is current: the public site shows it and new programmes go into it.

create table public.editions (
    year integer primary key check (year between 2000 and 2100),
    name_en text not null,
    name_bn text,
    venue text,
    mahalaya timestamptz,
    shashthi timestamptz not null,
    dashami timestamptz not null,
    is_current boolean not null default false,
    created_at timestamptz not null default now()
);

create unique index editions_one_current_idx on public.editions (is_current) where is_current;

-- Seed this year's edition from the old single "event" setting.
insert into public.editions (year, name_en, name_bn, venue, mahalaya, shashthi, dashami, is_current)
select
    extract(year from (value ->> 'shashthi')::timestamptz at time zone 'Asia/Kolkata')::integer,
    coalesce(value ->> 'name_en', 'Sarbojanin Durgotsav'),
    value ->> 'name_bn',
    value ->> 'venue',
    (value ->> 'mahalaya')::timestamptz,
    (value ->> 'shashthi')::timestamptz,
    (value ->> 'dashami')::timestamptz,
    true
from public.settings
where key = 'event';

insert into public.editions (year, name_en, name_bn, venue, mahalaya, shashthi, dashami, is_current)
select 2026, 'Sarbojanin Durgotsav', 'সর্বজনীন দুর্গোৎসব', 'Community Pandal',
    '2026-10-10T04:00:00+05:30', '2026-10-16T00:00:00+05:30', '2026-10-21T23:59:00+05:30', true
where not exists (select 1 from public.editions);

-- Programmes: tag existing ones with the current year; slugs only need to be unique within a year.
alter table public.programmes
    add column year integer references public.editions (year) on update cascade on delete restrict;
update public.programmes set year = (select year from public.editions where is_current);
alter table public.programmes alter column year set not null;
alter table public.programmes drop constraint if exists programmes_slug_key;
alter table public.programmes add constraint programmes_year_slug_key unique (year, slug);
create index programmes_year_idx on public.programmes (year, starts_at);

-- Public read, server-only writes (same pattern as the other tables).
alter table public.editions enable row level security;
revoke all on public.editions from anon, authenticated;
grant select on public.editions to anon, authenticated;
grant all on public.editions to service_role;
create policy "public read" on public.editions for select to anon, authenticated using (true);

-- Start a new year: closes last year's sign-ups and voting, makes the new year current and,
-- optionally, copies last year's programmes (dates moved by the same number of days).
create or replace function public.start_edition(
    p_year integer,
    p_name_en text,
    p_name_bn text,
    p_venue text,
    p_mahalaya timestamptz,
    p_shashthi timestamptz,
    p_dashami timestamptz,
    p_copy_programmes boolean
) returns void
language plpgsql
set search_path = ''
as $$
declare
    prev public.editions;
    shift interval;
begin
    if exists (select 1 from public.editions where year = p_year) then
        raise exception 'edition_exists';
    end if;

    select * into prev from public.editions where is_current;

    update public.editions set is_current = false where is_current;
    insert into public.editions (year, name_en, name_bn, venue, mahalaya, shashthi, dashami, is_current)
    values (p_year, p_name_en, p_name_bn, p_venue, p_mahalaya, p_shashthi, p_dashami, true);

    if prev.year is null then
        return;
    end if;

    update public.programmes
    set registration_open = false, voting_open = false
    where year = prev.year;

    if p_copy_programmes then
        shift := p_shashthi - prev.shashthi;
        insert into public.programmes (
            year, slug, type, title_en, title_bn, description_en, description_bn, rules_en, rules_bn,
            cover_image_url, venue, starts_at, ends_at, max_participants, hide_vote_counts, sort_order
        )
        select
            p_year, slug, type, title_en, title_bn, description_en, description_bn, rules_en, rules_bn,
            cover_image_url, venue, starts_at + shift, ends_at + shift, max_participants,
            hide_vote_counts, sort_order
        from public.programmes
        where year = prev.year and status <> 'cancelled';
    end if;
end;
$$;

-- Switch which year the public site treats as "this year" (e.g. to undo a mistake).
create or replace function public.set_current_edition(p_year integer) returns void
language plpgsql
set search_path = ''
as $$
begin
    if not exists (select 1 from public.editions where year = p_year) then
        raise exception 'edition_not_found';
    end if;
    update public.editions set is_current = false where is_current and year <> p_year;
    update public.editions set is_current = true where year = p_year;
end;
$$;

revoke execute on function public.start_edition(integer, text, text, text, timestamptz, timestamptz, timestamptz, boolean) from public, anon, authenticated;
revoke execute on function public.set_current_edition(integer) from public, anon, authenticated;
grant execute on function public.start_edition(integer, text, text, text, timestamptz, timestamptz, timestamptz, boolean) to service_role;
grant execute on function public.set_current_edition(integer) to service_role;
