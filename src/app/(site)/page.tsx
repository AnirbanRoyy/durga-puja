import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowRight01Icon,
    Calendar03Icon,
    HeadphonesIcon,
    QrCodeIcon,
    StarIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Alpana } from "@/components/decor/alpana";
import { KashFlowers } from "@/components/decor/kash-flowers";
import { OrnamentDivider } from "@/components/decor/ornament-divider";
import { Trinayan } from "@/components/decor/trinayan";
import { Countdown } from "@/components/home/countdown";
import { ProgrammeCard } from "@/components/programmes/programme-card";
import { Timeline } from "@/components/programmes/timeline";
import { pick } from "@/lib/localize";
import { countRegistrationsByProgramme, getEventSettings, listProgrammes } from "@/lib/queries";

export default async function HomePage() {
    const [t, locale, event, programmes, counts] = await Promise.all([
        getTranslations("home"),
        getLocale(),
        getEventSettings(),
        listProgrammes(),
        countRegistrationsByProgramme(),
    ]);

    const active = programmes.filter((p) => p.status !== "cancelled");
    const ongoing = active.find((p) => p.status === "ongoing");
    const upNext = active.find((p) => p.status === "upcoming");
    const featured = active.filter((p) => p.type !== "other").slice(0, 4);

    return (
        <>
            {/* Hero */}
            <section className="bg-puja-radial relative overflow-hidden">
                <KashFlowers />
                <Alpana className="absolute top-1/2 left-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow text-marigold/20 sm:size-[60rem]" />
                <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-20 text-center sm:pt-24">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-x-10 top-6 h-24 animate-glow rounded-full bg-marigold/50" />
                        <Trinayan className="relative w-full text-maroon dark:text-kash" />
                    </div>
                    <p className="mt-8 text-sm font-semibold tracking-[0.3em] text-primary uppercase">
                        {pick(locale, event.name_en, event.name_bn)}
                    </p>
                    <h1 className="text-gradient-puja mt-3 font-heading text-6xl leading-tight font-bold sm:text-8xl">
                        শুভ শারদীয়া
                    </h1>
                    <p className="mt-4 max-w-xl text-lg text-muted-foreground sm:text-xl">
                        {t("subtitle")}
                    </p>
                    <div className="mt-8">
                        <Countdown shashthi={event.shashthi} dashami={event.dashami} />
                    </div>
                    <div className="mt-10 flex flex-wrap justify-center gap-3">
                        <Button asChild size="lg" className="h-11 rounded-full px-6 text-base">
                            <Link href="/programmes">
                                <HugeiconsIcon icon={StarIcon} data-icon="inline-start" />
                                {t("ctaProgrammes")}
                            </Link>
                        </Button>
                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="h-11 rounded-full border-gold/50 px-6 text-base"
                        >
                            <Link href="/music">
                                <HugeiconsIcon icon={HeadphonesIcon} data-icon="inline-start" />
                                {t("ctaMahalaya")}
                            </Link>
                        </Button>
                    </div>
                </div>
                <OrnamentDivider className="relative mx-auto max-w-6xl px-4 pb-6 text-marigold" />
            </section>

            {/* Now / next */}
            {(ongoing || upNext) && (
                <section className="border-b bg-card">
                    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                        {ongoing && (
                            <Link
                                href={`/programmes/${ongoing.slug}`}
                                className="flex items-center gap-3 text-sm hover:underline"
                            >
                                <span className="relative flex size-2.5">
                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-sindoor opacity-75" />
                                    <span className="relative inline-flex size-2.5 rounded-full bg-sindoor" />
                                </span>
                                <span className="font-semibold text-sindoor">{t("now")}</span>
                                <span className="font-medium">
                                    {pick(locale, ongoing.title_en, ongoing.title_bn)}
                                </span>
                            </Link>
                        )}
                        {upNext && (
                            <Link
                                href={`/programmes/${upNext.slug}`}
                                className="flex items-center gap-3 text-sm hover:underline sm:ml-auto"
                            >
                                <span className="font-semibold text-muted-foreground">
                                    {t("next")}
                                </span>
                                <span className="font-medium">
                                    {pick(locale, upNext.title_en, upNext.title_bn)}
                                </span>
                                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                            </Link>
                        )}
                    </div>
                </section>
            )}

            {/* Featured programmes */}
            <section className="mx-auto max-w-6xl px-4 pt-20">
                <SectionHeading
                    eyebrow={t("programmesEyebrow")}
                    title={t("programmesTitle")}
                    href="/programmes"
                    linkLabel={t("seeAll")}
                />
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {featured.map((p) => (
                        <ProgrammeCard key={p.id} programme={p} registrations={counts.get(p.id)} />
                    ))}
                </div>
            </section>

            {/* Timeline + Mahalaya */}
            <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-20 lg:grid-cols-[1.3fr_1fr]">
                <div>
                    <SectionHeading
                        eyebrow={t("timelineEyebrow")}
                        title={t("timelineTitle")}
                        href="/timeline"
                        linkLabel={t("fullTimeline")}
                    />
                    <div className="mt-8">
                        <Timeline
                            programmes={programmes.slice(0, 6)}
                            shashthi={event.shashthi}
                            compact
                        />
                    </div>
                </div>
                <div className="relative self-start overflow-hidden rounded-3xl bg-maroon p-8 text-kash shadow-2xl shadow-maroon/30 lg:sticky lg:top-24">
                    <Alpana className="absolute -right-20 -bottom-20 size-72 text-gold/20" />
                    <p className="text-xs font-semibold tracking-widest text-gold uppercase">
                        {t("mahalayaEyebrow")}
                    </p>
                    <p className="mt-4 font-heading text-2xl leading-snug sm:text-3xl">
                        যা দেবী সর্বভূতেষু শক্তিরূপেণ সংস্থিতা।
                        <br />
                        নমস্তস্যৈ নমস্তস্যৈ নমস্তস্যৈ নমো নমঃ॥
                    </p>
                    <p className="mt-4 text-sm text-kash/75">{t("mahalayaBody")}</p>
                    <Button
                        asChild
                        size="lg"
                        className="mt-6 h-11 rounded-full bg-gold px-6 text-maroon hover:bg-gold/90"
                    >
                        <Link href="/music">
                            <HugeiconsIcon icon={HeadphonesIcon} data-icon="inline-start" />
                            {t("ctaMahalaya")}
                        </Link>
                    </Button>
                </div>
            </section>

            {/* About teaser + donate */}
            <section className="mx-auto grid max-w-6xl gap-6 px-4 pt-20 md:grid-cols-2">
                <Link
                    href="/about"
                    className="group relative overflow-hidden rounded-3xl border bg-card p-8 transition-colors hover:border-marigold/60"
                >
                    <HugeiconsIcon icon={Calendar03Icon} className="size-8 text-primary" />
                    <h2 className="mt-4 text-3xl font-semibold">{t("aboutTitle")}</h2>
                    <p className="mt-3 text-muted-foreground">{t("aboutBody")}</p>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                        {t("readMore")}
                        <HugeiconsIcon
                            icon={ArrowRight01Icon}
                            className="size-4 transition-transform group-hover:translate-x-1"
                        />
                    </span>
                </Link>
                <Link
                    href="/donate"
                    className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-sindoor to-marigold p-8 text-primary-foreground"
                >
                    <Alpana className="absolute -top-16 -right-16 size-64 text-white/15" />
                    <HugeiconsIcon icon={QrCodeIcon} className="size-8" />
                    <h2 className="mt-4 text-3xl font-semibold">{t("donateTitle")}</h2>
                    <p className="mt-3 text-primary-foreground/85">{t("donateBody")}</p>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold">
                        {t("donateCta")}
                        <HugeiconsIcon
                            icon={ArrowRight01Icon}
                            className="size-4 transition-transform group-hover:translate-x-1"
                        />
                    </span>
                </Link>
            </section>
        </>
    );
}

function SectionHeading({
    eyebrow,
    title,
    href,
    linkLabel,
}: Readonly<{
    eyebrow: string;
    title: string;
    href: string;
    linkLabel: string;
}>) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <p className="text-sm font-semibold tracking-widest text-primary uppercase">
                    {eyebrow}
                </p>
                <h2 className="mt-1 text-3xl font-semibold sm:text-4xl">{title}</h2>
            </div>
            <Link
                href={href}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
                {linkLabel}
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Link>
        </div>
    );
}
