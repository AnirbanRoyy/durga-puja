"use client";

import { useActionState, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit02Icon, PlusSignIcon, SquareLock01Icon } from "@hugeicons/core-free-icons";
import { createUser, setUserActive, setUserPassword, updateUser } from "@/actions/admin/access";
import { useActionToast } from "@/components/admin/use-action-toast";
import { useAdminRun } from "@/components/admin/use-admin-run";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MIN_PASSWORD_LENGTH, SUPER_ADMIN_ROLE } from "@/constants";
import type { RoleWithSets, UserListItem } from "@/lib/access-queries";
import { formatIst } from "@/lib/datetime";
import { initialActionState, type ActionState } from "@/lib/validators";

type RoleOption = Pick<RoleWithSets, "id" | "name">;

const SELECT_CLASS =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function LabeledField({
    id,
    label,
    children,
}: Readonly<{ id: string; label: string; children: React.ReactNode }>) {
    return (
        <div className="grid grid-cols-1 gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            {children}
        </div>
    );
}

/** Name, username, phone, email and role: shared by the add and edit forms. */
function UserDetailsFields({
    prefix,
    roles,
    values,
}: Readonly<{ prefix: string; roles: RoleOption[]; values: Record<string, string> }>) {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LabeledField id={`${prefix}-name`} label="Name">
                <Input id={`${prefix}-name`} name="name" defaultValue={values.name} required />
            </LabeledField>
            <LabeledField id={`${prefix}-username`} label="Username">
                <Input
                    id={`${prefix}-username`}
                    name="username"
                    defaultValue={values.username}
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                />
            </LabeledField>
            <LabeledField id={`${prefix}-phone`} label="Phone (optional)">
                <Input id={`${prefix}-phone`} name="phone" type="tel" defaultValue={values.phone} />
            </LabeledField>
            <LabeledField id={`${prefix}-email`} label="Email (optional)">
                <Input
                    id={`${prefix}-email`}
                    name="email"
                    type="email"
                    defaultValue={values.email}
                />
            </LabeledField>
            <LabeledField id={`${prefix}-role`} label="Role">
                <select
                    id={`${prefix}-role`}
                    name="roleId"
                    defaultValue={values.roleId ?? ""}
                    className={SELECT_CLASS}
                    required
                >
                    <option value="" disabled>
                        Choose a role
                    </option>
                    {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                            {role.name}
                        </option>
                    ))}
                </select>
            </LabeledField>
        </div>
    );
}

/** Calls onDone once the action succeeds. */
function useCloseOnSuccess(state: ActionState, onDone?: () => void) {
    useEffect(() => {
        if (state.ok && onDone) {
            onDone();
        }
    }, [state, onDone]);
}

function AddUserForm({ roles }: Readonly<{ roles: RoleOption[] }>) {
    const [state, action, pending] = useActionState(createUser, initialActionState);
    useActionToast(state);
    const values = state.ok ? {} : (state.values ?? {});
    return (
        <form action={action} className="grid grid-cols-1 gap-3">
            <UserDetailsFields prefix="new-user" roles={roles} values={values} />
            <LabeledField id="new-user-password" label="Starting password">
                <Input
                    id="new-user-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                />
            </LabeledField>
            <p className="text-xs text-muted-foreground">
                Give the username and password to the person yourself. At least{" "}
                {MIN_PASSWORD_LENGTH} characters.
            </p>
            <div>
                <Button type="submit" disabled={pending}>
                    <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
                    Add user
                </Button>
            </div>
        </form>
    );
}

