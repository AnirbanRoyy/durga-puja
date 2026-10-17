import { PERMISSION_ACTIONS, SUPER_ADMIN_ROLE_NAME } from "@/constants";
import type { AdminArea, AdminSessionRow } from "@/lib/database.types";

// The access rules, as plain functions of the signed-in session. No I/O here, so they're easy to
// test and safe to reuse for hiding buttons. Loading the session and redirecting live in
// `@/lib/permissions`.

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** What a check is about: an admin area, or one programme (and everything inside it). */
export type AccessTarget = { area: AdminArea } | { programmeId: string };

/** One permission set of the user's role. */
export type Grant = {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    programmeIds: Set<string>;
    areas: Set<AdminArea>;
};

export type AdminSession =
    | { kind: "super"; name: string; roleName: string }
    | { kind: "user"; id: string; name: string; roleName: string; grants: Grant[] };

export type PermissionFlags = Record<PermissionAction, boolean>;

export const ALL_PERMISSIONS: PermissionFlags = {
    create: true,
    read: true,
    update: true,
    delete: true,
};

export const SUPER_ADMIN_SESSION: AdminSession = {
    kind: "super",
    name: SUPER_ADMIN_ROLE_NAME,
    roleName: SUPER_ADMIN_ROLE_NAME,
};

export function sessionFromRow(row: AdminSessionRow): AdminSession {
    return {
        kind: "user",
        id: row.id,
        name: row.name,
        roleName: row.role_name,
        grants: row.grants.map((grant) => ({
            create: grant.create,
            read: grant.read,
            update: grant.update,
            delete: grant.delete,
            programmeIds: new Set(grant.programme_ids),
            areas: new Set(grant.areas),
        })),
    };
}

function grantCovers(grant: Grant, target: AccessTarget): boolean {
    if ("area" in target) {
        return grant.areas.has(target.area);
    }
    return grant.areas.has("all_programmes") || grant.programmeIds.has(target.programmeId);
}

/** True when some permission set of the user's role has this switch on and covers the target. */
export function can(
    session: AdminSession,
    action: PermissionAction,
    target: AccessTarget,
): boolean {
    if (session.kind === "super") {
        return true;
    }
    return session.grants.some((grant) => grant[action] && grantCovers(grant, target));
}

export function permissionFlags(session: AdminSession, target: AccessTarget): PermissionFlags {
    return {
        create: can(session, "create", target),
        read: can(session, "read", target),
        update: can(session, "update", target),
        delete: can(session, "delete", target),
    };
}

function grantLinksSomething(grant: Grant): boolean {
    return grant.areas.size > 0 || grant.programmeIds.size > 0;
}

/** Can open at least one admin page. Audience users (and roles with no sets) can't. */
export function hasAnyAccess(session: AdminSession): boolean {
    if (session.kind === "super") {
        return true;
    }
    return session.grants.some((grant) => grant.read && grantLinksSomething(grant));
}

/** May create or change anything at all (used to allow file uploads). */
export function canWriteAnything(session: AdminSession): boolean {
    if (session.kind === "super") {
        return true;
    }
    return session.grants.some(
        (grant) => (grant.create || grant.update) && grantLinksSomething(grant),
    );
}

/** Programmes the user may read: "all", or the ids linked to their readable permission sets. */
export function readableProgrammeIds(session: AdminSession): "all" | Set<string> {
    if (session.kind === "super" || can(session, "read", { area: "all_programmes" })) {
        return "all";
    }
    const ids = new Set<string>();
    for (const grant of session.grants) {
        if (grant.read) {
            grant.programmeIds.forEach((id) => ids.add(id));
        }
    }
    return ids;
}

export function canReadProgramme(readable: "all" | Set<string>, programmeId: string): boolean {
    return readable === "all" || readable.has(programmeId);
}

/** Admin nav pages and the area whose read switch opens them. */
const AREA_PAGES: { href: string; area: AdminArea }[] = [
    { href: "/admin/registrations", area: "registrations" },
    { href: "/admin/stream", area: "stream" },
    { href: "/admin/songs", area: "songs" },
    { href: "/admin/song-requests", area: "song_requests" },
    { href: "/admin/feedback", area: "feedback" },
    { href: "/admin/years", area: "years" },
    { href: "/admin/settings", area: "settings" },
];

/** The admin pages to show in the nav for this session. */
export function visibleAdminPages(session: AdminSession): string[] {
    const pages = ["/admin"];
    const readable = readableProgrammeIds(session);
    if (readable === "all" || readable.size > 0) {
        pages.push("/admin/programmes");
    }
    for (const page of AREA_PAGES) {
        if (can(session, "read", { area: page.area })) {
            pages.push(page.href);
        }
    }
    if (session.kind === "super") {
        pages.push("/admin/users");
    }
    return pages;
}
