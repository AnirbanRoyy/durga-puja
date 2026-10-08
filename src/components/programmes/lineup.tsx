import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mic01Icon, ShuffleIcon } from "@hugeicons/core-free-icons";
import type { Registration } from "@/lib/database.types";
import { cn } from "@/lib/utils";

/** Public call order for singing / dance. Shows the shuffled order once the organiser draws it. */
export function Lineup({
    registrations,
    locked,
}: {
    registrations: Registration[];
    locked: boolean;
}) {
    const t = useTranslations("lineup");
    const ordered = registrations.filter((r) => r.sequence_no !== null);
    const onStage = ordered.find((r) => r.performance_status === "on_stage");
    const upNext = ordered.find(
        (r) =>
            r.performance_status === "waiting" &&
            (!onStage || r.sequence_no! > onStage.sequence_no!),
    );

    return (
        <section>
            <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-2xl font-semibold">{t("title")}</h2>
                {ordered.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                        {locked ? t("locked") : t("provisional")}
                    </span>
                )}
            </div>

            {ordered.length === 0 ? (
                <div className="mt-4 flex items-center gap-4 rounded-2xl border border-dashed p-6">
                    <HugeiconsIcon icon={ShuffleIcon} className="size-8 shrink-0 text-marigold" />
                    <p className="text-sm text-muted-foreground">
                        {t("notDrawn", { count: registrations.length })}
                    </p>
                </div>
            ) : (
                <>
                    {onStage && (
                        <div className="mt-4 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-sindoor to-marigold p-5 text-primary-foreground shadow-lg shadow-sindoor/20">
                            <HugeiconsIcon
                                icon={Mic01Icon}
                                className="size-8 shrink-0 animate-dhak"
                            />
                            <div>
                                <p className="text-xs font-semibold tracking-widest uppercase opacity-80">
                                    {t("onStage")}
                                </p>
                                <p className="font-heading text-2xl font-semibold">
                                    {onStage.name}
                                </p>
                            </div>
                            {upNext && (
                                <div className="ml-auto text-right">
                                    <p className="text-xs opacity-80">{t("upNext")}</p>
                                    <p className="font-semibold">{upNext.name}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                        {ordered.map((r) => (
                            <li
                                key={r.id}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl border bg-card px-4 py-3",
                                    r.performance_status === "on_stage" &&
                                        "border-sindoor bg-sindoor/5",
                                    r.id === upNext?.id && "border-marigold",
                                    (r.performance_status === "done" ||
                                        r.performance_status === "absent") &&
                                        "opacity-55",
                                )}
                            >
                                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-heading font-semibold tabular-nums">
                                    {r.sequence_no}
                                </span>
                                <span
                                    className={cn(
                                        "flex-1 font-medium",
                                        r.performance_status === "absent" && "line-through",
                                    )}
                                >
                                    {r.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {r.performance_status !== "waiting" &&
                                        t(`status.${r.performance_status}`)}
                                    {r.id === upNext?.id && t("upNext")}
                                </span>
                            </li>
                        ))}
                    </ol>
                </>
            )}
        </section>
    );
}
