import "server-only";
import { db } from "@/lib/supabase/server";

/** Returns true when allowed. Fails open so a DB hiccup never blocks a visitor. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
    const { data, error } = await db().rpc("hit_rate_limit", {
        p_key: key,
        p_max: max,
        p_window_seconds: windowSeconds,
    });
    if (error) {
        console.error("rate limit check failed", error);
        return true;
    }
    return data;
}
