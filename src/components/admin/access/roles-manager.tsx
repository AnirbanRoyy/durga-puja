"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { deleteRole, saveRole } from "@/actions/admin/access";
import { ConfirmDeleteButton } from "@/components/admin/access/confirm-delete-button";
import { useAdminRun } from "@/components/admin/use-admin-run";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PermissionSetWithLinks, RoleWithSets } from "@/lib/access-queries";

type SetOption = Pick<PermissionSetWithLinks, "id" | "name">;

function RoleForm({
    role,
    permissionSets,
    onDone,
}: Readonly<{
    role?: RoleWithSets;
    permissionSets: SetOption[];
    onDone?: () => void;
}>) {
    const { pending, run } = useAdminRun();
    const [name, setName] = useState(role?.name ?? "");
    const [description, setDescription] = useState(role?.description ?? "");
    const [setIds, setSetIds] = useState<string[]>(role?.permissionSetIds ?? []);
    const prefix = role ? `role-${role.id}` : "new-role";

    function toggleSet(id: string, checked: boolean) {
        setSetIds((current) =>
            checked ? [...current, id] : current.filter((existing) => existing !== id),
        );
    }

    function submit(event: React.FormEvent) {
        event.preventDefault();
        run(
            async () => {
                const result = await saveRole({
                    id: role?.id,
                    name,
                    description,
                    permissionSetIds: setIds,
                });
                if (result.ok) {
                    if (!role) {
                        setName("");
                        setDescription("");
                        setSetIds([]);
                    }
                    onDone?.();
                }
                return result;
            },
            role ? "Role saved" : "Role added",
        );
    }

    return (
        <form onSubmit={submit} className="grid grid-cols-1 gap-3 pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid grid-cols-1 gap-1.5">
                    <Label htmlFor={`${prefix}-name`}>Role name</Label>
                    <Input
                        id={`${prefix}-name`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. pandal-speaker-admin"
                        autoCapitalize="none"
                        required
                    />
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                    <Label htmlFor={`${prefix}-description`}>Description (optional)</Label>
                    <Input
                        id={`${prefix}-description`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
            </div>
            <fieldset className="grid min-w-0 grid-cols-1 gap-2">
                <legend className="mb-1 text-sm font-medium">Permission sets</legend>
                {permissionSets.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                        No permission sets yet. Make one below; until then this role has no access.
                    </p>
                )}
                {permissionSets.map((set) => (
                    <label key={set.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={setIds.includes(set.id)}
                            onCheckedChange={(checked) => toggleSet(set.id, checked === true)}
                        />
                        {set.name}
                    </label>
                ))}
            </fieldset>
            <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                    {role ? (
                        "Save"
                    ) : (
                        <>
                            <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
                            Add role
                        </>
                    )}
                </Button>
                {onDone && (
                    <Button type="button" variant="ghost" onClick={onDone}>
                        Cancel
                    </Button>
                )}
            </div>
        </form>
    );
}

function RoleRow({
    role,
    permissionSets,
    editing,
    setEditing,
}: Readonly<{
    role: RoleWithSets;
    permissionSets: SetOption[];
    editing: boolean;
    setEditing: (editing: boolean) => void;
}>) {
    const { pending, run } = useAdminRun();
    const setNames = new Map(permissionSets.map((set) => [set.id, set.name]));
    const assignedNames = role.permissionSetIds.map((id) => setNames.get(id) ?? "?");
    const deleteBlockedReason = role.built_in
        ? "Built-in roles can't be deleted"
        : "Users still have this role";

    return (
        <li className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1 basis-full sm:basis-0">
                    <p className="truncate font-medium">{role.name}</p>
                    {role.description && (
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                    )}
                    {!role.built_in && (
                        <p className="text-xs text-muted-foreground">
                            {assignedNames.length > 0
                                ? `Sets: ${assignedNames.join(", ")}`
                                : "No permission sets: no access"}
                        </p>
                    )}
                </div>
                {role.built_in && <Badge variant="outline">Built-in</Badge>}
                <Badge variant="secondary">
                    {role.userCount} {role.userCount === 1 ? "user" : "users"}
                </Badge>
                {!role.built_in && (
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Edit role"
                            aria-expanded={editing}
                            onClick={() => setEditing(!editing)}
                        >
                            <HugeiconsIcon icon={PencilEdit02Icon} />
                            <span className="sr-only">Edit {role.name}</span>
                        </Button>
                        <ConfirmDeleteButton
                            title={`Delete the role “${role.name}”?`}
                            description="Its permission sets stay; only the role goes."
                            disabled={pending || role.userCount > 0}
                            disabledReason={deleteBlockedReason}
                            onConfirm={() => run(() => deleteRole(role.id), "Role deleted")}
                        />
                    </div>
                )}
            </div>
            {editing && (
                <RoleForm
                    role={role}
                    permissionSets={permissionSets}
                    onDone={() => setEditing(false)}
                />
            )}
        </li>
    );
}

export function RolesManager({
    roles,
    permissionSets,
}: Readonly<{ roles: RoleWithSets[]; permissionSets: PermissionSetWithLinks[] }>) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const setOptions = permissionSets.map((set) => ({ id: set.id, name: set.name }));
    return (
        <div className="grid grid-cols-1 gap-4">
            <RoleForm permissionSets={setOptions} />
            <ul className="divide-y rounded-2xl border">
                {roles.map((role) => (
                    <RoleRow
                        key={role.id}
                        role={role}
                        permissionSets={setOptions}
                        editing={editingId === role.id}
                        setEditing={(editing) => setEditingId(editing ? role.id : null)}
                    />
                ))}
            </ul>
        </div>
    );
}
