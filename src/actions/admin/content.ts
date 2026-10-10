"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { invalidateCatalog, invalidateSettings } from "@/lib/cache";
import { destroyCloudinaryAsset } from "@/lib/cloudinary";
import { istLocalToIso } from "@/lib/datetime";
import type { FeedbackStatus, SongCategory, SongRequestStatus } from "@/lib/database.types";
import { getCurrentYear } from "@/lib/queries";
import { db } from "@/lib/supabase/server";
import { bengaliOrTranslated } from "@/lib/translate";
import { parseWhatsappInvite, parseYouTubeId, type ActionState } from "@/lib/validators";

const CATEGORIES = [
    "mahalaya",
    "agomoni",
    "dhunuchi",
    "bhajan",
    "modern",
    "bollywood",
    "other",
] as const;

// ---------------------------------------------------------------------------
// Songs
// ---------------------------------------------------------------------------

const youtubeSongSchema = z.object({
    url: z.string().trim().min(1, "Paste a YouTube link"),
    title: z.string().trim().min(1, "Title is required").max(160),
    artist: z
        .string()
        .trim()
        .max(120)
        .optional()
        .transform((v) => v || null),
    category: z.enum(CATEGORIES),
});

export async function addYouTubeSong(_prev: ActionState, formData: FormData): Promise<ActionState> {
    await requireAdmin();
    const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
    const parsed = youtubeSongSchema.safeParse(raw);
    if (!parsed.success) {
        return { ok: false, code: parsed.error.issues[0]?.message ?? "Invalid input", values: raw };
    }
    const youtubeId = parseYouTubeId(parsed.data.url);
    if (!youtubeId)
        return { ok: false, code: "That doesn't look like a YouTube link.", values: raw };

    const { error } = await db()
        .from("songs")
        .insert({
            title: parsed.data.title,
            artist: parsed.data.artist,
            category: parsed.data.category,
            source: "youtube",
            youtube_id: youtubeId,
            pool: "music_page",
            featured: formData.get("featured") === "on",
        });
    if (error) throw error;
    refresh();
    return { ok: true, code: "Song added." };
}

export type UploadedAudio = {
    title: string;
    artist?: string | null;
    audioUrl: string;
    publicId: string;
    durationSec: number | null;
    requestId?: string | null;
};

export async function addMusicalChairSong(input: UploadedAudio) {
    await requireAdmin();
    const title = input.title.trim().slice(0, 160);
    if (!title || !/^https:\/\/res\.cloudinary\.com\//.test(input.audioUrl)) {
        throw new Error("Invalid upload");
    }
    const supabase = db();
    const { data: song, error } = await supabase
        .from("songs")
        .insert({
            title,
            artist: input.artist?.trim() || null,
            category: "other",
            source: "cloudinary",
            audio_url: input.audioUrl,
            cloudinary_public_id: input.publicId,
            duration_sec: input.durationSec,
            pool: "musical_chair",
        })
        .select("id")
        .single();
    if (error) throw error;
    if (input.requestId) {
        await supabase
            .from("song_requests")
            .update({ status: "added", song_id: song.id })
            .eq("id", input.requestId);
    }
    refresh();
}

export async function updateSong(
    id: string,
    patch: {
        active?: boolean;
        featured?: boolean;
        category?: SongCategory;
        title?: string;
        artist?: string | null;
    },
) {
    await requireAdmin();
    const supabase = db();
    if (patch.featured) {
        // Only one featured track at a time.
        await supabase.from("songs").update({ featured: false }).eq("featured", true);
    }
    const { error } = await supabase.from("songs").update(patch).eq("id", id);
    if (error) throw error;
    refresh();
}

export async function deleteSong(id: string) {
    await requireAdmin();
    const supabase = db();
    const { data: song, error } = await supabase
        .from("songs")
        .delete()
        .eq("id", id)
        .select("cloudinary_public_id")
        .single();
    if (error) throw error;
    if (song.cloudinary_public_id) await destroyCloudinaryAsset(song.cloudinary_public_id, "video");
    refresh();
}

