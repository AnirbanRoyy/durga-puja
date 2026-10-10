"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    advanceStream,
    approveQuotaReset,
    approveStreamRequest,
    rejectQuotaReset,
    rejectStreamRequest,
    removeStreamSong,
    setStreamUpNext,
    startStream,
    stopStream,
    type StreamActionResult,
} from "@/actions/admin/stream";
import { AdminCard } from "@/components/admin/admin-bits";
import { StreamLibrary, type LibrarySong } from "@/components/admin/stream-library";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import { Button } from "@/components/ui/button";
import type { StreamRequest } from "@/lib/database.types";
import type { QuotaRequestForAdmin } from "@/lib/queries";
import { loadYouTubeApi, type YTPlayer } from "@/lib/youtube-api";

type WakeLockSentinelLike = { release: () => Promise<void> };

function Row({ song, children }: { song: StreamRequest; children?: React.ReactNode }) {
    return (
        <li className="flex items-center gap-3 py-2.5">
            {song.thumbnail_url && (
                <Image
                    src={song.thumbnail_url}
                    alt=""
                    width={96}
                    height={54}
                    className="aspect-video w-20 shrink-0 rounded-md object-cover"
                />
            )}
            <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium">{song.title}</p>
                <p className="text-xs text-muted-foreground">
                    {song.requested_by} · {song.upvotes} upvote{song.upvotes === 1 ? "" : "s"}
                    {song.play_count > 0 && ` · played ${song.play_count}× before`}
                </p>
            </div>
            {children}
        </li>
    );
}

