"use client";

import { createContext, useContext, type ReactNode } from "react";
import { ALL_PERMISSIONS, type PermissionFlags } from "@/lib/access-rules";

// What the signed-in user may do on the current page, so components can hide buttons they can't
// use. Only a convenience: every server action checks again with checkPermission().

const AdminPermissionsContext = createContext<PermissionFlags>(ALL_PERMISSIONS);

export function AdminPermissions({
    flags,
    children,
}: Readonly<{ flags: PermissionFlags; children: ReactNode }>) {
    return (
        <AdminPermissionsContext.Provider value={flags}>
            {children}
        </AdminPermissionsContext.Provider>
    );
}

export function useAdminCan(): PermissionFlags {
    return useContext(AdminPermissionsContext);
}
