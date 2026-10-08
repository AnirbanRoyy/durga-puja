"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowDown01Icon,
    ArrowUp01Icon,
    Cancel01Icon,
    NextIcon,
    PauseIcon,
    PlayIcon,
    PreviousIcon,
} from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/components/music/youtube-player-provider";
import { cn } from "@/lib/utils";

/** Floating player that lives in the root layout so music survives navigation. */
export function MiniPlayer() {
    const t = useTranslations("player");
    const { current, isPlaying, toggle, next, previous, close, registerHost, queue } = usePlayer();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div
            className={cn(
                "fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80",
                !current && "pointer-events-none invisible",
            )}
            aria-hidden={!current}
        >
            <div className="overflow-hidden rounded-2xl border border-gold/40 bg-card/95 shadow-2xl shadow-maroon/20 backdrop-blur">
                <div className={cn("aspect-video w-full bg-black", collapsed && "h-0")}>
                    <div ref={registerHost} className="h-full w-full" />
                </div>
                <div className="flex items-center gap-2 p-2.5">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{current?.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                            {current?.artist ?? t("nowPlaying")}
                            {queue.length > 1 ? ` · ${t("queue", { count: queue.length })}` : ""}
                        </p>
                    </div>
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={previous}
                        aria-label={t("previous")}
                    >
                        <HugeiconsIcon icon={PreviousIcon} />
                    </Button>
                    <Button
                        size="icon"
                        className="rounded-full"
                        onClick={toggle}
                        aria-label={isPlaying ? t("pause") : t("play")}
                    >
                        <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={next} aria-label={t("next")}>
                        <HugeiconsIcon icon={NextIcon} />
                    </Button>
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setCollapsed((c) => !c)}
                        aria-label={collapsed ? t("expand") : t("collapse")}
                    >
                        <HugeiconsIcon icon={collapsed ? ArrowUp01Icon : ArrowDown01Icon} />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={close} aria-label={t("close")}>
                        <HugeiconsIcon icon={Cancel01Icon} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
