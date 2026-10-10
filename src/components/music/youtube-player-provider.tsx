"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { loadYouTubeApi, type YTPlayer } from "@/lib/youtube-api";

export type PlayableTrack = {
    id: string;
    title: string;
    artist: string | null;
    youtubeId: string;
};

type PlayerContextValue = {
    queue: PlayableTrack[];
    index: number;
    current: PlayableTrack | null;
    isPlaying: boolean;
    playQueue: (tracks: PlayableTrack[], startIndex?: number) => void;
    toggle: () => void;
    next: () => void;
    previous: () => void;
    close: () => void;
    /** The mini player calls this with the element the iframe should mount into. */
    registerHost: (el: HTMLDivElement | null) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function YouTubePlayerProvider({ children }: { children: ReactNode }) {
    const [queue, setQueue] = useState<PlayableTrack[]>([]);
    const [index, setIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const playerRef = useRef<YTPlayer | null>(null);
    const hostRef = useRef<HTMLDivElement | null>(null);
    const queueRef = useRef(queue);
    const indexRef = useRef(index);

    useEffect(() => {
        queueRef.current = queue;
        indexRef.current = index;
    }, [queue, index]);

    const current = queue[index] ?? null;

    const advance = useCallback((delta: number) => {
        const q = queueRef.current;
        if (q.length === 0) return;
        setIndex((i) => (i + delta + q.length) % q.length);
    }, []);

    // Load whichever track is current into the (lazily created) player.
    useEffect(() => {
        if (!current) return;
        let cancelled = false;
        loadYouTubeApi().then((YT) => {
            if (cancelled || !hostRef.current) return;
            if (playerRef.current) {
                playerRef.current.loadVideoById(current.youtubeId);
                return;
            }
            const mount = document.createElement("div");
            hostRef.current.replaceChildren(mount);
            playerRef.current = new YT.Player(mount, {
                videoId: current.youtubeId,
                width: "100%",
                height: "100%",
                playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
                events: {
                    onReady: (e) => e.target.playVideo(),
                    onStateChange: (e) => {
                        if (e.data === YT.PlayerState.PLAYING) setIsPlaying(true);
                        if (e.data === YT.PlayerState.PAUSED) setIsPlaying(false);
                        if (e.data === YT.PlayerState.ENDED) {
                            setIsPlaying(false);
                            advance(1);
                        }
                    },
                },
            });
        });
        return () => {
            cancelled = true;
        };
    }, [current, advance]);

    const playQueue = useCallback((tracks: PlayableTrack[], startIndex = 0) => {
        if (tracks.length === 0) return;
        setQueue(tracks);
        setIndex(Math.min(Math.max(startIndex, 0), tracks.length - 1));
    }, []);

    const toggle = useCallback(() => {
        const player = playerRef.current;
        if (!player) return;
        if (isPlaying) player.pauseVideo();
        else player.playVideo();
    }, [isPlaying]);

    const close = useCallback(() => {
        playerRef.current?.destroy();
        playerRef.current = null;
        setQueue([]);
        setIndex(0);
        setIsPlaying(false);
    }, []);

    const registerHost = useCallback((el: HTMLDivElement | null) => {
        hostRef.current = el;
    }, []);

    const value = useMemo<PlayerContextValue>(
        () => ({
            queue,
            index,
            current,
            isPlaying,
            playQueue,
            toggle,
            next: () => advance(1),
            previous: () => advance(-1),
            close,
            registerHost,
        }),
        [queue, index, current, isPlaying, playQueue, toggle, advance, close, registerHost],
    );

    return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error("usePlayer must be used inside YouTubePlayerProvider");
    return ctx;
}
