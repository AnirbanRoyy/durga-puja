import {
    Brain02Icon,
    Chair01Icon,
    DrumIcon,
    Mic01Icon,
    PaintBoardIcon,
    SparklesIcon,
} from "@hugeicons/core-free-icons";
import type { Programme, ProgrammeStatus, ProgrammeType } from "@/lib/database.types";

export const PROGRAMME_TYPES: ProgrammeType[] = [
    "musical_chair",
    "singing",
    "dance",
    "drawing",
    "quiz",
    "other",
];
export const PROGRAMME_STATUSES: ProgrammeStatus[] = [
    "upcoming",
    "ongoing",
    "completed",
    "cancelled",
];

export const TYPE_ICON = {
    musical_chair: Chair01Icon,
    singing: Mic01Icon,
    dance: SparklesIcon,
    drawing: PaintBoardIcon,
    quiz: Brain02Icon,
    other: DrumIcon,
} satisfies Record<ProgrammeType, unknown>;

export type ResultStatus = "pending" | "completed" | "cancelled";

/** Results page groups upcoming and ongoing programmes as "pending". */
export function resultStatus(status: ProgrammeStatus): ResultStatus {
    if (status === "completed" || status === "cancelled") return status;
    return "pending";
}

/** Types where people sign up and are called on stage in a random order. */
export function isLineupType(type: ProgrammeType): boolean {
    return type === "singing" || type === "dance";
}

export function acceptsRegistrations(p: Programme): boolean {
    return p.registration_open && p.status !== "completed" && p.status !== "cancelled";
}

const IST = "Asia/Kolkata";

/** YYYY-MM-DD in IST, used to bucket programmes into Puja days. */
export function istDateKey(iso: string | Date): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(new Date(iso));
}

// Usually five days; some years (2026) Saptami spans two days, making six.
const FIVE_DAYS = ["shashthi", "saptami", "ashtami", "navami", "dashami"] as const;
const SIX_DAYS = ["shashthi", "saptami1", "saptami2", "ashtami", "navami", "dashami"] as const;
export type PujaDay = (typeof FIVE_DAYS)[number] | (typeof SIX_DAYS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Maps each Puja day to its IST date, from Shashthi up to Dashami. */
export function pujaDayDates(
    shashthiIso: string,
    dashamiIso?: string,
): { day: PujaDay; date: string }[] {
    const start = new Date(shashthiIso);
    const span = dashamiIso
        ? Math.round(
              (Date.parse(istDateKey(dashamiIso)) - Date.parse(istDateKey(start))) / DAY_MS,
          ) + 1
        : SIX_DAYS.length;
    const days: readonly PujaDay[] = span === FIVE_DAYS.length ? FIVE_DAYS : SIX_DAYS;
    return days.map((day, i) => ({
        day,
        date: istDateKey(new Date(start.getTime() + i * DAY_MS)),
    }));
}
