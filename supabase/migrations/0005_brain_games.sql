-- Brain games: a live quiz. Rounds have a name and optional points; each round holds team questions
-- (asked to one of the registered teams) and audience questions. Answers live in a table the public
-- API cannot read; they are copied onto the question only when the admin reveals them.

alter table public.programmes drop constraint if exists programmes_type_check;
alter table public.programmes
    add constraint programmes_type_check
    check (type in ('musical_chair', 'singing', 'dance', 'drawing', 'quiz', 'other'));

create table public.quiz_rounds (
    id uuid primary key default gen_random_uuid(),
    programme_id uuid not null references public.programmes (id) on delete cascade,
    round_no integer not null,
    name_en text not null,
    name_bn text,
    -- Null = the admin types the points live. points_wrong is stored signed (e.g. -5) or null/0.
    points_correct integer,
    points_wrong integer,
    status text not null default 'upcoming' check (status in ('upcoming', 'live', 'done')),
    created_at timestamptz not null default now(),
    unique (programme_id, round_no)
);

create table public.quiz_questions (
    id uuid primary key default gen_random_uuid(),
    round_id uuid not null references public.quiz_rounds (id) on delete cascade,
    programme_id uuid not null references public.programmes (id) on delete cascade,
    sort_no integer not null default 0,
    kind text not null default 'team' check (kind in ('team', 'audience')),
    question_en text not null,
    question_bn text,
    state text not null default 'hidden' check (state in ('hidden', 'asked', 'revealed')),
    team_id uuid references public.registrations (id) on delete set null,
    outcome text check (outcome in ('correct', 'wrong')),
    points_awarded integer,
    asked_at timestamptz,
    revealed_at timestamptz,
    revealed_answer_en text,
    revealed_answer_bn text,
    created_at timestamptz not null default now()
);

create index quiz_questions_round_idx on public.quiz_questions (round_id, sort_no);
create index quiz_questions_programme_idx on public.quiz_questions (programme_id, state);
create index quiz_questions_team_idx on public.quiz_questions (team_id);

-- The answers themselves. No anon access, so nothing here can leak before the reveal.
create table public.quiz_answers (
    question_id uuid primary key references public.quiz_questions (id) on delete cascade,
    answer_en text not null,
    answer_bn text
);

alter table public.quiz_rounds enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;

revoke all on public.quiz_rounds, public.quiz_questions, public.quiz_answers from anon, authenticated;
grant select on public.quiz_rounds, public.quiz_questions to anon, authenticated;
grant all on public.quiz_rounds, public.quiz_questions, public.quiz_answers to service_role;

create policy "public read" on public.quiz_rounds for select to anon, authenticated using (true);
-- Questions only become public once the admin asks them.
create policy "public read" on public.quiz_questions for select to anon, authenticated
    using (state <> 'hidden');

alter publication supabase_realtime add table public.quiz_rounds, public.quiz_questions;

-- Puts one question on screen. Only one question is live at a time: any other asked-but-unrevealed
-- question goes back to hidden.
create or replace function public.ask_quiz_question(p_question_id uuid, p_team_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
    q public.quiz_questions;
begin
    select * into q from public.quiz_questions where id = p_question_id;
    if not found then
        raise exception 'question_not_found';
    end if;
    if q.state = 'revealed' then
        raise exception 'already_revealed';
    end if;
    if q.kind = 'team' and p_team_id is null then
        raise exception 'team_required';
    end if;

    update public.quiz_questions
    set state = 'hidden', asked_at = null, team_id = case when kind = 'team' then null else team_id end
    where programme_id = q.programme_id and state = 'asked' and id <> p_question_id;

    update public.quiz_questions
    set state = 'asked', asked_at = now(), team_id = case when kind = 'team' then p_team_id else null end
    where id = p_question_id;

    update public.quiz_rounds set status = 'live' where id = q.round_id and status <> 'live';
end;
$$;

-- Reveals the answer to everyone and records the result. outcome: 'correct' | 'wrong' | 'reveal'
-- ('reveal' is for audience questions, which carry no points).
create or replace function public.mark_quiz_question(p_question_id uuid, p_outcome text, p_points integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
    q public.quiz_questions;
    a public.quiz_answers;
begin
    if p_outcome not in ('correct', 'wrong', 'reveal') then
        raise exception 'bad_outcome';
    end if;
    select * into q from public.quiz_questions where id = p_question_id for update;
    if not found then
        raise exception 'question_not_found';
    end if;
    if q.state <> 'asked' then
        raise exception 'not_asked';
    end if;
    select * into a from public.quiz_answers where question_id = p_question_id;

    update public.quiz_questions
    set state = 'revealed',
        revealed_at = now(),
        revealed_answer_en = a.answer_en,
        revealed_answer_bn = a.answer_bn,
        outcome = case when p_outcome = 'reveal' then null else p_outcome end,
        points_awarded = case when p_outcome = 'reveal' or q.kind = 'audience' then null else coalesce(p_points, 0) end
    where id = p_question_id;
end;
$$;

-- Takes a reveal back (a mistaken Correct/Wrong click): the question is live again, answer hidden.
create or replace function public.undo_quiz_question(p_question_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
    update public.quiz_questions
    set state = 'asked',
        revealed_at = null,
        revealed_answer_en = null,
        revealed_answer_bn = null,
        outcome = null,
        points_awarded = null
    where id = p_question_id and state = 'revealed';
end;
$$;

revoke execute on function public.ask_quiz_question(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.mark_quiz_question(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.undo_quiz_question(uuid) from public, anon, authenticated;
grant execute on function public.ask_quiz_question(uuid, uuid) to service_role;
grant execute on function public.mark_quiz_question(uuid, text, integer) to service_role;
grant execute on function public.undo_quiz_question(uuid) to service_role;

-- This year's brain games become a quiz with 8 teams.
update public.programmes
set type = 'quiz', max_participants = coalesce(max_participants, 8)
where slug = 'brain-games' and type = 'other';
