"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Award01Icon, Chair01Icon, PlayIcon, StopIcon } from "@hugeicons/core-free-icons";
import {
    addMusicalChairRequestToPool,
    addSongsToMusicalChairPool,
    deleteSong,
    finishMusicalChair,
    recordRound,
    rejectMusicalChairRequest,
    resetRounds,
    setRoundEliminated,
} from "@/actions/admin/content";
import { AdminCard } from "@/components/admin/admin-bits";
import {
    createAudioVoice,
    createYouTubeVoice,
    type PoolSong,
    type RoundVoice,
} from "@/components/admin/round-player";
import { StreamLibrary, type LibrarySong } from "@/components/admin/stream-library";
import { LiveRefresh } from "@/components/realtime/live-refresh";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MusicalChairRequest, MusicalChairRound } from "@/lib/database.types";
import {
    MC_EVENT,
    musicalChairChannel,
    pickStartOffset,
    randomBetween,
    type MusicalChairState,
} from "@/lib/musical-chair";
import { playersStillIn } from "@/lib/musical-chair-standings";
import { browserDb } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const FADE_IN_MS = 300;
const FADE_OUT_MS = 80;
const OTHER = "__other__";

function statusLabel(loading: boolean, phase: MusicalChairState["phase"]): string {
    if (loading) return "Starting…";
    if (phase === "playing") return "Music playing";
    return phase === "stopped" ? "STOP!" : "Ready";
}

type Started = { song: PoolSong; voice: RoundVoice; offset: number };

/**
 * Tries songs one by one until one starts; a song that can't play (removed video, blocked embed)
 * is skipped with a toast. Returns null when none of them worked.
 */
async function startFirstPlayable(
    tries: number,
    nextSong: () => PoolSong | null,
    voiceFor: (song: PoolSong) => RoundVoice,
    maxPlay: number,
    signal: { cancelled: boolean },
): Promise<Started | null> {
    for (let attempt = 0; attempt < tries; attempt++) {
        const song = nextSong();
        if (!song) return null;
        try {
            const voice = voiceFor(song);
            const result = await voice.start(
                song,
                (duration) => pickStartOffset(duration, maxPlay),
                signal,
            );
            return { song, voice, offset: result.offset };
        } catch (e) {
            if (signal.cancelled) return null;
            const reason = e instanceof Error ? e.message : "It couldn't be played.";
            toast.error(`“${song.title}” skipped. ${reason}`);
        }
    }
    return null;
}

/** A dropdown of the registered players who are still in, with a typed-name fallback. */
function PlayerPicker({
    players,
    value,
    onChange,
    placeholder,
    disabled,
}: Readonly<{
    players: string[];
    value: string;
    onChange: (name: string) => void;
    placeholder: string;
    disabled?: boolean;
}>) {
    const [other, setOther] = useState(false);
    const typed = other || (value !== "" && !players.includes(value));
    return (
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2">
            <select
                aria-label={placeholder}
                disabled={disabled}
                value={typed ? OTHER : value}
                onChange={(e) => {
                    const v = e.target.value;
                    setOther(v === OTHER);
                    onChange(v === OTHER ? "" : v);
                }}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
            >
                <option value="">{placeholder}</option>
                {players.map((n) => (
                    <option key={n} value={n}>
                        {n}
                    </option>
                ))}
                <option value={OTHER}>Someone else…</option>
            </select>
            {typed && (
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Type the name"
                    disabled={disabled}
                />
            )}
        </div>
    );
}

