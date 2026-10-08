"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Award01Icon, Chair01Icon, PlayIcon, StopIcon } from "@hugeicons/core-free-icons";
import {
    finishMusicalChair,
    recordRound,
    resetRounds,
    setRoundEliminated,
} from "@/actions/admin/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MusicalChairRound } from "@/lib/database.types";
import {
    MC_EVENT,
    musicalChairChannel,
    pickStartOffset,
    randomBetween,
    type MusicalChairState,
} from "@/lib/musical-chair";
import { browserDb } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ConsoleSong = { id: string; title: string; url: string; duration: number | null };
type Prepared = { song: ConsoleSong; audio: HTMLAudioElement };

const FADE_IN_MS = 300;
const FADE_OUT_MS = 80;

function fade(audio: HTMLAudioElement, to: number, ms: number): Promise<void> {
    return new Promise((resolve) => {
        const from = audio.volume;
        const start = performance.now();
        const step = () => {
            const t = Math.min(1, (performance.now() - start) / ms);
            audio.volume = Math.min(1, Math.max(0, from + (to - from) * t));
            if (t < 1) requestAnimationFrame(step);
            else resolve();
        };
        step();
    });
}

function prepare(song: ConsoleSong): Prepared {
    const audio = new Audio(song.url);
    audio.preload = "auto";
    audio.volume = 0;
    return { song, audio };
}

function waitForMetadata(audio: HTMLAudioElement): Promise<void> {
    if (audio.readyState >= 1) return Promise.resolve();
    return new Promise((resolve, reject) => {
        audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
        audio.addEventListener("error", () => reject(new Error("Could not load song")), {
            once: true,
        });
    });
}

