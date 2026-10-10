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

export async function setStreamUpNext(id: string) {
    return run((year) => db().rpc("set_stream_up_next", { p_year: year, p_request_id: id }));
}
