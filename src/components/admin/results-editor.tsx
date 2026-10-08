"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { saveResults } from "@/actions/admin/programmes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Entry = { position: number; name: string; score: string; remark: string };

export function ResultsEditor({
    programmeId,
    completed,
    initial,
    names,
}: {
    programmeId: string;
    completed: boolean;
    initial: Entry[];
    names: string[];
}) {
    const [entries, setEntries] = useState<Entry[]>(
        initial.length
            ? initial
            : [1, 2, 3].map((position) => ({ position, name: "", score: "", remark: "" })),
    );
    const [pending, startTransition] = useTransition();

    const update = (i: number, patch: Partial<Entry>) =>
        setEntries((list) => list.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

    function save(markCompleted: boolean) {
        startTransition(async () => {
            try {
                await saveResults(programmeId, entries, markCompleted);
                toast.success(markCompleted ? "Saved and marked completed" : "Saved");
            } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
            }
        });
    }

    return (
        <div className="max-w-3xl space-y-4">
            <datalist id="registered-names">
                {names.map((n) => (
                    <option key={n} value={n} />
                ))}
            </datalist>
            <div className="space-y-2">
                {entries.map((entry, i) => (
                    <div
                        key={i}
                        className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 sm:grid-cols-[3.5rem_1fr_8rem_1fr_auto]"
                    >
                        <Input
                            type="number"
                            min={1}
                            value={entry.position}
                            onChange={(e) => update(i, { position: Number(e.target.value) })}
                            aria-label="Position"
                        />
                        <Input
                            list="registered-names"
                            value={entry.name}
                            onChange={(e) => update(i, { name: e.target.value })}
                            placeholder="Name"
                            aria-label="Name"
                        />
                        <Input
                            className="hidden sm:block"
                            value={entry.score}
                            onChange={(e) => update(i, { score: e.target.value })}
                            placeholder="Score"
                            aria-label="Score"
                        />
                        <Input
                            className="hidden sm:block"
                            value={entry.remark}
                            onChange={(e) => update(i, { remark: e.target.value })}
                            placeholder="Remark"
                            aria-label="Remark"
                        />
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setEntries((list) => list.filter((_, idx) => idx !== i))}
                            aria-label="Remove row"
                        >
                            <HugeiconsIcon icon={Delete02Icon} className="text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() =>
                    setEntries((list) => [
                        ...list,
                        {
                            position: Math.max(0, ...list.map((e) => e.position)) + 1,
                            name: "",
                            score: "",
                            remark: "",
                        },
                    ])
                }
            >
                <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
                Add row
            </Button>
            <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button disabled={pending} onClick={() => save(false)}>
                    Save results
                </Button>
                {!completed && (
                    <Button variant="secondary" disabled={pending} onClick={() => save(true)}>
                        Save & mark completed
                    </Button>
                )}
            </div>
        </div>
    );
}
