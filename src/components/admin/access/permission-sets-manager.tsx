"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, PencilEdit02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { deletePermissionSet, savePermissionSet } from "@/actions/admin/access";
import { ConfirmDeleteButton } from "@/components/admin/access/confirm-delete-button";
import { useAdminRun } from "@/components/admin/use-admin-run";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_AREA_LABEL, ADMIN_AREAS, PERMISSION_ACTIONS } from "@/constants";
import type { PermissionAction } from "@/lib/access-rules";
import type { PermissionSetWithLinks, ProgrammeOption } from "@/lib/access-queries";
import type { AdminArea } from "@/lib/database.types";

const ACTION_LABEL: Record<PermissionAction, string> = {
    create: "Create",
    read: "Read",
    update: "Update",
    delete: "Delete",
};

type Switches = Record<PermissionAction, boolean>;

function switchesOf(set?: PermissionSetWithLinks): Switches {
    return {
        create: set?.can_create ?? false,
        read: set?.can_read ?? false,
        update: set?.can_update ?? false,
        delete: set?.can_delete ?? false,
    };
}

/** Toggles one value in a list. */
function toggled<T>(list: T[], value: T, on: boolean): T[] {
    if (on) {
        return list.includes(value) ? list : [...list, value];
    }
    return list.filter((item) => item !== value);
}

function groupByYear(programmes: ProgrammeOption[]): [number, ProgrammeOption[]][] {
    const years = new Map<number, ProgrammeOption[]>();
    for (const programme of programmes) {
        const list = years.get(programme.year) ?? [];
        list.push(programme);
        years.set(programme.year, list);
    }
    return [...years.entries()].sort(([a], [b]) => b - a);
}

/** Problems worth pointing out before saving (they don't block it). */
function warningsFor(switches: Switches, areaCount: number, programmeCount: number): string[] {
    const warnings: string[] = [];
    const writes = switches.create || switches.update || switches.delete;
    if (writes && !switches.read) {
        warnings.push("Create, update or delete without read is not useful: the pages won't open.");
    }
    if (areaCount === 0 && programmeCount === 0) {
        warnings.push("Pick at least one area or programme, or this set gives no access.");
    }
    return warnings;
}

