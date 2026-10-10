"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getQuizAdmin, quizLeaderboard } from "@/lib/queries";
import { db } from "@/lib/supabase/server";
import { fillBengali } from "@/lib/translate";

export type QuizActionResult = { ok: true } | { ok: false; message: string };

const ok: QuizActionResult = { ok: true };
const fail = (message: string): QuizActionResult => ({ ok: false, message });

const clean = (value: string | null | undefined, max: number) => (value ?? "").trim().slice(0, max);
const points = (value: number | null | undefined): number | null =>
    typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;

function describe(error: { message: string }): string {
    if (error.message.includes("team_required")) return "Choose which team gets this question.";
    if (error.message.includes("already_revealed")) return "This question was already revealed.";
    if (error.message.includes("not_asked")) return "Ask the question first.";
    return error.message;
}

// ---------------------------------------------------------------------------
// Setup: rounds and questions
// ---------------------------------------------------------------------------

export type RoundInput = {
    id?: string;
    programmeId: string;
    name_en: string;
    name_bn: string;
    /** Blank = the organiser types the points while playing. A wrong answer is usually negative. */
    points_correct: number | null;
    points_wrong: number | null;
};

export async function saveRound(input: RoundInput): Promise<QuizActionResult> {
    await requireAdmin();
    const name_en = clean(input.name_en, 80);
    if (!name_en) return fail("Give the round a name.");
    const [name_bn] = await fillBengali([{ en: name_en, bn: clean(input.name_bn, 80) }]);
    const row = {
        name_en,
        name_bn,
        points_correct: points(input.points_correct),
        points_wrong: points(input.points_wrong),
    };
    const supabase = db();
    if (input.id) {
        const { error } = await supabase.from("quiz_rounds").update(row).eq("id", input.id);
        if (error) return fail(describe(error));
    } else {
        const { data: last } = await supabase
            .from("quiz_rounds")
            .select("round_no")
            .eq("programme_id", input.programmeId)
            .order("round_no", { ascending: false })
            .limit(1)
            .maybeSingle();
        const { error } = await supabase.from("quiz_rounds").insert({
            ...row,
            programme_id: input.programmeId,
            round_no: (last?.round_no ?? 0) + 1,
        });
        if (error) return fail(describe(error));
    }
    refresh();
    return ok;
}

export async function deleteRound(id: string): Promise<QuizActionResult> {
    await requireAdmin();
    const { error } = await db().from("quiz_rounds").delete().eq("id", id);
    if (error) return fail(describe(error));
    refresh();
    return ok;
}

export type QuestionInput = {
    id?: string;
    roundId: string;
    programmeId: string;
    kind: "team" | "audience";
    question_en: string;
    question_bn: string;
    answer_en: string;
    answer_bn: string;
};

export async function saveQuestion(input: QuestionInput): Promise<QuizActionResult> {
    await requireAdmin();
    const question_en = clean(input.question_en, 400);
    const answer_en = clean(input.answer_en, 200);
    if (!question_en || !answer_en) return fail("Write both the question and its answer.");

    const [question_bn, answer_bn] = await fillBengali([
        { en: question_en, bn: clean(input.question_bn, 400) },
        { en: answer_en, bn: clean(input.answer_bn, 200) },
    ]);
    const supabase = db();
    let questionId = input.id;
    if (questionId) {
        const { error } = await supabase
            .from("quiz_questions")
            .update({ kind: input.kind, question_en, question_bn })
            .eq("id", questionId);
        if (error) return fail(describe(error));
    } else {
        const { data: last } = await supabase
            .from("quiz_questions")
            .select("sort_no")
            .eq("round_id", input.roundId)
            .order("sort_no", { ascending: false })
            .limit(1)
            .maybeSingle();
        const { data, error } = await supabase
            .from("quiz_questions")
            .insert({
                round_id: input.roundId,
                programme_id: input.programmeId,
                kind: input.kind,
                question_en,
                question_bn,
                sort_no: (last?.sort_no ?? 0) + 1,
            })
            .select("id")
            .single();
        if (error) return fail(describe(error));
        questionId = data.id;
    }
    const { error } = await supabase
        .from("quiz_answers")
        .upsert({ question_id: questionId, answer_en, answer_bn });
    if (error) return fail(describe(error));
    refresh();
    return ok;
}

export async function deleteQuestion(id: string): Promise<QuizActionResult> {
    await requireAdmin();
    const { error } = await db().from("quiz_questions").delete().eq("id", id);
    if (error) return fail(describe(error));
    refresh();
    return ok;
}

