-- Team registrations: a programme can take individuals (as before), teams with a name, members and
-- a leader, or brother–sister pairs. Brain Games also gets a "pick a random team" button: in each
-- round every team is asked exactly one team question, in random order.

alter table public.programmes
    add column team_format text not null default 'individual'
        check (team_format in ('individual', 'team', 'pair')),
    add column team_min_size integer check (team_min_size between 1 and 20),
    add column team_max_size integer check (team_max_size between 1 and 20),
    add constraint programmes_team_size_order check (team_min_size is null or team_max_size is null or team_min_size <= team_max_size);

-- [{ "name": "...", "role": "leader" | "member" | "brother" | "sister" }]. Public, like the name.
alter table public.registrations
    add column members jsonb not null default '[]'::jsonb
        check (jsonb_typeof(members) = 'array');

update public.programmes set team_format = 'team', team_min_size = 2, team_max_size = 4
where slug in ('brain-games', 'antakshari');
update public.programmes set team_format = 'pair', team_min_size = 2, team_max_size = 2
where slug = 'brother-sister-challenge';

-- Asks a random unasked team question of the round to a random team that hasn't had its turn yet.
-- 'asked' | 'question_live' | 'all_teams_done' | 'no_questions' | 'no_teams'
create function public.ask_random_team_question(p_round_id uuid) returns text
language plpgsql
set search_path = ''
as $$
declare
    v_programme uuid;
    v_team uuid;
    v_question uuid;
begin
    select programme_id into v_programme from public.quiz_rounds where id = p_round_id;
    if v_programme is null then
        raise exception 'round_not_found';
    end if;
    -- One press at a time per quiz.
    perform pg_advisory_xact_lock(hashtext('quiz_pick:' || v_programme));

    if exists (select 1 from public.quiz_questions where programme_id = v_programme and state = 'asked') then
        return 'question_live';
    end if;
    if not exists (select 1 from public.registrations where programme_id = v_programme) then
        return 'no_teams';
    end if;

    select r.id into v_team
    from public.registrations r
    where r.programme_id = v_programme
      and not exists (
          select 1 from public.quiz_questions q
          where q.round_id = p_round_id and q.kind = 'team' and q.state <> 'hidden' and q.team_id = r.id
      )
    order by random()
    limit 1;
    if v_team is null then
        return 'all_teams_done';
    end if;

    select q.id into v_question
    from public.quiz_questions q
    where q.round_id = p_round_id and q.kind = 'team' and q.state = 'hidden'
    order by random()
    limit 1;
    if v_question is null then
        return 'no_questions';
    end if;

    perform public.ask_quiz_question(v_question, v_team);
    return 'asked';
end;
$$;

-- Takes a question off screen without marking it (e.g. asked by mistake); its team can be picked again.
create function public.hide_quiz_question(p_question_id uuid) returns void
language sql
set search_path = ''
as $$
    update public.quiz_questions
    set state = 'hidden', asked_at = null, team_id = case when kind = 'team' then null else team_id end
    where id = p_question_id and state = 'asked';
$$;

revoke execute on function public.ask_random_team_question(uuid) from public, anon, authenticated;
revoke execute on function public.hide_quiz_question(uuid) from public, anon, authenticated;
grant execute on function public.ask_random_team_question(uuid) to service_role;
grant execute on function public.hide_quiz_question(uuid) to service_role;