function PermissionSetForm({
    set,
    programmes,
    onDone,
}: Readonly<{
    set?: PermissionSetWithLinks;
    programmes: ProgrammeOption[];
    onDone?: () => void;
}>) {
    const { pending, run } = useAdminRun();
    const [name, setName] = useState(set?.name ?? "");
    const [switches, setSwitches] = useState<Switches>(switchesOf(set));
    const [areas, setAreas] = useState<AdminArea[]>(set?.areas ?? []);
    const [programmeIds, setProgrammeIds] = useState<string[]>(set?.programmeIds ?? []);
    const prefix = set ? `set-${set.id}` : "new-set";
    const allProgrammes = areas.includes("all_programmes");
    const warnings = warningsFor(switches, areas.length, programmeIds.length);

    function reset() {
        setName("");
        setSwitches(switchesOf());
        setAreas([]);
        setProgrammeIds([]);
    }

    function submit(event: React.FormEvent) {
        event.preventDefault();
        run(
            async () => {
                const result = await savePermissionSet({
                    id: set?.id,
                    name,
                    ...switches,
                    areas,
                    programmeIds,
                });
                if (result.ok) {
                    if (!set) {
                        reset();
                    }
                    onDone?.();
                }
                return result;
            },
            set ? "Permission set saved" : "Permission set added",
        );
    }

    return (
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 pt-3">
            <div className="grid grid-cols-1 gap-1.5 sm:max-w-sm">
                <Label htmlFor={`${prefix}-name`}>Name</Label>
                <Input
                    id={`${prefix}-name`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Stream operator"
                    required
                />
            </div>

            <fieldset className="min-w-0">
                <legend className="mb-2 text-sm font-medium">Allows</legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {PERMISSION_ACTIONS.map((action) => (
                        <label key={action} className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={switches[action]}
                                onCheckedChange={(checked) =>
                                    setSwitches((current) => ({
                                        ...current,
                                        [action]: checked === true,
                                    }))
                                }
                            />
                            {ACTION_LABEL[action]}
                        </label>
                    ))}
                </div>
            </fieldset>

            <fieldset className="min-w-0">
                <legend className="mb-2 text-sm font-medium">Areas</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ADMIN_AREAS.map((area) => (
                        <label key={area} className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={areas.includes(area)}
                                onCheckedChange={(checked) =>
                                    setAreas((current) => toggled(current, area, checked === true))
                                }
                            />
                            {ADMIN_AREA_LABEL[area]}
                        </label>
                    ))}
                </div>
            </fieldset>

            <fieldset className="min-w-0">
                <legend className="mb-2 text-sm font-medium">Programmes</legend>
                {allProgrammes ? (
                    <p className="text-xs text-muted-foreground">
                        “All programmes” is ticked, so this set covers every programme.
                    </p>
                ) : (
                    <div className="grid max-h-64 grid-cols-1 gap-3 overflow-y-auto rounded-xl border p-3">
                        {groupByYear(programmes).map(([year, list]) => (
                            <div key={year} className="grid grid-cols-1 gap-2">
                                <p className="text-xs font-semibold text-muted-foreground">
                                    {year}
                                </p>
                                {list.map((programme) => (
                                    <label
                                        key={programme.id}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <Checkbox
                                            checked={programmeIds.includes(programme.id)}
                                            onCheckedChange={(checked) =>
                                                setProgrammeIds((current) =>
                                                    toggled(
                                                        current,
                                                        programme.id,
                                                        checked === true,
                                                    ),
                                                )
                                            }
                                        />
                                        <span className="min-w-0 truncate">{programme.title}</span>
                                    </label>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </fieldset>

            {warnings.map((warning) => (
                <p
                    key={warning}
                    className="flex items-start gap-2 rounded-lg bg-marigold/10 px-3 py-2 text-xs"
                >
                    <HugeiconsIcon icon={Alert02Icon} className="mt-0.5 size-4 shrink-0" />
                    {warning}
                </p>
            ))}

            <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                    {set ? (
                        "Save"
                    ) : (
                        <>
                            <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
                            Add permission set
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

function summary(set: PermissionSetWithLinks, programmeTitles: Map<string, string>): string {
    const covers = set.areas.map((area) => ADMIN_AREA_LABEL[area]);
    for (const id of set.programmeIds) {
        covers.push(programmeTitles.get(id) ?? "a removed programme");
    }
    return covers.length > 0 ? covers.join(", ") : "Nothing yet";
}

function PermissionSetRow({
    set,
    programmes,
    programmeTitles,
    usedByRoles,
    editing,
    setEditing,
}: Readonly<{
    set: PermissionSetWithLinks;
    programmes: ProgrammeOption[];
    programmeTitles: Map<string, string>;
    usedByRoles: number;
    editing: boolean;
    setEditing: (editing: boolean) => void;
}>) {
    const { pending, run } = useAdminRun();
    const switches = switchesOf(set);
    const allowed = PERMISSION_ACTIONS.filter((action) => switches[action]);
    return (
        <li className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1 basis-full sm:basis-0">
                    <p className="font-medium">{set.name}</p>
                    <p className="text-xs text-muted-foreground">
                        On: {summary(set, programmeTitles)}
                    </p>
                </div>
                <div className="flex flex-wrap gap-1">
                    {allowed.length === 0 && <Badge variant="outline">Nothing allowed</Badge>}
                    {allowed.map((action) => (
                        <Badge key={action} variant="secondary">
                            {ACTION_LABEL[action]}
                        </Badge>
                    ))}
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Edit permission set"
                        aria-expanded={editing}
                        onClick={() => setEditing(!editing)}
                    >
                        <HugeiconsIcon icon={PencilEdit02Icon} />
                        <span className="sr-only">Edit {set.name}</span>
                    </Button>
                    <ConfirmDeleteButton
                        title={`Delete the permission set “${set.name}”?`}
                        description="Nothing else is deleted."
                        disabled={pending || usedByRoles > 0}
                        disabledReason="A role still uses this set"
                        onConfirm={() =>
                            run(() => deletePermissionSet(set.id), "Permission set deleted")
                        }
                    />
                </div>
            </div>
            {editing && (
                <PermissionSetForm
                    set={set}
                    programmes={programmes}
                    onDone={() => setEditing(false)}
                />
            )}
        </li>
    );
}

export function PermissionSetsManager({
    permissionSets,
    programmes,
    roleUsage,
}: Readonly<{
    permissionSets: PermissionSetWithLinks[];
    programmes: ProgrammeOption[];
    /** How many roles use each permission set, by id. */
    roleUsage: Record<string, number>;
}>) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const programmeTitles = new Map(programmes.map((p) => [p.id, `${p.title} (${p.year})`]));
    return (
        <div className="grid grid-cols-1 gap-4">
            <PermissionSetForm programmes={programmes} />
            {permissionSets.length > 0 && (
                <ul className="divide-y rounded-2xl border">
                    {permissionSets.map((set) => (
                        <PermissionSetRow
                            key={set.id}
                            set={set}
                            programmes={programmes}
                            programmeTitles={programmeTitles}
                            usedByRoles={roleUsage[set.id] ?? 0}
                            editing={editingId === set.id}
                            setEditing={(editing) => setEditingId(editing ? set.id : null)}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}
