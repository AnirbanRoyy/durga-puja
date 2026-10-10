"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    askQuestion,
    askRandomTeamQuestion,
    deleteQuestion,
    deleteRound,
    hideQuestion,
    markQuestion,
    saveLeaderboardToResults,
    saveQuestion,
    saveRound,
    setRoundStatus,
    undoQuestion,
    type QuizActionResult,
} from "@/actions/admin/brain-games";
import { FieldTranslateButton } from "@/components/admin/translate-button";
import { AdminCard } from "@/components/admin/admin-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { QuizRound } from "@/lib/database.types";
import type { QuizAdminQuestion, QuizTeamScore } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Team = { id: string; name: string };

const selectClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Runs a server action, shows its error (if any) as a toast and refreshes the page data. */
function useRun() {
    const router = useRouter();
    const [pending, start] = useTransition();
    const run = (action: () => Promise<QuizActionResult>, success?: string) =>
        start(async () => {
            const result = await action();
            if (!result.ok) toast.error(result.message);
            else {
                if (success) toast.success(success);
                router.refresh();
            }
        });
    return { run, pending };
}

export function BrainGamesConsole({
    programmeId,
    rounds,
    questions,
    teams,
    leaderboard,
}: {
    programmeId: string;
    rounds: QuizRound[];
    questions: QuizAdminQuestion[];
    teams: Team[];
    leaderboard: QuizTeamScore[];
}) {
    return (
        <Tabs defaultValue={questions.length ? "live" : "setup"} className="gap-6">
            <TabsList>
                <TabsTrigger value="live">Live</TabsTrigger>
                <TabsTrigger value="setup">Rounds &amp; questions</TabsTrigger>
            </TabsList>
            <TabsContent value="live">
                <LivePanel
                    programmeId={programmeId}
                    rounds={rounds}
                    questions={questions}
                    teams={teams}
                    leaderboard={leaderboard}
                />
            </TabsContent>
            <TabsContent value="setup">
                <SetupPanel programmeId={programmeId} rounds={rounds} questions={questions} />
            </TabsContent>
        </Tabs>
    );
}

// ---------------------------------------------------------------------------
// Live
// ---------------------------------------------------------------------------

