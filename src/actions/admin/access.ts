"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
    ADMIN_AREAS,
    MIN_PASSWORD_LENGTH,
    SUPER_ADMIN_ROLE,
    SUPER_ADMIN_USERNAME,
    USERNAME_PATTERN,
} from "@/constants";
import { hashPassword } from "@/lib/password";
import { checkSuperAdmin } from "@/lib/permissions";
import { db } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/validators";

// Users, roles and permission sets. Super Admin only.

export type AccessActionResult = { ok: true } | { ok: false; message: string };

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

function formValues(formData: FormData): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
            values[key] = value;
        }
    }
    return values;
}

function failure(code: string, values?: Record<string, string>): ActionState {
    return { ok: false, code, values };
}

const optionalText = (max: number) =>
    z
        .string()
        .trim()
        .max(max)
        .optional()
        .transform((v) => v || null);

const usernameSchema = z
    .string()
    .trim()
    .toLowerCase()
    .regex(
        USERNAME_PATTERN,
        "Username: 3-32 lowercase letters, numbers, dots, dashes or underscores.",
    )
    .refine((name) => name !== SUPER_ADMIN_USERNAME, "That username is reserved.");

const passwordSchema = z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password: at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(200);

const userDetailsSchema = z.object({
    name: z.string().trim().min(1, "Name is required.").max(80),
    username: usernameSchema,
    phone: optionalText(20),
    email: z
        .union([z.literal(""), z.email("That email doesn't look right.")])
        .optional()
        .transform((v) => v || null),
    roleId: z.uuid("Choose a role."),
});

/** Users can't be given the Super Admin role: that stays with the password in the environment. */
async function isAssignableRole(roleId: string): Promise<boolean> {
    const { data, error } = await db().from("roles").select("name").eq("id", roleId).maybeSingle();
    if (error) {
        throw error;
    }
    return data !== null && data.name !== SUPER_ADMIN_ROLE;
}

function describeUserError(error: { code?: string; message: string }): string {
    if (error.code === UNIQUE_VIOLATION) {
        return "That username is taken.";
    }
    return error.message;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
    await checkSuperAdmin();
    const values = formValues(formData);
    const details = userDetailsSchema.safeParse(values);
    if (!details.success) {
        return failure(details.error.issues[0]?.message ?? "Invalid input.", values);
    }
    const password = passwordSchema.safeParse(values.password ?? "");
    if (!password.success) {
        return failure(password.error.issues[0]?.message ?? "Invalid password.", values);
    }
    if (!(await isAssignableRole(details.data.roleId))) {
        return failure("Choose another role.", values);
    }

    const { error } = await db()
        .from("users")
        .insert({
            name: details.data.name,
            username: details.data.username,
            phone: details.data.phone,
            email: details.data.email,
            role_id: details.data.roleId,
            password_hash: await hashPassword(password.data),
        });
    if (error) {
        return failure(describeUserError(error), values);
    }
    refresh();
    return { ok: true, code: `Added ${details.data.username}.` };
}

export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
    await checkSuperAdmin();
    const values = formValues(formData);
    const id = z.uuid().safeParse(values.id);
    const details = userDetailsSchema.safeParse(values);
    if (!id.success) {
        return failure("User not found.", values);
    }
    if (!details.success) {
        return failure(details.error.issues[0]?.message ?? "Invalid input.", values);
    }
    if (!(await isAssignableRole(details.data.roleId))) {
        return failure("Choose another role.", values);
    }

    const { error } = await db()
        .from("users")
        .update({
            name: details.data.name,
            username: details.data.username,
            phone: details.data.phone,
            email: details.data.email,
            role_id: details.data.roleId,
        })
        .eq("id", id.data);
    if (error) {
        return failure(describeUserError(error), values);
    }
    refresh();
    return { ok: true, code: "User saved." };
}

export async function setUserPassword(
    _prev: ActionState,
    formData: FormData,
): Promise<ActionState> {
    await checkSuperAdmin();
    const id = z.uuid().safeParse(formData.get("id"));
    const password = passwordSchema.safeParse(formData.get("password") ?? "");
    if (!id.success) {
        return failure("User not found.");
    }
    if (!password.success) {
        return failure(password.error.issues[0]?.message ?? "Invalid password.");
    }
    const { error } = await db()
        .from("users")
        .update({ password_hash: await hashPassword(password.data) })
        .eq("id", id.data);
    if (error) {
        return failure(error.message);
    }
    return { ok: true, code: "Password changed." };
}

