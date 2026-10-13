import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { requestMusicalChairSong, upvoteMusicalChairSong } from "@/actions/public";
import { CollapsibleSection } from "@/components/layout/collapsible-section";
import {
    MusicalChairLeaderboard,
    type LeaderboardBoard,
} from "@/components/programmes/musical-chair-leaderboard";
import { LiveMusicalChairScreen } from "@/components/programmes/live-musical-chair-screen";
import { StreamRequestForm } from "@/components/music/stream-request-form";
import { StreamUpvoteButton } from "@/components/music/stream-upvote-button";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import {
    listMusicalChairPlayers,
    listMusicalChairRequests,
    listRounds,
    musicalChairRequestsLeft,
    votedMusicalChairRequests,
} from "@/lib/queries";
import { liveMusicalChairCategory, musicalChairStandings } from "@/lib/musical-chair-standings";
import { cn } from "@/lib/utils";
import { getIpHash, peekVoterHash } from "@/lib/visitor";

import { MC_CATEGORIES } from "@/constants";

export async function MusicalChairPublic({
    programmeId,
    finished = false,
}: Readonly<{
    programmeId: string;
    finished?: boolean;
}>) {
    const [t, requests, rounds, players, left] = await Promise.all([
        getTranslations("musicalChair"),
        listMusicalChairRequests(programmeId),
        listRounds(programmeId),
        listMusicalChairPlayers(programmeId),
        getIpHash().then((ip) => musicalChairRequestsLeft(programmeId, ip)),
    ]);
    const voted = await votedMusicalChairRequests(
        await peekVoterHash(),
        requests.map((r) => r.id),
    );
    // One leaderboard, switchable by category; categories without players are left out.
    const boards: LeaderboardBoard[] = [];
    for (const category of MC_CATEGORIES) {
        const names = players.filter((p) => p.category === category).map((p) => p.name);
        const categoryRounds = rounds.filter((r) => r.category === category);
        const standings = musicalChairStandings(names, categoryRounds);
        const hasPlayers = standings.stillIn.length > 0 || standings.out.length > 0;
        if (hasPlayers) {
            boards.push({ category, label: t(`categories.${category}`), standings });
        }
    }
    const live = liveMusicalChairCategory(
        rounds,
        boards.map((b) => b.category),
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

            {live && <MusicalChairLeaderboard boards={boards} live={live} finished={finished} />}

            {rounds.length > 0 && (
                <CollapsibleSection title={t("roundsTitle")}>
                    <ol className="mt-4 space-y-2">
                        {rounds.map((r) => (
                            <li
                                key={r.id}
                                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
                            >
                                <span className="font-heading font-semibold text-primary">
                                    {r.category && `${t(`categories.${r.category}`)} · `}
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
                </CollapsibleSection>
            )}

            <CollapsibleSection title={t("requestTitle")}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="min-w-0">
                        <p className="mt-1 mb-4 text-sm text-muted-foreground">
                            {t("requestHint")}
                        </p>
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
                                        <StreamUpvoteButton
                                            id={r.id}
                                            count={r.upvotes}
                                            voted={voted.has(r.id)}
                                            closed={r.status !== "pending"}
                                            closedMessage={t("votingClosed")}
                                            vote={upvoteMusicalChairSong}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
}
