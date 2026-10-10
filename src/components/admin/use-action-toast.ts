"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/validators";

/**
 * Shows the result of a form's server action as a toast, so admin forms don't print loose text.
 * Field-level errors stay next to their fields; this adds the overall message.
 */
export function useActionToast(state: ActionState) {
    useEffect(() => {
        if (!state.code) return;
        if (state.ok) toast.success(state.code);
        else toast.error(state.code);
    }, [state]);
}
