import "server-only";
import { updateTag } from "next/cache";

/** Cache tags for data that changes rarely and is read on almost every page. */
export const PROGRAMMES_TAG = "programmes";
export const EDITIONS_TAG = "editions";

/**
 * Drops the cached programme and year lists so the next request reads fresh data. Call it from a
 * server action right after anything that changes a programme or a year.
 */
export function invalidateCatalog(): void {
    updateTag(PROGRAMMES_TAG);
    updateTag(EDITIONS_TAG);
}