// ---------------------------------------------------------------------------
// Live: ask, reveal, undo
// ---------------------------------------------------------------------------

/** Puts a question on everyone's screen (any other live question goes back to hidden). */
export async function askQuestion(
    questionId: string,
    teamId: string | null,
): Promise<QuizActionResult> {
    await requireAdmin();
    const { error } = await db().rpc("ask_quiz_question", {
        p_question_id: questionId,
        p_team_id: teamId,
    });
    if (error) return fail(describe(error));
    refresh();
    return ok;
}

const PICK_MESSAGES = {
    question_live: "A question is already on screen. Mark it, or take it off screen, first.",
    all_teams_done:
        "Every team has had its turn in this round. Finish the round and start the next one.",
    no_questions: "No unasked team questions are left in this round. Add more in the Setup tab.",
    no_teams: "No teams have registered yet.",
} as const;

/**
 * Picks a random team that hasn't had its turn this round, and a random unasked team question,
 * and puts it on everyone's screen.
 */
export async function askRandomTeamQuestion(roundId: string): Promise<QuizActionResult> {
    await requireAdmin();
    const { data, error } = await db().rpc("ask_random_team_question", { p_round_id: roundId });
    if (error) return fail(describe(error));
    if (data !== "asked") return fail(PICK_MESSAGES[data]);
    refresh();
    return ok;
}

/** Takes the question off screen without scoring it; its team can be picked again. */
export async function hideQuestion(questionId: string): Promise<QuizActionResult> {
    await requireAdmin();
    const { error } = await db().rpc("hide_quiz_question", { p_question_id: questionId });
    if (error) return fail(describe(error));
    refresh();
    return ok;
}

/**
 * Reveals the answer to everyone and scores it in the same step.
 * `pointsOverride` replaces the round's points (needed when the round left them blank).
 */
export async function markQuestion(
    questionId: string,
    outcome: "correct" | "wrong" | "reveal",
    pointsOverride?: number | null,
): Promise<QuizActionResult> {
    await requireAdmin();
    const supabase = db();
    let awarded: number | null = null;
    if (outcome !== "reveal") {
        const { data: q } = await supabase
            .from("quiz_questions")
            .select("round_id")
            .eq("id", questionId)
            .maybeSingle();
        const { data: round } = q
            ? await supabase.from("quiz_rounds").select("*").eq("id", q.round_id).maybeSingle()
            : { data: null };
        const fromRound = outcome === "correct" ? round?.points_correct : round?.points_wrong;
        awarded = points(pointsOverride) ?? fromRound ?? 0;
        // A wrong answer is a deduction: a positive number typed for "wrong" still takes points away.
        if (outcome === "wrong" && awarded > 0 && pointsOverride != null) awarded = -awarded;
    }
    const { error } = await supabase.rpc("mark_quiz_question", {
        p_question_id: questionId,
        p_outcome: outcome,
        p_points: awarded,
    });
    if (error) return fail(describe(error));
    refresh();
    return ok;
}

export async function undoQuestion(questionId: string): Promise<QuizActionResult> {
    await requireAdmin();
    const { error } = await db().rpc("undo_quiz_question", { p_question_id: questionId });
    if (error) return fail(describe(error));
    refresh();
    return ok;
}

export async function setRoundStatus(
    roundId: string,
    status: "upcoming" | "live" | "done",
): Promise<QuizActionResult> {
    await requireAdmin();
    const { error } = await db().from("quiz_rounds").update({ status }).eq("id", roundId);
    if (error) return fail(describe(error));
    refresh();
    return ok;
}

/** Writes the top three teams into the programme's results (shown on Results and in the archive). */
export async function saveLeaderboardToResults(programmeId: string): Promise<QuizActionResult> {
    await requireAdmin();
    const { questions, teams } = await getQuizAdmin(programmeId);
    const top = quizLeaderboard(teams, questions)
        .filter((t) => t.answered > 0)
        .slice(0, 3);
    if (!top.length) return fail("No team has scored yet.");
    const supabase = db();
    const { error: delError } = await supabase
        .from("results")
        .delete()
        .eq("programme_id", programmeId);
    if (delError) return fail(describe(delError));
    const { error } = await supabase.from("results").insert(
        top.map((t, i) => ({
            programme_id: programmeId,
            position: i + 1,
            name: t.name,
            score: `${t.points} pts`,
        })),
    );
    if (error) return fail(describe(error));
    refresh();
    return ok;
}
