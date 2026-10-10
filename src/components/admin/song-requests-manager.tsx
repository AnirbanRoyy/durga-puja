"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, Link01Icon } from "@hugeicons/core-free-icons";
import { deleteSongRequest, setSongRequestStatus } from "@/actions/admin/content";
import { MusicalChairUploader } from "@/components/admin/songs-manager";
import { useAdminRun } from "@/components/admin/use-admin-run";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SongRequest } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const FILTERS = ["pending", "added", "rejected", "all"] as const;

export function SongRequestsManager({ requests }: { requests: SongRequest[] }) {
    const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
    const [openId, setOpenId] = useState<string | null>(null);
    const { pending, run } = useAdminRun();
    const visible = requests.filter((r) => filter === "all" || r.status === filter);

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
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
                        {f} {f !== "all" && `(${requests.filter((r) => r.status === f).length})`}
                    </button>
                ))}
            </div>

            {visible.length === 0 && (
                <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                    Nothing in this list.
                </p>
            )}

            <ul className="space-y-3">
                {visible.map((r) => (
                    <li key={r.id} className="rounded-2xl border bg-card p-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="grid size-10 place-items-center rounded-xl bg-secondary font-heading font-semibold">
                                ×{r.request_count}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold">{r.title}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {[r.artist, r.requested_by && `by ${r.requested_by}`]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            </div>
                            {r.link && (
                                <Button asChild size="icon-sm" variant="ghost" title="Open link">
                                    <a href={r.link} target="_blank" rel="noopener noreferrer">
                                        <HugeiconsIcon icon={Link01Icon} />
                                    </a>
                                </Button>
                            )}
                            <Badge variant="secondary">{r.status}</Badge>
                            {r.status !== "added" && (
                                <Button
                                    size="sm"
                                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                                >
                                    Add to pool
                                </Button>
                            )}
                            {r.status === "pending" && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pending}
                                    onClick={() =>
                                        run(
                                            () => setSongRequestStatus(r.id, "rejected"),
                                            "Request rejected",
                                        )
                                    }
                                >
                                    Reject
                                </Button>
                            )}
                            {r.status === "rejected" && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pending}
                                    onClick={() =>
                                        run(
                                            () => setSongRequestStatus(r.id, "pending"),
                                            "Request restored",
                                        )
                                    }
                                >
                                    Restore
                                </Button>
                            )}
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                disabled={pending}
                                onClick={() => {
                                    if (confirm("Delete this request?"))
                                        run(() => deleteSongRequest(r.id), "Request deleted");
                                }}
                            >
                                <HugeiconsIcon icon={Delete02Icon} className="text-destructive" />
                            </Button>
                        </div>
                        {openId === r.id && (
                            <div className="mt-4 border-t pt-4">
                                <MusicalChairUploader requestId={r.id} defaultTitle={r.title} />
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
