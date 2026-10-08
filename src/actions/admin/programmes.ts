"use server";

import { randomInt } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import type { PerformanceStatus, Programme } from "@/lib/database.types";
import { istLocalToIso } from "@/lib/datetime";
import { PROGRAMME_STATUSES, PROGRAMME_TYPES } from "@/lib/programme-meta";
import { db } from "@/lib/supabase/server";
import { fieldErrors, type ActionState } from "@/lib/validators";

const text = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .optional()
        .transform((v) => v || null);

const programmeSchema = z.object({
    id: z
        .uuid()
        .optional()
        .or(z.literal("").transform(() => undefined)),
    title_en: z.string().trim().min(2, "Title is required").max(120),
    title_bn: text(120),
    slug: z
        .string()
        .trim()
        .toLowerCase()
        .max(80)
        .regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and dashes")
        .optional(),
    type: z.enum(PROGRAMME_TYPES as [string, ...string[]]),
    status: z.enum(PROGRAMME_STATUSES as [string, ...string[]]),
    description_en: text(2000),
    description_bn: text(2000),
    rules_en: text(4000),
    rules_bn: text(4000),
    venue: text(120),
    cover_image_url: text(500),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
    max_participants: z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : null))
        .pipe(z.number().int().positive().nullable()),
    sort_order: z
        .string()
        .optional()
        .transform((v) => (v ? Number(v) : 0))
        .pipe(z.number().int()),
    admin_notes: text(2000),
});

function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}

export async function saveProgramme(_prev: ActionState, formData: FormData): Promise<ActionState> {
    await requireAdmin();
    const raw = Object.fromEntries(
        [...formData.entries()].filter(([, v]) => typeof v === "string"),
    ) as Record<string, string>;
    const parsed = programmeSchema.safeParse(raw);
    if (!parsed.success) {
        return {
            ok: false,
            code: "Please fix the highlighted fields.",
            errors: fieldErrors(parsed.error),
            values: raw,
        };
    }
    const { id, starts_at, ends_at, slug, ...rest } = parsed.data;
    const row = {
        ...rest,
        type: rest.type as Programme["type"],
        status: rest.status as Programme["status"],
        slug: slug || slugify(rest.title_en),
        starts_at: istLocalToIso(starts_at),
        ends_at: istLocalToIso(ends_at),
        registration_open: formData.get("registration_open") === "on",
        voting_open: formData.get("voting_open") === "on",
        hide_vote_counts: formData.get("hide_vote_counts") === "on",
    };

    const supabase = db();
    const query = id
        ? supabase.from("programmes").update(row).eq("id", id).select("id").single()
        : supabase.from("programmes").insert(row).select("id").single();
    const { data, error } = await query;
    if (error) {
        if (error.code === "23505") {
            return {
                ok: false,
                code: "That slug is already used.",
                errors: { slug: "Already used" },
                values: raw,
            };
        }
        throw error;
    }
    if (!id) redirect(`/admin/programmes/${data.id}`);
    refresh();
    return { ok: true, code: "Saved." };
}

export async function deleteProgramme(id: string) {
    await requireAdmin();
    const { error } = await db().from("programmes").delete().eq("id", id);
    if (error) throw error;
    redirect("/admin/programmes");
}

type QuickPatch = Partial<
    Pick<
        Programme,
        "status" | "registration_open" | "voting_open" | "hide_vote_counts" | "admin_notes"
    >
>;

export async function patchProgramme(id: string, patch: QuickPatch) {
    await requireAdmin();
    const { error } = await db().from("programmes").update(patch).eq("id", id);
    if (error) throw error;
    refresh();
}

// ---------------------------------------------------------------------------
// Lineup (singing / dance)
// ---------------------------------------------------------------------------

