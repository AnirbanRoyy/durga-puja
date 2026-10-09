import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type {
    Drawing,
    Edition,
    Feedback,
    MusicalChairRound,
    Programme,
    Registration,
    Result,
    Song,
    SongPool,
    SongRequest,
} from "@/lib/database.types";
import { EDITIONS_TAG, PROGRAMMES_TAG } from "@/lib/cache";
import { db } from "@/lib/supabase/server";

export type EventSettings = {
    year: number;
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
    year: 2026,
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

/**
 * Cached across requests: the years rarely change but nearly every page reads them. Admin actions
 * call invalidateCatalog(); the time limit is only a safety net for edits made outside the app.
 */
const CATALOG_REVALIDATE_SECONDS = 120;

const fetchEditions = unstable_cache(
    async (): Promise<Edition[]> =>
        unwrap(
            await db().from("editions").select("*").order("year", { ascending: false }),
            "editions",
        ),
    ["editions"],
    { tags: [EDITIONS_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

/** All years, newest first. */
export const listEditions = cache((): Promise<Edition[]> => fetchEditions());

export const getEdition = cache(
    async (year: number): Promise<Edition | null> =>
        (await listEditions()).find((e) => e.year === year) ?? null,
);

function toEventSettings(edition: Edition): EventSettings {
    return {
        year: edition.year,
        name_en: edition.name_en,
        name_bn: edition.name_bn ?? edition.name_en,
        mahalaya: edition.mahalaya ?? edition.shashthi,
        shashthi: edition.shashthi,
        dashami: edition.dashami,
        venue: edition.venue ?? "",
    };
}

/** This year's Puja: the current edition (what the public site shows by default). */
export const getEventSettings = cache(async (): Promise<EventSettings> => {
    const current = (await listEditions()).find((e) => e.is_current);
    return current ? toEventSettings(current) : DEFAULT_EVENT;
});

export async function getCurrentYear(): Promise<number> {
    return (await getEventSettings()).year;
}
export const getWhatsappSettings = cache(() =>
    getSetting<WhatsappSettings>("whatsapp", DEFAULT_WHATSAPP),
);
export const getAmbientSettings = cache(() =>
    getSetting<AmbientSettings>("ambient", DEFAULT_AMBIENT),
);
export const getDonationSettings = cache(() =>
    getSetting<DonationSettings>("donation", DEFAULT_DONATION),
);

const fetchProgrammes = unstable_cache(
    async (year: number): Promise<Programme[]> =>
        unwrap(
            await db()
                .from("programmes")
                .select("*")
                .eq("year", year)
                .order("starts_at", { ascending: true, nullsFirst: false })
                .order("sort_order", { ascending: true }),
            "programmes",
        ),
    ["programmes-by-year"],
    { tags: [PROGRAMMES_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
);

/** Programmes of one year (default: the current year). Cached across requests. */
export const listProgrammes = cache(async (year?: number): Promise<Programme[]> =>
    fetchProgrammes(year ?? (await getCurrentYear())),
);

export const getProgrammeBySlug = cache(
    async (slug: string, year?: number): Promise<Programme | null> =>
        (await listProgrammes(year)).find((p) => p.slug === slug) ?? null,
);

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

/** Results for every programme of one year (defaults to the current year). */
export const listAllResults = cache(async (year?: number): Promise<Result[]> => {
    const ids = (await listProgrammes(year)).map((p) => p.id);
    if (!ids.length) return [];
    return unwrap(
        await db()
            .from("results")
            .select("*")
            .in("programme_id", ids)
            .order("position", { ascending: true }),
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

export type EditionSummary = Edition & {
    programmes: number;
    participants: number;
    drawings: number;
};

/** Every year with headline counts, newest first. */
export const listEditionSummaries = cache(async (): Promise<EditionSummary[]> => {
    const [editions, programmes, registrations, drawings] = await Promise.all([
        listEditions(),
        db()
            .from("programmes")
            .select("id, year, status")
            .then((r) => unwrap(r, "programmes")),
        db()
            .from("registrations")
            .select("programme_id")
            .then((r) => unwrap(r, "registrations")),
        db()
            .from("drawings")
            .select("programme_id")
            .then((r) => unwrap(r, "drawings")),
    ]);
    const yearOf = new Map(programmes.map((p) => [p.id, p.year]));
    const tally = (rows: { programme_id: string }[]) => {
        const counts = new Map<number, number>();
        for (const row of rows) {
            const year = yearOf.get(row.programme_id);
            if (year !== undefined) counts.set(year, (counts.get(year) ?? 0) + 1);
        }
        return counts;
    };
    const participants = tally(registrations);
    const drawingCounts = tally(drawings);
    return editions.map((edition) => ({
        ...edition,
        programmes: programmes.filter((p) => p.year === edition.year && p.status !== "cancelled")
            .length,
        participants: participants.get(edition.year) ?? 0,
        drawings: drawingCounts.get(edition.year) ?? 0,
    }));
});

export type YearSnapshot = {
    edition: Edition;
    programmes: Programme[];
    registrations: Registration[];
    results: Result[];
    drawings: Drawing[];
};

/** Everything public about one year, for the archive. */
export const getYearSnapshot = cache(async (year: number): Promise<YearSnapshot | null> => {
    const edition = await getEdition(year);
    if (!edition) return null;
    const programmes = await listProgrammes(year);
    const ids = programmes.map((p) => p.id);
    if (!ids.length) return { edition, programmes, registrations: [], results: [], drawings: [] };
    const [registrations, results, drawings] = await Promise.all([
        db()
            .from("registrations")
            .select("*")
            .in("programme_id", ids)
            .order("sequence_no", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true })
            .then((r) => unwrap(r, "registrations")),
        db()
            .from("results")
            .select("*")
            .in("programme_id", ids)
            .order("position", { ascending: true })
            .then((r) => unwrap(r, "results")),
        db()
            .from("drawings")
            .select("*")
            .in("programme_id", ids)
            .order("vote_count", { ascending: false })
            .then((r) => unwrap(r, "drawings")),
    ]);
    return { edition, programmes, registrations, results, drawings };
});
