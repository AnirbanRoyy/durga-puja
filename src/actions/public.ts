"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
    claimDevice,
    claimKey,
    deviceKey,
    drawingVoteKey,
    releaseDevice,
    releaseKey,
} from "@/lib/device-lock";
import {
    forgetRegistration,
    getMyRegistration,
    newEditToken,
    rememberRegistration,
} from "@/lib/my-registration";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentYear, STREAM_REQUEST_LIMIT } from "@/lib/queries";
import { db } from "@/lib/supabase/server";
import { parseRegistration } from "@/lib/registration-input";
import { fetchYouTubeInfo } from "@/lib/youtube-oembed";
import {
    feedbackSchema,
    fieldErrors,
    normalizeSongKey,
    parseYouTubeId,
    phoneSchema,
    songRequestSchema,
    type ActionState,
} from "@/lib/validators";
import { getClientIp, getIpHash, getVisitorId, getVoterHash } from "@/lib/visitor";

function formObject(formData: FormData): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string") out[key] = value;
    }
    return out;
}

/** A text field of a form; anything that isn't text (a file) counts as empty. */
function field(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
}

/** Field errors for the link and name of a song request, or null when both are fine. */
function songRequestErrors(videoId: string | null, name: string): Record<string, string> | null {
    const nameOk = name.length >= 2 && name.length <= 40;
    if (videoId && nameOk) return null;
    return { ...(videoId ? {} : { link: "link" }), ...(nameOk ? {} : { name: "name" }) };
}

