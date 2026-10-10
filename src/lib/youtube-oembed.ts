import "server-only";

export type YouTubeInfo = { title: string; channel: string | null; thumbnail: string };

/**
 * Looks a video up through YouTube's public oEmbed endpoint (no API key). A video that is
 * private, removed or not embeddable fails here, so unplayable songs never reach the queue.
 */
export async function fetchYouTubeInfo(videoId: string): Promise<YouTubeInfo | null> {
    try {
        const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
            `https://www.youtube.com/watch?v=${videoId}`,
        )}&format=json`;
        const response = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
        if (!response.ok) return null;
        const data = (await response.json()) as { title?: string; author_name?: string };
        if (!data.title) return null;
        return {
            title: data.title.slice(0, 160),
            channel: data.author_name?.slice(0, 120) ?? null,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        };
    } catch {
        return null;
    }
}
