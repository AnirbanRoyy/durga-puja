"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { upvoteStreamSong } from "@/actions/public";
import { cn } from "@/lib/utils";

/** An upvote pill. Each browser can upvote a song once; the count updates instantly. */
export function StreamUpvoteButton({ id, count }: { id: string; count: number }) {
    const t = useTranslations("stream");
    const [voted, setVoted] = useState(false);
    const [optimistic, addVote] = useOptimistic(count, (current: number) => current + 1);
    const [pending, start] = useTransition();

    function vote() {
        if (voted || pending) return;
        start(async () => {
            addVote(1);
            const result = await upvoteStreamSong(id);
            if (result === "ok") setVoted(true);
            else if (result === "already_voted") {
                setVoted(true);
                toast(t("alreadyVoted"));
            } else toast.error(t("voteFailed"));
        });
    }

    return (
        <button
            type="button"
            onClick={vote}
            aria-label={t("upvote")}
            aria-pressed={voted}
            className={cn(
                "inline-flex h-9 min-w-14 shrink-0 items-center justify-center gap-1 rounded-full border px-3 text-sm font-semibold tabular-nums transition-colors",
                voted ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
        >
            <HugeiconsIcon icon={ArrowUp01Icon} className="size-4" />
            {optimistic}
        </button>
    );
}
