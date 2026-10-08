/** Realtime broadcast contract between the host console and the public screen. */
export type MusicalChairPhase = "idle" | "playing" | "stopped";

export type MusicalChairState = {
    phase: MusicalChairPhase;
    round: number;
    songTitle?: string | null;
    at: number;
};

export const MC_EVENT = "state";

export function musicalChairChannel(programmeId: string): string {
    return `mc:${programmeId}`;
}

/** Inclusive random float in [min, max] using the crypto RNG. */
export function randomBetween(min: number, max: number): number {
    if (max <= min) return min;
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return min + (buf[0] / 0xffffffff) * (max - min);
}

export const MIN_START_OFFSET = 20;
export const SHORT_SONG_OFFSET = 15;

/**
 * Picks where in the song to start: always past the intro (≥20s), and leaving room for the
 * longest possible round. Short songs fall back to a 15s offset.
 */
export function pickStartOffset(durationSec: number | null, maxPlaySec: number): number {
    if (!durationSec || !Number.isFinite(durationSec)) return MIN_START_OFFSET;
    const latest = durationSec - maxPlaySec - 5;
    if (latest <= MIN_START_OFFSET) {
        return Math.min(SHORT_SONG_OFFSET, Math.max(0, durationSec - maxPlaySec));
    }
    return randomBetween(MIN_START_OFFSET, latest);
}
