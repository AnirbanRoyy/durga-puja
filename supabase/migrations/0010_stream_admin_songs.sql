-- Pandal stream: the admin can put library songs straight into the playlist, and take songs out of it.

-- Adds songs as approved (or approves them if they're already listed). Returns how many joined the
-- playlist. Organiser songs never touch a visitor's request quota.
create function public.add_stream_songs(p_year integer, p_songs jsonb) returns integer
language plpgsql
set search_path = ''
as $$
declare
    v_song jsonb;
    r public.stream_requests;
    s public.stream_state;
    v_added integer := 0;
begin
    perform pg_advisory_xact_lock(hashtext('stream_admin:' || p_year));

    for v_song in select * from jsonb_array_elements(p_songs) loop
        select * into r from public.stream_requests
        where year = p_year and youtube_id = v_song ->> 'youtube_id'
        for update;

        if not found then
            insert into public.stream_requests (
                year, youtube_id, title, channel, thumbnail_url, requested_by, status, upvotes, approved_at
            ) values (
                p_year,
                v_song ->> 'youtube_id',
                v_song ->> 'title',
                nullif(v_song ->> 'channel', ''),
                'https://i.ytimg.com/vi/' || (v_song ->> 'youtube_id') || '/mqdefault.jpg',
                'Organisers',
                'approved',
                0,
                now()
            );
            v_added := v_added + 1;
        elsif r.status <> 'approved' then
            update public.stream_requests
            set status = 'approved', approved_at = now()
            where id = r.id;
            v_added := v_added + 1;
        end if;
    end loop;

    if v_added > 0 then
        perform public.ensure_stream_state(p_year);
        select * into s from public.stream_state where year = p_year for update;
        if s.is_streaming and s.now_playing_id is null then
            update public.stream_state
            set now_playing_id = public.pick_stream_song(p_year, null), updated_at = now()
            where year = p_year
            returning * into s;
            update public.stream_state
            set up_next_id = public.pick_stream_song(p_year, s.now_playing_id)
            where year = p_year;
        elsif s.now_playing_id is not null and s.up_next_id is null then
            update public.stream_state
            set up_next_id = public.pick_stream_song(p_year, s.now_playing_id), updated_at = now()
            where year = p_year;
        end if;
    end if;

    return v_added;
end;
$$;

-- Takes a waiting song out of the playlist. A song that has played before goes back to the
-- "played" history; a never-played one is deleted. The song playing right now is refused (use Skip).
create function public.remove_stream_song(p_request_id uuid) returns text
language plpgsql
set search_path = ''
as $$
declare
    r public.stream_requests;
    s public.stream_state;
begin
    select * into r from public.stream_requests where id = p_request_id;
    if not found then
        return 'not_found';
    end if;

    perform pg_advisory_xact_lock(hashtext('stream_admin:' || r.year));
    perform public.ensure_stream_state(r.year);
    select * into s from public.stream_state where year = r.year for update;
    if s.now_playing_id = p_request_id then
        return 'now_playing';
    end if;

    if s.up_next_id = p_request_id then
        update public.stream_state set up_next_id = null where year = r.year;
    end if;

    if r.play_count > 0 then
        update public.stream_requests set status = 'played' where id = p_request_id;
    else
        delete from public.stream_requests where id = p_request_id;
    end if;

    if s.up_next_id = p_request_id then
        update public.stream_state
        set up_next_id = case
                when s.now_playing_id is null then null
                else public.pick_stream_song(r.year, s.now_playing_id)
            end,
            updated_at = now()
        where year = r.year;
    end if;

    return 'removed';
end;
$$;

revoke execute on function public.add_stream_songs(integer, jsonb) from public, anon, authenticated;
revoke execute on function public.remove_stream_song(uuid) from public, anon, authenticated;
grant execute on function public.add_stream_songs(integer, jsonb) to service_role;
grant execute on function public.remove_stream_song(uuid) to service_role;
