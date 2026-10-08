"use client";

import { useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, FavouriteIcon, PaintBoardIcon } from "@hugeicons/core-free-icons";
import { castVote } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Drawing } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export function DrawingGallery({
    drawings,
    votedFor,
    votingOpen,
    hideCounts,
}: {
    drawings: Drawing[];
    votedFor: string | null;
    votingOpen: boolean;
    hideCounts: boolean;
}) {
    const t = useTranslations("drawing");
    const [pending, startTransition] = useTransition();
    const [optimisticVote, setOptimisticVote] = useOptimistic(votedFor);
    const [selected, setSelected] = useState<Drawing | null>(null);

    function vote(drawing: Drawing) {
        startTransition(async () => {
            setOptimisticVote(drawing.id);
            const result = await castVote(drawing.id);
            if (result === "ok") toast.success(t("voted", { name: drawing.child_name }));
            else toast.error(t(`voteError.${result}`));
        });
    }

    const canVote = votingOpen && !optimisticVote;

    return (
        <section>
            <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-2xl font-semibold">{t("title")}</h2>
                <span
                    className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        votingOpen
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground",
                    )}
                >
                    {votingOpen ? t("votingOpen") : t("votingClosed")}
                </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
                {optimisticVote ? t("thanks") : votingOpen ? t("howTo") : t("closedHint")}
            </p>

            {drawings.length === 0 ? (
                <div className="mt-4 flex items-center gap-4 rounded-2xl border border-dashed p-6">
                    <HugeiconsIcon
                        icon={PaintBoardIcon}
                        className="size-8 shrink-0 text-marigold"
                    />
                    <p className="text-sm text-muted-foreground">{t("empty")}</p>
                </div>
            ) : (
                <div className="mt-5 columns-2 gap-4 sm:columns-3">
                    {drawings.map((d) => {
                        const mine = optimisticVote === d.id;
                        return (
                            <figure
                                key={d.id}
                                className={cn(
                                    "mb-4 break-inside-avoid overflow-hidden rounded-2xl border bg-card",
                                    mine && "border-sindoor ring-2 ring-sindoor/30",
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => setSelected(d)}
                                    className="block w-full"
                                    aria-label={t("viewLarger", { name: d.child_name })}
                                >
                                    <Image
                                        src={d.image_url}
                                        alt={d.title ?? t("drawingBy", { name: d.child_name })}
                                        width={d.width ?? 800}
                                        height={d.height ?? 600}
                                        sizes="(min-width: 640px) 33vw, 50vw"
                                        className="h-auto w-full"
                                    />
                                </button>
                                <figcaption className="flex items-center gap-2 p-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">
                                            {d.child_name}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {[d.title, d.age ? t("age", { age: d.age }) : null]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </p>
                                    </div>
                                    {!hideCounts && (
                                        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                                            {d.vote_count +
                                                (mine && optimisticVote !== votedFor ? 1 : 0)}
                                        </span>
                                    )}
                                    {votingOpen && (
                                        <Button
                                            size="icon-sm"
                                            variant={mine ? "default" : "outline"}
                                            disabled={!canVote || pending}
                                            onClick={() => vote(d)}
                                            aria-label={t("voteFor", { name: d.child_name })}
                                        >
                                            <HugeiconsIcon
                                                icon={mine ? CheckmarkCircle02Icon : FavouriteIcon}
                                            />
                                        </Button>
                                    )}
                                </figcaption>
                            </figure>
                        );
                    })}
                </div>
            )}

            <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
                <DialogContent className="max-w-3xl p-3 sm:max-w-3xl">
                    {selected && (
                        <>
                            <Image
                                src={selected.image_url}
                                alt={
                                    selected.title ?? t("drawingBy", { name: selected.child_name })
                                }
                                width={selected.width ?? 1200}
                                height={selected.height ?? 900}
                                sizes="(min-width: 768px) 768px, 100vw"
                                className="max-h-[75vh] w-full rounded-lg object-contain"
                            />
                            <div className="flex items-center gap-3 px-1 pb-1">
                                <div className="flex-1">
                                    <DialogTitle className="font-heading text-xl">
                                        {selected.child_name}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {[
                                            selected.title,
                                            selected.age ? t("age", { age: selected.age }) : null,
                                        ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </DialogDescription>
                                </div>
                                {votingOpen && (
                                    <Button
                                        disabled={!canVote || pending}
                                        onClick={() => vote(selected)}
                                        className="rounded-full"
                                    >
                                        <HugeiconsIcon
                                            icon={FavouriteIcon}
                                            data-icon="inline-start"
                                        />
                                        {optimisticVote === selected.id ? t("yourVote") : t("vote")}
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
}