export function StreamConsole({
    isStreaming,
    nowPlaying,
    upNext,
    queue,
    pending,
    quotaRequests,
    library,
}: Readonly<{
    isStreaming: boolean;
    nowPlaying: StreamRequest | null;
    upNext: StreamRequest | null;
    queue: StreamRequest[];
    pending: StreamRequest[];
    quotaRequests: QuotaRequestForAdmin[];
    library: LibrarySong[];
}>) {
    const router = useRouter();
    const listedIds = new Set(
        [...queue, ...(nowPlaying ? [nowPlaying] : [])].map((s) => s.youtube_id),
    );

    // Visitors' "more requests" asks are private, so they don't arrive by realtime: check now and then.
    useEffect(() => {
        const timer = setInterval(() => {
            if (document.visibilityState === "visible") router.refresh();
        }, 20_000);
        return () => clearInterval(timer);
    }, [router]);
    const [busy, start] = useTransition();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const advancing = useRef(false);
    const [volume, setVolume] = useState(80);
    const volumeRef = useRef(80);

    const run = useCallback(
        (action: () => Promise<StreamActionResult>, success?: string) =>
            start(async () => {
                const result = await action();
                if (!result.ok) toast.error(result.message);
                else {
                    if (success) toast.success(success);
                    router.refresh();
                }
            }),
        [router],
    );

    const advance = useCallback(() => {
        if (advancing.current) return;
        advancing.current = true;
        void advanceStream().then((result) => {
            if (!result.ok) toast.error(result.message);
            router.refresh();
        });
    }, [router]);

    // Keep the player in step with the server's "now playing" song.
    const videoId = isStreaming ? (nowPlaying?.youtube_id ?? null) : null;
    useEffect(() => {
        advancing.current = false;
        let cancelled = false;
        const player = playerRef.current;
        if (!videoId) {
            player?.stopVideo();
            return;
        }
        if (player) {
            player.loadVideoById(videoId);
            return;
        }
        void loadYouTubeApi().then((YT) => {
            if (cancelled || !hostRef.current || playerRef.current) return;
            const mount = document.createElement("div");
            hostRef.current.replaceChildren(mount);
            playerRef.current = new YT.Player(mount, {
                videoId,
                width: "100%",
                height: "100%",
                playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
                events: {
                    onReady: (e) => {
                        e.target.setVolume(volumeRef.current);
                        e.target.playVideo();
                    },
                    onStateChange: (e) => {
                        if (e.data === YT.PlayerState.ENDED) advance();
                    },
                    // Removed, private or not embeddable: skip it instead of getting stuck in silence.
                    onError: () => {
                        toast.error("A song couldn't be played and was skipped.");
                        advance();
                    },
                },
            });
        });
        return () => {
            cancelled = true;
        };
    }, [videoId, advance]);

    useEffect(() => {
        volumeRef.current = volume;
        playerRef.current?.setVolume(volume);
    }, [volume]);

    // Keep the phone awake while the pandal stream is running.
    useEffect(() => {
        if (!isStreaming) return;
        let lock: WakeLockSentinelLike | null = null;
        const nav = navigator as Navigator & {
            wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
        };
        const acquire = () => {
            nav.wakeLock
                ?.request("screen")
                .then((l) => (lock = l))
                .catch(() => {});
        };
        acquire();
        const onVisible = () => document.visibilityState === "visible" && acquire();
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            void lock?.release();
        };
    }, [isStreaming]);

    return (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <LiveRefresh tables={["stream_requests", "stream_state"]} />

            <div className="grid gap-6">
                <AdminCard title="Playback">
                    <div className="flex flex-wrap items-center gap-3">
                        {isStreaming ? (
                            <Button
                                size="lg"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => run(() => stopStream(), "Streaming stopped")}
                            >
                                ■ Stop streaming
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                disabled={busy}
                                onClick={() => run(() => startStream(), "Streaming started")}
                            >
                                ▶ Start streaming
                            </Button>
                        )}
                        {isStreaming && (
                            <>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    disabled={busy || !nowPlaying}
                                    onClick={advance}
                                >
                                    Skip ⏭
                                </Button>
                                <Button
                                    size="lg"
                                    variant="ghost"
                                    onClick={() => playerRef.current?.playVideo()}
                                >
                                    Resume sound
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-sm">
                        <label htmlFor="stream-volume" className="text-muted-foreground">
                            Volume
                        </label>
                        <input
                            id="stream-volume"
                            type="range"
                            min={0}
                            max={100}
                            value={volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                            className="w-48 accent-primary"
                        />
                        <span className="tabular-nums">{volume}</span>
                    </div>

                    {isStreaming ? (
                        <div className="mt-5 grid gap-3">
                            <div className="aspect-video w-full max-w-md overflow-hidden rounded-xl bg-black">
                                <div ref={hostRef} className="size-full" />
                            </div>
                            {nowPlaying ? (
                                <p className="text-sm">
                                    <span className="font-semibold">Now playing:</span>{" "}
                                    {nowPlaying.title}{" "}
                                    <span className="text-muted-foreground">
                                        (requested by {nowPlaying.requested_by})
                                    </span>
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Waiting for approved songs. Approve a request and it starts by
                                    itself.
                                </p>
                            )}
                            {upNext && (
                                <p className="text-sm">
                                    <span className="rounded-full bg-marigold px-2 py-0.5 text-xs font-bold text-maroon">
                                        Up next
                                    </span>{" "}
                                    {upNext.title}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Keep this page open on the phone connected to the pandal speaker.
                                The screen stays awake while streaming.
                            </p>
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-muted-foreground">
                            Connect this phone to the Bluetooth speaker, then press Start streaming.
                            Songs play in random order; songs with more upvotes are more likely to
                            come up. Everyone sees what is playing and what is “Up next”.
                        </p>
                    )}
                </AdminCard>

                <AdminCard title={`Playlist (${queue.length})`}>
                    <ul className="divide-y">
                        {queue.map((song) => (
                            <Row key={song.id} song={song}>
                                {upNext?.id === song.id ? (
                                    <span className="rounded-full bg-marigold px-2 py-0.5 text-xs font-bold text-maroon">
                                        Up next
                                    </span>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={busy}
                                        onClick={() =>
                                            run(() => setStreamUpNext(song.id), "Set as up next")
                                        }
                                    >
                                        Play next
                                    </Button>
                                )}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={busy}
                                            className="text-destructive"
                                        >
                                            Remove
                                            <span className="sr-only"> {song.title}</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                Remove “{song.title}” from the playlist?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                It won’t be played. A song that already played stays
                                                in “Played earlier”.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                                            <AlertDialogAction
                                                variant="destructive"
                                                onClick={() =>
                                                    run(
                                                        () => removeStreamSong(song.id),
                                                        "Removed from playlist",
                                                    )
                                                }
                                            >
                                                Remove
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </Row>
                        ))}
                        {!queue.length && (
                            <li className="py-3 text-sm text-muted-foreground">
                                No approved songs waiting.
                            </li>
                        )}
                    </ul>
                </AdminCard>
            </div>

            <StreamLibrary
                songs={library}
                inPlaylist={listedIds}
                playingId={nowPlaying?.youtube_id ?? null}
            />

            {quotaRequests.length > 0 && (
                <AdminCard title={`Visitors asking for more requests (${quotaRequests.length})`}>
                    <p className="mb-2 text-xs text-muted-foreground">
                        Each visitor can request 3 songs. Approving gives their network a fresh set
                        of 3; rejecting leaves them at their limit (they can still upvote).
                    </p>
                    <ul className="divide-y">
                        {quotaRequests.map((ask) => (
                            <li key={ask.id} className="flex items-center gap-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{ask.name}</p>
                                    <p className="line-clamp-2 text-xs text-muted-foreground">
                                        Requested: {ask.songs.join(" · ") || "—"}
                                    </p>
                                </div>
                                <div className="flex gap-1.5">
                                    <Button
                                        size="sm"
                                        disabled={busy}
                                        onClick={() =>
                                            run(() => approveQuotaReset(ask.id), "Reset approved")
                                        }
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={busy}
                                        onClick={() =>
                                            run(() => rejectQuotaReset(ask.id), "Rejected")
                                        }
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </AdminCard>
            )}

            <AdminCard title={`Requests to review (${pending.length})`}>
                <ul className="divide-y">
                    {pending.map((song) => (
                        <Row key={song.id} song={song}>
                            <div className="flex gap-1.5">
                                <Button
                                    size="sm"
                                    disabled={busy}
                                    onClick={() =>
                                        run(() => approveStreamRequest(song.id), "Approved")
                                    }
                                >
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={() =>
                                        run(() => rejectStreamRequest(song.id), "Rejected")
                                    }
                                >
                                    Reject
                                </Button>
                            </div>
                        </Row>
                    ))}
                    {!pending.length && (
                        <li className="py-3 text-sm text-muted-foreground">Nothing to review.</li>
                    )}
                </ul>
            </AdminCard>
        </div>
    );
}
