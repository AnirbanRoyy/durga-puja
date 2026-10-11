import { loadYouTubeApi, type YTPlayer } from "@/lib/youtube-api";

/** A song in the musical chair pool: a YouTube video or an uploaded MP3. */
export type PoolSong = {
    id: string;
    title: string;
    kind: "youtube" | "audio";
    /** MP3 url, or the YouTube video id. */
    ref: string;
    duration: number | null;
};

export type Started = { duration: number | null; offset: number };

/** Plays one song of a round, from a point the caller picks once the length is known. */
export type RoundVoice = {
    /** Starts silently at the chosen offset; resolves once the song is really playing. */
    start: (
        song: PoolSong,
        pickOffset: (duration: number | null) => number,
        signal: { cancelled: boolean },
    ) => Promise<Started>;
    fadeTo: (volume: number, ms: number) => Promise<void>;
    stop: () => void;
    /** Called when the song reaches its end by itself. */
    onEnded: (cb: () => void) => void;
};

function fadeValue(from: number, to: number, ms: number, set: (v: number) => void): Promise<void> {
    return new Promise((resolve) => {
        const begin = performance.now();
        const step = () => {
            const t = ms <= 0 ? 1 : Math.min(1, (performance.now() - begin) / ms);
            set(Math.min(1, Math.max(0, from + (to - from) * t)));
            if (t < 1) requestAnimationFrame(step);
            else resolve();
        };
        step();
    });
}

/** MP3 voice: one preloaded <audio> per song, as the console always did. */
export function createAudioVoice(): RoundVoice & { preload: (song: PoolSong) => void } {
    let current: HTMLAudioElement | null = null;
    let ready: { id: string; audio: HTMLAudioElement } | null = null;
    let ended: (() => void) | null = null;

    const make = (song: PoolSong) => {
        const audio = new Audio(song.ref);
        audio.preload = "auto";
        audio.volume = 0;
        return audio;
    };

    return {
        preload(song) {
            ready = { id: song.id, audio: make(song) };
        },
        async start(song, pickOffset) {
            const audio = ready?.id === song.id ? ready.audio : make(song);
            ready = null;
            if (audio.readyState < 1) {
                await new Promise<void>((resolve, reject) => {
                    audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
                    audio.addEventListener(
                        "error",
                        () => reject(new Error("Could not load song")),
                        {
                            once: true,
                        },
                    );
                });
            }
            const duration = Number.isFinite(audio.duration) ? audio.duration : song.duration;
            const offset = pickOffset(duration ?? null);
            audio.currentTime = offset;
            audio.volume = 0;
            await audio.play();
            current = audio;
            audio.addEventListener("ended", () => ended?.(), { once: true });
            return { duration: duration ?? null, offset };
        },
        fadeTo(volume, ms) {
            const audio = current;
            return audio
                ? fadeValue(audio.volume, volume, ms, (v) => (audio.volume = v))
                : Promise.resolve();
        },
        stop() {
            current?.pause();
            current = null;
        },
        onEnded(cb) {
            ended = cb;
        },
    };
}

const PLAYER_ERRORS: Record<number, string> = {
    2: "That video link is invalid.",
    5: "That video can't be played in this player.",
    100: "That video was removed or is private.",
    101: "The owner doesn't allow this video to be embedded.",
    150: "The owner doesn't allow this video to be embedded.",
};

/** YouTube voice: one player in `host`, created once and reused for every round. */
export function createYouTubeVoice(host: HTMLElement): RoundVoice {
    let player: YTPlayer | null = null;
    let loading: Promise<YTPlayer> | null = null;
    let playing = false;
    let volume = 0;
    let ended: (() => void) | null = null;
    let waiter: { ok: () => void; fail: (e: Error) => void } | null = null;

    function ensure(): Promise<YTPlayer> {
        loading ??= loadYouTubeApi().then(
            (YT) =>
                new Promise<YTPlayer>((resolve) => {
                    const mount = document.createElement("div");
                    host.replaceChildren(mount);
                    const created = new YT.Player(mount, {
                        width: "100%",
                        height: "100%",
                        playerVars: { playsinline: 1, rel: 0, controls: 0, disablekb: 1 },
                        events: {
                            onReady: (e) => {
                                e.target.setVolume(0);
                                player = created;
                                resolve(created);
                            },
                            onStateChange: (e) => {
                                if (e.data === YT.PlayerState.PLAYING) waiter?.ok();
                                if (e.data === YT.PlayerState.ENDED && playing) ended?.();
                            },
                            onError: (e) =>
                                waiter?.fail(
                                    new Error(
                                        PLAYER_ERRORS[e.data] ?? "That video can't be played.",
                                    ),
                                ),
                        },
                    });
                }),
        );
        return loading;
    }

    return {
        async start(song, pickOffset, signal) {
            const p = await ensure();
            volume = 0;
            p.setVolume(0);
            const started = new Promise<void>((ok, fail) => {
                const timer = setTimeout(
                    () => fail(new Error("The video took too long to start.")),
                    20_000,
                );
                waiter = {
                    ok: () => {
                        clearTimeout(timer);
                        ok();
                    },
                    fail: (e) => {
                        clearTimeout(timer);
                        fail(e);
                    },
                };
            });
            p.loadVideoById(song.ref);
            try {
                await started;
            } finally {
                waiter = null;
            }
            if (signal.cancelled) {
                p.pauseVideo();
                throw new Error("cancelled");
            }
            const length = p.getDuration();
            const duration = length > 0 ? length : null;
            const offset = pickOffset(duration);
            if (offset > 0) p.seekTo(offset, true);
            playing = true;
            return { duration, offset };
        },
        fadeTo(target, ms) {
            const p = player;
            if (!p) return Promise.resolve();
            return fadeValue(volume, target, ms, (v) => {
                volume = v;
                p.setVolume(Math.round(v * 100));
            });
        },
        stop() {
            playing = false;
            player?.pauseVideo();
        },
        onEnded(cb) {
            ended = cb;
        },
    };
}
