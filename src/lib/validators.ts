import { z } from "zod";

const optionalText = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .optional()
        .transform((v) => (v ? v : null));

/** Accepts 10-digit Indian mobile numbers with optional +91 / 0 prefix; stores the bare 10 digits. */
export const phoneSchema = z
    .string()
    .transform((v) => v.replace(/[\s\-()]/g, ""))
    .transform((v) => v.replace(/^(\+?91|0)(?=\d{10}$)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "phone"));

export const registrationSchema = z.object({
    programmeId: z.uuid(),
    name: z.string().trim().min(2, "name").max(80, "name"),
    phone: phoneSchema,
    age: z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : null))
        .pipe(z.number().int().min(1, "age").max(120, "age").nullable()),
    guardianName: optionalText(80),
    notes: optionalText(300),
});

export const songRequestSchema = z.object({
    title: z.string().trim().min(2, "title").max(120, "title"),
    artist: optionalText(80),
    link: z
        .string()
        .trim()
        .max(300)
        .optional()
        .transform((v) => (v ? v : null))
        .pipe(z.url({ protocol: /^https?$/, message: "link" }).nullable()),
    requestedBy: optionalText(60),
});

export const feedbackSchema = z.object({
    kind: z.enum(["suggestion", "complaint", "appreciation"]),
    message: z.string().trim().min(5, "message").max(2000, "message"),
    name: optionalText(80),
    contact: optionalText(120),
});

/** Lowercase, strip punctuation and extra whitespace so "Dhaker Taale!" == "dhaker  taale". */
export function normalizeSongKey(title: string): string {
    return title
        .toLowerCase()
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

/** Extracts the 11-char video id from any common YouTube URL form, or accepts a bare id. */
export function parseYouTubeId(input: string): string | null {
    const value = input.trim();
    if (/^[\w-]{11}$/.test(value)) return value;
    try {
        const url = new URL(value);
        if (url.hostname === "youtu.be") return url.pathname.slice(1, 12) || null;
        if (url.hostname.endsWith("youtube.com")) {
            const v = url.searchParams.get("v");
            if (v) return v.slice(0, 11);
            const match = url.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/);
            if (match) return match[1];
        }
    } catch {
        return null;
    }
    return null;
}

/**
 * Accepts a WhatsApp community/group invite (chat.whatsapp.com/<code>) or channel link and returns
 * it normalised (https, no query string), or null if it isn't one.
 */
export function parseWhatsappInvite(input: string): string | null {
    try {
        const url = new URL(input.trim());
        if (url.protocol !== "https:") return null;
        const host = url.hostname.replace(/^www\./, "");
        const path = url.pathname.replace(/\/$/, "");
        const ok =
            (host === "chat.whatsapp.com" && /^\/[A-Za-z0-9]{10,}$/.test(path)) ||
            (host === "whatsapp.com" && /^\/(channel|invite)\/[A-Za-z0-9_-]+$/.test(path));
        return ok ? `https://${host}${path}` : null;
    } catch {
        return null;
    }
}

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
    const out: FieldErrors = {};
    for (const issue of error.issues) {
        const key = String(issue.path[0] ?? "form");
        out[key] ??= issue.message;
    }
    return out;
}

export type ActionState = {
    ok: boolean;
    /** Translation key under "forms.errors" or "forms.success". */
    code?: string;
    errors?: FieldErrors;
    /** Echoed back on failure so inputs can be refilled after React resets the form. */
    values?: Record<string, string>;
};

export const initialActionState: ActionState = { ok: false };
