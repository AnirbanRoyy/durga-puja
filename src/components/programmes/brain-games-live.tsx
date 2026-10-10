import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import type { QuizQuestion } from "@/lib/database.types";
import { pick } from "@/lib/localize";
import { getQuizBoard } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * The public face of the brain games: the question on screen right now, the live leaderboard and
 * every earlier question with its answer. Re-renders itself whenever the host moves things along.
 */
export async function BrainGamesLive({ programmeId }: { programmeId: string }) {
    const [t, locale, format, board] = await Promise.all([
        getTranslations("quiz"),
        getLocale(),
        getFormatter(),
        getQuizBoard(programmeId),
    ]);
    const { rounds, questions, live, leaderboard } = board;
    const teamName = (id: string | null) =>
        leaderboard.find((team) => team.id === id)?.name ?? null;
    const roundOf = (q: QuizQuestion) => rounds.find((r) => r.id === q.round_id);
    const revealed = questions.filter((q) => q.state === "revealed");
    const signed = (n: number) => (n > 0 ? `+${format.number(n)}` : format.number(n));

    const latest =
        [...revealed].sort((a, b) => (b.revealed_at ?? "").localeCompare(a.revealed_at ?? ""))[0] ??
        null;

    const history = rounds
        .map((round) => ({
            round,
            items: revealed
                .filter((q) => q.round_id === round.id)
                .sort((a, b) => (b.revealed_at ?? "").localeCompare(a.revealed_at ?? "")),
        }))
        .filter((group) => group.items.length)
        .reverse();

    return (
        <div className="space-y-10">
            <LiveRefresh
                tables={["quiz_rounds", "quiz_questions"]}
                filter={`programme_id=eq.${programmeId}`}
            />

            <section aria-live="polite">
                <h2 className="text-2xl font-semibold">{t("liveTitle")}</h2>
                {live ? (
                    <div className="mt-4 overflow-hidden rounded-3xl border-2 border-marigold/60 bg-card shadow-lg">
                        <div className="flex flex-wrap items-center gap-2 bg-marigold/20 px-5 py-2.5 text-sm font-semibold">
                            <span className="relative flex size-2.5">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sindoor opacity-75" />
                                <span className="relative inline-flex size-2.5 rounded-full bg-sindoor" />
                            </span>
                            {pick(locale, roundOf(live)?.name_en ?? "", roundOf(live)?.name_bn)}
                            <span className="ml-auto text-muted-foreground">
                                {live.kind === "team"
                                    ? t("forTeam", { team: teamName(live.team_id) ?? "—" })
                                    : t("forAudience")}
                            </span>
                        </div>
                        <p className="px-5 py-8 text-center font-heading text-3xl leading-snug font-semibold sm:text-4xl">
                            {pick(locale, live.question_en, live.question_bn)}
                        </p>
                        <p className="border-t px-5 py-3 text-center text-sm text-muted-foreground">
                            {t("answerSoon")}
                        </p>
                    </div>
                ) : (
                    <p className="mt-3 rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
                        {revealed.length ? t("waitingNext") : t("notStarted")}
                    </p>
                )}
            </section>

            {latest && !live && (
                <LatestReveal
                    question={latest}
                    locale={locale}
                    team={teamName(latest.team_id)}
                    labels={{
                        title: t("justRevealed"),
                        answer: t("answerLabel"),
                        correct: t("correct"),
                        wrong: t("wrong"),
                    }}
                    points={signed}
                />
            )}

            <section>
                <h2 className="text-2xl font-semibold">{t("leaderboard")}</h2>
                {leaderboard.length ? (
                    <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                        {leaderboard.map((team, i) => (
                            <li
                                key={team.id}
                                className={cn(
                                    "flex items-center gap-3 rounded-2xl border bg-card px-4 py-3",
                                    i === 0 && team.points > 0 && "border-gold bg-gold/10",
                                )}
                            >
                                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold tabular-nums">
                                    {format.number(i + 1)}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-medium">
                                    {team.name}
                                </span>
                                <span className="font-heading text-2xl font-semibold tabular-nums">
                                    {format.number(team.points)}
                                </span>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="mt-3 text-muted-foreground">{t("noTeams")}</p>
                )}
            </section>

            {history.length > 0 && (
                <section>
                    <h2 className="text-2xl font-semibold">{t("previous")}</h2>
                    <div className="mt-4 space-y-8">
                        {history.map(({ round, items }) => (
                            <div key={round.id}>
                                <h3 className="text-sm font-semibold tracking-widest text-primary uppercase">
                                    {pick(locale, round.name_en, round.name_bn)}
                                </h3>
                                <ul className="mt-3 space-y-3">
                                    {items.map((q) => (
                                        <li key={q.id} className="rounded-2xl border bg-card p-4">
                                            <p className="font-medium">
                                                {pick(locale, q.question_en, q.question_bn)}
                                            </p>
                                            <p className="mt-1.5 text-sm">
                                                <span className="text-muted-foreground">
                                                    {t("answerLabel")}:{" "}
                                                </span>
                                                <span className="font-semibold">
                                                    {pick(
                                                        locale,
                                                        q.revealed_answer_en ?? "",
                                                        q.revealed_answer_bn,
                                                    )}
                                                </span>
                                            </p>
                                            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                {q.kind === "team" ? (
                                                    <>
                                                        <span>{teamName(q.team_id) ?? "—"}</span>
                                                        <span
                                                            className={cn(
                                                                "rounded-full px-2 py-0.5 font-semibold",
                                                                q.outcome === "correct"
                                                                    ? "bg-success/15 text-success"
                                                                    : "bg-destructive/10 text-destructive",
                                                            )}
                                                        >
                                                            {q.outcome === "correct" ? "✓" : "✗"}{" "}
                                                            {signed(q.points_awarded ?? 0)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span>{t("forAudience")}</span>
                                                )}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function LatestReveal({
    question,
    locale,
    team,
    labels,
    points,
}: {
    question: QuizQuestion;
    locale: string;
    team: string | null;
    labels: { title: string; answer: string; correct: string; wrong: string };
    points: (n: number) => string;
}) {
    const verdict =
        question.outcome === "correct"
            ? labels.correct
            : question.outcome === "wrong"
              ? labels.wrong
              : null;
    return (
        <section>
            <h2 className="text-2xl font-semibold">{labels.title}</h2>
            <div
                className={cn(
                    "mt-4 rounded-3xl border-2 p-6 text-center",
                    question.outcome === "correct" && "border-success/60 bg-success/10",
                    question.outcome === "wrong" && "border-destructive/50 bg-destructive/5",
                    question.outcome === null && "border-marigold/60 bg-marigold/10",
                )}
            >
                <p className="text-muted-foreground">
                    {pick(locale, question.question_en, question.question_bn)}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{labels.answer}</p>
                <p className="font-heading text-3xl font-semibold sm:text-4xl">
                    {pick(locale, question.revealed_answer_en ?? "", question.revealed_answer_bn)}
                </p>
                {verdict && (
                    <p className="mt-3 font-semibold">
                        {team && <span>{team} · </span>}
                        {verdict}{" "}
                        {question.points_awarded != null && `(${points(question.points_awarded)})`}
                    </p>
                )}
            </div>
        </section>
    );
}
