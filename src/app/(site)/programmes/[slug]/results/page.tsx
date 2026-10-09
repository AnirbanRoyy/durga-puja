import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { CrownIcon, Medal01Icon } from "@hugeicons/core-free-icons";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/programmes/status-badge";
import { buildInsights, type LeaderboardEntry } from "@/lib/insights";
import { pick } from "@/lib/localize";
import { resultStatus } from "@/lib/programme-meta";
import { getProgrammeBySlug } from "@/lib/queries";
import { cn } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/programmes/[slug]/results">) {
    const { slug } = await props.params;
    const [programme, locale, t] = await Promise.all([
        getProgrammeBySlug(slug),
        getLocale(),
        getTranslations("results"),
    ]);
    return {
        title: programme
            ? `${pick(locale, programme.title_en, programme.title_bn)} · ${t("title")}`
            : undefined,
    };
}

export default async function ResultDetailPage(props: PageProps<"/programmes/[slug]/results">) {
    const { slug } = await props.params;
    const programme = await getProgrammeBySlug(slug);
    if (!programme) notFound();

    const [t, locale] = await Promise.all([getTranslations("results"), getLocale()]);
    const title = pick(locale, programme.title_en, programme.title_bn);
    const status = resultStatus(programme.status);

    if (status !== "completed") {
        return (
            <>
                <PageHeader title={title}>
                    <StatusBadge status={status} />
                </PageHeader>
                <div className="mx-auto max-w-4xl px-4 pt-8">
                    <p className="mt-6 text-muted-foreground">
                        {status === "cancelled"
                            ? (programme.admin_notes ?? t("cancelledHint"))
                            : t("pendingHint")}
                    </p>
                </div>
            </>
        );
    }

    const { insights, leaderboard } = await buildInsights(programme);
    const podium = leaderboard.filter((e) => e.position <= 3);
    const rest = leaderboard.filter((e) => e.position > 3);

    return (
        <>
            <PageHeader eyebrow={t("eyebrow")} title={title}>
                <StatusBadge status="completed" />
            </PageHeader>
            <div className="mx-auto max-w-4xl px-4 pt-8">
                <section className="mt-6">
                    <h2 className="text-2xl font-semibold">{t("insights")}</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {insights.map((i) => (
                            <div key={i.key} className="rounded-2xl border bg-card p-4">
                                <p className="font-heading text-3xl font-semibold text-primary tabular-nums">
                                    {i.key === "duration"
                                        ? t("minutes", { n: Number(i.value) })
                                        : i.value}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t(`insight.${i.key}`)}
                                </p>
                            </div>
                        ))}
                    </div>
                    {programme.admin_notes && (
                        <p className="mt-4 rounded-2xl bg-secondary/60 p-4 text-sm whitespace-pre-line">
                            {programme.admin_notes}
                        </p>
                    )}
                </section>

                <section className="mt-12">
                    <h2 className="text-2xl font-semibold">{t("leaderboard")}</h2>
                    {leaderboard.length === 0 ? (
                        <p className="mt-3 text-muted-foreground">{t("noLeaderboard")}</p>
                    ) : (
                        <>
                            <Podium entries={podium} />
                            {rest.length > 0 && (
                                <ol className="mt-6 divide-y rounded-2xl border bg-card">
                                    {rest.map((e) => (
                                        <li
                                            key={`${e.position}-${e.name}`}
                                            className="flex items-center gap-4 px-4 py-3"
                                        >
                                            <span className="w-8 font-heading font-semibold text-muted-foreground tabular-nums">
                                                #{e.position}
                                            </span>
                                            <span className="flex-1 font-medium">{e.name}</span>
                                            {e.remark && (
                                                <span className="hidden text-sm text-muted-foreground sm:inline">
                                                    {e.remark}
                                                </span>
                                            )}
                                            {e.score && (
                                                <span className="font-semibold tabular-nums">
                                                    {e.score}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </>
                    )}
                </section>
            </div>
        </>
    );
}

const PODIUM_STYLE: Record<number, string> = {
    1: "sm:order-2 bg-gradient-to-b from-gold to-marigold text-maroon sm:-mt-6",
    2: "sm:order-1 bg-secondary",
    3: "sm:order-3 bg-secondary",
};

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
    return (
        <div className="mt-8 grid gap-3 sm:grid-cols-3 sm:items-end">
            {entries.map((e) => (
                <div
                    key={`${e.position}-${e.name}`}
                    className={cn(
                        "rounded-3xl p-6 text-center shadow-sm",
                        PODIUM_STYLE[e.position],
                    )}
                >
                    <HugeiconsIcon
                        icon={e.position === 1 ? CrownIcon : Medal01Icon}
                        className={cn(
                            "mx-auto",
                            e.position === 1 ? "size-10" : "size-7 text-primary",
                        )}
                    />
                    <p className="mt-2 font-heading text-4xl font-bold">#{e.position}</p>
                    <p className="mt-1 text-lg font-semibold">{e.name}</p>
                    {(e.score || e.remark) && (
                        <p className="mt-1 text-sm opacity-75">
                            {[e.score, e.remark].filter(Boolean).join(" · ")}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}
