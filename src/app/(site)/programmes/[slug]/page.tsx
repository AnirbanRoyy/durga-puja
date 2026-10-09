import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Award01Icon,
    Clock01Icon,
    Location01Icon,
    UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { DrawingGallery } from "@/components/programmes/drawing-gallery";
import { Lineup } from "@/components/programmes/lineup";
import { MusicalChairPublic } from "@/components/programmes/musical-chair-public";
import { MyRegistration } from "@/components/programmes/my-registration";
import { RegistrationForm } from "@/components/programmes/registration-form";
import { StatusBadge } from "@/components/programmes/status-badge";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import { pick } from "@/lib/localize";
import { acceptsRegistrations, isLineupType, TYPE_ICON } from "@/lib/programme-meta";
import { getProgrammeBySlug, hasVoted, listDrawings, listRegistrations } from "@/lib/queries";
import { getMyRegistration } from "@/lib/my-registration";
import { peekVoterHash } from "@/lib/visitor";

export async function generateMetadata(props: PageProps<"/programmes/[slug]">) {
    const { slug } = await props.params;
    const [programme, locale] = await Promise.all([getProgrammeBySlug(slug), getLocale()]);
    return { title: programme ? pick(locale, programme.title_en, programme.title_bn) : undefined };
}

export default async function ProgrammePage(props: PageProps<"/programmes/[slug]">) {
    const { slug } = await props.params;
    const programme = await getProgrammeBySlug(slug);
    if (!programme) notFound();

    const [t, locale, format, registrations] = await Promise.all([
        getTranslations("programmes"),
        getLocale(),
        getFormatter(),
        listRegistrations(programme.id),
    ]);

    const title = pick(locale, programme.title_en, programme.title_bn);
    const description = pick(locale, programme.description_en, programme.description_bn);
    const rules = pick(locale, programme.rules_en, programme.rules_bn);
    const open = acceptsRegistrations(programme);
    const mine = programme.status === "completed" ? null : await getMyRegistration(programme.id);

    return (
        <>
            <LiveRefresh tables={["programmes"]} filter={`id=eq.${programme.id}`} />
            <LiveRefresh
                tables={["registrations", "drawings", "results"]}
                filter={`programme_id=eq.${programme.id}`}
            />

            <PageHeader title={title} description={description ?? undefined}>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-sindoor to-marigold text-primary-foreground">
                        <HugeiconsIcon icon={TYPE_ICON[programme.type]} className="size-5" />
                    </span>
                    <StatusBadge status={programme.status} />
                    {programme.starts_at && (
                        <span className="inline-flex items-center gap-1.5">
                            <HugeiconsIcon icon={Clock01Icon} className="size-4" />
                            {format.dateTime(new Date(programme.starts_at), {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                hour: "numeric",
                                minute: "2-digit",
                            })}
                        </span>
                    )}
                    {programme.venue && (
                        <span className="inline-flex items-center gap-1.5">
                            <HugeiconsIcon icon={Location01Icon} className="size-4" />
                            {programme.venue}
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon icon={UserGroupIcon} className="size-4" />
                        {t("registeredCount", { count: registrations.length })}
                    </span>
                </div>
            </PageHeader>

            <div className="mx-auto max-w-6xl px-4 pt-8">
                <div className="flex flex-wrap gap-2">
                    {programme.status === "completed" && (
                        <Button asChild size="sm" variant="secondary">
                            <Link href={`/programmes/${programme.slug}/results`}>
                                <HugeiconsIcon icon={Award01Icon} data-icon="inline-start" />
                                {t("seeResults")}
                            </Link>
                        </Button>
                    )}
                </div>

                {programme.status === "cancelled" && (
                    <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
                        <p className="font-semibold text-destructive">{t("cancelled")}</p>
                        {programme.admin_notes && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {programme.admin_notes}
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
                    <div className="min-w-0 space-y-10">
                        {programme.type === "drawing" && (
                            <DrawingSection
                                programmeId={programme.id}
                                votingOpen={programme.voting_open}
                                hideCounts={programme.hide_vote_counts}
                            />
                        )}
                        {programme.type === "musical_chair" && (
                            <MusicalChairPublic programmeId={programme.id} />
                        )}
                        {isLineupType(programme.type) && (
                            <Lineup registrations={registrations} locked={programme.order_locked} />
                        )}
                        {rules && (
                            <section>
                                <h2 className="text-2xl font-semibold">{t("rules")}</h2>
                                <p className="mt-3 whitespace-pre-line text-muted-foreground">
                                    {rules}
                                </p>
                            </section>
                        )}
                    </div>

                    <aside className="lg:sticky lg:top-24 lg:self-start">
                        <div className="rounded-3xl border bg-card p-6 shadow-sm">
                            <h2 className="text-2xl font-semibold">{t("register")}</h2>
                            {mine ? (
                                <div className="mt-4">
                                    <MyRegistration
                                        programmeId={programme.id}
                                        programmeType={programme.type}
                                        mine={{
                                            name: mine.name,
                                            phone: mine.phone,
                                            age: mine.age,
                                            guardianName: mine.guardianName,
                                            notes: mine.notes,
                                        }}
                                    />
                                </div>
                            ) : open ? (
                                <>
                                    <p className="mt-1 mb-5 text-sm text-muted-foreground">
                                        {t("registerHint")}
                                    </p>
                                    <RegistrationForm
                                        programmeId={programme.id}
                                        programmeType={programme.type}
                                    />
                                </>
                            ) : (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {t("registrationClosed")}
                                </p>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

async function DrawingSection({
    programmeId,
    votingOpen,
    hideCounts,
}: {
    programmeId: string;
    votingOpen: boolean;
    hideCounts: boolean;
}) {
    const [drawings, votedFor] = await Promise.all([
        listDrawings(programmeId),
        peekVoterHash().then((hash) => (hash ? hasVoted(programmeId, hash) : null)),
    ]);
    return (
        <DrawingGallery
            drawings={drawings}
            votedFor={votedFor}
            votingOpen={votingOpen}
            hideCounts={hideCounts && votingOpen}
        />
    );
}
