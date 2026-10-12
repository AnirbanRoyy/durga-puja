import { getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { Award01Icon } from "@hugeicons/core-free-icons";
import type { Standings } from "@/lib/musical-chair-standings";
import { cn } from "@/lib/utils";

/** Live standings: updates whenever the host saves who is out (the page refreshes on round changes). */
export async function MusicalChairLeaderboard({
    title,
    standings,
    finished,
}: Readonly<{
    title: string;
    standings: Standings;
    finished: boolean;
}>) {
    const t = await getTranslations("musicalChair.leaderboard");
    const { stillIn, out } = standings;
    if (!stillIn.length && !out.length) return null;

    return (
        <section aria-live="polite">
            <h2 className="text-2xl font-semibold">
                {t("title")} · {title}
            </h2>
            {finished && <p className="mt-1 text-sm text-muted-foreground">{t("finished")}</p>}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0 rounded-2xl border bg-card p-4">
                    <h3 className="text-sm font-semibold tracking-wide text-success uppercase">
                        {t("stillIn", { count: stillIn.length })}
                    </h3>
                    {stillIn.length ? (
                        <ul className="mt-3 space-y-1.5">
                            {stillIn.map((name) => (
                                <li key={name} className="truncate text-sm font-medium">
                                    {name}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-3 text-sm text-muted-foreground">{t("nobodyLeft")}</p>
                    )}
                </div>
                <div className="min-w-0 rounded-2xl border bg-card p-4">
                    <h3 className="text-sm font-semibold tracking-wide text-sindoor uppercase">
                        {t("out", { count: out.length })}
                    </h3>
                    {out.length ? (
                        <ol className="mt-3 space-y-1.5">
                            {out.map((p) => (
                                <li
                                    key={`${p.round}-${p.name}`}
                                    className="flex items-center gap-2"
                                >
                                    <span
                                        className={cn(
                                            "grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold tabular-nums",
                                            p.place <= 3 && "bg-gold/30",
                                        )}
                                    >
                                        {p.place <= 3 ? (
                                            <HugeiconsIcon
                                                icon={Award01Icon}
                                                className="size-3.5"
                                            />
                                        ) : (
                                            p.place
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                        {p.name}
                                    </span>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {t("round", { n: p.round })}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="mt-3 text-sm text-muted-foreground">{t("nobodyOut")}</p>
                    )}
                </div>
            </div>
        </section>
    );
}
