import "server-only";
import { Translate } from "translate";

/**
 * English → Bengali so organisers only write things once. No API key or billing needed:
 *  1. the `translate` package (Google's free web-translate endpoint), then
 *  2. MyMemory's free API as a fallback for anything the first one couldn't do.
 * Both are free services without guarantees, so every function here fails soft: a string that
 * can't be translated comes back as null, and saving carries on with the Bengali left blank.
 */
const TIMEOUT_MS = 6000;
const CONCURRENCY = 2;

const google = Translate({ engine: "google", from: "en", to: "bn" });

export function translationEnabled(): boolean {
    return process.env.TRANSLATION_DISABLED !== "1";
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)),
    ]);
}

/** A usable translation: non-empty and not just the English handed back. */
function usable(english: string, result: string | null | undefined): string | null {
    const text = result?.trim();
    if (!text || text.toLowerCase() === english.toLowerCase()) return null;
    return text;
}

async function viaGoogle(text: string): Promise<string | null> {
    try {
        return usable(text, await withTimeout(google(text)));
    } catch (error) {
        console.warn("translate: google endpoint failed", (error as Error).message);
        return null;
    }
}

async function viaMyMemory(text: string): Promise<string | null> {
    try {
        const params = new URLSearchParams({ q: text.slice(0, 500), langpair: "en|bn" });
        // An email raises MyMemory's free quota from 5,000 to 50,000 characters a day.
        if (process.env.TRANSLATE_CONTACT_EMAIL)
            params.set("de", process.env.TRANSLATE_CONTACT_EMAIL);
        const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: "no-store",
        });
        if (!response.ok) return null;
        const data = (await response.json()) as {
            responseStatus?: number | string;
            responseData?: { translatedText?: string };
        };
        if (Number(data.responseStatus) !== 200) return null;
        return usable(text, data.responseData?.translatedText);
    } catch (error) {
        console.warn("translate: mymemory failed", (error as Error).message);
        return null;
    }
}

async function translateOne(text: string): Promise<string | null> {
    return (await viaGoogle(text)) ?? (await viaMyMemory(text));
}

/** Translates each text to Bengali; empty inputs and failures give null. */
export async function toBengali(texts: (string | null | undefined)[]): Promise<(string | null)[]> {
    const cleaned = texts.map((x) => x?.trim() ?? "");
    const result: (string | null)[] = cleaned.map(() => null);
    if (!translationEnabled()) return result;

    const todo = cleaned.flatMap((text, i) => (text ? [i] : []));
    let next = 0;
    const worker = async () => {
        while (next < todo.length) {
            const i = todo[next++];
            result[i] = await translateOne(cleaned[i]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
    return result;
}

/** The Bengali the organiser typed, or an automatic translation of the English when it was left blank. */
export async function bengaliOrTranslated(
    english: string | null | undefined,
    bengali: string | null | undefined,
): Promise<string | null> {
    const typed = bengali?.trim();
    if (typed) return typed;
    return (await toBengali([english]))[0];
}

/** Same, for several English/Bengali pairs at once. */
export async function fillBengali(
    pairs: { en: string | null | undefined; bn: string | null | undefined }[],
): Promise<(string | null)[]> {
    const missing = pairs.map((p) => (p.bn?.trim() ? null : (p.en ?? null)));
    const translated = await toBengali(missing);
    return pairs.map((p, i) => p.bn?.trim() || translated[i] || null);
}

/** Exposed for testing the fallback path on its own. */
export const __engines = { viaGoogle, viaMyMemory };
