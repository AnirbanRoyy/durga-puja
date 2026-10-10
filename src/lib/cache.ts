import "server-only";
import { updateTag } from "next/cache";

/**
 * Server-side cache shared by every visitor, for the slow-changing lists only: programmes, years
 * and site settings. Registrations, results, drawings, votes and the registration checks are never
 * cached and always read the live database.
 * Cached data stays until an action that changes
 * it calls one of the invalidate functions below (the long expiry in queries.ts is only a safety
 * net for edits made outside the app). Keep CACHE_VERSION in sync when a cached shape changes.
 */
export const CACHE_VERSION = "v2";

export const PROGRAMMES_TAG = "programmes";
export const EDITIONS_TAG = "editions";
export const SETTINGS_TAG = "settings";

/** After anything that changes a programme or a year. Server actions only. */
export function invalidateCatalog(): void {
    updateTag(PROGRAMMES_TAG);
    updateTag(EDITIONS_TAG);
}

/** After a site setting (event music, donation, WhatsApp) is saved. */
export function invalidateSettings(): void {
    updateTag(SETTINGS_TAG);
}
