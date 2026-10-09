import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Alpana } from "@/components/decor/alpana";
import { PageHeader } from "@/components/layout/page-header";
import { pick } from "@/lib/localize";
import { listEditionSummaries } from "@/lib/queries";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
    const t = await getTranslations("archive");
    return { title: t("title"), description: t("description") };
}

export default async function ArchivePage() {
    const [t, locale, format, editions] = await Promise.all([
        getTranslations("archive"),
        getLocale(),
        getFormatter(),
        listEditionSummaries(),
    ]);
    const year = (y: number) => format.number(y, { useGrouping: false });
    const day = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short" });

    return (
        <>
            <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
            <div className="mx-auto max-w-5xl px-4 pt-12">
                {editions.length <= 1 && (
                    <p className="mb-8 rounded-2xl bg-secondary/60 p-4 text-sm">{t("onlyOne")}</p>
                )}
                <ul className="grid gap-5 sm:grid-cols-2">
                    {editions.map((edition) => (
                        <li key={edition.year}>
                            <Link
                                href={edition.is_current ? "/" : `/archive/${edition.year}`}
                                className={cn(
                                    "group relative block overflow-hidden rounded-3xl border bg-card p-6 transition-colors hover:border-marigold/70",
                                    edition.is_current &&
                                        "border-primary/40 bg-gradient-to-br from-card to-marigold/10",
                                )}
                            >
                                <Alpana className="absolute -top-16 -right-16 size-48 text-marigold/15 transition-transform duration-700 group-hover:rotate-45" />
                                <div className="relative">
                                    <div className="flex items-center gap-3">
                                        <span className="text-gradient-puja font-heading text-5xl font-bold tabular-nums">
                                            {year(edition.year)}
                                        </span>
                                        {edition.is_current && (
                                            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                                                {t("thisYear")}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2 font-medium">
                                        {pick(locale, edition.name_en, edition.name_bn)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {day(edition.shashthi)} – {day(edition.dashami)}
                                        {edition.venue && ` · ${edition.venue}`}
                                    </p>
                                    <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                                        {(
                                            [
                                                ["programmes", edition.programmes],
                                                ["participants", edition.participants],
                                                ["drawings", edition.drawings],
                                            ] as const
                                        ).map(([key, value]) => (
                                            <div
                                                key={key}
                                                className="rounded-xl bg-secondary/60 py-2"
                                            >
                                                <dd className="font-heading text-xl font-semibold tabular-nums">
                                                    {format.number(value)}
                                                </dd>
                                                <dt className="text-[11px] text-muted-foreground">
                                                    {t(`stats.${key}`)}
                                                </dt>
                                            </div>
                                        ))}
                                    </dl>
                                    <p className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                                        {edition.is_current ? t("goLive") : t("open")}
                                        <HugeiconsIcon
                                            icon={ArrowRight01Icon}
                                            className="size-4 transition-transform group-hover:translate-x-0.5"
                                        />
                                    </p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}
