"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { deleteFeedback, setFeedbackStatus } from "@/actions/admin/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Feedback, FeedbackStatus } from "@/lib/database.types";
import { formatIst } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const FILTERS = ["new", "reviewed", "resolved", "all"] as const;
const NEXT: Record<FeedbackStatus, FeedbackStatus> = {
    new: "reviewed",
    reviewed: "resolved",
    resolved: "new",
};
const NEXT_LABEL: Record<FeedbackStatus, string> = {
    new: "Mark reviewed",
    reviewed: "Mark resolved",
    resolved: "Reopen",
};

export function FeedbackInbox({ items }: { items: Feedback[] }) {
    const [filter, setFilter] = useState<(typeof FILTERS)[number]>("new");
    const [pending, startTransition] = useTransition();
    const visible = items.filter((f) => filter === "all" || f.status === filter);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize",
                            filter === f
                                ? "border-primary bg-primary text-primary-foreground"
                                : "bg-card",
                        )}
                    >
                        {f} {f !== "all" && `(${items.filter((i) => i.status === f).length})`}
                    </button>
                ))}
            </div>
            {visible.length === 0 && (
                <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                    Nothing here.
                </p>
            )}
            <ul className="space-y-3">
                {visible.map((f) => (
                    <li key={f.id} className="rounded-2xl border bg-card p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={f.kind === "complaint" ? "destructive" : "secondary"}>
                                {f.kind}
                            </Badge>
                            <span className="text-sm font-medium">{f.name || "Anonymous"}</span>
                            {f.contact && (
                                <span className="text-sm text-muted-foreground">· {f.contact}</span>
                            )}
                            <span className="ml-auto text-xs text-muted-foreground">
                                {formatIst(f.created_at)}
                            </span>
                        </div>
                        <p className="mt-3 whitespace-pre-line">{f.message}</p>
                        <div className="mt-3 flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={pending}
                                onClick={() =>
                                    startTransition(() => setFeedbackStatus(f.id, NEXT[f.status]))
                                }
                            >
                                {NEXT_LABEL[f.status]}
                            </Button>
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                disabled={pending}
                                onClick={() => {
                                    if (confirm("Delete this feedback?"))
                                        startTransition(() => deleteFeedback(f.id));
                                }}
                            >
                                <HugeiconsIcon icon={Delete02Icon} className="text-destructive" />
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
