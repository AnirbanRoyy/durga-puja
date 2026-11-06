import { AdminCard, AdminTitle } from "@/components/admin/admin-bits";
import { PermissionSetsManager } from "@/components/admin/access/permission-sets-manager";
import { RolesManager } from "@/components/admin/access/roles-manager";
import { UsersManager } from "@/components/admin/access/users-manager";
import { getAccessControlData } from "@/lib/access-queries";
import { checkSuperAdmin } from "@/lib/permissions";

export const metadata = { title: "Users & roles" };

export default async function UsersAndRolesPage() {
    await checkSuperAdmin();
    const { users, roles, permissionSets, programmes } = await getAccessControlData();

    const roleUsage: Record<string, number> = {};
    for (const role of roles) {
        for (const setId of role.permissionSetIds) {
            roleUsage[setId] = (roleUsage[setId] ?? 0) + 1;
        }
    }

    return (
        <>
            <AdminTitle
                title="Users & roles"
                description="Who can sign in, and what each role may do. Access starts at nothing: a role only gets what its permission sets allow."
            />
            <div className="grid max-w-4xl grid-cols-1 gap-8">
                <AdminCard title="Users">
                    <UsersManager users={users} roles={roles} />
                </AdminCard>
                <AdminCard title="Roles">
                    <RolesManager roles={roles} permissionSets={permissionSets} />
                </AdminCard>
                <AdminCard title="Permission sets">
                    <p className="mb-2 text-sm text-muted-foreground">
                        A set switches on create, read, update or delete for the areas and
                        programmes ticked in it. Give sets to roles above.
                    </p>
                    <PermissionSetsManager
                        permissionSets={permissionSets}
                        programmes={programmes}
                        roleUsage={roleUsage}
                    />
                </AdminCard>
            </div>
        </>
    );
}
