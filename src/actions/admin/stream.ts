"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getCurrentYear } from "@/lib/queries";
import { db } from "@/lib/supabase/server";

export type StreamActionResult = { ok: true } | { ok: false; message: string };

async function run(
    call: (year: number) => PromiseLike<{ error: { message: string } | null }>,
): Promise<StreamActionResult> {
    await requireAdmin();
    const { error } = await call(await getCurrentYear());
    if (error) {
        return {
            ok: false,
            message: error.message.includes("not_approved")
                ? "Only approved songs can be played next."
                : error.message,
        };
    }
    refresh();
    return { ok: true };
}

export async function approveStreamRequest(id: string) {
    return run(() => db().rpc("approve_stream_request", { p_request_id: id }));
}

export async function rejectStreamRequest(id: string) {
    return run(() => db().rpc("reject_stream_request", { p_request_id: id }));
}

export async function approveQuotaReset(id: string) {
    return run(() => db().rpc("approve_stream_quota_reset", { p_request_id: id }));
}

export async function rejectQuotaReset(id: string) {
    return run(() => db().rpc("reject_stream_quota_reset", { p_request_id: id }));
}

export async function startStream() {
    return run((year) => db().rpc("start_stream", { p_year: year }));
}

export async function stopStream() {
    return run((year) => db().rpc("stop_stream", { p_year: year }));
}

/** The current song finished (or was skipped, or can't play): move on to "Up next". */
export async function advanceStream() {
    return run((year) => db().rpc("advance_stream", { p_year: year }));
}

/** Puts library songs straight into the playlist as approved; says how many were new to it. */
export async function addLibrarySongsToStream(
    songIds: string[],
): Promise<StreamActionResult & { added?: number }> {
    await requireAdmin();
    if (!songIds.length) return { ok: false, message: "Pick at least one song." };
    const { data: songs, error: songsError } = await db()
        .from("songs")
        .select("title, artist, youtube_id")
        .in("id", songIds)
        .eq("source", "youtube")
        .eq("active", true);
    if (songsError) return { ok: false, message: songsError.message };
    const list = songs.flatMap((s) =>
        s.youtube_id ? [{ youtube_id: s.youtube_id, title: s.title, channel: s.artist }] : [],
    );
    if (!list.length) return { ok: false, message: "None of those songs can be streamed." };
    const { data, error } = await db().rpc("add_stream_songs", {
        p_year: await getCurrentYear(),
        p_songs: list,
    });
    if (error) return { ok: false, message: error.message };
    refresh();
    return { ok: true, added: data ?? 0 };
}

/** Takes a waiting song out of the playlist (the song playing now has to be skipped instead). */
export async function removeStreamSong(id: string): Promise<StreamActionResult> {
    await requireAdmin();
    const { data, error } = await db().rpc("remove_stream_song", { p_request_id: id });
    if (error) return { ok: false, message: error.message };
    if (data === "now_playing") {
        return { ok: false, message: "This song is playing now. Use Skip instead." };
    }
    refresh();
    return { ok: true };
}

export async function setStreamUpNext(id: string) {
    return run((year) => db().rpc("set_stream_up_next", { p_year: year, p_request_id: id }));
}