export async function setSongRequestStatus(id: string, status: SongRequestStatus) {
    await requireAdmin();
    const { error } = await db().from("song_requests").update({ status }).eq("id", id);
    if (error) throw error;
    refresh();
}

export async function deleteSongRequest(id: string) {
    await requireAdmin();
    const { error } = await db().from("song_requests").delete().eq("id", id);
    if (error) throw error;
    refresh();
}

// ---------------------------------------------------------------------------
// Drawings
// ---------------------------------------------------------------------------

export type UploadedImage = {
    imageUrl: string;
    publicId: string;
    width: number | null;
    height: number | null;
    originalName: string;
};

export async function addDrawing(programmeId: string, image: UploadedImage) {
    await requireAdmin();
    if (!/^https:\/\/res\.cloudinary\.com\//.test(image.imageUrl))
        throw new Error("Invalid upload");
    const { error } = await db()
        .from("drawings")
        .insert({
            programme_id: programmeId,
            child_name:
                image.originalName
                    .replace(/\.[^.]+$/, "")
                    .replace(/[_-]+/g, " ")
                    .slice(0, 80) || "Unnamed",
            image_url: image.imageUrl,
            cloudinary_public_id: image.publicId,
            width: image.width,
            height: image.height,
        });
    if (error) throw error;
    refresh();
}

export async function updateDrawing(
    id: string,
    patch: { child_name: string; age: number | null; title: string | null },
) {
    await requireAdmin();
    const name = patch.child_name.trim().slice(0, 80);
    if (!name) throw new Error("Name is required");
    const { error } = await db()
        .from("drawings")
        .update({
            child_name: name,
            age: patch.age && patch.age > 0 && patch.age < 120 ? Math.floor(patch.age) : null,
            title: patch.title?.trim().slice(0, 120) || null,
        })
        .eq("id", id);
    if (error) throw error;
    refresh();
}

export async function deleteDrawing(id: string) {
    await requireAdmin();
    const { data, error } = await db()
        .from("drawings")
        .delete()
        .eq("id", id)
        .select("cloudinary_public_id")
        .single();
    if (error) throw error;
    if (data.cloudinary_public_id) await destroyCloudinaryAsset(data.cloudinary_public_id, "image");
    refresh();
}

/** Closes voting, writes the top 10 by votes to results and completes the programme. */
export async function publishDrawingResults(programmeId: string) {
    await requireAdmin();
    const supabase = db();
    await supabase.from("programmes").update({ voting_open: false }).eq("id", programmeId);
    const { data: drawings, error } = await supabase
        .from("drawings")
        .select("child_name, title, vote_count, last_vote_at")
        .eq("programme_id", programmeId);
    if (error) throw error;
    const ranked = [...drawings]
        .sort(
            (a, b) =>
                b.vote_count - a.vote_count ||
                (a.last_vote_at ?? "").localeCompare(b.last_vote_at ?? ""),
        )
        .slice(0, 10);
    await supabase.from("results").delete().eq("programme_id", programmeId);
    if (ranked.length) {
        const { error: insertError } = await supabase.from("results").insert(
            ranked.map((d, i) => ({
                programme_id: programmeId,
                position: i + 1,
                name: d.child_name,
                score: `${d.vote_count} votes`,
                remark: d.title,
            })),
        );
        if (insertError) throw insertError;
    }
    await supabase.from("programmes").update({ status: "completed" }).eq("id", programmeId);
    invalidateCatalog();
    refresh();
}

// ---------------------------------------------------------------------------
// Musical chair
// ---------------------------------------------------------------------------

export async function recordRound(
    programmeId: string,
    round: { songId: string | null; songTitle: string; startOffset: number; playDuration: number },
): Promise<{ id: string; roundNo: number }> {
    await requireAdmin();
    const supabase = db();
    const { data: last } = await supabase
        .from("musical_chair_rounds")
        .select("round_no")
        .eq("programme_id", programmeId)
        .order("round_no", { ascending: false })
        .limit(1)
        .maybeSingle();
    const roundNo = (last?.round_no ?? 0) + 1;
    const { data, error } = await supabase
        .from("musical_chair_rounds")
        .insert({
            programme_id: programmeId,
            round_no: roundNo,
            song_id: round.songId,
            song_title: round.songTitle.slice(0, 160),
            start_offset_sec: Math.round(round.startOffset * 10) / 10,
            play_duration_sec: Math.round(round.playDuration * 10) / 10,
        })
        .select("id")
        .single();
    if (error) throw error;
    return { id: data.id, roundNo };
}

export async function setRoundEliminated(roundId: string, name: string) {
    await requireAdmin();
    const { error } = await db()
        .from("musical_chair_rounds")
        .update({ eliminated_name: name.trim().slice(0, 80) || null })
        .eq("id", roundId);
    if (error) throw error;
    refresh();
}

export async function resetRounds(programmeId: string) {
    await requireAdmin();
    const { error } = await db()
        .from("musical_chair_rounds")
        .delete()
        .eq("programme_id", programmeId);
    if (error) throw error;
    refresh();
}

/** Winner first, then players in reverse order of elimination. */
export async function finishMusicalChair(programmeId: string, winner: string) {
    await requireAdmin();
    const supabase = db();
    const { data: rounds, error } = await supabase
        .from("musical_chair_rounds")
        .select("round_no, eliminated_name")
        .eq("programme_id", programmeId)
        .order("round_no", { ascending: false });
    if (error) throw error;
    const names = [winner.trim(), ...rounds.map((r) => r.eliminated_name?.trim() ?? "")].filter(
        Boolean,
    );
    await supabase.from("results").delete().eq("programme_id", programmeId);
    if (names.length) {
        const { error: insertError } = await supabase
            .from("results")
            .insert(
                names
                    .slice(0, 20)
                    .map((name, i) => ({ programme_id: programmeId, position: i + 1, name })),
            );
        if (insertError) throw insertError;
    }
    await supabase.from("programmes").update({ status: "completed" }).eq("id", programmeId);
    invalidateCatalog();
    refresh();
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export async function setFeedbackStatus(id: string, status: FeedbackStatus) {
    await requireAdmin();
    const { error } = await db().from("feedback").update({ status }).eq("id", id);
    if (error) throw error;
    refresh();
}

export async function deleteFeedback(id: string) {
    await requireAdmin();
    const { error } = await db().from("feedback").delete().eq("id", id);
    if (error) throw error;
    refresh();
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

async function saveSetting(key: string, value: Record<string, unknown>) {
    const { error } = await db()
        .from("settings")
        .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    invalidateSettings();
}

export async function saveEventSettings(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    await requireAdmin();
    const get = (k: string) => String(formData.get(k) ?? "").trim();
    const mahalaya = istLocalToIso(get("mahalaya"));
    const shashthi = istLocalToIso(get("shashthi"));
    const dashami = istLocalToIso(get("dashami"));
    if (!get("name_en") || !mahalaya || !shashthi || !dashami) {
        return { ok: false, code: "Name and all three dates are required." };
    }
    const { error } = await db()
        .from("editions")
        .update({
            name_en: get("name_en").slice(0, 120),
            name_bn:
                (await bengaliOrTranslated(get("name_en"), get("name_bn")))?.slice(0, 120) || null,
            venue: get("venue").slice(0, 120) || null,
            mahalaya,
            shashthi,
            dashami,
        })
        .eq("year", await getCurrentYear());
    if (error) throw error;
    invalidateCatalog();
    refresh();
    return { ok: true, code: "Event settings saved." };
}

// ---------------------------------------------------------------------------
// Years (editions)
// ---------------------------------------------------------------------------

/** Starts a new year: it becomes current, last year's sign-ups and voting close. */
export async function startEdition(_prev: ActionState, formData: FormData): Promise<ActionState> {
    await requireAdmin();
    const get = (k: string) => String(formData.get(k) ?? "").trim();
    const year = Number(get("year"));
    const mahalaya = istLocalToIso(get("mahalaya"));
    const shashthi = istLocalToIso(get("shashthi"));
    const dashami = istLocalToIso(get("dashami"));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return { ok: false, code: "Enter a valid year." };
    }
    if (!get("name_en") || !shashthi || !dashami) {
        return { ok: false, code: "Name, Shashthi and Dashami are required." };
    }
    if (new Date(dashami) <= new Date(shashthi)) {
        return { ok: false, code: "Dashami must be after Shashthi." };
    }
    const { error } = await db().rpc("start_edition", {
        p_year: year,
        p_name_en: get("name_en").slice(0, 120),
        p_name_bn:
            (await bengaliOrTranslated(get("name_en"), get("name_bn")))?.slice(0, 120) || null,
        p_venue: get("venue").slice(0, 120) || null,
        p_mahalaya: mahalaya,
        p_shashthi: shashthi,
        p_dashami: dashami,
        p_copy_programmes: formData.get("copy_programmes") === "on",
    });
    if (error) {
        if (error.message.includes("edition_exists")) {
            return { ok: false, code: `${year} already exists.` };
        }
        throw error;
    }
    invalidateCatalog();
    refresh();
    return { ok: true, code: `${year} started. The public site now shows ${year}.` };
}

/** Switch which year the public site treats as "this year". */
export async function makeEditionCurrent(year: number) {
    await requireAdmin();
    const { error } = await db().rpc("set_current_edition", { p_year: year });
    if (error) throw error;
    invalidateCatalog();
    refresh();
}

export async function saveDonationSettings(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    await requireAdmin();
    const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
    const upi = get("upi_id");
    if (upi && !/^[\w.-]{2,256}@[a-zA-Z][\w]{2,64}$/.test(upi)) {
        return { ok: false, code: "That UPI ID doesn't look right (expected name@bank)." };
    }
    const qr = get("qr_image_url");
    if (qr && !/^https:\/\/res\.cloudinary\.com\//.test(qr)) {
        return { ok: false, code: "QR image must be uploaded through the button." };
    }
    await saveSetting("donation", {
        qr_image_url: qr,
        upi_id: upi,
        payee_name: get("payee_name"),
        note_en: get("note_en"),
        note_bn: await bengaliOrTranslated(get("note_en"), get("note_bn")),
    });
    refresh();
    return { ok: true, code: "Donation settings saved." };
}

export async function saveAmbientSettings(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    await requireAdmin();
    const url = String(formData.get("audio_url") ?? "").trim() || null;
    if (url && !/^https:\/\/res\.cloudinary\.com\//.test(url)) {
        return { ok: false, code: "Audio must be uploaded through the button." };
    }
    await saveSetting("ambient", { audio_url: url });
    refresh();
    return { ok: true, code: url ? "Background music saved." : "Background music removed." };
}

export async function saveWhatsappSettings(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    await requireAdmin();
    const rawInvite = String(formData.get("invite_url") ?? "").trim();
    const invite = rawInvite ? parseWhatsappInvite(rawInvite) : null;
    if (rawInvite && !invite) {
        return {
            ok: false,
            code: "That doesn't look like a WhatsApp invite link (expected https://chat.whatsapp.com/…).",
        };
    }
    const qr = String(formData.get("qr_image_url") ?? "").trim() || null;
    if (qr && !/^https:\/\/res\.cloudinary\.com\//.test(qr)) {
        return { ok: false, code: "QR image must be uploaded through the button." };
    }
    await saveSetting("whatsapp", { invite_url: invite, qr_image_url: qr });
    refresh();
    return { ok: true, code: "WhatsApp community saved." };
}