export function MusicalChairConsole({
    programmeId,
    songs,
    rounds,
    playerNames,
}: {
    programmeId: string;
    songs: ConsoleSong[];
    rounds: MusicalChairRound[];
    playerNames: string[];
}) {
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
    const [pending, startTransition] = useTransition();

    const bagRef = useRef<ConsoleSong[]>([]);
    const nextRef = useRef<Prepared | null>(null);
    const activeRef = useRef<HTMLAudioElement | null>(null);
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
            supabase.removeChannel(channel);
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

    /** Shuffle bag: every song plays once before any repeats. */
    const drawSong = useCallback((): ConsoleSong | null => {
        if (songs.length === 0) return null;
        if (bagRef.current.length === 0) {
            const copy = [...songs];
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(randomBetween(0, i + 0.999999));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            // Avoid the same song twice in a row across bag refills.
            if (copy.length > 1 && copy[0].id === nextRef.current?.song.id)
                copy.push(copy.shift()!);
            bagRef.current = copy;
        }
        return bagRef.current.pop() ?? null;
    }, [songs]);

    const preloadNext = useCallback(() => {
        const song = drawSong();
        nextRef.current = song ? prepare(song) : null;
    }, [drawSong]);

    useEffect(() => {
        preloadNext();
        return () => {
            activeRef.current?.pause();
            nextRef.current?.audio.pause();
            if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
            if (tickRef.current) clearInterval(tickRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stopRound = useCallback(
        async (manual = false) => {
            if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
            if (tickRef.current) clearInterval(tickRef.current);
            stopTimerRef.current = null;
            tickRef.current = null;
            const audio = activeRef.current;
            activeRef.current = null;
            setRemaining(null);
            setPhase("stopped");
            broadcast({ phase: "stopped", round: roundRef.current });
            if (audio) {
                await fade(audio, 0, FADE_OUT_MS);
                audio.pause();
            }
            if (manual) toast("Music stopped");
        },
        [broadcast],
    );

    const startRound = useCallback(async () => {
        if (busyRef.current) return;
        if (songs.length === 0) {
            toast.error("Upload at least one song to the musical chair pool first.");
            return;
        }
        busyRef.current = true;
        try {
            if (activeRef.current) await stopRound();
            const prepared = nextRef.current ?? (preloadNext(), nextRef.current);
            if (!prepared) return;
            const { song, audio } = prepared;
            nextRef.current = null;

            await waitForMetadata(audio);
            const duration = Number.isFinite(audio.duration)
                ? audio.duration
                : (song.duration ?? null);
            const lo = Math.max(1, Math.min(minPlay, maxPlay));
            const hi = Math.max(lo, maxPlay);
            const playFor = randomBetween(lo, hi);
            const offset = pickStartOffset(duration, hi);

            audio.currentTime = offset;
            audio.volume = 0;
            await audio.play();
            activeRef.current = audio;
            void fade(audio, 1, FADE_IN_MS);

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
            // Song ended earlier than planned (very short file): stop when it does.
            audio.addEventListener("ended", () => void stopRound(), { once: true });

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
            nextRef.current = null;
            preloadNext();
        } finally {
            busyRef.current = false;
        }
    }, [songs.length, stopRound, preloadNext, minPlay, maxPlay, broadcast, programmeId]);

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

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
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
                            {playing ? "Music playing" : phase === "stopped" ? "STOP!" : "Ready"}
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

                <div className="flex flex-wrap gap-3">
                    <Button
                        size="lg"
                        onClick={() => void startRound()}
                        disabled={pending || songs.length === 0}
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

                <div className="rounded-2xl border bg-card p-5">
                    <h2 className="font-semibold">Who’s out this round?</h2>
                    <datalist id="mc-players">
                        {playerNames.map((n) => (
                            <option key={n} value={n} />
                        ))}
                    </datalist>
                    <form
                        className="mt-3 flex gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!roundId) return;
                            startTransition(async () => {
                                await setRoundEliminated(roundId, eliminated);
                                toast.success("Saved");
                            });
                        }}
                    >
                        <Input
                            list="mc-players"
                            value={eliminated}
                            onChange={(e) => setEliminated(e.target.value)}
                            placeholder="Name of the player who lost the chair"
                            disabled={!roundId}
                        />
                        <Button type="submit" disabled={!roundId || pending}>
                            Save
                        </Button>
                    </form>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <h2 className="font-semibold">Finish the game</h2>
                    <form
                        className="mt-3 flex gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!winner.trim()) return;
                            startTransition(async () => {
                                await finishMusicalChair(programmeId, winner);
                                toast.success("Leaderboard published and programme completed");
                            });
                        }}
                    >
                        <Input
                            list="mc-players"
                            value={winner}
                            onChange={(e) => setWinner(e.target.value)}
                            placeholder="Winner’s name"
                        />
                        <Button
                            type="submit"
                            variant="secondary"
                            disabled={pending || !winner.trim()}
                        >
                            <HugeiconsIcon icon={Award01Icon} data-icon="inline-start" />
                            Publish
                        </Button>
                    </form>
                </div>
            </div>

            <aside className="space-y-6">
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
                        Show countdown (host only)
                    </label>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Song pool</h2>
                        <Link href="/admin/songs" className="text-xs font-semibold text-primary">
                            Manage →
                        </Link>
                    </div>
                    {songs.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                            No songs yet — upload some in Songs.
                        </p>
                    ) : (
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {songs.map((s) => (
                                <li key={s.id} className="truncate">
                                    ♪ {s.title}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Rounds so far</h2>
                        <Button
                            size="xs"
                            variant="ghost"
                            disabled={pending || roundNo === 0}
                            onClick={() => {
                                if (confirm("Clear all rounds for a fresh game?")) {
                                    startTransition(async () => {
                                        await resetRounds(programmeId);
                                        setRoundNo(0);
                                        setRoundId(null);
                                        setEliminated("");
                                        setPhase("idle");
                                        broadcast({ phase: "idle", round: 0 });
                                    });
                                }
                            }}
                        >
                            Reset
                        </Button>
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