function LivePanel({
    programmeId,
    rounds,
    questions,
    teams,
    leaderboard,
}: {
    programmeId: string;
    rounds: QuizRound[];
    questions: QuizAdminQuestion[];
    teams: Team[];
    leaderboard: QuizTeamScore[];
}) {
    const { run, pending } = useRun();
    const live = questions.find((q) => q.state === "asked") ?? null;
    const [roundId, setRoundId] = useState(
        live?.round_id ?? rounds.find((r) => r.status !== "done")?.id ?? rounds[0]?.id ?? "",
    );
    const [manualPoints, setManualPoints] = useState("");
    const round = rounds.find((r) => r.id === roundId);
    const inRound = questions.filter((q) => q.round_id === roundId);
    const teamQuestions = inRound.filter((q) => q.kind === "team");
    const playedTeamIds = new Set(
        teamQuestions.filter((q) => q.state !== "hidden" && q.team_id).map((q) => q.team_id),
    );
    const teamsLeft = teams.filter((team) => !playedTeamIds.has(team.id));
    const unaskedTeamQuestions = teamQuestions.filter((q) => q.state === "hidden").length;
    const shortBy = Math.max(0, teamsLeft.length - unaskedTeamQuestions);
    const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "—";
    const liveRound = live ? rounds.find((r) => r.id === live.round_id) : null;
    const needsPoints = (outcome: "correct" | "wrong") =>
        liveRound != null &&
        (outcome === "correct" ? liveRound.points_correct : liveRound.points_wrong) == null;
    const lastRevealed = [...questions]
        .filter((q) => q.state === "revealed")
        .sort((a, b) => (b.revealed_at ?? "").localeCompare(a.revealed_at ?? ""))[0];

    if (!rounds.length) {
        return (
            <AdminCard>
                <p className="text-sm text-muted-foreground">
                    Add a round and its questions in the “Rounds &amp; questions” tab first.
                </p>
            </AdminCard>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="grid gap-6">
                <AdminCard title="On screen now">
                    {live ? (
                        <div className="grid gap-4">
                            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                                {liveRound?.name_en} ·{" "}
                                {live.kind === "team"
                                    ? `Team: ${teamName(live.team_id)}`
                                    : "Audience question"}
                            </p>
                            <p className="text-2xl font-semibold">{live.question_en}</p>
                            <div className="rounded-xl border border-dashed bg-secondary/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                    Answer (only you can see this)
                                </p>
                                <p className="text-lg font-semibold">{live.answer_en}</p>
                            </div>
                            <div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={pending}
                                    onClick={() =>
                                        run(() => hideQuestion(live.id), "Taken off screen")
                                    }
                                >
                                    Take off screen (not scored)
                                </Button>
                            </div>
                            {live.kind === "team" ? (
                                <div className="grid gap-3">
                                    {(needsPoints("correct") || needsPoints("wrong")) && (
                                        <div className="grid max-w-xs gap-1.5">
                                            <Label htmlFor="manual-points">
                                                Points for this question
                                            </Label>
                                            <Input
                                                id="manual-points"
                                                type="number"
                                                inputMode="numeric"
                                                placeholder="e.g. 10"
                                                value={manualPoints}
                                                onChange={(e) => setManualPoints(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                This round has no fixed points. Wrong answers deduct
                                                this number.
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            size="lg"
                                            disabled={pending}
                                            className="bg-success text-white hover:bg-success/90"
                                            onClick={() =>
                                                run(
                                                    () =>
                                                        markQuestion(
                                                            live.id,
                                                            "correct",
                                                            manualPoints === ""
                                                                ? null
                                                                : Number(manualPoints),
                                                        ),
                                                    "Marked correct — answer revealed",
                                                )
                                            }
                                        >
                                            ✓ Correct
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="destructive"
                                            disabled={pending}
                                            onClick={() =>
                                                run(
                                                    () =>
                                                        markQuestion(
                                                            live.id,
                                                            "wrong",
                                                            manualPoints === ""
                                                                ? null
                                                                : Number(manualPoints),
                                                        ),
                                                    "Marked wrong — answer revealed",
                                                )
                                            }
                                        >
                                            ✗ Wrong
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <Button
                                        size="lg"
                                        disabled={pending}
                                        onClick={() =>
                                            run(
                                                () => markQuestion(live.id, "reveal"),
                                                "Answer revealed",
                                            )
                                        }
                                    >
                                        Reveal answer
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Nothing on screen. Pick a question below and press Ask.
                        </p>
                    )}
                    {lastRevealed && (
                        <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3 text-sm text-muted-foreground">
                            Last revealed: “{lastRevealed.question_en}” →{" "}
                            <span className="font-medium text-foreground">
                                {lastRevealed.answer_en}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={pending || Boolean(live)}
                                onClick={() =>
                                    run(() => undoQuestion(lastRevealed.id), "Reveal undone")
                                }
                            >
                                Undo
                            </Button>
                        </div>
                    )}
                </AdminCard>

                <AdminCard title="Questions">
                    <div className="mb-4 flex flex-wrap items-end gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="live-round">Round</Label>
                            <select
                                id="live-round"
                                className={cn(selectClass, "w-64")}
                                value={roundId}
                                onChange={(e) => setRoundId(e.target.value)}
                            >
                                {rounds.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.round_no}. {r.name_en}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {round && round.status !== "done" && (
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={pending}
                                onClick={() =>
                                    run(() => setRoundStatus(round.id, "done"), "Round finished")
                                }
                            >
                                Finish round
                            </Button>
                        )}
                    </div>
                    {round && (
                        <div className="mb-4 grid gap-2 rounded-xl border bg-secondary/40 p-3">
                            <p className="text-sm font-medium">Team questions</p>
                            <p className="text-xs text-muted-foreground">
                                Every team gets one question per round, in random order. Teams that
                                have played: {teams.length - teamsLeft.length} of {teams.length}
                                {teamsLeft.length > 0 && teamsLeft.length < teams.length
                                    ? ` · still to play: ${teamsLeft.map((x) => x.name).join(", ")}`
                                    : ""}
                            </p>
                            {shortBy > 0 && (
                                <p className="text-xs text-destructive">
                                    Not enough team questions left in this round: add {shortBy} more
                                    in the Setup tab so every team gets a turn.
                                </p>
                            )}
                            <div>
                                <Button
                                    disabled={
                                        pending ||
                                        Boolean(live) ||
                                        teamsLeft.length === 0 ||
                                        unaskedTeamQuestions === 0
                                    }
                                    onClick={() => {
                                        setManualPoints("");
                                        run(
                                            () => askRandomTeamQuestion(round.id),
                                            "Question is on screen",
                                        );
                                    }}
                                >
                                    Pick team &amp; ask
                                </Button>
                            </div>
                            {teams.length > 0 && teamsLeft.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Every team has had its turn. Finish this round and start the
                                    next.
                                </p>
                            )}
                            {live && (
                                <p className="text-xs text-muted-foreground">
                                    A question is on screen: mark it first.
                                </p>
                            )}
                        </div>
                    )}
                    <ul className="divide-y">
                        {inRound.map((q) => (
                            <li key={q.id} className="grid gap-2 py-3">
                                <div className="flex flex-wrap items-start gap-2">
                                    <span
                                        className={cn(
                                            "rounded-full px-2 py-0.5 text-xs font-medium",
                                            q.state === "revealed" && "bg-success/15 text-success",
                                            q.state === "asked" && "bg-marigold/30",
                                            q.state === "hidden" &&
                                                "bg-muted text-muted-foreground",
                                        )}
                                    >
                                        {q.state === "revealed"
                                            ? q.outcome === "correct"
                                                ? `✓ ${q.points_awarded ?? 0}`
                                                : q.outcome === "wrong"
                                                  ? `✗ ${q.points_awarded ?? 0}`
                                                  : "revealed"
                                            : q.state === "asked"
                                              ? "on screen"
                                              : "not asked"}
                                    </span>
                                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                                        {q.kind === "team" ? "team" : "audience"}
                                    </span>
                                    <p className="min-w-0 flex-1 text-sm font-medium">
                                        {q.question_en}
                                    </p>
                                </div>
                                {q.state !== "revealed" && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {q.kind === "audience" ? (
                                            <Button
                                                size="sm"
                                                disabled={pending || q.state === "asked"}
                                                onClick={() => {
                                                    setManualPoints("");
                                                    run(
                                                        () => askQuestion(q.id, null),
                                                        "Question is on screen",
                                                    );
                                                }}
                                            >
                                                {q.state === "asked" ? "On screen" : "Ask"}
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {q.state === "asked"
                                                    ? `On screen for ${teamName(q.team_id)}`
                                                    : "Asked by “Pick team & ask”"}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                        {!inRound.length && (
                            <li className="py-3 text-sm text-muted-foreground">
                                No questions in this round yet.
                            </li>
                        )}
                    </ul>
                </AdminCard>
            </div>

            <AdminCard title="Leaderboard">
                <ol className="space-y-1.5">
                    {leaderboard.map((t, i) => (
                        <li key={t.id} className="flex items-center gap-3 text-sm">
                            <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>
                            <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                            <span className="font-heading text-lg font-semibold tabular-nums">
                                {t.points}
                            </span>
                        </li>
                    ))}
                    {!leaderboard.length && (
                        <li className="text-sm text-muted-foreground">
                            No teams yet. Teams appear here once they register.
                        </li>
                    )}
                </ol>
                <Button
                    className="mt-4"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                        run(() => saveLeaderboardToResults(programmeId), "Top 3 saved to Results")
                    }
                >
                    Save top 3 to Results
                </Button>
            </AdminCard>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function numberOrNull(value: string): number | null {
    return value.trim() === "" ? null : Number(value);
}

function SetupPanel({
    programmeId,
    rounds,
    questions,
}: {
    programmeId: string;
    rounds: QuizRound[];
    questions: QuizAdminQuestion[];
}) {
    return (
        <div className="grid max-w-3xl gap-6">
            {rounds.map((round) => (
                <RoundCard
                    key={round.id}
                    programmeId={programmeId}
                    round={round}
                    questions={questions.filter((q) => q.round_id === round.id)}
                />
            ))}
            <AdminCard title="Add a round">
                <RoundForm programmeId={programmeId} />
            </AdminCard>
        </div>
    );
}

function RoundForm({ programmeId, round }: { programmeId: string; round?: QuizRound }) {
    const { run, pending } = useRun();
    const key = round?.id ?? "new";
    const [name, setName] = useState(round?.name_en ?? "");
    const [nameBn, setNameBn] = useState(round?.name_bn ?? "");
    const [correct, setCorrect] = useState(round?.points_correct?.toString() ?? "");
    const [wrong, setWrong] = useState(round?.points_wrong?.toString() ?? "");

    return (
        <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
                e.preventDefault();
                run(
                    () =>
                        saveRound({
                            id: round?.id,
                            programmeId,
                            name_en: name,
                            name_bn: nameBn,
                            points_correct: numberOrNull(correct),
                            points_wrong: numberOrNull(wrong),
                        }),
                    round ? "Round saved" : "Round added",
                );
                if (!round) {
                    setName("");
                    setNameBn("");
                    setCorrect("");
                    setWrong("");
                }
            }}
        >
            <div className="grid gap-1.5">
                <Label htmlFor={`rn-${key}`}>Round name (English)</Label>
                <Input
                    id={`rn-${key}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={`rnb-${key}`}>Round name (বাংলা)</Label>
                <Input
                    id={`rnb-${key}`}
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                />
                <FieldTranslateButton from={`rn-${key}`} to={`rnb-${key}`} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={`pc-${key}`}>Points for a correct answer</Label>
                <Input
                    id={`pc-${key}`}
                    type="number"
                    inputMode="numeric"
                    placeholder="blank = type live"
                    value={correct}
                    onChange={(e) => setCorrect(e.target.value)}
                />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={`pw-${key}`}>Points for a wrong answer</Label>
                <Input
                    id={`pw-${key}`}
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. -5 (blank = type live)"
                    value={wrong}
                    onChange={(e) => setWrong(e.target.value)}
                />
            </div>
            <div className="sm:col-span-2">
                <Button type="submit" size="sm" disabled={pending}>
                    {round ? "Save round" : "Add round"}
                </Button>
            </div>
        </form>
    );
}

function RoundCard({
    programmeId,
    round,
    questions,
}: {
    programmeId: string;
    round: QuizRound;
    questions: QuizAdminQuestion[];
}) {
    const { run, pending } = useRun();
    const [editing, setEditing] = useState(false);
    return (
        <AdminCard>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold">
                        {round.round_no}. {round.name_en}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Correct: {round.points_correct ?? "type live"} · Wrong:{" "}
                        {round.points_wrong ?? "type live"}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
                        {editing ? "Close" : "Edit round"}
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => {
                            if (window.confirm(`Delete “${round.name_en}” and its questions?`))
                                run(() => deleteRound(round.id), "Round deleted");
                        }}
                    >
                        Delete
                    </Button>
                </div>
            </div>
            {editing && (
                <div className="mb-5 rounded-xl border p-4">
                    <RoundForm programmeId={programmeId} round={round} />
                </div>
            )}
            <ul className="mb-4 divide-y">
                {questions.map((q) => (
                    <QuestionRow
                        key={q.id}
                        programmeId={programmeId}
                        roundId={round.id}
                        question={q}
                    />
                ))}
                {!questions.length && (
                    <li className="py-2 text-sm text-muted-foreground">No questions yet.</li>
                )}
            </ul>
            <QuestionForm programmeId={programmeId} roundId={round.id} />
        </AdminCard>
    );
}

function QuestionRow({
    programmeId,
    roundId,
    question,
}: {
    programmeId: string;
    roundId: string;
    question: QuizAdminQuestion;
}) {
    const { run, pending } = useRun();
    const [editing, setEditing] = useState(false);
    return (
        <li className="grid gap-2 py-3">
            <div className="flex flex-wrap items-start gap-2">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {question.kind}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{question.question_en}</p>
                    <p className="text-muted-foreground">Answer: {question.answer_en}</p>
                    {question.question_bn && (
                        <p className="text-xs text-muted-foreground">
                            {question.question_bn} → {question.answer_bn}
                        </p>
                    )}
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={question.state !== "hidden"}
                    onClick={() => setEditing((v) => !v)}
                >
                    {editing ? "Close" : "Edit"}
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                        if (window.confirm("Delete this question?"))
                            run(() => deleteQuestion(question.id), "Question deleted");
                    }}
                >
                    Delete
                </Button>
            </div>
            {editing && (
                <div className="rounded-xl border p-4">
                    <QuestionForm
                        programmeId={programmeId}
                        roundId={roundId}
                        question={question}
                        onDone={() => setEditing(false)}
                    />
                </div>
            )}
        </li>
    );
}

function QuestionForm({
    programmeId,
    roundId,
    question,
    onDone,
}: {
    programmeId: string;
    roundId: string;
    question?: QuizAdminQuestion;
    onDone?: () => void;
}) {
    const { run, pending } = useRun();
    const key = question?.id ?? `new-${roundId}`;
    const [kind, setKind] = useState<"team" | "audience">(question?.kind ?? "team");
    const [qEn, setQEn] = useState(question?.question_en ?? "");
    const [qBn, setQBn] = useState(question?.question_bn ?? "");
    const [aEn, setAEn] = useState(question?.answer_en ?? "");
    const [aBn, setABn] = useState(question?.answer_bn ?? "");

    return (
        <form
            className="grid gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                run(
                    () =>
                        saveQuestion({
                            id: question?.id,
                            roundId,
                            programmeId,
                            kind,
                            question_en: qEn,
                            question_bn: qBn,
                            answer_en: aEn,
                            answer_bn: aBn,
                        }),
                    question ? "Question saved" : "Question added",
                );
                if (!question) {
                    setQEn("");
                    setQBn("");
                    setAEn("");
                    setABn("");
                }
                onDone?.();
            }}
        >
            <div className="grid gap-1.5 sm:max-w-xs">
                <Label htmlFor={`qk-${key}`}>Asked to</Label>
                <select
                    id={`qk-${key}`}
                    className={selectClass}
                    value={kind}
                    onChange={(e) => setKind(e.target.value as "team" | "audience")}
                >
                    <option value="team">A team</option>
                    <option value="audience">The audience</option>
                </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                    <Label htmlFor={`qe-${key}`}>Question (English)</Label>
                    <Textarea
                        id={`qe-${key}`}
                        rows={2}
                        value={qEn}
                        onChange={(e) => setQEn(e.target.value)}
                        required
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`qb-${key}`}>Question (বাংলা)</Label>
                    <Textarea
                        id={`qb-${key}`}
                        rows={2}
                        value={qBn}
                        onChange={(e) => setQBn(e.target.value)}
                    />
                    <FieldTranslateButton from={`qe-${key}`} to={`qb-${key}`} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`ae-${key}`}>Answer (English)</Label>
                    <Input
                        id={`ae-${key}`}
                        value={aEn}
                        onChange={(e) => setAEn(e.target.value)}
                        required
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`ab-${key}`}>Answer (বাংলা)</Label>
                    <Input id={`ab-${key}`} value={aBn} onChange={(e) => setABn(e.target.value)} />
                    <FieldTranslateButton from={`ae-${key}`} to={`ab-${key}`} />
                </div>
            </div>
            <div>
                <Button type="submit" size="sm" disabled={pending}>
                    {question ? "Save question" : "Add question"}
                </Button>
            </div>
        </form>
    );
}
