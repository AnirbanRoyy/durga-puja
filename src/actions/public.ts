"use server";

import { refresh } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/supabase/server";
import {
    feedbackSchema,
    fieldErrors,
    normalizeSongKey,
    registrationSchema,
    songRequestSchema,
    type ActionState,
} from "@/lib/validators";
import { getClientIp, getVisitorId, getVoterHash } from "@/lib/visitor";

function formObject(formData: FormData): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string") out[key] = value;
    }
    return out;
}

function fail(formData: FormData, code: string, errors?: Record<string, string>): ActionState {
    return { ok: false, code, errors, values: formObject(formData) };
}

/** Bots fill every field; humans never see this one. */
function isBot(formData: FormData): boolean {
    return Boolean(formData.get("website"));
}

export async function registerForProgramme(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    if (isBot(formData)) return { ok: true, code: "registered" };

    const parsed = registrationSchema.safeParse(formObject(formData));
    if (!parsed.success) return fail(formData, "invalid", fieldErrors(parsed.error));
    const input = parsed.data;

    if (!(await rateLimit(`register:${await getClientIp()}`, 15, 600))) {
        return fail(formData, "rateLimited");
    }

    const supabase = db();
    const { data: programme, error: programmeError } = await supabase
        .from("programmes")
        .select("id, registration_open, status, max_participants, order_locked")
        .eq("id", input.programmeId)
        .maybeSingle();
    if (programmeError) throw programmeError;
    if (
        !programme ||
        !programme.registration_open ||
        programme.status === "completed" ||
        programme.status === "cancelled"
    ) {
        return fail(formData, "registrationClosed");
    }

    const { data: existing, error: countError } = await supabase
        .from("registrations")
        .select("sequence_no")
        .eq("programme_id", programme.id);
    if (countError) throw countError;
    if (programme.max_participants && existing.length >= programme.max_participants) {
        return fail(formData, "full");
    }

    // Once the call order is locked, late entries go to the end of the line.
    const sequenceNo = programme.order_locked
        ? Math.max(0, ...existing.map((r) => r.sequence_no ?? 0)) + 1
        : null;

    const { data: registration, error: insertError } = await supabase
        .from("registrations")
        .insert({
            programme_id: programme.id,
            name: input.name,
            sequence_no: sequenceNo,
        })
        .select("id")
        .single();
    if (insertError) throw insertError;

    const { error: contactError } = await supabase.from("registration_contacts").insert({
        registration_id: registration.id,
        programme_id: programme.id,
        phone: input.phone,
        name_key: input.name.toLowerCase().replace(/\s+/g, " "),
        age: input.age,
        guardian_name: input.guardianName,
        notes: input.notes,
    });
    if (contactError) {
        await supabase.from("registrations").delete().eq("id", registration.id);
        if (contactError.code === "23505") return fail(formData, "duplicate");
        throw contactError;
    }

    refresh();
    return { ok: true, code: "registered" };
}

export async function requestSong(_prev: ActionState, formData: FormData): Promise<ActionState> {
    if (isBot(formData)) return { ok: true, code: "requested" };

    const parsed = songRequestSchema.safeParse(formObject(formData));
    if (!parsed.success) return fail(formData, "invalid", fieldErrors(parsed.error));
    const input = parsed.data;

    if (!(await rateLimit(`song:${await getVisitorId()}`, 5, 3600))) {
        return fail(formData, "rateLimited");
    }

    const key = normalizeSongKey(input.title);
    if (!key) return fail(formData, "invalid", { title: "title" });

    const { error } = await db().rpc("request_song", {
        p_title: input.title,
        p_artist: input.artist,
        p_link: input.link,
        p_requested_by: input.requestedBy,
        p_normalized_key: key,
    });
    if (error) throw error;

    refresh();
    return { ok: true, code: "requested" };
}

export type VoteResult = "ok" | "already_voted" | "closed" | "not_found" | "rate_limited";

export async function castVote(drawingId: string): Promise<VoteResult> {
    if (!/^[0-9a-f-]{36}$/i.test(drawingId)) return "not_found";
    if (!(await rateLimit(`vote:${await getClientIp()}`, 60, 3600))) return "rate_limited";

    const { data, error } = await db().rpc("cast_vote", {
        p_drawing_id: drawingId,
        p_voter_hash: await getVoterHash(),
    });
    if (error) throw error;
    if (data === "ok") refresh();
    return data;
}

export async function submitFeedback(_prev: ActionState, formData: FormData): Promise<ActionState> {
    if (isBot(formData)) return { ok: true, code: "feedbackSent" };

    const parsed = feedbackSchema.safeParse(formObject(formData));
    if (!parsed.success) return fail(formData, "invalid", fieldErrors(parsed.error));

    if (!(await rateLimit(`feedback:${await getClientIp()}`, 5, 3600))) {
        return fail(formData, "rateLimited");
    }

    const { error } = await db().from("feedback").insert(parsed.data);
    if (error) throw error;
    return { ok: true, code: "feedbackSent" };
}
