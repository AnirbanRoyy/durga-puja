"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { parseRegistration } from "@/lib/registration-input";
import { db } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/validators";

/**
 * An organiser edits any registration (individual, team or pair). It follows the same rules as a
 * participant's own edit, except that the sign-up being closed or full doesn't matter and no
 * network lock is involved.
 */
export async function adminUpdateRegistration(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    await requireAdmin();
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string") values[key] = value;
    }

    const id = z.uuid().safeParse(values.registrationId);
    if (!id.success) return { ok: false, code: "generic", values };

    const supabase = db();
    const { data: registration, error: findError } = await supabase
        .from("registrations")
        .select("id, programme_id")
        .eq("id", id.data)
        .maybeSingle();
    if (findError) throw findError;
    if (!registration) return { ok: false, code: "generic", values };

    // The programme comes from the registration itself, never from the form.
    const parsed = await parseRegistration({ ...values, programmeId: registration.programme_id });
    if (!parsed.ok) return { ok: false, code: "invalid", errors: parsed.errors, values };
    const { input } = parsed;

    const { error: contactError } = await supabase
        .from("registration_contacts")
        .update({
            phone: input.phone,
            name_key: input.name.toLowerCase().replace(/\s+/g, " "),
            age: input.age,
            guardian_name: input.guardianName,
            notes: input.notes,
        })
        .eq("registration_id", registration.id);
    if (contactError) {
        if (contactError.code === "23505") return { ok: false, code: "duplicate", values };
        throw contactError;
    }
    const { error } = await supabase
        .from("registrations")
        .update({ name: input.name, members: input.members })
        .eq("id", registration.id);
    if (error) throw error;

    refresh();
    return { ok: true, code: "updated" };
}
