import { getFormatter, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { MusicNote03Icon } from "@hugeicons/core-free-icons";
import { LiveMusicalChairScreen } from "@/components/programmes/live-musical-chair-screen";
import { SongRequestForm } from "@/components/programmes/song-request-form";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import { listRounds, listSongRequests } from "@/lib/queries";
import { cn } from "@/lib/utils";

export async function MusicalChairPublic({ programmeId }: { programmeId: string }) {
    const [t, format, requests, rounds] = await Promise.all([
        getTranslations("musicalChair"),
        getFormatter(),
        listSongRequests(),
        listRounds(programmeId),
    ]);

    return (
        <div className="space-y-10">
            <LiveRefresh tables={["song_requests"]} />
            <LiveRefresh
                tables={["musical_chair_rounds"]}
                filter={`programme_id=eq.${programmeId}`}
            />

            <LiveMusicalChairScreen programmeId={programmeId} />

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

            <section className="grid gap-6 md:grid-cols-2">
                <div>
                    <h2 className="text-2xl font-semibold">{t("requestTitle")}</h2>
                    <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("requestHint")}</p>
                    <SongRequestForm />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">{t("requestedSongs")}</h3>
                    {requests.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">{t("noRequests")}</p>
                    ) : (
                        <ul className="mt-3 space-y-2">
                            {requests.slice(0, 30).map((r) => (
                                <li
                                    key={r.id}
                                    className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5"
                                >
                                    <HugeiconsIcon
                                        icon={MusicNote03Icon}
                                        className={cn(
                                            "size-4 shrink-0",
                                            r.status === "added" ? "text-success" : "text-marigold",
                                        )}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{r.title}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {[
                                                r.artist,
                                                r.requested_by && t("by", { name: r.requested_by }),
                                            ]
                                                .filter(Boolean)
                                                .join(" · ") ||
                                                format.relativeTime(new Date(r.created_at))}
                                        </p>
                                    </div>
                                    {r.request_count > 1 && (
                                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
                                            ×{r.request_count}
                                        </span>
                                    )}
                                    <span
                                        className={cn(
                                            "text-xs font-semibold",
                                            r.status === "added"
                                                ? "text-success"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        {t(`requestStatus.${r.status}`)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>
        </div>
    );
}
