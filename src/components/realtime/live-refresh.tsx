"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { browserDb } from "@/lib/supabase/client";

type LiveTable =
    | "programmes"
    | "registrations"
    | "song_requests"
    | "musical_chair_rounds"
    | "drawings"
    | "results"
    | "quiz_rounds"
    | "quiz_questions"
    | "stream_requests"
    | "stream_state";

/**
 * Re-renders the current server page whenever one of the given tables changes.
 * Server components stay the single source of truth; Realtime is only a "something changed" ping.
 */
export function LiveRefresh({ tables, filter }: { tables: LiveTable[]; filter?: string }) {
    const router = useRouter();
    const key = tables.join(",");

    useEffect(() => {
        const supabase = browserDb();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const refresh = () => {
            clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 300);
        };

        const channel = supabase.channel(`live:${key}:${filter ?? "all"}:${Math.random()}`);
        for (const table of key.split(",")) {
            channel.on(
                "postgres_changes",
                { event: "*", schema: "public", table, filter },
                refresh,
            );
        }
        channel.subscribe();

        return () => {
            clearTimeout(timer);
            supabase.removeChannel(channel);
        };
    }, [key, filter, router]);

    return null;
}