/** Fisher–Yates with a cryptographic RNG so nobody can claim the draw was rigged. */
function secureShuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export async function shuffleLineup(
    programmeId: string,
): Promise<{ ok: boolean; message?: string }> {
    await requireAdmin();
    const supabase = db();
    const { data: programme, error: pErr } = await supabase
        .from("programmes")
        .select("order_locked")
        .eq("id", programmeId)
        .single();
    if (pErr) throw pErr;
    if (programme.order_locked)
        return { ok: false, message: "Order is locked. Unlock it to reshuffle." };

    const { data: regs, error } = await supabase
        .from("registrations")
        .select("id")
        .eq("programme_id", programmeId);
    if (error) throw error;

    const order = secureShuffle(regs);
    await Promise.all(
        order.map((r, i) =>
            supabase
                .from("registrations")
                .update({ sequence_no: i + 1, performance_status: "waiting" })
                .eq("id", r.id)
                .then(({ error: e }) => {
                    if (e) throw e;
                }),
        ),
    );
    refresh();
    return { ok: true };
}

export async function setOrderLocked(programmeId: string, locked: boolean) {
    await requireAdmin();
    const { error } = await db()
        .from("programmes")
        .update({ order_locked: locked })
        .eq("id", programmeId);
    if (error) throw error;
    refresh();
}

export async function setPerformanceStatus(registrationId: string, status: PerformanceStatus) {
    await requireAdmin();
    const supabase = db();
    if (status === "on_stage") {
        const { data: reg, error } = await supabase
            .from("registrations")
            .select("programme_id")
            .eq("id", registrationId)
            .single();
        if (error) throw error;
        // Only one performer on stage at a time.
        await supabase
            .from("registrations")
            .update({ performance_status: "done" })
            .eq("programme_id", reg.programme_id)
            .eq("performance_status", "on_stage");
    }
    const { error } = await supabase
        .from("registrations")
        .update({ performance_status: status })
        .eq("id", registrationId);
    if (error) throw error;
    refresh();
}

/** Marks whoever is on stage as done and calls the next waiting performer. */
export async function callNext(programmeId: string) {
    await requireAdmin();
    const supabase = db();
    await supabase
        .from("registrations")
        .update({ performance_status: "done" })
        .eq("programme_id", programmeId)
        .eq("performance_status", "on_stage");
    const { data: next, error } = await supabase
        .from("registrations")
        .select("id")
        .eq("programme_id", programmeId)
        .eq("performance_status", "waiting")
        .not("sequence_no", "is", null)
        .order("sequence_no", { ascending: true })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    if (next) {
        await supabase
            .from("registrations")
            .update({ performance_status: "on_stage" })
            .eq("id", next.id);
    }
    refresh();
}

export async function moveToEnd(registrationId: string) {
    await requireAdmin();
    const supabase = db();
    const { data: reg, error } = await supabase
        .from("registrations")
        .select("programme_id")
        .eq("id", registrationId)
        .single();
    if (error) throw error;
    const { data: last } = await supabase
        .from("registrations")
        .select("sequence_no")
        .eq("programme_id", reg.programme_id)
        .order("sequence_no", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
    await supabase
        .from("registrations")
        .update({ sequence_no: (last?.sequence_no ?? 0) + 1, performance_status: "waiting" })
        .eq("id", registrationId);
    refresh();
}

export async function deleteRegistration(registrationId: string) {
    await requireAdmin();
    const { error } = await db().from("registrations").delete().eq("id", registrationId);
    if (error) throw error;
    refresh();
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type ResultInput = {
    position: number;
    name: string;
    score?: string | null;
    remark?: string | null;
};

export async function saveResults(
    programmeId: string,
    entries: ResultInput[],
    markCompleted: boolean,
) {
    await requireAdmin();
    const clean = entries
        .map((e) => ({
            programme_id: programmeId,
            position: Math.max(1, Math.floor(Number(e.position) || 1)),
            name: e.name.trim().slice(0, 80),
            score: e.score?.trim().slice(0, 40) || null,
            remark: e.remark?.trim().slice(0, 200) || null,
        }))
        .filter((e) => e.name);
    const supabase = db();
    const { error: delError } = await supabase
        .from("results")
        .delete()
        .eq("programme_id", programmeId);
    if (delError) throw delError;
    if (clean.length) {
        const { error } = await supabase.from("results").insert(clean);
        if (error) throw error;
    }
    if (markCompleted) {
        await supabase.from("programmes").update({ status: "completed" }).eq("id", programmeId);
    }
    refresh();
}
