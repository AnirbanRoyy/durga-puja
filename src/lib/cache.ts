import "server-only";
import { updateTag } from "next/cache";
import { EDITIONS_TAG, PROGRAMMES_TAG, SETTINGS_TAG } from "@/constants";

/**
 * Server-side cache shared by every visitor, for the slow-changing lists only: programmes, years
 * and site settings. Registrations, results, drawings, votes and the registration checks are never
 * cached and always read the live database.
 * Cached data stays until an action that changes
 * it calls one of the invalidate functions below (the long expiry in queries.ts is only a safety
 * net for edits made outside the app). Keep CACHE_VERSION (src/constants.ts) in sync when a cached shape changes.
 */

/** After anything that changes a programme or a year. Server actions only. */
export function invalidateCatalog(): void {
    updateTag(PROGRAMMES_TAG);
    updateTag(EDITIONS_TAG);
}

/** After a site setting (event music, donation, WhatsApp) is saved. */
export function invalidateSettings(): void {
    updateTag(SETTINGS_TAG);
}