export function MusicalChairConsole({
    programmeId,
    songs,
    library,
    requests,
    rounds,
    playerNames,
}: Readonly<{
    programmeId: string;
    songs: PoolSong[];
    library: LibrarySong[];
    requests: MusicalChairRequest[];
    rounds: MusicalChairRound[];
    playerNames: string[];
}>) {
    const router = useRouter();
    const [phase, setPhase] = useState<MusicalChairState["phase"]>("idle");
    const [minPlay, setMinPlay] = useState(15);
    const [maxPlay, setMaxPlay] = useState(45);
    const [showTimer, setShowTimer] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [currentTitle, setCurrentTitle] = useState<string | null>(null);
    const [roundNo, setRoundNo] = useState(rounds.at(-1)?.round_no ?? 0);
    const [roundId, setRoundId] = useState<string | null>(rounds.at(-1)?.id ?? null);
    const [eliminated, setEliminated] = useState(rounds.at(-1)?.eliminated_name ?? "");
    const [winner, setWinner] = useState("");
    const [loading, setLoading] = useState(false);
    const [pending, startTransition] = useTransition();

    const bagRef = useRef<PoolSong[]>([]);
    const nextRef = useRef<PoolSong | null>(null);
    const lastIdRef = useRef<string | null>(null);
    const audioVoice = useRef<ReturnType<typeof createAudioVoice> | null>(null);
    const youtubeVoice = useRef<RoundVoice | null>(null);
    const hostRef = useRef<HTMLDivElement | null>(null);
    const activeRef = useRef<RoundVoice | null>(null);
    const startSignal = useRef({ cancelled: false });
    const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const channelRef = useRef<ReturnType<ReturnType<typeof browserDb>["channel"]> | null>(null);
    const channelReady = useRef(false);
    const roundRef = useRef(roundNo);
    const busyRef = useRef(false);

    useEffect(() => {
        roundRef.current = roundNo;
    }, [roundNo]);

    useEffect(() => {
        const supabase = browserDb();
        const channel = supabase.channel(musicalChairChannel(programmeId));
        channel.subscribe((status) => {
            channelReady.current = status === "SUBSCRIBED";
        });
        channelRef.current = channel;
        return () => {
            channelReady.current = false;
            void supabase.removeChannel(channel);
        };
    }, [programmeId]);

    const broadcast = useCallback((state: Omit<MusicalChairState, "at">) => {
        if (!channelReady.current) return;
        void channelRef.current?.send({
            type: "broadcast",
            event: MC_EVENT,
            payload: { ...state, at: Date.now() } satisfies MusicalChairState,
        });
    }, []);

    const voiceFor = useCallback((song: PoolSong): RoundVoice => {
        if (song.kind === "youtube") {
            if (!youtubeVoice.current && hostRef.current) {
                youtubeVoice.current = createYouTubeVoice(hostRef.current);
            }
            if (!youtubeVoice.current) throw new Error("The player isn't ready yet.");
            return youtubeVoice.current;
        }
        audioVoice.current ??= createAudioVoice();
        return audioVoice.current;
    }, []);

    /** Shuffle bag: every song plays once before any repeats. */
    const drawSong = useCallback((): PoolSong | null => {
        if (songs.length === 0) return null;
        if (bagRef.current.length === 0) {
            const copy = [...songs];
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(randomBetween(0, i + 0.999999));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            // Avoid the same song twice in a row across bag refills.
            if (copy.length > 1 && copy[0].id === lastIdRef.current) copy.push(copy.shift()!);
            bagRef.current = copy;
        }
        return bagRef.current.pop() ?? null;
    }, [songs]);

    const preloadNext = useCallback(() => {
        const song = drawSong();
        nextRef.current = song;
        if (song?.kind === "audio") {
            audioVoice.current ??= createAudioVoice();
            audioVoice.current.preload(song);
        }
    }, [drawSong]);

    // The pool changed (songs added or removed): start the shuffle over with the new list.
    const poolKey = songs.map((s) => s.id).join(",");
    useEffect(() => {
        bagRef.current = [];
        preloadNext();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [poolKey]);

    useEffect(() => {
        const signal = startSignal.current;
        return () => {
            signal.cancelled = true;
            activeRef.current?.stop();
            youtubeVoice.current?.stop();
            if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
            if (tickRef.current) clearInterval(tickRef.current);
        };
    }, []);

    const stopRound = useCallback(
        async (manual = false) => {
            if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
            if (tickRef.current) clearInterval(tickRef.current);
            stopTimerRef.current = null;
            tickRef.current = null;
            const voice = activeRef.current;
            activeRef.current = null;
            setRemaining(null);
            setPhase("stopped");
            broadcast({ phase: "stopped", round: roundRef.current });
            if (voice) {
                await voice.fadeTo(0, FADE_OUT_MS);
                voice.stop();
            }
            if (manual) toast("Music stopped");
        },
        [broadcast],
    );

    const startRound = useCallback(async () => {
        if (busyRef.current) return;
        if (songs.length === 0) {
            toast.error("Add at least one song to the musical chair pool first.");
            return;
        }
        busyRef.current = true;
        setLoading(true);
        try {
            if (activeRef.current) await stopRound();
            const lo = Math.max(1, Math.min(minPlay, maxPlay));
            const hi = Math.max(lo, maxPlay);
            const signal = startSignal.current;

            const started = await startFirstPlayable(
                songs.length,
                () => {
                    const song = nextRef.current ?? drawSong();
                    nextRef.current = null;
                    return song;
                },
                voiceFor,
                hi,
                signal,
            );
            if (signal.cancelled) return;
            if (!started) {
                toast.error("None of the pool songs could be played.");
                preloadNext();
                return;
            }
            const { song, voice, offset } = started;
            lastIdRef.current = song.id;
            const playFor = randomBetween(lo, hi);

            activeRef.current = voice;
            void voice.fadeTo(1, FADE_IN_MS);
            voice.onEnded(() => void stopRound());

            const n = roundRef.current + 1;
            setRoundNo(n);
            roundRef.current = n;
            setEliminated("");
            setRoundId(null);
            setCurrentTitle(song.title);
            setPhase("playing");
            broadcast({ phase: "playing", round: n, songTitle: song.title });

            const endsAt = performance.now() + playFor * 1000;
            setRemaining(playFor);
            tickRef.current = setInterval(
                () => setRemaining(Math.max(0, (endsAt - performance.now()) / 1000)),
                100,
            );
            stopTimerRef.current = setTimeout(() => void stopRound(), playFor * 1000);

            recordRound(programmeId, {
                songId: song.id,
                songTitle: song.title,
                startOffset: offset,
                playDuration: playFor,
            })
                .then((r) => setRoundId(r.id))
                .catch(() => toast.error("Round played but could not be saved"));

            preloadNext();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not start the round");
            preloadNext();
        } finally {
            busyRef.current = false;
            setLoading(false);
        }
    }, [
        songs.length,
        stopRound,
        preloadNext,
        drawSong,
        voiceFor,
        minPlay,
        maxPlay,
        broadcast,
        programmeId,
    ]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            const target = e.target as HTMLElement;
            if (e.code !== "Space" || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))
                return;
            e.preventDefault();
            void startRound();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [startRound]);

    const playing = phase === "playing";
    const stillIn = playersStillIn(playerNames, rounds, roundNo);
    const finalists = playersStillIn(playerNames, rounds);
    const winnerValue = winner || (finalists.length === 1 ? finalists[0] : "");
    const poolYouTube = new Set(songs.filter((s) => s.kind === "youtube").map((s) => s.ref));
    const hasYouTube = songs.some((s) => s.kind === "youtube");
    const pendingRequests = requests.filter((r) => r.status === "pending").length;

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <LiveRefresh
                tables={["musical_chair_requests"]}
                filter={`programme_id=eq.${programmeId}`}
            />
            <div className="min-w-0 space-y-6">
                <div
                    className={cn(
                        "grid min-h-72 place-items-center rounded-3xl border p-8 text-center transition-colors",
                        playing &&
                            "border-transparent bg-gradient-to-br from-marigold to-gold text-maroon",
                        phase === "stopped" &&
                            "border-transparent bg-sindoor text-primary-foreground",
                        phase === "idle" && "bg-card",
                    )}
                >
                    <div>
                        <HugeiconsIcon
                            icon={playing ? PlayIcon : Chair01Icon}
                            className={cn("mx-auto size-14", playing && "animate-dhak")}
                        />
                        <p className="mt-3 font-heading text-5xl font-bold">
                            {statusLabel(loading, phase)}
                        </p>
                        {roundNo > 0 && (
                            <p className="mt-1 text-sm font-semibold opacity-80">Round {roundNo}</p>
                        )}
                        {playing && currentTitle && (
                            <p className="mt-1 text-sm opacity-80">♪ {currentTitle}</p>
                        )}
                        {playing && showTimer && remaining !== null && (
                            <p className="mt-3 font-heading text-3xl tabular-nums">
                                {remaining.toFixed(1)}s
                            </p>
                        )}
                    </div>
                </div>

                {/* The YouTube player lives here; it has to be on screen to play. */}
                <div
                    ref={hostRef}
                    className={cn(
                        "aspect-video w-full max-w-xs overflow-hidden rounded-xl bg-black",
                        !hasYouTube && "hidden",
                    )}
                />

                <div className="flex flex-wrap gap-3">
                    <Button
                        size="lg"
                        onClick={() => void startRound()}
                        disabled={pending || loading || songs.length === 0}
                        className="h-14 flex-1 rounded-2xl text-lg"
                    >
                        <HugeiconsIcon
                            icon={PlayIcon}
                            data-icon="inline-start"
                            className="size-5"
                        />
                        Start round{" "}
                        <kbd className="ml-2 rounded bg-primary-foreground/20 px-1.5 text-xs">
                            Space
                        </kbd>
                    </Button>
                    <Button
                        size="lg"
                        variant="destructive"
                        onClick={() => void stopRound(true)}
                        disabled={!playing}
                        className="h-14 rounded-2xl px-6"
                    >
                        <HugeiconsIcon
                            icon={StopIcon}
                            data-icon="inline-start"
                            className="size-5"
                        />
                        Stop now
                    </Button>
                </div>
                {songs.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        The pool is empty. Add songs from the library on the right, or{" "}
                        <Link href="/admin/songs" className="underline">
                            add a YouTube link on the Songs page
                        </Link>
                        .
                    </p>
                )}

                <div className="rounded-2xl border bg-card p-5">
                    <h2 className="font-semibold">Who’s out this round?</h2>
                    <form
                        className="mt-3 flex flex-wrap items-start gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!roundId) return;
                            startTransition(async () => {
                                await setRoundEliminated(roundId, eliminated);
                                toast.success("Saved. The leaderboard is updated.");
                            });
                        }}
                    >
                        <PlayerPicker
                            players={stillIn}
                            value={eliminated}
                            onChange={setEliminated}
                            placeholder="Choose the player who lost the chair"
                            disabled={!roundId}
                        />
                        <Button type="submit" disabled={!roundId || pending}>
                            Save
                        </Button>
                    </form>
                    {playerNames.length === 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            Nobody has registered yet. You can still type a name.
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <h2 className="font-semibold">Finish the game</h2>
                    <form
                        className="mt-3 flex flex-wrap items-start gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!winnerValue.trim()) return;
                            startTransition(async () => {
                                await finishMusicalChair(programmeId, winnerValue);
                                toast.success("Leaderboard published and programme completed");
                            });
                        }}
                    >
                        <PlayerPicker
                            players={finalists}
                            value={winnerValue}
                            onChange={setWinner}
                            placeholder="Choose the winner"
                        />
                        <Button
                            type="submit"
                            variant="secondary"
                            disabled={pending || !winnerValue.trim()}
                        >
                            <HugeiconsIcon icon={Award01Icon} data-icon="inline-start" />
                            Publish
                        </Button>
                    </form>
                </div>
            </div>

            <aside className="min-w-0 space-y-6">
                <div className="rounded-2xl border bg-card p-5">
                    <h2 className="font-semibold">Round settings</h2>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="text-sm">
                            Shortest (s)
                            <Input
                                type="number"
                                min={3}
                                value={minPlay}
                                onChange={(e) => setMinPlay(Number(e.target.value))}
                            />
                        </label>
                        <label className="text-sm">
                            Longest (s)
                            <Input
                                type="number"
                                min={3}
                                value={maxPlay}
                                onChange={(e) => setMaxPlay(Number(e.target.value))}
                            />
                        </label>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Each round starts at a random point (after the first 20s) and stops at a
                        random moment in this range — players never know when.
                    </p>
                    <label className="mt-4 flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={showTimer}
                            onChange={(e) => setShowTimer(e.target.checked)}
                        />
                        <span>Show countdown (host only)</span>
                    </label>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Song pool ({songs.length})</h2>
                        <Link href="/admin/songs" className="text-xs font-semibold text-primary">
                            Manage →
                        </Link>
                    </div>
                    {songs.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                            No songs in the pool yet.
                        </p>
                    ) : (
                        <ul className="mt-2 space-y-1.5 text-sm">
                            {songs.map((s) => (
                                <li key={s.id} className="flex items-center gap-2">
                                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                        ♪ {s.title}
                                    </span>
                                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                                        {s.kind === "youtube" ? "YouTube" : "MP3"}
                                    </span>
                                    {s.kind === "youtube" && (
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            disabled={pending}
                                            aria-label={`Remove ${s.title} from the pool`}
                                            onClick={() =>
                                                startTransition(async () => {
                                                    await deleteSong(s.id);
                                                    toast.success("Removed from the pool");
                                                })
                                            }
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <StreamLibrary
                    songs={library}
                    inPlaylist={poolYouTube}
                    playingId={null}
                    addSongs={addSongsToMusicalChairPool}
                    target="pool"
                />

                <AdminCard title={`Visitor requests (${pendingRequests} waiting)`}>
                    {requests.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No requests yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {requests.map((r) => (
                                <li key={r.id} className="flex items-start gap-3">
                                    {r.thumbnail_url && (
                                        <Image
                                            src={r.thumbnail_url}
                                            alt=""
                                            width={96}
                                            height={54}
                                            className="aspect-video w-14 shrink-0 rounded object-cover"
                                        />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-sm font-medium">
                                            {r.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {r.requested_by} · {r.upvotes} vote
                                            {r.upvotes === 1 ? "" : "s"}
                                        </p>
                                        {r.status === "pending" ? (
                                            <div className="mt-1.5 flex flex-wrap gap-2">
                                                <Button
                                                    size="xs"
                                                    disabled={pending}
                                                    onClick={() =>
                                                        startTransition(async () => {
                                                            await addMusicalChairRequestToPool(
                                                                r.id,
                                                            );
                                                            toast.success("Added to the pool");
                                                            router.refresh();
                                                        })
                                                    }
                                                >
                                                    Add to pool
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    disabled={pending}
                                                    onClick={() =>
                                                        startTransition(async () => {
                                                            await rejectMusicalChairRequest(r.id);
                                                            toast.success("Request rejected");
                                                        })
                                                    }
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="mt-1 text-xs font-semibold text-success">
                                                In the pool
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </AdminCard>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Rounds so far</h2>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    disabled={pending || roundNo === 0}
                                >
                                    Reset
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Clear all rounds?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This starts a fresh game. Every round and who was out is
                                        deleted, and the leaderboard goes back to everyone being in.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Keep them</AlertDialogCancel>
                                    <AlertDialogAction
                                        variant="destructive"
                                        onClick={() =>
                                            startTransition(async () => {
                                                await resetRounds(programmeId);
                                                setRoundNo(0);
                                                setRoundId(null);
                                                setEliminated("");
                                                setPhase("idle");
                                                broadcast({ phase: "idle", round: 0 });
                                            })
                                        }
                                    >
                                        Clear rounds
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    {rounds.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">None yet.</p>
                    ) : (
                        <ol className="mt-2 space-y-1 text-sm">
                            {rounds.map((r) => (
                                <li key={r.id} className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">R{r.round_no}</span>
                                    <span className="truncate font-medium">
                                        {r.eliminated_name ?? "—"}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </aside>
        </div>
    );
}
