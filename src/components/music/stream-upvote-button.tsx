"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { FavouriteIcon } from "@hugeicons/core-free-icons";
import { upvoteStreamSong, type StreamVoteResult } from "@/actions/public";
import { cn } from "@/lib/utils";

/**
 * A heart with the upvote count, like YouTube's like button. Each browser can upvote a song once;
 * the heart turns red and the count goes up straight away. A closed song shows a grey heart.
 */
export function StreamUpvoteButton({
    id,
    count,
    voted: votedBefore = false,
    closed = false,
    closedMessage,
    vote: castVote = upvoteStreamSong,
}: Readonly<{
    id: string;
    count: number;
    /** This browser upvoted the song on an earlier visit. */
    voted?: boolean;
    /** Voting has ended for this song (already played or in the game). */
    closed?: boolean;
    /** Toast for a tap on a closed song; defaults to the stream's wording. */
    closedMessage?: string;
    /** Defaults to the pandal stream; the musical chair page passes its own. */
    vote?: (id: string) => Promise<StreamVoteResult>;
}>) {
    const t = useTranslations("stream");
    const [voted, setVoted] = useState(votedBefore);
    // The count when this visitor tapped, so a realtime refresh that already includes the vote
    // doesn't count it twice.
    const [countAtVote, setCountAtVote] = useState<number | null>(null);
    const [pending, start] = useTransition();
    const shown = countAtVote === null ? count : Math.max(count, countAtVote + 1);
    const red = (voted || votedBefore) && !closed;

    function undo() {
        setVoted(false);
        setCountAtVote(null);
    }

    function vote() {
        if (pending) {
            return;
        }
        if (closed) {
            toast(closedMessage ?? t("votingClosed"));
            return;
        }
        if (red) {
            toast(t("alreadyVoted"));
            return;
        }
        setVoted(true);
        setCountAtVote(count);
        start(async () => {
            const result = await castVote(id);
            if (result === "ok") {
                return;
            }
            if (result === "already_voted") {
                setCountAtVote(null);
                toast(t("alreadyVoted"));
            } else if (result === "closed") {
                undo();
                toast(closedMessage ?? t("votingClosed"));
            } else {
                undo();
                toast.error(t("voteFailed"));
            }
        });
    }

    return (
        <button
            type="button"
            onClick={vote}
            aria-label={t("upvote")}
            aria-pressed={red}
            className={cn(
                "inline-flex h-9 min-w-14 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold tabular-nums transition-colors",
                closed ? "text-muted-foreground" : "hover:bg-muted",
                red && "border-red-500/40 bg-red-500/10",
            )}
        >
            <HugeiconsIcon
                // Remount when the visitor votes, so the pop plays once.
                key={countAtVote === null ? "idle" : "voted"}
                icon={FavouriteIcon}
                className={cn(
                    "size-4.5 transition-colors",
                    red && "fill-red-500 text-red-500",
                    red && countAtVote !== null && "animate-heart-pop motion-reduce:animate-none",
                )}
            />
            {shown}
        </button>
    );
}
