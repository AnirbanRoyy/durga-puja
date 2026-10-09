import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowLeft01Icon,
    ArrowRight01Icon,
    Archive02Icon,
    ArrowDown01Icon,
    Location01Icon,
} from "@hugeicons/core-free-icons";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/programmes/status-badge";
import type { Programme } from "@/lib/database.types";
import { pick } from "@/lib/localize";
import { TYPE_ICON } from "@/lib/programme-meta";
import { getYearSnapshot, listEditions } from "@/lib/queries";

const MEDALS = ["🥇", "🥈", "🥉"];

async function loadYear(param: string) {
    const year = Number(param);
    if (!/^\d{4}$/.test(param) || !Number.isInteger(year)) return null;
    return getYearSnapshot(year);
}

export async function generateMetadata(props: PageProps<"/archive/[year]">) {
    const { year } = await props.params;
    const [t, snapshot] = await Promise.all([getTranslations("archive"), loadYear(year)]);
    if (!snapshot) return {};
    return {
        title: t("yearTitle", { year }),
        description: t("yearDescription", { year }),
    };
}

export default async function ArchiveYearPage(props: PageProps<"/archive/[year]">) {
    const { year: param } = await props.params;
    const snapshot = await loadYear(param);
    if (!snapshot) notFound();

    const [t, locale, format, editions] = await Promise.all([
        getTranslations("archive"),
        getLocale(),
        getFormatter(),
        listEditions(),
    ]);
    const { edition, programmes, registrations, results, drawings } = snapshot;
    const yearLabel = (y: number) => format.number(y, { useGrouping: false });
    const day = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "long" });
    const title = (p: Programme) => pick(locale, p.title_en, p.title_bn);

    const current = editions.find((e) => e.is_current);
    const years = editions.map((e) => e.year).sort((a, b) => a - b);
    const index = years.indexOf(edition.year);
    const prev = index > 0 ? years[index - 1] : null;
    const next = index < years.length - 1 ? years[index + 1] : null;

    const byProgramme = <T extends { programme_id: string }>(rows: T[]) => {
        const map = new Map<string, T[]>();
        for (const row of rows)
            map.set(row.programme_id, [...(map.get(row.programme_id) ?? []), row]);
        return map;
    };
    const resultsBy = byProgramme(results);
    const peopleBy = byProgramme(registrations);
    const drawingsBy = byProgramme(drawings);
    const withResults = programmes.filter((p) => resultsBy.has(p.id));
    const drawingProgrammes = programmes.filter((p) => drawingsBy.has(p.id));

    const stats = [
        ["programmes", programmes.filter((p) => p.status !== "cancelled").length],
        ["participants", registrations.length],
        ["winners", results.filter((r) => r.position <= 3).length],
        ["drawings", drawings.length],
    ] as const;

    return (
        <>
            <PageHeader
                eyebrow={pick(locale, edition.name_en, edition.name_bn)}
                title={t("yearTitle", { year: yearLabel(edition.year) })}
            >
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                    <span>
                        {day(edition.shashthi)} – {day(edition.dashami)}
                    </span>
                    {edition.venue && (
                        <span className="inline-flex items-center gap-1">
                            <HugeiconsIcon icon={Location01Icon} className="size-4" />
                            {edition.venue}
                        </span>
                    )}
                </p>
                <dl className="mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                    {stats.map(([key, value]) => (
                        <div
                            key={key}
                            className="rounded-2xl border bg-card/80 px-4 py-3 backdrop-blur"
                        >
                            <dd className="font-heading text-3xl font-semibold tabular-nums">
                                {format.number(value)}
                            </dd>
                            <dt className="text-xs text-muted-foreground">{t(`stats.${key}`)}</dt>
                        </div>
                    ))}
                </dl>
            </PageHeader>

            <div className="mx-auto max-w-5xl space-y-16 px-4 pt-8">
                {edition.is_current ? (
                    <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-marigold/15 p-4 text-sm">
                        {t("isCurrent")}
                        <Link href="/" className="font-semibold text-primary underline">
                            {t("goLive")}
                        </Link>
                    </p>
                ) : (
                    <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-secondary/70 p-4 text-sm">
                        <HugeiconsIcon icon={Archive02Icon} className="size-4.5 text-primary" />
                        {t("viewingPast", { year: yearLabel(edition.year) })}
                        {current && (
                            <Link href="/" className="font-semibold text-primary underline">
                                {t("backToCurrent", { year: yearLabel(current.year) })}
                            </Link>
                        )}
                    </p>
                )}

                <section>
                    <h2 className="text-3xl font-semibold">{t("winnersTitle")}</h2>
                    {withResults.length ? (
                        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {withResults.map((p) => (
                                <li key={p.id} className="rounded-3xl border bg-card p-5">
                                    <p className="flex items-center gap-2 font-semibold">
                                        <HugeiconsIcon
                                            icon={TYPE_ICON[p.type]}
                                            className="size-4.5 text-primary"
                                        />
                                        {title(p)}
                                    </p>
                                    <ol className="mt-4 space-y-2">
                                        {resultsBy.get(p.id)!.map((r) => (
                                            <li key={r.id} className="flex items-baseline gap-2.5">
                                                <span className="w-6 text-lg">
                                                    {MEDALS[r.position - 1] ?? `${r.position}.`}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="font-medium">{r.name}</span>
                                                    {(r.score || r.remark) && (
                                                        <span className="block text-xs text-muted-foreground">
                                                            {[r.score, r.remark]
                                                                .filter(Boolean)
                                                                .join(" · ")}
                                                        </span>
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ol>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-4 text-muted-foreground">{t("noWinners")}</p>
                    )}
                </section>

                {drawingProgrammes.map((p) => (
                    <section key={p.id}>
                        <h2 className="text-3xl font-semibold">{title(p)}</h2>
                        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {drawingsBy.get(p.id)!.map((d) => (
                                <li
                                    key={d.id}
                                    className="overflow-hidden rounded-2xl border bg-card"
                                >
                                    <a href={d.image_url} target="_blank" rel="noopener noreferrer">
                                        <Image
                                            src={d.image_url}
                                            alt={d.title ?? d.child_name}
                                            width={d.width ?? 600}
                                            height={d.height ?? 600}
                                            sizes="(min-width: 1024px) 240px, 50vw"
                                            className="aspect-square w-full object-cover"
                                        />
                                    </a>
                                    <div className="p-3">
                                        <p className="truncate text-sm font-medium">
                                            {d.child_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {t("votes", { count: d.vote_count })}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}

                <section>
                    <h2 className="text-3xl font-semibold">{t("programmesTitle")}</h2>
                    <ul className="mt-6 space-y-3">
                        {programmes.map((p) => {
                            const people = peopleBy.get(p.id) ?? [];
                            return (
                                <li key={p.id}>
                                    <details className="group rounded-2xl border bg-card">
                                        <summary className="flex cursor-pointer list-none items-center gap-4 p-4 [&::-webkit-details-marker]:hidden">
                                            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                                                <HugeiconsIcon
                                                    icon={TYPE_ICON[p.type]}
                                                    className="size-5"
                                                />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-semibold">
                                                    {title(p)}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {p.starts_at &&
                                                        `${format.dateTime(new Date(p.starts_at), {
                                                            weekday: "short",
                                                            day: "numeric",
                                                            month: "short",
                                                        })} · `}
                                                    {t("participants", { count: people.length })}
                                                </span>
                                            </span>
                                            <StatusBadge status={p.status} />
                                            <HugeiconsIcon
                                                icon={ArrowDown01Icon}
                                                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                                            />
                                        </summary>
                                        <div className="border-t px-4 py-3">
                                            {people.length ? (
                                                <ol className="columns-2 gap-6 text-sm sm:columns-3">
                                                    {people.map((r, i) => (
                                                        <li key={r.id} className="py-0.5">
                                                            <span className="mr-1.5 text-muted-foreground tabular-nums">
                                                                {format.number(i + 1)}.
                                                            </span>
                                                            {r.name}
                                                        </li>
                                                    ))}
                                                </ol>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    {t("noParticipants")}
                                                </p>
                                            )}
                                        </div>
                                    </details>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <nav className="flex items-center justify-between gap-4 border-t pt-6">
                    {prev ? (
                        <Link
                            href={`/archive/${prev}`}
                            className="inline-flex items-center gap-1.5 font-medium text-primary"
                        >
                            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                            {yearLabel(prev)}
                        </Link>
                    ) : (
                        <span />
                    )}
                    <Link href="/archive" className="text-sm text-muted-foreground underline">
                        {t("allYears")}
                    </Link>
                    {next ? (
                        <Link
                            href={`/archive/${next}`}
                            className="inline-flex items-center gap-1.5 font-medium text-primary"
                        >
                            {yearLabel(next)}
                            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                        </Link>
                    ) : (
                        <span />
                    )}
                </nav>
            </div>
        </>
    );
}