function EditUserForm({
    user,
    roles,
    onDone,
}: Readonly<{ user: UserListItem; roles: RoleOption[]; onDone: () => void }>) {
    const [state, action, pending] = useActionState(updateUser, initialActionState);
    useActionToast(state);
    useCloseOnSuccess(state, onDone);
    const saved = {
        name: user.name,
        username: user.username,
        phone: user.phone ?? "",
        email: user.email ?? "",
        roleId: user.role_id,
    };
    const values = state.ok ? saved : { ...saved, ...state.values };
    return (
        <form action={action} className="grid grid-cols-1 gap-3 pt-3">
            <input type="hidden" name="id" value={user.id} />
            <UserDetailsFields prefix={`user-${user.id}`} roles={roles} values={values} />
            <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                    Save
                </Button>
                <Button type="button" variant="ghost" onClick={onDone}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}

function PasswordForm({ user, onDone }: Readonly<{ user: UserListItem; onDone: () => void }>) {
    const [state, action, pending] = useActionState(setUserPassword, initialActionState);
    useActionToast(state);
    useCloseOnSuccess(state, onDone);
    const fieldId = `password-${user.id}`;
    return (
        <form action={action} className="grid grid-cols-1 gap-3 pt-3 sm:max-w-sm">
            <input type="hidden" name="id" value={user.id} />
            <LabeledField id={fieldId} label={`New password for ${user.username}`}>
                <Input
                    id={fieldId}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                />
            </LabeledField>
            <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                    Set password
                </Button>
                <Button type="button" variant="ghost" onClick={onDone}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}

type OpenPanel = { userId: string; panel: "edit" | "password" } | null;

function UserRow({
    user,
    roles,
    roleName,
    openPanel,
    setOpenPanel,
}: Readonly<{
    user: UserListItem;
    roles: RoleOption[];
    roleName: string;
    openPanel: OpenPanel;
    setOpenPanel: (panel: OpenPanel) => void;
}>) {
    const { pending, run } = useAdminRun();
    const panel = openPanel?.userId === user.id ? openPanel.panel : null;
    const close = () => setOpenPanel(null);
    const toggle = (next: "edit" | "password") => {
        setOpenPanel(panel === next ? null : { userId: user.id, panel: next });
    };
    const lastLogin = user.last_login_at ? formatIst(user.last_login_at) : "never";

    return (
        <li className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1 basis-full sm:basis-0">
                    <p className="truncate font-medium">
                        {user.name}{" "}
                        <span className="font-normal text-muted-foreground">@{user.username}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        Last sign-in: {lastLogin}
                    </p>
                </div>
                <Badge variant="secondary">{roleName}</Badge>
                {!user.active && <Badge variant="outline">Disabled</Badge>}
                <div className="flex items-center gap-1">
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Edit user"
                        aria-expanded={panel === "edit"}
                        onClick={() => toggle("edit")}
                    >
                        <HugeiconsIcon icon={PencilEdit02Icon} />
                        <span className="sr-only">Edit {user.username}</span>
                    </Button>
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Set a new password"
                        aria-expanded={panel === "password"}
                        onClick={() => toggle("password")}
                    >
                        <HugeiconsIcon icon={SquareLock01Icon} />
                        <span className="sr-only">Set a new password for {user.username}</span>
                    </Button>
                    <label className="flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
                        <Switch
                            checked={user.active}
                            disabled={pending}
                            onCheckedChange={(active) =>
                                run(
                                    () => setUserActive(user.id, active),
                                    active
                                        ? `${user.username} can sign in`
                                        : `${user.username} disabled`,
                                )
                            }
                        />
                        Active
                    </label>
                </div>
            </div>
            {panel === "edit" && <EditUserForm user={user} roles={roles} onDone={close} />}
            {panel === "password" && <PasswordForm user={user} onDone={close} />}
        </li>
    );
}

export function UsersManager({
    users,
    roles,
}: Readonly<{ users: UserListItem[]; roles: RoleWithSets[] }>) {
    const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
    const assignableRoles = roles.filter((role) => role.name !== SUPER_ADMIN_ROLE);
    const roleNames = new Map(roles.map((role) => [role.id, role.name]));

    return (
        <div className="grid grid-cols-1 gap-4">
            <AddUserForm roles={assignableRoles} />
            {users.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No users yet. You sign in as <strong>superadmin</strong>.
                </p>
            ) : (
                <ul className="divide-y rounded-2xl border">
                    {users.map((user) => (
                        <UserRow
                            key={user.id}
                            user={user}
                            roles={assignableRoles}
                            roleName={roleNames.get(user.role_id) ?? "unknown"}
                            openPanel={openPanel}
                            setOpenPanel={setOpenPanel}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}
