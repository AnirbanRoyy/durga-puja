-- Pandal stream: a visitor who has used up their song requests can ask the organisers to reset the
-- allowance. Approving clears that network's request log for the year; rejecting declines it.

create table public.stream_quota_requests (
    id uuid primary key default gen_random_uuid(),
    year integer not null references public.editions (year) on update cascade,
    ip_hash text not null,
    name text not null,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    created_at timestamptz not null default now(),
    resolved_at timestamptz
);
-- One open request per network at a time.
create unique index stream_quota_requests_one_pending_idx
    on public.stream_quota_requests (year, ip_hash) where status = 'pending';
create index stream_quota_requests_year_ip_idx on public.stream_quota_requests (year, ip_hash, created_at desc);

-- Private (holds hashed network addresses): only the server can read or write it.
alter table public.stream_quota_requests enable row level security;
revoke all on public.stream_quota_requests from anon, authenticated;
grant all on public.stream_quota_requests to service_role;

-- 'created' | 'pending' (already asked) | 'declined' (organisers said no) | 'not_needed' (still has requests)
create function public.request_stream_quota_reset(
    p_year integer,
    p_ip_hash text,
    p_name text,
    p_limit integer
) returns text
language plpgsql
set search_path = ''
as $$
declare
    v_latest text;
begin
    perform pg_advisory_xact_lock(hashtext('stream_quota:' || p_year || ':' || p_ip_hash));

    if public.stream_requests_used(p_year, p_ip_hash) < p_limit then
        return 'not_needed';
    end if;

    select status into v_latest
    from public.stream_quota_requests
    where year = p_year and ip_hash = p_ip_hash
    order by created_at desc
    limit 1;

    if v_latest = 'pending' then
        return 'pending';
    end if;
    if v_latest = 'rejected' then
        return 'declined';
    end if;

    insert into public.stream_quota_requests (year, ip_hash, name) values (p_year, p_ip_hash, p_name);
    return 'created';
end;
$$;

-- Clears the network's request log for the year, so the full allowance is available again.
create function public.approve_stream_quota_reset(p_request_id uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
    r public.stream_quota_requests;
begin
    select * into r from public.stream_quota_requests where id = p_request_id and status = 'pending' for update;
    if not found then
        raise exception 'not_pending';
    end if;
    delete from public.stream_request_log where year = r.year and ip_hash = r.ip_hash;
    update public.stream_quota_requests set status = 'approved', resolved_at = now() where id = r.id;
end;
$$;

create function public.reject_stream_quota_reset(p_request_id uuid) returns void
language plpgsql
set search_path = ''
as $$
begin
    update public.stream_quota_requests
    set status = 'rejected', resolved_at = now()
    where id = p_request_id and status = 'pending';
    if not found then
        raise exception 'not_pending';
    end if;
end;
$$;

revoke execute on function public.request_stream_quota_reset(integer, text, text, integer) from public, anon, authenticated;
revoke execute on function public.approve_stream_quota_reset(uuid) from public, anon, authenticated;
revoke execute on function public.reject_stream_quota_reset(uuid) from public, anon, authenticated;
grant execute on function public.request_stream_quota_reset(integer, text, text, integer) to service_role;
grant execute on function public.approve_stream_quota_reset(uuid) to service_role;
grant execute on function public.reject_stream_quota_reset(uuid) to service_role;
