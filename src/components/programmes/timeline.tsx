import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon } from "@hugeicons/core-free-icons";
import { StatusBadge } from "@/components/programmes/status-badge";
import type { Programme } from "@/lib/database.types";
import { pick } from "@/lib/localize";
import { istDateKey, pujaDayDates, TYPE_ICON, type PujaDay } from "@/lib/programme-meta";
import { cn } from "@/lib/utils";

const noonIst = (date: string) => new Date(`${date}T12:00:00+05:30`);

type DayGroup = { date: string; day: PujaDay | null; programmes: Programme[] };

function groupByDay(programmes: Programme[], shashthi: string): DayGroup[] {
    const dayByDate = new Map(pujaDayDates(shashthi).map((d) => [d.date, d.day]));
    const groups = new Map<string, Programme[]>();
    for (const p of programmes) {
        if (!p.starts_at) continue;
        const key = istDateKey(p.starts_at);
        groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, items]) => ({ date, day: dayByDate.get(date) ?? null, programmes: items }));
}

export function Timeline({
    programmes,
    shashthi,
    compact = false,
}: {
    programmes: Programme[];
    shashthi: string;
    compact?: boolean;
}) {
    const t = useTranslations("timeline");
    const days = useTranslations("pujaDays");
    const locale = useLocale();
    const format = useFormatter();
    const groups = groupByDay(programmes, shashthi);

    if (groups.length === 0) {
        return <p className="text-muted-foreground">{t("empty")}</p>;
    }

    return (
        <ol className="relative space-y-10">
            {groups.map((group) => (
                <li key={group.date} className="relative">
                    <div className="mb-4 flex items-baseline gap-3">
                        <h3 className="font-heading text-2xl font-semibold text-primary">
                            {group.day
                                ? days(group.day)
                                : format.dateTime(noonIst(group.date), { weekday: "long" })}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                            {format.dateTime(noonIst(group.date), {
                                day: "numeric",
                                month: "long",
                            })}
                        </span>
                    </div>
                    <ol className="relative ml-3 space-y-4 border-l-2 border-dashed border-marigold/50 pl-7">
                        {group.programmes.map((p) => (
                            <li key={p.id} className="relative">
                                <span
                                    className={cn(
                                        "absolute top-3 -left-[39px] grid size-5 place-items-center rounded-full border-2 border-background bg-marigold",
                                        p.status === "ongoing" &&
                                            "bg-sindoor ring-4 ring-sindoor/25",
                                        p.status === "completed" && "bg-success",
                                        p.status === "cancelled" && "bg-muted-foreground",
                                    )}
                                />
                                <Link
                                    href={`/programmes/${p.slug}`}
                                    className={cn(
                                        "flex items-start gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-marigold/60",
                                        p.status === "ongoing" &&
                                            "border-sindoor/50 shadow-lg shadow-sindoor/10",
                                    )}
                                >
                                    {!compact && (
                                        <span className="hidden size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary sm:grid">
                                            <HugeiconsIcon
                                                icon={TYPE_ICON[p.type]}
                                                className="size-5"
                                            />
                                        </span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-primary tabular-nums">
                                                {format.dateTime(new Date(p.starts_at!), {
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                                {p.ends_at &&
                                                    ` – ${format.dateTime(new Date(p.ends_at), {
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    })}`}
                                            </span>
                                            <StatusBadge status={p.status} />
                                            {p.status === "ongoing" && (
                                                <span className="text-xs font-semibold text-sindoor">
                                                    ● {t("happeningNow")}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 font-semibold">
                                            {pick(locale, p.title_en, p.title_bn)}
                                        </p>
                                        {!compact && p.venue && (
                                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                <HugeiconsIcon
                                                    icon={Location01Icon}
                                                    className="size-3.5"
                                                />
                                                {p.venue}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ol>
                </li>
            ))}
        </ol>
    );
}
