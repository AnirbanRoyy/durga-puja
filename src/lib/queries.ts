import "server-only";
import { cache } from "react";
import type {
    Drawing,
    Feedback,
    MusicalChairRound,
    Programme,
    Registration,
    Result,
    Song,
    SongPool,
    SongRequest,
} from "@/lib/database.types";
import { db } from "@/lib/supabase/server";

export type EventSettings = {
    name_en: string;
    name_bn: string;
    mahalaya: string;
    shashthi: string;
    dashami: string;
    venue: string;
};

export type DonationSettings = {
    qr_image_url: string | null;
    upi_id: string | null;
    payee_name: string | null;
    note_en: string | null;
    note_bn: string | null;
};

export type AmbientSettings = {
    audio_url: string | null;
};

export type WhatsappSettings = {
    invite_url: string | null;
    qr_image_url: string | null;
};

const DEFAULT_WHATSAPP: WhatsappSettings = { invite_url: null, qr_image_url: null };

const DEFAULT_AMBIENT: AmbientSettings = { audio_url: null };

const DEFAULT_EVENT: EventSettings = {
    name_en: "Sarbojanin Durgotsav",
    name_bn: "সর্বজনীন দুর্গোৎসব",
    mahalaya: "2026-10-10T04:00:00+05:30",
    shashthi: "2026-10-16T00:00:00+05:30",
    dashami: "2026-10-21T23:59:00+05:30",
    venue: "Community Pandal",
};

const DEFAULT_DONATION: DonationSettings = {
    qr_image_url: null,
    upi_id: null,
    payee_name: null,
    note_en: null,
    note_bn: null,
};

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
    if (result.error) {
        throw new Error(`Failed to load ${what}: ${result.error.message}`);
    }
    return result.data as T;
}

async function getSetting<T extends object>(key: string, fallback: T): Promise<T> {
    const { data, error } = await db()
        .from("settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
    if (error) throw new Error(`Failed to load settings: ${error.message}`);
    return { ...fallback, ...((data?.value as Partial<T>) ?? {}) };
}

export const getEventSettings = cache(() => getSetting<EventSettings>("event", DEFAULT_EVENT));
export const getWhatsappSettings = cache(() =>
    getSetting<WhatsappSettings>("whatsapp", DEFAULT_WHATSAPP),
);
export const getAmbientSettings = cache(() =>
    getSetting<AmbientSettings>("ambient", DEFAULT_AMBIENT),
);
export const getDonationSettings = cache(() =>
    getSetting<DonationSettings>("donation", DEFAULT_DONATION),
);

export const listProgrammes = cache(async (): Promise<Programme[]> => {
    return unwrap(
        await db()
            .from("programmes")
            .select("*")
            .order("starts_at", { ascending: true, nullsFirst: false })
            .order("sort_order", { ascending: true }),
        "programmes",
    );
});

export const getProgrammeBySlug = cache(async (slug: string): Promise<Programme | null> => {
    return unwrap(
        await db().from("programmes").select("*").eq("slug", slug).maybeSingle(),
        "programme",
    );
});

export const getProgrammeById = cache(async (id: string): Promise<Programme | null> => {
    return unwrap(
        await db().from("programmes").select("*").eq("id", id).maybeSingle(),
        "programme",
    );
});

export const listRegistrations = cache(async (programmeId: string): Promise<Registration[]> => {
    return unwrap(
        await db()
            .from("registrations")
            .select("*")
            .eq("programme_id", programmeId)
            .order("sequence_no", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true }),
        "registrations",
    );
});

export type RegistrationWithPhone = Registration & {
    phone: string | null;
    age: number | null;
    guardian_name: string | null;
    notes: string | null;
};

/** Admin only: includes phone numbers. */
export async function listRegistrationsWithPhones(
    programmeId: string,
): Promise<RegistrationWithPhone[]> {
    const [registrations, contacts] = await Promise.all([
        listRegistrations(programmeId),
        db()
            .from("registration_contacts")
            .select("registration_id, phone, age, guardian_name, notes")
            .eq("programme_id", programmeId)
            .then((r) => unwrap(r, "contacts")),
    ]);
    const details = new Map(contacts.map((c) => [c.registration_id, c]));
    return registrations.map((r) => {
        const c = details.get(r.id);
        return {
            ...r,
            phone: c?.phone ?? null,
            age: c?.age ?? null,
            guardian_name: c?.guardian_name ?? null,
            notes: c?.notes ?? null,
        };
    });
}

export const countRegistrationsByProgramme = cache(async (): Promise<Map<string, number>> => {
    const rows = unwrap(await db().from("registrations").select("programme_id"), "registrations");
    const counts = new Map<string, number>();
    for (const row of rows) {
        counts.set(row.programme_id, (counts.get(row.programme_id) ?? 0) + 1);
    }
    return counts;
});

export const listSongs = cache(async (pool: SongPool, includeInactive = false): Promise<Song[]> => {
    let query = db().from("songs").select("*").eq("pool", pool);
    if (!includeInactive) query = query.eq("active", true);
    return unwrap(
        await query
            .order("featured", { ascending: false })
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
        "songs",
    );
});

export const listSongRequests = cache(async (includeRejected = false): Promise<SongRequest[]> => {
    let query = db().from("song_requests").select("*");
    if (!includeRejected) query = query.neq("status", "rejected");
    return unwrap(
        await query
            .order("request_count", { ascending: false })
            .order("created_at", { ascending: true }),
        "song requests",
    );
});

export const listRounds = cache(async (programmeId: string): Promise<MusicalChairRound[]> => {
    return unwrap(
        await db()
            .from("musical_chair_rounds")
            .select("*")
            .eq("programme_id", programmeId)
            .order("round_no", { ascending: true }),
        "rounds",
    );
});

export const listDrawings = cache(async (programmeId: string): Promise<Drawing[]> => {
    return unwrap(
        await db()
            .from("drawings")
            .select("*")
            .eq("programme_id", programmeId)
            .order("created_at", { ascending: true }),
        "drawings",
    );
});

export const listResults = cache(async (programmeId: string): Promise<Result[]> => {
    return unwrap(
        await db()
            .from("results")
            .select("*")
            .eq("programme_id", programmeId)
            .order("position", { ascending: true }),
        "results",
    );
});

export const listAllResults = cache(async (): Promise<Result[]> => {
    return unwrap(
        await db().from("results").select("*").order("position", { ascending: true }),
        "results",
    );
});

export async function countVotes(programmeId: string): Promise<number> {
    const { count, error } = await db()
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("programme_id", programmeId);
    if (error) throw new Error(`Failed to count votes: ${error.message}`);
    return count ?? 0;
}

export async function listFeedback(): Promise<Feedback[]> {
    return unwrap(
        await db().from("feedback").select("*").order("created_at", { ascending: false }),
        "feedback",
    );
}

export async function hasVoted(programmeId: string, voterHash: string): Promise<string | null> {
    const { data, error } = await db()
        .from("votes")
        .select("drawing_id")
        .eq("programme_id", programmeId)
        .eq("voter_hash", voterHash)
        .maybeSingle();
    if (error) throw new Error(`Failed to check vote: ${error.message}`);
    return data?.drawing_id ?? null;
}
