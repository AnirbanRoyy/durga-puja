"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";

let client: SupabaseClient<Database> | null = null;

/** Anon client for the browser: read-only access to public tables and Realtime. */
export function browserDb(): SupabaseClient<Database> {
    if (!client) {
        client = createClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey(), {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    return client;
}
