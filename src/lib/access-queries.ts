import "server-only";
import type { AdminArea, AdminUser, PermissionSet, Role } from "@/lib/database.types";
import { db } from "@/lib/supabase/server";

// Reads for the Users & roles page (Super Admin only). Password hashes never leave the server.

export type UserListItem = Omit<AdminUser, "password_hash">;

export type RoleWithSets = Role & { permissionSetIds: string[]; userCount: number };

export type PermissionSetWithLinks = PermissionSet & {
    programmeIds: string[];
    areas: AdminArea[];
};

export type ProgrammeOption = { id: string; year: number; title: string };

export type AccessControlData = {
    users: UserListItem[];
    roles: RoleWithSets[];
    permissionSets: PermissionSetWithLinks[];
    programmes: ProgrammeOption[];
};

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
    if (result.error) {
        throw new Error(`Failed to load ${what}: ${result.error.message}`);
    }
    return result.data as T;
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    for (const row of rows) {
        const list = groups.get(key(row)) ?? [];
        list.push(row);
        groups.set(key(row), list);
    }
    return groups;
}

export async function getAccessControlData(): Promise<AccessControlData> {
    const supabase = db();
    const [users, roles, sets, roleSets, setProgrammes, setAreas, programmes] = await Promise.all([
        supabase
            .from("users")
            .select("id, name, username, phone, email, role_id, active, created_at, last_login_at")
            .order("name")
            .then((r) => unwrap(r, "users")),
        supabase
            .from("roles")
            .select("*")
            .order("built_in", { ascending: false })
            .order("name")
            .then((r) => unwrap(r, "roles")),
        supabase
            .from("permission_sets")
            .select("*")
            .order("name")
            .then((r) => unwrap(r, "permission sets")),
        supabase
            .from("role_permission_sets")
            .select("role_id, permission_set_id")
            .then((r) => unwrap(r, "role permission sets")),
        supabase
            .from("permission_set_programmes")
            .select("permission_set_id, programme_id")
            .then((r) => unwrap(r, "permission set programmes")),
        supabase
            .from("permission_set_areas")
            .select("permission_set_id, area")
            .then((r) => unwrap(r, "permission set areas")),
        supabase
            .from("programmes")
            .select("id, year, title_en")
            .order("year", { ascending: false })
            .order("sort_order")
            .then((r) => unwrap(r, "programmes")),
    ]);

    const setsByRole = groupBy(roleSets, (row) => row.role_id);
    const usersByRole = groupBy(users, (user) => user.role_id);
    const programmesBySet = groupBy(setProgrammes, (row) => row.permission_set_id);
    const areasBySet = groupBy(setAreas, (row) => row.permission_set_id);

    return {
        users,
        roles: roles.map((role) => ({
            ...role,
            permissionSetIds: (setsByRole.get(role.id) ?? []).map((row) => row.permission_set_id),
            userCount: usersByRole.get(role.id)?.length ?? 0,
        })),
        permissionSets: sets.map((set) => ({
            ...set,
            programmeIds: (programmesBySet.get(set.id) ?? []).map((row) => row.programme_id),
            areas: (areasBySet.get(set.id) ?? []).map((row) => row.area),
        })),
        programmes: programmes.map((p) => ({ id: p.id, year: p.year, title: p.title_en })),
    };
}