/** One visitor (and one network) may only send so many song requests an hour. */
async function songRequestsTooFast(prefix: string, perVisitor: number, perNetwork: number) {
    if (!(await rateLimit(`${prefix}:${await getVisitorId()}`, perVisitor, 3600))) return true;
    return !(await rateLimit(`${prefix}-ip:${await getClientIp()}`, perNetwork, 3600));
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

    const ip = await getClientIp();
    if (!(await rateLimit(`register:${ip}`, 15, 600))) {
        return fail(formData, "rateLimited");
    }

    const parsed = await parseRegistration(formObject(formData));
    if (!parsed.ok) {
        return parsed.programme
            ? fail(formData, "invalid", parsed.errors)
            : fail(formData, "registrationClosed");
    }
    const { programme, input } = parsed;

    const supabase = db();
    if (
        !programme.registration_open ||
        programme.status === "completed" ||
        programme.status === "cancelled"
    ) {
        return fail(formData, "registrationClosed");
    }

    // Checked late so closed/full programmes never use up an address's one entry.
    const { data: existing, error: countError } = await supabase
        .from("registrations")
        .select("sequence_no")
        .eq("programme_id", programme.id);
    if (countError) throw countError;
    if (programme.max_participants && existing.length >= programme.max_participants) {
        return fail(formData, "full");
    }

    if (!(await claimDevice(ip, programme.slug))) return fail(formData, "deviceUsed");

    // Once the call order is locked, late entries go to the end of the line.
    const sequenceNo = programme.order_locked
        ? Math.max(0, ...existing.map((r) => r.sequence_no ?? 0)) + 1
        : null;

    const { data: registration, error: insertError } = await supabase
        .from("registrations")
        .insert({
            programme_id: programme.id,
            name: input.name,
            members: input.members,
            sequence_no: sequenceNo,
        })
        .select("id")
        .single();
    if (insertError) {
        await releaseDevice(ip, programme.slug);
        throw insertError;
    }

    const edit = newEditToken();
    const { error: contactError } = await supabase.from("registration_contacts").insert({
        edit_token_hash: edit.hash,
        claim_key: deviceKey(ip, programme.slug),
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
        await releaseDevice(ip, programme.slug);
        if (contactError.code === "23505") return fail(formData, "duplicate");
        throw contactError;
    }

    await rememberRegistration(programme.id, registration.id, edit.token);
    refresh();
    return { ok: true, code: "registered" };
}

/** Edit the visitor's own registration (proven by the secret in their browser). */
export async function updateMyRegistration(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    const parsed = await parseRegistration(formObject(formData));
    if (!parsed.ok) return fail(formData, "invalid", parsed.errors);
    const { programme, input } = parsed;

    const mine = await getMyRegistration(programme.id);
    if (!mine) return fail(formData, "notYours");

    const supabase = db();
    const { error: contactError } = await supabase
        .from("registration_contacts")
        .update({
            phone: input.phone,
            name_key: input.name.toLowerCase().replace(/\s+/g, " "),
            age: input.age,
            guardian_name: input.guardianName,
            notes: input.notes,
        })
        .eq("registration_id", mine.registrationId);
    if (contactError) {
        if (contactError.code === "23505") return fail(formData, "duplicate");
        throw contactError;
    }
    const { error } = await supabase
        .from("registrations")
        .update({ name: input.name, members: input.members })
        .eq("id", mine.registrationId);
    if (error) throw error;

    refresh();
    return { ok: true, code: "updated" };
}

/** Withdraw: removes the registration and frees this network to register again. */
export async function withdrawMyRegistration(programmeId: string): Promise<ActionState> {
    const mine = await getMyRegistration(programmeId);
    if (!mine) return { ok: false, code: "notYours" };

    const { error } = await db().from("registrations").delete().eq("id", mine.registrationId);
    if (error) throw error;
    if (mine.claimKey) await releaseKey(mine.claimKey);
    await forgetRegistration(programmeId);
    refresh();
    return { ok: true, code: "withdrawn" };
}

/**
 * For someone blocked on a shared network or a new browser: proves ownership with the phone
 * number used to register, and only for a registration made from this same network.
 */
export async function recoverRegistration(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    const programmeId = field(formData, "programmeId");
    const phone = phoneSchema.safeParse(field(formData, "phone"));
    if (!z.uuid().safeParse(programmeId).success || !phone.success) {
        return fail(formData, "invalid", { phone: "phone" });
    }

    const ip = await getClientIp();
    if (!(await rateLimit(`recover:${ip}`, 8, 600))) return fail(formData, "rateLimited");

    const supabase = db();
    const { data: programme } = await supabase
        .from("programmes")
        .select("slug")
        .eq("id", programmeId)
        .maybeSingle();
    const key = programme ? deviceKey(ip, programme.slug) : null;
    if (!key) return fail(formData, "noMatch");

    const { data: contact } = await supabase
        .from("registration_contacts")
        .select("registration_id")
        .eq("programme_id", programmeId)
        .eq("phone", phone.data)
        .eq("claim_key", key)
        .maybeSingle();
    if (!contact) return fail(formData, "noMatch");

    const edit = newEditToken();
    const { error } = await supabase
        .from("registration_contacts")
        .update({ edit_token_hash: edit.hash })
        .eq("registration_id", contact.registration_id);
    if (error) throw error;

    await rememberRegistration(programmeId, contact.registration_id, edit.token);
    refresh();
    return { ok: true, code: "recovered" };
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

/** A visitor adds a YouTube song to the pandal stream list (or upvotes it if it is already there). */
export async function requestStreamSong(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    if (isBot(formData)) return { ok: true, code: "streamAdded" };

    const name = field(formData, "name").trim();
    const videoId = parseYouTubeId(field(formData, "link"));
    const errors = songRequestErrors(videoId, name);
    if (errors || !videoId) return fail(formData, "invalid", errors ?? undefined);
    if (await songRequestsTooFast("stream", 6, 30)) return fail(formData, "rateLimited");

    const info = await fetchYouTubeInfo(videoId);
    if (!info) return fail(formData, "streamUnavailable", { link: "link" });

    const { data, error } = await db().rpc("request_stream_song", {
        p_year: await getCurrentYear(),
        p_youtube_id: videoId,
        p_title: info.title,
        p_channel: info.channel,
        p_thumbnail_url: info.thumbnail,
        p_requested_by: name,
        p_voter_hash: await getVoterHash(),
        p_ip_hash: await getIpHash(),
        p_limit: STREAM_REQUEST_LIMIT,
    });
    if (error) throw error;
    if (data === "rejected") return fail(formData, "streamRejected");
    if (data === "limit_reached") return fail(formData, "streamLimit");
    if (data === "already_requested") return fail(formData, "streamAlready");
    refresh();
    const codes = {
        added: "streamAdded",
        rerequested: "streamRerequested",
        upvoted: "streamUpvoted",
    };
    return { ok: true, code: codes[data] };
}

/** A visitor requests a YouTube song for a musical chair game (or upvotes it if it is already listed). */
export async function requestMusicalChairSong(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    if (isBot(formData)) return { ok: true, code: "streamAdded" };

    const programmeId = field(formData, "programmeId");
    const name = field(formData, "name").trim();
    const videoId = parseYouTubeId(field(formData, "link"));
    if (!z.uuid().safeParse(programmeId).success) return fail(formData, "invalid");
    const errors = songRequestErrors(videoId, name);
    if (errors || !videoId) return fail(formData, "invalid", errors ?? undefined);
    if (await songRequestsTooFast("mcsong", 6, 30)) return fail(formData, "rateLimited");

    const supabase = db();
    const { data: programme } = await supabase
        .from("programmes")
        .select("type, status")
        .eq("id", programmeId)
        .maybeSingle();
    if (programme?.type !== "musical_chair") return fail(formData, "invalid");
    if (programme.status === "completed" || programme.status === "cancelled") {
        return fail(formData, "registrationClosed");
    }

    const info = await fetchYouTubeInfo(videoId);
    if (!info) return fail(formData, "streamUnavailable", { link: "link" });

    const { data, error } = await supabase.rpc("request_musical_chair_song", {
        p_programme_id: programmeId,
        p_youtube_id: videoId,
        p_title: info.title,
        p_channel: info.channel,
        p_thumbnail_url: info.thumbnail,
        p_requested_by: name,
        p_voter_hash: await getVoterHash(),
        p_ip_hash: await getIpHash(),
        p_limit: STREAM_REQUEST_LIMIT,
    });
    if (error) throw error;
    if (data === "rejected") return fail(formData, "streamRejected");
    if (data === "limit_reached") return fail(formData, "streamLimit");
    if (data === "already_requested") return fail(formData, "streamAlready");
    if (data === "in_pool") return fail(formData, "mcInPool");
    refresh();
    return { ok: true, code: data === "added" ? "streamAdded" : "streamUpvoted" };
}

export async function upvoteMusicalChairSong(requestId: string): Promise<StreamVoteResult> {
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return "not_found";
    if (!(await rateLimit(`mcvote:${await getVisitorId()}`, 60, 3600))) return "rate_limited";
    const { data, error } = await db().rpc("upvote_musical_chair_request", {
        p_request_id: requestId,
        p_voter_hash: await getVoterHash(),
    });
    if (error) throw error;
    if (data === "ok") refresh();
    return data;
}

/** A visitor who has used all their song requests asks the organisers for a fresh allowance. */
export async function requestQuotaReset(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    if (isBot(formData)) return { ok: true, code: "quotaAsked" };

    const name = field(formData, "quotaName").trim();
    if (name.length < 2 || name.length > 40)
        return fail(formData, "invalid", { quotaName: "name" });
    if (!(await rateLimit(`stream-quota:${await getClientIp()}`, 5, 3600))) {
        return fail(formData, "rateLimited");
    }

    const { data, error } = await db().rpc("request_stream_quota_reset", {
        p_year: await getCurrentYear(),
        p_ip_hash: await getIpHash(),
        p_name: name,
        p_limit: STREAM_REQUEST_LIMIT,
    });
    if (error) throw error;
    if (data === "declined") return fail(formData, "quotaDeclined");
    refresh();
    return { ok: true, code: data === "created" ? "quotaAsked" : "quotaPending" };
}

export type StreamVoteResult = "ok" | "already_voted" | "closed" | "not_found" | "rate_limited";

export async function upvoteStreamSong(requestId: string): Promise<StreamVoteResult> {
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return "not_found";
    if (!(await rateLimit(`streamvote:${await getVisitorId()}`, 60, 3600))) return "rate_limited";
    const { data, error } = await db().rpc("upvote_stream_request", {
        p_request_id: requestId,
        p_voter_hash: await getVoterHash(),
    });
    if (error) throw error;
    if (data === "ok") refresh();
    return data;
}

export type VoteResult = "ok" | "already_voted" | "closed" | "not_found" | "rate_limited";

/**
 * One vote per contest, checked twice: per network address (a single Redis bit,
 * `user:drawing:<programme>:<ip>`) and per browser (the visitor cookie, enforced in `cast_vote`).
 */
export async function castVote(drawingId: string): Promise<VoteResult> {
    if (!/^[0-9a-f-]{36}$/i.test(drawingId)) return "not_found";
    const ip = await getClientIp();
    if (!(await rateLimit(`vote:${ip}`, 60, 3600))) return "rate_limited";

    const supabase = db();
    const { data: drawing } = await supabase
        .from("drawings")
        .select("programme_id")
        .eq("id", drawingId)
        .maybeSingle();
    if (!drawing) return "not_found";
    const { data: programme } = await supabase
        .from("programmes")
        .select("slug")
        .eq("id", drawing.programme_id)
        .maybeSingle();
    if (!programme) return "not_found";

    const key = drawingVoteKey(ip, programme.slug);
    if (!(await claimKey(key))) return "already_voted";

    const { data, error } = await supabase.rpc("cast_vote", {
        p_drawing_id: drawingId,
        p_voter_hash: await getVoterHash(),
    });
    // Only a counted vote keeps the network's bit; a refused or failed one gives it back.
    if (error || data !== "ok") {
        if (key) await releaseKey(key);
        if (error) throw error;
        return data;
    }
    refresh();
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
