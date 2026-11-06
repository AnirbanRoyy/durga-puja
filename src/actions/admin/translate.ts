"use server";

import { checkSignedIn } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { toBengali, translationEnabled } from "@/lib/translate";

export type TranslateResult = { ok: true; text: string } | { ok: false; reason: string };

/** Admin-only helper behind the "Translate" button next to Bengali fields. */
export async function translateForAdmin(english: string): Promise<TranslateResult> {
    await checkSignedIn();
    const text = english.trim().slice(0, 4000);
    if (!text) {
        return { ok: false, reason: "Write the English text first." };
    }
    if (!translationEnabled()) {
        return {
            ok: false,
            reason: "Automatic translation is switched off (TRANSLATION_DISABLED).",
        };
    }
    if (!(await rateLimit("translate:admin", 120, 3600))) {
        return { ok: false, reason: "Too many translations this hour." };
    }
    const [bn] = await toBengali([text]);
    return bn
        ? { ok: true, text: bn }
        : {
              ok: false,
              reason: "Translation service is busy. Please try again or type the Bengali.",
          };
}
