import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { requestMusicalChairSong, upvoteMusicalChairSong } from "@/actions/public";
import { MusicalChairLeaderboard } from "@/components/programmes/musical-chair-leaderboard";
import { LiveMusicalChairScreen } from "@/components/programmes/live-musical-chair-screen";
import { StreamRequestForm } from "@/components/music/stream-request-form";
import { StreamUpvoteButton } from "@/components/music/stream-upvote-button";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import {
    listMusicalChairRequests,
    listRegistrations,
    listRounds,
    musicalChairRequestsLeft,
} from "@/lib/queries";
import { musicalChairStandings } from "@/lib/musical-chair-standings";
import { cn } from "@/lib/utils";
import { getIpHash } from "@/lib/visitor";

export async function MusicalChairPublic({
    programmeId,
    finished = false,
}: Readonly<{
    programmeId: string;
    finished?: boolean;
}>) {
    const [t, requests, rounds, registrations, left] = await Promise.all([
        getTranslations("musicalChair"),
        listMusicalChairRequests(programmeId),
        listRounds(programmeId),
        listRegistrations(programmeId),
        getIpHash().then((ip) => musicalChairRequestsLeft(programmeId, ip)),
    ]);
    const standings = musicalChairStandings(
        registrations.map((r) => r.name),
        rounds,
    );

    return (
        <div className="space-y-10">
            <LiveRefresh
                tables={["musical_chair_requests"]}
                filter={`programme_id=eq.${programmeId}`}
            />
            <LiveRefresh
                tables={["musical_chair_rounds"]}
                filter={`programme_id=eq.${programmeId}`}
            />

            <LiveMusicalChairScreen programmeId={programmeId} />

            <MusicalChairLeaderboard standings={standings} finished={finished} />

            {rounds.length > 0 && (
                <section>
                    <h2 className="text-2xl font-semibold">{t("roundsTitle")}</h2>
                    <ol className="mt-4 space-y-2">
                        {rounds.map((r) => (
                            <li
                                key={r.id}
                                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
                            >
                                <span className="font-heading font-semibold text-primary">
                                    {t("round", { n: r.round_no })}
                                </span>
                                <span className="flex-1 truncate text-muted-foreground">
                                    {r.song_title}
                                </span>
                                {r.eliminated_name && (
                                    <span className="font-medium">
                                        {t("out", { name: r.eliminated_name })}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="min-w-0">
                    <h2 className="text-2xl font-semibold">{t("requestTitle")}</h2>
                    <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("requestHint")}</p>
                    <StreamRequestForm
                        left={left}
                        action={requestMusicalChairSong}
                        hidden={{ programmeId }}
                    />
                </div>
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{t("requestedSongs")}</h3>
                    {requests.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">{t("noRequests")}</p>
                    ) : (
                        <ul className="mt-3 space-y-2.5">
                            {requests.slice(0, 30).map((r) => (
                                <li key={r.id} className="flex items-center gap-3">
                                    {r.thumbnail_url ? (
                                        <Image
                                            src={r.thumbnail_url}
                                            alt=""
                                            width={160}
                                            height={90}
                                            className="aspect-video w-16 shrink-0 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="aspect-video w-16 shrink-0 rounded-lg bg-muted" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-1 text-sm font-medium">
                                            {r.title}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {t("by", { name: r.requested_by })}
                                            {" · "}
                                            <span
                                                className={cn(
                                                    r.status === "added" &&
                                                        "font-semibold text-success",
                                                )}
                                            >
                                                {t(
                                                    `requestStatus.${r.status === "added" ? "added" : "pending"}`,
                                                )}
                                            </span>
                                        </p>
                                    </div>
                                    {r.status === "pending" ? (
                                        <StreamUpvoteButton
                                            id={r.id}
                                            count={r.upvotes}
                                            vote={upvoteMusicalChairSong}
                                        />
                                    ) : (
                                        <span className="inline-flex h-9 min-w-14 shrink-0 items-center justify-center rounded-full border px-3 text-sm font-semibold tabular-nums">
                                            {r.upvotes}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>
        </div>
    );
}
