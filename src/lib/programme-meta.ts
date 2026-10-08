import {
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

// 2026: Saptami runs for two days, so the six slots below cover 16–21 October.
export const PUJA_DAYS = [
    "shashthi",
    "saptami1",
    "saptami2",
    "ashtami",
    "navami",
    "dashami",
] as const;
export type PujaDay = (typeof PUJA_DAYS)[number];

/** Maps each Puja day to its IST date, starting from the configured Shashthi. */
export function pujaDayDates(shashthiIso: string): { day: PujaDay; date: string }[] {
    const start = new Date(shashthiIso);
    return PUJA_DAYS.map((day, i) => ({
        day,
        date: istDateKey(new Date(start.getTime() + i * 24 * 60 * 60 * 1000)),
    }));
}
