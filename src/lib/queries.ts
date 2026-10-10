import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type {
    Drawing,
    Edition,
    Feedback,
    MusicalChairRound,
    QuizAnswer,
    QuizQuestion,
    QuizRound,
    Programme,
    Registration,
    Result,
    Song,
    SongPool,
    SongRequest,
    StreamQuotaRequest,
    StreamRequest,
    StreamState,
} from "@/lib/database.types";
import { CACHE_VERSION, EDITIONS_TAG, PROGRAMMES_TAG, SETTINGS_TAG } from "@/lib/cache";
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

/** Safety net only: data is normally refreshed the moment an admin action changes it. */
const CACHE_EXPIRY_SECONDS = 60 * 60 * 24;

const fetchSettingValue = unstable_cache(
    async (key: string): Promise<Record<string, unknown> | null> => {
        const { data, error } = await db()
            .from("settings")
            .select("value")
            .eq("key", key)
            .maybeSingle();
        if (error) throw new Error(`Failed to load settings: ${error.message}`);
        return (data?.value as Record<string, unknown> | null) ?? null;
    },
    ["setting", CACHE_VERSION],
    { tags: [SETTINGS_TAG], revalidate: CACHE_EXPIRY_SECONDS },
);

async function getSetting<T extends object>(key: string, fallback: T): Promise<T> {
    return { ...fallback, ...(((await fetchSettingValue(key)) as Partial<T> | null) ?? {}) };
}

