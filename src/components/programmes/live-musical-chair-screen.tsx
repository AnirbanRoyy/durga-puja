"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Chair01Icon, MusicNote03Icon } from "@hugeicons/core-free-icons";
import { browserDb } from "@/lib/supabase/client";
import { MC_EVENT, musicalChairChannel, type MusicalChairState } from "@/lib/musical-chair";
import { cn } from "@/lib/utils";

/** Big live indicator that mirrors the host console — works on phones and on a projector. */
export function LiveMusicalChairScreen({ programmeId }: { programmeId: string }) {
    const t = useTranslations("musicalChair");
    const [state, setState] = useState<MusicalChairState | null>(null);

    useEffect(() => {
        const supabase = browserDb();
        const channel = supabase
            .channel(musicalChairChannel(programmeId))
            .on("broadcast", { event: MC_EVENT }, ({ payload }) =>
                setState(payload as MusicalChairState),
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [programmeId]);

    const phase = state?.phase ?? "idle";

    return (
        <section
            aria-live="polite"
            className={cn(
                "relative overflow-hidden rounded-3xl border p-8 text-center transition-colors duration-300",
                phase === "playing" &&
                    "border-transparent bg-gradient-to-br from-marigold to-gold text-maroon",
                phase === "stopped" && "border-transparent bg-sindoor text-primary-foreground",
                phase === "idle" && "bg-card",
            )}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={phase}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.1, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center"
                >
                    <HugeiconsIcon
                        icon={phase === "playing" ? MusicNote03Icon : Chair01Icon}
                        className={cn("size-14", phase === "playing" && "animate-dhak")}
                    />
                    <p className="mt-3 font-heading text-4xl font-bold sm:text-6xl">
                        {phase === "playing"
                            ? t("live.playing")
                            : phase === "stopped"
                              ? t("live.stop")
                              : t("live.idle")}
                    </p>
                    {state && state.round > 0 && (
                        <p className="mt-2 text-sm font-semibold opacity-80">
                            {t("round", { n: state.round })}
                        </p>
                    )}
                    {phase === "playing" && state?.songTitle && (
                        <p className="mt-1 text-sm opacity-80">♪ {state.songTitle}</p>
                    )}
                    {phase === "idle" && (
                        <p className="mt-2 text-sm text-muted-foreground">{t("live.idleHint")}</p>
                    )}
                </motion.div>
            </AnimatePresence>
        </section>
    );
}
