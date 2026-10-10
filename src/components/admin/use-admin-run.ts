"use client";

import { useTransition } from "react";
import { toast } from "sonner";

/**
 * Runs an admin server action and always tells the organiser how it went: a success toast with the
 * given message, or an error toast (including actions that return `{ ok: false, message }`).
 */
export function useAdminRun() {
    const [pending, startTransition] = useTransition();
    const run = (fn: () => Promise<unknown>, success: string) =>
        startTransition(async () => {
            try {
                const result = (await fn()) as { ok?: boolean; message?: string } | undefined;
                if (result && result.ok === false)
                    toast.error(result.message ?? "Something went wrong");
                else toast.success(success);
            } catch (e) {
                toast.error(e instanceof Error ? e.message : "Something went wrong");
            }
        });
    return { pending, run };
}