/** The years rarely change but nearly every page reads them, so they are cached for everyone. */
const fetchEditions = unstable_cache(
    async (): Promise<Edition[]> =>
        unwrap(
            await db().from("editions").select("*").order("year", { ascending: false }),
            "editions",
        ),
    ["editions", CACHE_VERSION],
    { tags: [EDITIONS_TAG], revalidate: CACHE_EXPIRY_SECONDS },
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
    ["programmes-by-year", CACHE_VERSION],
    { tags: [PROGRAMMES_TAG], revalidate: CACHE_EXPIRY_SECONDS },
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

/** Admin only: every registration of a year, across all of its programmes, with contact details. */
export async function listAllRegistrationsForAdmin(
    year: number,
): Promise<{ programmes: Programme[]; registrations: RegistrationWithPhone[] }> {
    const programmes = await listProgrammes(year);
    const ids = programmes.map((p) => p.id);
    if (!ids.length) return { programmes, registrations: [] };
    const [registrations, contacts] = await Promise.all([
        db()
            .from("registrations")
            .select("*")
            .in("programme_id", ids)
            .order("created_at", { ascending: false })
            .then((r) => unwrap(r, "registrations")),
        db()
            .from("registration_contacts")
            .select("registration_id, phone, age, guardian_name, notes")
            .in("programme_id", ids)
            .then((r) => unwrap(r, "contacts")),
    ]);
    const details = new Map(contacts.map((c) => [c.registration_id, c]));
    return {
        programmes,
        registrations: registrations.map((r) => {
            const c = details.get(r.id);
            return {
                ...r,
                phone: c?.phone ?? null,
                age: c?.age ?? null,
                guardian_name: c?.guardian_name ?? null,
                notes: c?.notes ?? null,
            };
        }),
    };
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

// ---------------------------------------------------------------------------
// Brain games (live quiz). Always read live: scores and reveals must never be stale.
// ---------------------------------------------------------------------------

export type QuizTeamScore = { id: string; name: string; points: number; answered: number };

export type QuizBoard = {
    rounds: QuizRound[];
    /** Only questions that have been asked or revealed; hidden ones never leave the server. */
    questions: QuizQuestion[];
    live: QuizQuestion | null;
    leaderboard: QuizTeamScore[];
};

export async function getQuizBoard(programmeId: string): Promise<QuizBoard> {
    const [rounds, questions, teams] = await Promise.all([
        db()
            .from("quiz_rounds")
            .select("*")
            .eq("programme_id", programmeId)
            .order("round_no", { ascending: true })
            .then((r) => unwrap(r, "quiz rounds")),
        db()
            .from("quiz_questions")
            .select("*")
            .eq("programme_id", programmeId)
            .neq("state", "hidden")
            .order("asked_at", { ascending: true })
            .then((r) => unwrap(r, "quiz questions")),
        listRegistrations(programmeId),
    ]);
    return {
        rounds,
        questions,
        live: questions.find((q) => q.state === "asked") ?? null,
        leaderboard: quizLeaderboard(teams, questions),
    };
}

/** Team totals from revealed team questions, best first (ties share an order by name). */
export function quizLeaderboard(
    teams: { id: string; name: string }[],
    questions: QuizQuestion[],
): QuizTeamScore[] {
    const scores = new Map(teams.map((t) => [t.id, { ...t, points: 0, answered: 0 }]));
    for (const q of questions) {
        if (q.state !== "revealed" || q.kind !== "team" || !q.team_id) continue;
        const entry = scores.get(q.team_id);
        if (!entry) continue;
        entry.points += q.points_awarded ?? 0;
        entry.answered += 1;
    }
    return [...scores.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

export type QuizAdminQuestion = QuizQuestion & { answer_en: string; answer_bn: string | null };

/** Admin only: every question, including hidden ones and their answers. */
export async function getQuizAdmin(programmeId: string): Promise<{
    rounds: QuizRound[];
    questions: QuizAdminQuestion[];
    teams: { id: string; name: string }[];
}> {
    const [rounds, questions, teams] = await Promise.all([
        db()
            .from("quiz_rounds")
            .select("*")
            .eq("programme_id", programmeId)
            .order("round_no", { ascending: true })
            .then((r) => unwrap(r, "quiz rounds")),
        db()
            .from("quiz_questions")
            .select("*")
            .eq("programme_id", programmeId)
            .order("sort_no", { ascending: true })
            .order("created_at", { ascending: true })
            .then((r) => unwrap(r, "quiz questions")),
        listRegistrations(programmeId),
    ]);
    const ids = questions.map((q) => q.id);
    const answers: QuizAnswer[] = ids.length
        ? unwrap(await db().from("quiz_answers").select("*").in("question_id", ids), "quiz answers")
        : [];
    const byQuestion = new Map(answers.map((a) => [a.question_id, a]));
    return {
        rounds,
        teams: teams.map((t) => ({ id: t.id, name: t.name })),
        questions: questions.map((q) => ({
            ...q,
            answer_en: byQuestion.get(q.id)?.answer_en ?? "",
            answer_bn: byQuestion.get(q.id)?.answer_bn ?? null,
        })),
    };
}

// ---------------------------------------------------------------------------
// Pandal stream. Live reads: requests, votes and "up next" change by the minute.
// ---------------------------------------------------------------------------

export type StreamBoard = {
    state: StreamState;
    nowPlaying: StreamRequest | null;
    upNext: StreamRequest | null;
    /** Approved songs waiting to be played, most upvoted first. */
    queue: StreamRequest[];
    /** Requests waiting for the admin, most upvoted first. */
    pending: StreamRequest[];
    /** Songs already played this year, most recent first. */
    played: StreamRequest[];
};

/** Songs one network address can add or re-request per year (upvotes don't count). */
export const STREAM_REQUEST_LIMIT = 3;

/** The visitor's latest ask for more requests this year, or null. */
export async function getQuotaRequestStatus(
    ipHash: string,
): Promise<StreamQuotaRequest["status"] | null> {
    const { data, error } = await db()
        .from("stream_quota_requests")
        .select("status")
        .eq("year", await getCurrentYear())
        .eq("ip_hash", ipHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data?.status ?? null;
}

export type QuotaRequestForAdmin = {
    id: string;
    name: string;
    created_at: string;
    /** Titles of the songs this network has requested, so the organiser can judge the ask. */
    songs: string[];
};

export async function listPendingQuotaRequests(): Promise<QuotaRequestForAdmin[]> {
    const year = await getCurrentYear();
    const { data: asks, error } = await db()
        .from("stream_quota_requests")
        .select("*")
        .eq("year", year)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
    if (error) throw error;
    if (!asks.length) return [];

    const { data: log, error: logError } = await db()
        .from("stream_request_log")
        .select("ip_hash, request_id")
        .eq("year", year)
        .in("ip_hash", [...new Set(asks.map((a) => a.ip_hash))]);
    if (logError) throw logError;
    const ids = [...new Set(log.flatMap((l) => (l.request_id ? [l.request_id] : [])))];
    const { data: songs, error: songsError } = ids.length
        ? await db().from("stream_requests").select("id, title").in("id", ids)
        : { data: [], error: null };
    if (songsError) throw songsError;
    const title = new Map(songs.map((s) => [s.id, s.title]));

    return asks.map((a) => ({
        id: a.id,
        name: a.name,
        created_at: a.created_at,
        songs: log
            .filter((l) => l.ip_hash === a.ip_hash && l.request_id)
            .map((l) => title.get(l.request_id!) ?? "(removed song)"),
    }));
}

export async function streamRequestsLeft(ipHash: string, year?: number): Promise<number> {
    const { data, error } = await db().rpc("stream_requests_used", {
        p_year: year ?? (await getCurrentYear()),
        p_ip_hash: ipHash,
    });
    if (error) throw error;
    return Math.max(0, STREAM_REQUEST_LIMIT - (data ?? 0));
}

export async function getStreamBoard(year?: number): Promise<StreamBoard> {
    const y = year ?? (await getCurrentYear());
    const [requests, state] = await Promise.all([
        db()
            .from("stream_requests")
            .select("*")
            .eq("year", y)
            .neq("status", "rejected")
            .order("upvotes", { ascending: false })
            .order("created_at", { ascending: true })
            .then((r) => unwrap(r, "stream requests")),
        db()
            .from("stream_state")
            .select("*")
            .eq("year", y)
            .maybeSingle()
            .then((r) => unwrap(r, "stream state")),
    ]);
    const current: StreamState = state ?? {
        year: y,
        is_streaming: false,
        now_playing_id: null,
        up_next_id: null,
        updated_at: new Date(0).toISOString(),
    };
    const byId = new Map(requests.map((r) => [r.id, r]));
    return {
        state: current,
        nowPlaying: current.now_playing_id ? (byId.get(current.now_playing_id) ?? null) : null,
        upNext: current.up_next_id ? (byId.get(current.up_next_id) ?? null) : null,
        queue: requests.filter((r) => r.status === "approved" && r.id !== current.now_playing_id),
        pending: requests.filter((r) => r.status === "pending"),
        played: requests
            .filter((r) => r.status === "played")
            .sort((a, b) => (b.played_at ?? "").localeCompare(a.played_at ?? "")),
    };
}
