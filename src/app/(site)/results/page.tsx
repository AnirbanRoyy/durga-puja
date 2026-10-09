import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, CrownIcon } from "@hugeicons/core-free-icons";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/programmes/status-badge";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import { pick } from "@/lib/localize";
import { resultStatus, TYPE_ICON, type ResultStatus } from "@/lib/programme-meta";
import { listAllResults, listProgrammes } from "@/lib/queries";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
    const t = await getTranslations("results");
    return { title: t("title") };
}

const ORDER: ResultStatus[] = ["completed", "pending", "cancelled"];

export default async function ResultsPage() {
    const [t, locale, format, programmes, results] = await Promise.all([
        getTranslations("results"),
        getLocale(),
        getFormatter(),
        listProgrammes(),
        listAllResults(),
    ]);

    const winners = new Map(
        results.filter((r) => r.position === 1).map((r) => [r.programme_id, r.name]),
    );
    const counts = Object.fromEntries(
        ORDER.map((s) => [s, programmes.filter((p) => resultStatus(p.status) === s).length]),
    ) as Record<ResultStatus, number>;

    return (
        <>
            <LiveRefresh tables={["programmes", "results"]} />
            <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
                <div className="flex flex-wrap gap-3">
                    {ORDER.map((s) => (
                        <div
                            key={s}
                            className="rounded-2xl border bg-card/80 px-4 py-2.5 backdrop-blur"
                        >
                            <p className="font-heading text-2xl font-semibold tabular-nums">
                                {counts[s]}
                            </p>
                            <p className="text-xs text-muted-foreground">{t(`summary.${s}`)}</p>
                        </div>
                    ))}
                </div>
            </PageHeader>

            <div className="mx-auto max-w-4xl px-4 pt-10">
                <ul className="space-y-3">
                    {[...programmes]
                        .sort(
                            (a, b) =>
                                ORDER.indexOf(resultStatus(a.status)) -
                                ORDER.indexOf(resultStatus(b.status)),
                        )
                        .map((p) => {
                            const status = resultStatus(p.status);
                            const winner = winners.get(p.id);
                            const body = (
                                <>
                                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                                        <HugeiconsIcon
                                            icon={TYPE_ICON[p.type]}
                                            className="size-5"
                                        />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">
                                            {pick(locale, p.title_en, p.title_bn)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {p.starts_at &&
                                                format.dateTime(new Date(p.starts_at), {
                                                    weekday: "short",
                                                    day: "numeric",
                                                    month: "short",
                                                })}
                                            {winner && (
                                                <span className="ml-2 inline-flex items-center gap-1 font-medium text-gold">
                                                    <HugeiconsIcon
                                                        icon={CrownIcon}
                                                        className="size-3.5"
                                                    />
                                                    {winner}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <StatusBadge status={status} />
                                    {status === "completed" && (
                                        <HugeiconsIcon
                                            icon={ArrowRight01Icon}
                                            className="size-4 text-primary"
                                        />
                                    )}
                                </>
                            );
                            const className = cn(
                                "flex items-center gap-4 rounded-2xl border bg-card p-4",
                                status === "completed" &&
                                    "transition-colors hover:border-marigold/60",
                                status === "cancelled" && "opacity-70",
                            );
                            return (
                                <li key={p.id}>
                                    {status === "completed" ? (
                                        <Link
                                            href={`/programmes/${p.slug}/results`}
                                            className={className}
                                        >
                                            {body}
                                        </Link>
                                    ) : (
                                        <div className={className}>{body}</div>
                                    )}
                                </li>
                            );
                        })}
                </ul>
                <Link
                    href="/archive"
                    className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                    {t("pastYears")}
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                </Link>
            </div>
        </>
    );
}
