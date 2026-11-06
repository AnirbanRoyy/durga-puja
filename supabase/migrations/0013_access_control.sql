-- Admin access control: personal logins with least privilege. A user has one role; a role has
-- permission sets; a permission set has create/read/update/delete switches and applies to the
-- programmes and admin areas linked to it. The Super Admin is not a row here: it signs in with the
-- password in the environment, so a broken database can never lock the organisers out.
-- All tables are private (service role only).

create table public.roles (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    built_in boolean not null default false,
    created_at timestamptz not null default now()
);

insert into public.roles (name, description, built_in) values
    ('super-admin', 'Everything, always. Signs in with the password from the environment.', true),
    ('audience', 'No access to the admin portal.', true);

create table public.permission_sets (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    can_create boolean not null default false,
    can_read boolean not null default false,
    can_update boolean not null default false,
    can_delete boolean not null default false,
    created_at timestamptz not null default now()
);

create table public.role_permission_sets (
    role_id uuid not null references public.roles (id) on delete cascade,
    permission_set_id uuid not null references public.permission_sets (id) on delete restrict,
    primary key (role_id, permission_set_id)
);
create index role_permission_sets_set_idx on public.role_permission_sets (permission_set_id);

create table public.permission_set_programmes (
    permission_set_id uuid not null references public.permission_sets (id) on delete cascade,
    programme_id uuid not null references public.programmes (id) on delete cascade,
    primary key (permission_set_id, programme_id)
);
create index permission_set_programmes_programme_idx on public.permission_set_programmes (programme_id);

create table public.permission_set_areas (
    permission_set_id uuid not null references public.permission_sets (id) on delete cascade,
    area text not null check (
        area in (
            'all_programmes', 'registrations', 'stream', 'songs', 'song_requests', 'feedback',
            'years', 'settings'
        )
    ),
    primary key (permission_set_id, area)
);

create table public.users (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    username text not null check (username ~ '^[a-z0-9._-]{3,32}$' and username <> 'superadmin'),
    phone text,
    email text,
    password_hash text not null,
    role_id uuid not null references public.roles (id) on delete restrict,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    last_login_at timestamptz
);
create unique index users_username_idx on public.users (username);
create index users_role_idx on public.users (role_id);

alter table public.roles enable row level security;
alter table public.permission_sets enable row level security;
alter table public.role_permission_sets enable row level security;
alter table public.permission_set_programmes enable row level security;
alter table public.permission_set_areas enable row level security;
alter table public.users enable row level security;

revoke all on public.roles, public.permission_sets, public.role_permission_sets,
    public.permission_set_programmes, public.permission_set_areas, public.users
    from anon, authenticated;
grant all on public.roles, public.permission_sets, public.role_permission_sets,
    public.permission_set_programmes, public.permission_set_areas, public.users
    to service_role;

-- Everything the server needs to authorise one signed-in user, in one round trip. Null when the
-- user doesn't exist or is disabled.
create function public.admin_session(p_user_id uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
    select jsonb_build_object(
        'id', u.id,
        'name', u.name,
        'username', u.username,
        'role_name', r.name,
        'grants', coalesce((
            select jsonb_agg(jsonb_build_object(
                'create', ps.can_create,
                'read', ps.can_read,
                'update', ps.can_update,
                'delete', ps.can_delete,
                'programme_ids', coalesce((
                    select jsonb_agg(psp.programme_id)
                    from public.permission_set_programmes psp
                    where psp.permission_set_id = ps.id
                ), '[]'::jsonb),
                'areas', coalesce((
                    select jsonb_agg(psa.area)
                    from public.permission_set_areas psa
                    where psa.permission_set_id = ps.id
                ), '[]'::jsonb)
            ))
            from public.role_permission_sets rps
            join public.permission_sets ps on ps.id = rps.permission_set_id
            where rps.role_id = r.id
        ), '[]'::jsonb)
    )
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = p_user_id and u.active;
$$;

-- Saves a permission set and replaces its programme and area links in one transaction.
-- Pass p_id null to create. Returns the set's id.
create function public.save_permission_set(
    p_id uuid,
    p_name text,
    p_create boolean,
    p_read boolean,
    p_update boolean,
    p_delete boolean,
    p_programme_ids uuid[],
    p_areas text[]
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
    v_id uuid := p_id;
begin
    if v_id is null then
        insert into public.permission_sets (name, can_create, can_read, can_update, can_delete)
        values (p_name, p_create, p_read, p_update, p_delete)
        returning id into v_id;
    else
        update public.permission_sets
        set name = p_name, can_create = p_create, can_read = p_read, can_update = p_update,
            can_delete = p_delete
        where id = v_id;
        if not found then
            raise exception 'permission set not found';
        end if;
        delete from public.permission_set_programmes where permission_set_id = v_id;
        delete from public.permission_set_areas where permission_set_id = v_id;
    end if;

    insert into public.permission_set_programmes (permission_set_id, programme_id)
    select v_id, programme_id from unnest(p_programme_ids) as programme_id
    on conflict do nothing;
    insert into public.permission_set_areas (permission_set_id, area)
    select v_id, area from unnest(p_areas) as area
    on conflict do nothing;
    return v_id;
end;
$$;

-- Replaces the permission sets of a role in one transaction.
create function public.set_role_permission_sets(p_role_id uuid, p_permission_set_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
    delete from public.role_permission_sets where role_id = p_role_id;
    insert into public.role_permission_sets (role_id, permission_set_id)
    select p_role_id, set_id from unnest(p_permission_set_ids) as set_id
    on conflict do nothing;
end;
$$;

revoke execute on function public.admin_session(uuid) from public, anon, authenticated;
revoke execute on function public.save_permission_set(uuid, text, boolean, boolean, boolean, boolean, uuid[], text[]) from public, anon, authenticated;
revoke execute on function public.set_role_permission_sets(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.admin_session(uuid) to service_role;
grant execute on function public.save_permission_set(uuid, text, boolean, boolean, boolean, boolean, uuid[], text[]) to service_role;
grant execute on function public.set_role_permission_sets(uuid, uuid[]) to service_role;
