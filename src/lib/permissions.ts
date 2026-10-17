import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
    ADMIN_LOGIN_PATH,
    NO_ACCESS_PATH,
    PATHNAME_HEADER,
    SUPER_ADMIN_USERNAME,
} from "@/constants";
import {
    can,
    hasAnyAccess,
    permissionFlags,
    readableProgrammeIds,
    sessionFromRow,
    SUPER_ADMIN_SESSION,
    type AccessTarget,
    type AdminSession,
    type PermissionAction,
    type PermissionFlags,
} from "@/lib/access-rules";
import { readAdminSubject } from "@/lib/auth";
import { db } from "@/lib/supabase/server";

// The one place admin pages, server actions and route handlers ask "who is this, and may they?".
// Start every admin page and action with `await checkPermission(action, target)`:
// not signed in (or disabled) -> login page; signed in but not allowed -> the no-access page.
// Redirects work the same in pages and actions, and survive production builds (thrown action
// errors are redacted there). Call it outside any try/catch, or the redirect is swallowed.

/** Tables whose rows belong to one programme (they have a `programme_id`). */
export type ProgrammeChildTable =
    | "registrations"
    | "quiz_rounds"
    | "quiz_questions"
    | "drawings"
    | "musical_chair_rounds"
    | "musical_chair_requests";

/** An area, a programme, or a row inside a programme (checked against that programme). */
export type AdminTarget = AccessTarget | { rowOf: ProgrammeChildTable; id: string };

/** The signed-in admin for this request, or null (not signed in, unknown or disabled user). */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
    const subject = await readAdminSubject();
    if (!subject) {
        return null;
    }
    if (subject === SUPER_ADMIN_USERNAME) {
        return SUPER_ADMIN_SESSION;
    }
    const { data, error } = await db().rpc("admin_session", { p_user_id: subject });
    if (error) {
        throw error;
    }
    if (!data) {
        return null;
    }
    return sessionFromRow(data);
});

async function redirectToLogin(): Promise<never> {
    const pathname = (await headers()).get(PATHNAME_HEADER);
    const next = pathname?.startsWith("/admin") ? `?next=${encodeURIComponent(pathname)}` : "";
    redirect(`${ADMIN_LOGIN_PATH}${next}`);
}

/** Looks up which programme a row belongs to. */
async function programmeOfRow(table: ProgrammeChildTable, id: string): Promise<string | null> {
    if (!z.uuid().safeParse(id).success) {
        return null;
    }
    const { data, error } = await db()
        .from(table as "registrations")
        .select("programme_id")
        .eq("id", id)
        .maybeSingle();
    if (error) {
        throw error;
    }
    return data?.programme_id ?? null;
}

async function resolveTarget(target: AdminTarget): Promise<AccessTarget | null> {
    if (!("rowOf" in target)) {
        return target;
    }
    const programmeId = await programmeOfRow(target.rowOf, target.id);
    return programmeId ? { programmeId } : null;
}

/** Signed in, still active, and allowed into the admin portal at all. */
export async function checkSignedIn(): Promise<AdminSession> {
    const session = await getAdminSession();
    if (!session) {
        return redirectToLogin();
    }
    if (!hasAnyAccess(session)) {
        redirect(NO_ACCESS_PATH);
    }
    return session;
}

/**
 * Authentication + authorisation for one admin page or action. Returns the session when the
 * signed-in user may do `action` on `target`; otherwise redirects (see the note at the top).
 */
export async function checkPermission(
    action: PermissionAction,
    target: AdminTarget,
): Promise<AdminSession> {
    const session = await checkSignedIn();
    if (session.kind === "super") {
        return session;
    }
    const resolved = await resolveTarget(target);
    if (!resolved || !can(session, action, resolved)) {
        redirect(NO_ACCESS_PATH);
    }
    return session;
}

/** Only the Super Admin (users, roles and permission sets). */
export async function checkSuperAdmin(): Promise<AdminSession> {
    const session = await checkSignedIn();
    if (session.kind !== "super") {
        redirect(NO_ACCESS_PATH);
    }
    return session;
}

/** The four switches for a target, for showing or hiding buttons. */
export async function getPermissionFlags(target: AccessTarget): Promise<PermissionFlags> {
    const session = await getAdminSession();
    if (!session) {
        return { create: false, read: false, update: false, delete: false };
    }
    return permissionFlags(session, target);
}

/** For pages listing programmes: the session and the programmes it may read (at least one). */
export async function checkCanReadSomeProgramme(): Promise<{
    session: AdminSession;
    readable: "all" | Set<string>;
}> {
    const session = await checkSignedIn();
    const readable = readableProgrammeIds(session);
    if (readable !== "all" && readable.size === 0) {
        redirect(NO_ACCESS_PATH);
    }
    return { session, readable };
}
