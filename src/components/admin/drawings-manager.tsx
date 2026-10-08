"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Award01Icon, Delete02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import {
    addDrawing,
    deleteDrawing,
    publishDrawingResults,
    updateDrawing,
} from "@/actions/admin/content";
import { patchProgramme } from "@/actions/admin/programmes";
import { UploadButton } from "@/components/admin/upload-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Drawing } from "@/lib/database.types";

function DrawingRow({ drawing }: { drawing: Drawing }) {
    const [pending, startTransition] = useTransition();
    const [name, setName] = useState(drawing.child_name);
    const [age, setAge] = useState(drawing.age?.toString() ?? "");
    const [title, setTitle] = useState(drawing.title ?? "");
    const dirty =
        name !== drawing.child_name ||
        age !== (drawing.age?.toString() ?? "") ||
        title !== (drawing.title ?? "");

    return (
        <div className="overflow-hidden rounded-2xl border bg-card">
            <Image
                src={drawing.image_url}
                alt={drawing.child_name}
                width={drawing.width ?? 600}
                height={drawing.height ?? 450}
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="aspect-[4/3] w-full object-cover"
            />
            <div className="space-y-2 p-3">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Child's name"
                    aria-label="Child's name"
                />
                <div className="flex gap-2">
                    <Input
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Age"
                        type="number"
                        className="w-20"
                        aria-label="Age"
                    />
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title (optional)"
                        aria-label="Title"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="mr-auto text-sm font-semibold tabular-nums">
                        {drawing.vote_count} votes
                    </span>
                    {dirty && (
                        <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                                startTransition(async () => {
                                    try {
                                        await updateDrawing(drawing.id, {
                                            child_name: name,
                                            age: age ? Number(age) : null,
                                            title: title || null,
                                        });
                                        toast.success("Saved");
                                    } catch (e) {
                                        toast.error(e instanceof Error ? e.message : "Failed");
                                    }
                                })
                            }
                        >
                            <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
                            Save
                        </Button>
                    )}
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={pending}
                        title="Delete drawing"
                        onClick={() => {
                            if (confirm(`Delete ${drawing.child_name}'s drawing and its votes?`)) {
                                startTransition(async () => {
                                    await deleteDrawing(drawing.id);
                                    toast.success("Deleted");
                                });
                            }
                        }}
                    >
                        <HugeiconsIcon icon={Delete02Icon} className="text-destructive" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function DrawingsManager({
    programmeId,
    drawings,
    votingOpen,
}: {
    programmeId: string;
    drawings: Drawing[];
    votingOpen: boolean;
}) {
    const [pending, startTransition] = useTransition();

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                <UploadButton
                    kind="image"
                    folder={`drawings/${programmeId}`}
                    multiple
                    onUploaded={async (file) => {
                        await addDrawing(programmeId, {
                            imageUrl: file.url,
                            publicId: file.publicId,
                            width: file.width,
                            height: file.height,
                            originalName: file.originalName,
                        });
                    }}
                >
                    Upload drawings
                </UploadButton>
                <Button
                    variant={votingOpen ? "outline" : "default"}
                    disabled={pending || drawings.length === 0}
                    onClick={() =>
                        startTransition(async () => {
                            await patchProgramme(programmeId, { voting_open: !votingOpen });
                            toast.success(votingOpen ? "Voting paused" : "Voting is open");
                        })
                    }
                >
                    {votingOpen ? "Pause voting" : "Open voting"}
                </Button>
                <Button
                    variant="secondary"
                    disabled={pending || drawings.length === 0}
                    onClick={() => {
                        if (
                            confirm(
                                "Close voting, publish the leaderboard and mark the programme completed?",
                            )
                        ) {
                            startTransition(async () => {
                                await publishDrawingResults(programmeId);
                                toast.success("Results published");
                            });
                        }
                    }}
                >
                    <HugeiconsIcon icon={Award01Icon} data-icon="inline-start" />
                    Close voting & publish results
                </Button>
            </div>
            <p className="text-sm text-muted-foreground">
                Tip: name each file after the child (e.g. <code>Riya Sen.jpg</code>) and the name is
                filled in for you.
            </p>

            {drawings.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                    No drawings yet. Upload the kids’ artwork to start.
                </p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {drawings.map((d) => (
                        <DrawingRow key={d.id} drawing={d} />
                    ))}
                </div>
            )}
        </div>
    );
}