/** Disabled users can't sign in and are signed out on their next page load. */
export async function setUserActive(userId: string, active: boolean): Promise<AccessActionResult> {
    await checkSuperAdmin();
    const { error } = await db().from("users").update({ active }).eq("id", z.uuid().parse(userId));
    if (error) {
        return { ok: false, message: error.message };
    }
    refresh();
    return { ok: true };
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

const roleSchema = z.object({
    id: z.uuid().optional(),
    name: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9-]{2,48}$/, "Role name: 2-48 lowercase letters, numbers or dashes."),
    description: optionalText(200),
    permissionSetIds: z.array(z.uuid()),
});

export type RoleInput = z.input<typeof roleSchema>;

export async function saveRole(input: RoleInput): Promise<AccessActionResult> {
    await checkSuperAdmin();
    const parsed = roleSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const { id, name, description, permissionSetIds } = parsed.data;
    const supabase = db();

    let roleId = id;
    if (roleId) {
        const { data: existing, error } = await supabase
            .from("roles")
            .select("name, built_in")
            .eq("id", roleId)
            .maybeSingle();
        if (error) {
            return { ok: false, message: error.message };
        }
        if (!existing) {
            return { ok: false, message: "Role not found." };
        }
        if (existing.built_in) {
            // Built-in roles keep their name, and their access is fixed: the Super Admin can do
            // everything anyway, and the Audience has nothing.
            return { ok: false, message: "Built-in roles can't be changed." };
        }
        const { error: updateError } = await supabase
            .from("roles")
            .update({ name, description })
            .eq("id", roleId);
        if (updateError) {
            return { ok: false, message: describeRoleError(updateError) };
        }
    } else {
        const { data, error } = await supabase
            .from("roles")
            .insert({ name, description })
            .select("id")
            .single();
        if (error) {
            return { ok: false, message: describeRoleError(error) };
        }
        roleId = data.id;
    }

    const { error: setsError } = await supabase.rpc("set_role_permission_sets", {
        p_role_id: roleId,
        p_permission_set_ids: permissionSetIds,
    });
    if (setsError) {
        return { ok: false, message: setsError.message };
    }
    refresh();
    return { ok: true };
}

function describeRoleError(error: { code?: string; message: string }): string {
    if (error.code === UNIQUE_VIOLATION) {
        return "A role with that name already exists.";
    }
    return error.message;
}

export async function deleteRole(roleId: string): Promise<AccessActionResult> {
    await checkSuperAdmin();
    const supabase = db();
    const { data: role, error } = await supabase
        .from("roles")
        .select("built_in")
        .eq("id", z.uuid().parse(roleId))
        .maybeSingle();
    if (error) {
        return { ok: false, message: error.message };
    }
    if (!role) {
        return { ok: false, message: "Role not found." };
    }
    if (role.built_in) {
        return { ok: false, message: "Built-in roles can't be deleted." };
    }
    const { error: deleteError } = await supabase.from("roles").delete().eq("id", roleId);
    if (deleteError) {
        if (deleteError.code === FOREIGN_KEY_VIOLATION) {
            return { ok: false, message: "Users still have this role. Give them another first." };
        }
        return { ok: false, message: deleteError.message };
    }
    refresh();
    return { ok: true };
}

// ---------------------------------------------------------------------------
// Permission sets
// ---------------------------------------------------------------------------

const permissionSetSchema = z.object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1, "Give the permission set a name.").max(80),
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
    programmeIds: z.array(z.uuid()),
    areas: z.array(z.enum(ADMIN_AREAS)),
});

export type PermissionSetInput = z.input<typeof permissionSetSchema>;

export async function savePermissionSet(input: PermissionSetInput): Promise<AccessActionResult> {
    await checkSuperAdmin();
    const parsed = permissionSetSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const set = parsed.data;
    const { error } = await db().rpc("save_permission_set", {
        p_id: set.id ?? null,
        p_name: set.name,
        p_create: set.create,
        p_read: set.read,
        p_update: set.update,
        p_delete: set.delete,
        p_programme_ids: set.programmeIds,
        p_areas: set.areas,
    });
    if (error) {
        if (error.code === UNIQUE_VIOLATION) {
            return { ok: false, message: "A permission set with that name already exists." };
        }
        return { ok: false, message: error.message };
    }
    refresh();
    return { ok: true };
}

export async function deletePermissionSet(setId: string): Promise<AccessActionResult> {
    await checkSuperAdmin();
    const { error } = await db().from("permission_sets").delete().eq("id", z.uuid().parse(setId));
    if (error) {
        if (error.code === FOREIGN_KEY_VIOLATION) {
            return {
                ok: false,
                message: "A role still uses this set. Remove it from the role first.",
            };
        }
        return { ok: false, message: error.message };
    }
    refresh();
    return { ok: true };
}
