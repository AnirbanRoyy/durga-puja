"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Download01Icon,
    LockIcon,
    Mic01Icon,
    NextIcon,
    ShuffleIcon,
    SquareUnlock01Icon,
} from "@hugeicons/core-free-icons";
import {
    callNext,
    moveToEnd,
    setOrderLocked,
    setPerformanceStatus,
    shuffleLineup,
} from "@/actions/admin/programmes";
import {
    DeleteRegistrationButton,
    EditRegistrationButton,
    type RegistrationProgramme,
} from "@/components/admin/registration-actions";
import { Button } from "@/components/ui/button";
import type { PerformanceStatus } from "@/lib/database.types";
import type { RegistrationWithPhone } from "@/lib/queries";
import { cn } from "@/lib/utils";

function csvCell(value: string | number | null): string {
    const text = String(value ?? "");
    // Prefix formulas so spreadsheets don't execute attendee-supplied text.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
}

export function RegistrationsManager({
    programmeId,
    programmeTitle,
    programme,
    lineup,
    locked,
    registrations,
}: {
    programmeId: string;
    programmeTitle: string;
    programme: RegistrationProgramme;
    lineup: boolean;
    locked: boolean;
    registrations: RegistrationWithPhone[];
}) {
    const [pending, startTransition] = useTransition();
    const run = (fn: () => Promise<unknown>, success?: string) =>
        startTransition(async () => {
            try {
                const result = (await fn()) as { ok?: boolean; message?: string } | undefined;
                if (result && result.ok === false) toast.error(result.message ?? "Failed");
                else if (success) toast.success(success);
            } catch (e) {
                toast.error(e instanceof Error ? e.message : "Something went wrong");
            }
        });

    function exportCsv() {
        const header = [
            "#",
            "Name",
            "Members",
            "Leader",
            "Phone",
            "Age",
            "Guardian",
            "Notes",
            "Status",
            "Registered at",
        ];
        const rows = registrations.map((r) => [
            r.sequence_no,
            r.name,
            r.members.map((m) => m.name).join("; "),
            r.members.find((m) => m.role === "leader")?.name ?? "",
            r.phone,
            r.age,
            r.guardian_name,
            r.notes,
            r.performance_status,
            r.created_at,
        ]);
        const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${programmeTitle}-registrations.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    const onStage = registrations.find((r) => r.performance_status === "on_stage");
    const drawn = registrations.some((r) => r.sequence_no !== null);
    const nextUp = registrations.find(
        (r) => r.performance_status === "waiting" && r.sequence_no !== null,
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {lineup && (
                    <>
                        <Button
                            disabled={pending || locked || registrations.length === 0}
                            onClick={() =>
                                run(
                                    () => shuffleLineup(programmeId),
                                    drawn ? "Reshuffled" : "Names drawn",
                                )
                            }
                        >
                            <HugeiconsIcon icon={ShuffleIcon} data-icon="inline-start" />
                            {drawn ? "Reshuffle" : "Draw random order"}
                        </Button>
                        <Button
                            variant="outline"
                            disabled={pending || !drawn}
                            onClick={() =>
                                run(
                                    () => setOrderLocked(programmeId, !locked),
                                    locked ? "Order unlocked" : "Order locked",
                                )
                            }
                        >
                            <HugeiconsIcon
                                icon={locked ? SquareUnlock01Icon : LockIcon}
                                data-icon="inline-start"
                            />
                            {locked ? "Unlock order" : "Lock order"}
                        </Button>
                    </>
                )}
                <Button variant="outline" onClick={exportCsv} disabled={registrations.length === 0}>
                    <HugeiconsIcon icon={Download01Icon} data-icon="inline-start" />
                    Export CSV
                </Button>
            </div>

            {lineup && drawn && (
                <div className="rounded-2xl bg-maroon p-6 text-kash">
                    <p className="text-xs font-semibold tracking-widest text-gold uppercase">
                        Stage
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-6">
                        <div>
                            <p className="text-sm text-kash/70">On stage</p>
                            <p className="font-heading text-3xl font-semibold">
                                {onStage?.name ?? "—"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-kash/70">Up next</p>
                            <p className="font-heading text-2xl">{nextUp?.name ?? "—"}</p>
                        </div>
                        <Button
                            size="lg"
                            disabled={pending || (!nextUp && !onStage)}
                            onClick={() =>
                                run(
                                    () => callNext(programmeId),
                                    onStage ? "Next performer called" : "First performer called",
                                )
                            }
                            className="ml-auto h-12 rounded-full bg-gold px-6 text-maroon hover:bg-gold/90"
                        >
                            <HugeiconsIcon icon={NextIcon} data-icon="inline-start" />
                            {onStage ? "Done · call next" : "Call first"}
                        </Button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                        <tr>
                            {lineup && <th className="px-4 py-3">#</th>}
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3">Age</th>
                            <th className="hidden px-4 py-3 md:table-cell">Notes</th>
                            {lineup && <th className="px-4 py-3">Status</th>}
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {registrations.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-8 text-center text-muted-foreground"
                                >
                                    Nobody has registered yet.
                                </td>
                            </tr>
                        )}
                        {registrations.map((r) => (
                            <tr
                                key={r.id}
                                className={cn(
                                    r.performance_status === "on_stage" && "bg-sindoor/5",
                                )}
                            >
                                {lineup && (
                                    <td className="px-4 py-3 font-heading font-semibold tabular-nums">
                                        {r.sequence_no ?? "—"}
                                    </td>
                                )}
                                <td className="px-4 py-3 font-medium">
                                    {r.name}
                                    {r.members.length > 0 && (
                                        <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                                            {r.members.map((m, i) => (
                                                <span key={`${m.role}-${m.name}`}>
                                                    {i > 0 && ", "}
                                                    <span
                                                        className={cn(
                                                            m.role === "leader" &&
                                                                "font-semibold text-foreground",
                                                        )}
                                                    >
                                                        {m.name}
                                                        {m.role === "leader" && " (leader)"}
                                                    </span>
                                                </span>
                                            ))}
                                        </p>
                                    )}
                                </td>
                                <td className="px-4 py-3 tabular-nums">{r.phone}</td>
                                <td className="px-4 py-3">{r.age ?? "—"}</td>
                                <td className="hidden max-w-60 truncate px-4 py-3 text-muted-foreground md:table-cell">
                                    {r.notes}
                                </td>
                                {lineup && (
                                    <td className="px-4 py-3">
                                        <select
                                            value={r.performance_status}
                                            disabled={pending}
                                            onChange={(e) =>
                                                run(
                                                    () =>
                                                        setPerformanceStatus(
                                                            r.id,
                                                            e.target.value as PerformanceStatus,
                                                        ),
                                                    "Status updated",
                                                )
                                            }
                                            className="h-7 rounded-md border bg-transparent px-1.5 text-xs"
                                        >
                                            <option value="waiting">waiting</option>
                                            <option value="on_stage">on stage</option>
                                            <option value="done">done</option>
                                            <option value="absent">absent</option>
                                        </select>
                                    </td>
                                )}
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-1">
                                        {lineup && r.sequence_no !== null && (
                                            <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                title="Move to end of line"
                                                disabled={pending}
                                                onClick={() =>
                                                    run(() => moveToEnd(r.id), "Moved to end")
                                                }
                                            >
                                                <HugeiconsIcon icon={Mic01Icon} />
                                            </Button>
                                        )}
                                        <EditRegistrationButton
                                            registration={r}
                                            programme={programme}
                                        />
                                        <DeleteRegistrationButton
                                            registration={r}
                                            programmeTitle={programme.title}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
