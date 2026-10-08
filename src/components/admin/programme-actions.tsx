"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteProgramme, patchProgramme } from "@/actions/admin/programmes";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Programme } from "@/lib/database.types";

export function QuickToggles({ programme }: { programme: Programme }) {
    const [pending, startTransition] = useTransition();
    const toggle = (field: "registration_open" | "voting_open", value: boolean) =>
        startTransition(async () => {
            await patchProgramme(programme.id, { [field]: value });
            toast.success("Updated");
        });

    return (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2 font-medium">
                <Switch
                    checked={programme.registration_open}
                    disabled={pending}
                    onCheckedChange={(v) => toggle("registration_open", v)}
                />
                Registration
            </label>
            {programme.type === "drawing" && (
                <label className="flex items-center gap-2 font-medium">
                    <Switch
                        checked={programme.voting_open}
                        disabled={pending}
                        onCheckedChange={(v) => toggle("voting_open", v)}
                    />
                    Voting
                </label>
            )}
            <div className="ml-auto flex gap-2">
                {programme.status !== "ongoing" && programme.status !== "completed" && (
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                            startTransition(async () => {
                                await patchProgramme(programme.id, { status: "ongoing" });
                                toast.success("Marked as happening now");
                            })
                        }
                    >
                        Start now
                    </Button>
                )}
                {programme.status !== "cancelled" && programme.status !== "completed" && (
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                            startTransition(async () => {
                                await patchProgramme(programme.id, {
                                    status: "completed",
                                    registration_open: false,
                                });
                                toast.success("Marked as completed");
                            })
                        }
                    >
                        Mark completed
                    </Button>
                )}
            </div>
        </div>
    );
}

export function DeleteProgramme({ id, title }: { id: string; title: string }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    Delete programme
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This permanently removes the programme with its registrations, drawings,
                        votes and results.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteProgramme(id)}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
