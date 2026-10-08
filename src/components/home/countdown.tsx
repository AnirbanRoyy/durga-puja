"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Phase =
    | { kind: "before"; days: number; hours: number; minutes: number; seconds: number }
    | { kind: "during" }
    | { kind: "after" };

function computePhase(start: number, end: number, now: number): Phase {
    if (now >= end) return { kind: "after" };
    if (now >= start) return { kind: "during" };
    const diff = Math.floor((start - now) / 1000);
    return {
        kind: "before",
        days: Math.floor(diff / 86400),
        hours: Math.floor((diff % 86400) / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
    };
}

export function Countdown({ shashthi, dashami }: { shashthi: string; dashami: string }) {
    const t = useTranslations("home.countdown");
    const [phase, setPhase] = useState<Phase | null>(null);

    useEffect(() => {
        const start = new Date(shashthi).getTime();
        const end = new Date(dashami).getTime();
        const tick = () => setPhase(computePhase(start, end, Date.now()));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [shashthi, dashami]);

    if (!phase) {
        return <div className="h-[88px]" aria-hidden />;
    }

    if (phase.kind !== "before") {
        return (
            <p className="font-heading text-2xl text-primary sm:text-3xl">
                {phase.kind === "during" ? t("during") : t("after")}
            </p>
        );
    }

    const units = [
        ["days", phase.days],
        ["hours", phase.hours],
        ["minutes", phase.minutes],
        ["seconds", phase.seconds],
    ] as const;

    return (
        <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {t("until")}
            </p>
            <div className="flex gap-2 sm:gap-3">
                {units.map(([unit, value]) => (
                    <div
                        key={unit}
                        className="min-w-16 rounded-xl border border-gold/40 bg-card/80 px-3 py-2 text-center shadow-sm backdrop-blur"
                    >
                        <div className="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">
                            {String(value).padStart(2, "0")}
                        </div>
                        <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
                            {t(unit)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
