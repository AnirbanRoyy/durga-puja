import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { VolumeHighIcon } from "@hugeicons/core-free-icons";
import { StreamRequestForm } from "@/components/music/stream-request-form";
import { StreamUpvoteButton } from "@/components/music/stream-upvote-button";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import type { StreamRequest } from "@/lib/database.types";
import { getStreamBoard } from "@/lib/queries";
import { cn } from "@/lib/utils";

function Thumb({ song, className }: { song: StreamRequest; className?: string }) {
    return song.thumbnail_url ? (
        <Image
            src={song.thumbnail_url}
            alt=""
            width={160}
            height={90}
            className={cn("aspect-video shrink-0 rounded-lg object-cover", className)}
        />
    ) : (
        <div className={cn("aspect-video shrink-0 rounded-lg bg-muted", className)} />
    );
}

/**
 * The pandal's speaker playlist: what is playing, what is "Up next", the approved queue and the
 * requests waiting for approval. Separate from the personal music library below it.
 */
export async function PandalStream() {
    const [t, format, board] = await Promise.all([
        getTranslations("stream"),
        getFormatter(),
        getStreamBoard(),
    ]);
    const { state, nowPlaying, upNext, queue, pending } = board;

    return (
        <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
            <LiveRefresh tables={["stream_requests", "stream_state"]} />
            <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold">{t("title")}</h2>
                {state.is_streaming && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sindoor px-2.5 py-0.5 text-xs font-semibold text-white">
                        <span className="size-1.5 animate-pulse rounded-full bg-white" />
                        {t("live")}
                    </span>
                )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

            {state.is_streaming && nowPlaying && (
                <div className="mt-5 flex items-center gap-4 rounded-2xl bg-maroon p-4 text-kash">
                    <Thumb song={nowPlaying} className="w-28 sm:w-36" />
                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-gold uppercase">
                            <HugeiconsIcon icon={VolumeHighIcon} className="size-4" />
                            {t("nowPlaying")}
                        </p>
                        <p className="mt-1 line-clamp-2 font-semibold">{nowPlaying.title}</p>
                        <p className="text-xs text-kash/70">
                            {t("requestedBy", { name: nowPlaying.requested_by })}
                        </p>
                    </div>
                </div>
            )}

            {upNext && (
                <div className="mt-3 flex items-center gap-3 rounded-2xl border-2 border-marigold/70 bg-marigold/10 p-3">
                    <Thumb song={upNext} className="w-20 sm:w-24" />
                    <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-full bg-marigold px-2.5 py-0.5 text-xs font-bold text-maroon">
                            {t("upNext")}
                        </span>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold">{upNext.title}</p>
                        <p className="text-xs text-muted-foreground">
                            {t("requestedBy", { name: upNext.requested_by })}
                        </p>
                    </div>
                </div>
            )}

            {!state.is_streaming && (
                <p className="mt-4 rounded-xl bg-secondary/60 p-3 text-sm">{t("notStreaming")}</p>
            )}

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
                <div>
                    <h3 className="text-lg font-semibold">{t("requestTitle")}</h3>
                    <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("requestHint")}</p>
                    <StreamRequestForm />
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold">{t("queueTitle")}</h3>
                        {queue.length ? (
                            <ul className="mt-3 space-y-2.5">
                                {queue.map((song) => (
                                    <li key={song.id} className="flex items-center gap-3">
                                        <Thumb song={song} className="w-16" />
                                        <div className="min-w-0 flex-1">
                                            <p className="line-clamp-1 text-sm font-medium">
                                                {song.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {t("requestedBy", { name: song.requested_by })}
                                                {upNext?.id === song.id && ` · ${t("upNext")}`}
                                            </p>
                                        </div>
                                        <StreamUpvoteButton id={song.id} count={song.upvotes} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground">{t("queueEmpty")}</p>
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold">{t("pendingTitle")}</h3>
                        <p className="text-xs text-muted-foreground">{t("pendingHint")}</p>
                        {pending.length ? (
                            <ul className="mt-3 space-y-2.5">
                                {pending.map((song) => (
                                    <li key={song.id} className="flex items-center gap-3">
                                        <Thumb song={song} className="w-16" />
                                        <div className="min-w-0 flex-1">
                                            <p className="line-clamp-1 text-sm font-medium">
                                                {song.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {t("requestedBy", { name: song.requested_by })} ·{" "}
                                                {format.relativeTime(new Date(song.created_at))}
                                            </p>
                                        </div>
                                        <StreamUpvoteButton id={song.id} count={song.upvotes} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground">
                                {t("pendingEmpty")}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
