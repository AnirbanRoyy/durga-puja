// Shared bits of the YouTube IFrame Player API (loaded on demand, once per page).

export type YTPlayer = {
    loadVideoById: (id: string) => void;
    playVideo: () => void;
    pauseVideo: () => void;
    stopVideo: () => void;
    setVolume: (volume: number) => void;
    destroy: () => void;
};

export type YTNamespace = {
    Player: new (
        el: HTMLElement,
        opts: {
            videoId: string;
            width?: string | number;
            height?: string | number;
            playerVars?: Record<string, number | string>;
            events?: {
                onReady?: (e: { target: YTPlayer }) => void;
                onStateChange?: (e: { data: number; target: YTPlayer }) => void;
                /** Fired when a video can't be played (removed, private, embedding disabled). */
                onError?: (e: { data: number; target: YTPlayer }) => void;
            };
        },
    ) => YTPlayer;
    PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

declare global {
    interface Window {
        YT?: YTNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

let apiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (!apiPromise) {
        apiPromise = new Promise((resolve) => {
            const previous = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                previous?.();
                resolve(window.YT!);
            };
            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            document.head.appendChild(script);
        });
    }
    return apiPromise;
}
