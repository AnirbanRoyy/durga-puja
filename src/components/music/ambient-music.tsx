"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { DrumIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/components/music/youtube-player-provider";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dp_ambient";
const PREF_EVENT = "dp-ambient-change";
const VOLUME = 0.5;
const FADE_MS = 600;

function subscribePref(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(PREF_EVENT, onChange);
    return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(PREF_EVENT, onChange);
    };
}

/** On by default: only an explicit "off" from the visitor is remembered. */
function readPref(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
        return true;
    }
}

// Events browsers accept as a user gesture for starting audio (touch needs pointerup/touchend).
const GESTURES = ["pointerup", "touchend", "click", "keydown"] as const;

function writePref(on: boolean) {
    try {
        localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch {
        // Private mode etc. — the toggle still works for this visit.
    }
    window.dispatchEvent(new Event(PREF_EVENT));
}

const noopSubscribe = () => () => {};

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

/**
 * Background loop, on by default. Browsers block sound until the visitor interacts with the page,
 * so it starts on their first tap, click or key press (or immediately where the browser allows it).
 * Turning it off is remembered. It steps aside while the YouTube player runs.
 */
export function AmbientMusic({ src }: { src: string }) {
    const t = useTranslations("ambient");
    const { isPlaying: youtubePlaying } = usePlayer();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audible, setAudible] = useState(false);

    // Both are false on the server and on first hydration, then pick up localStorage.
    const wanted = useSyncExternalStore(subscribePref, readPref, () => false);
    const ready = useSyncExternalStore(
        noopSubscribe,
        () => true,
        () => false,
    );

    const getAudio = useCallback(() => {
        if (!audioRef.current) {
            const audio = new Audio(src);
            audio.loop = true;
            audio.preload = "auto";
            audio.volume = 0;
            // Reflect real playback state, whoever caused it.
            audio.addEventListener("playing", () => setAudible(true));
            audio.addEventListener("pause", () => setAudible(false));
            audioRef.current = audio;
        }
        return audioRef.current;
    }, [src]);

    const start = useCallback(async (): Promise<boolean> => {
        const audio = getAudio();
        try {
            await audio.play();
            void fade(audio, VOLUME, FADE_MS);
            return true;
        } catch {
            return false; // Autoplay still blocked; wait for a gesture.
        }
    }, [getAudio]);

    const stop = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio || audio.paused) return;
        await fade(audio, 0, FADE_MS / 2);
        audio.pause();
    }, []);

    useEffect(
        () => () => {
            audioRef.current?.pause();
            audioRef.current = null;
        },
        [],
    );

    // Wanted (the default): start now if the browser allows it, otherwise on the first gesture.
    useEffect(() => {
        if (!ready || !wanted || youtubePlaying || audible || document.hidden) return;
        let cancelled = false;
        const resume = () => {
            void start().then((ok) => {
                if (ok) detach();
            });
        };
        const detach = () => {
            for (const type of GESTURES) window.removeEventListener(type, resume);
        };
        void start().then((ok) => {
            if (!ok && !cancelled) {
                for (const type of GESTURES) window.addEventListener(type, resume);
            }
        });
        return () => {
            cancelled = true;
            detach();
        };
    }, [ready, wanted, youtubePlaying, audible, start]);

    // Duck out of the way while a YouTube track is playing.
    useEffect(() => {
        if (youtubePlaying) void stop();
    }, [youtubePlaying, stop]);

    // Be polite when the tab is in the background.
    useEffect(() => {
        const onVisibility = () => {
            if (document.hidden) void stop();
            else if (wanted && !youtubePlaying) void start();
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
    }, [wanted, youtubePlaying, start, stop]);

    function toggle() {
        if (wanted) {
            writePref(false);
            void stop();
        } else {
            writePref(true);
            void start();
        }
    }

    if (!ready) return null;

    return (
        <Button
            type="button"
            variant={wanted ? "default" : "ghost"}
            size="icon"
            onClick={toggle}
            aria-pressed={wanted}
            aria-label={wanted ? t("on") : t("off")}
            title={wanted ? t("on") : t("off")}
            className="relative rounded-full"
        >
            <HugeiconsIcon
                icon={DrumIcon}
                className={cn("size-4.5", wanted && audible && "animate-dhak")}
            />
            {!wanted && (
                <span
                    className="absolute h-0.5 w-5 -rotate-45 rounded bg-current opacity-70"
                    aria-hidden
                />
            )}
        </Button>
    );
}
