import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { publicEnv, serverEnv } from "@/lib/env";

let client: SupabaseClient<Database> | null = null;

/**
 * Service-role client. Bypasses RLS, so it must only run on the server and every
 * write path must validate input (and check the admin session where relevant).
 */
export function db(): SupabaseClient<Database> {
    if (!client) {
        client = createClient<Database>(
            publicEnv.supabaseUrl(),
            serverEnv.supabaseServiceRoleKey(),
            { auth: { persistSession: false, autoRefreshToken: false } },
        );
    }
    return client;
}
