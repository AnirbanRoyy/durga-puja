"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Award01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { MusicalChairCategory } from "@/lib/musical-chair-categories";
import type { Standings } from "@/lib/musical-chair-standings";
import { cn } from "@/lib/utils";

export type LeaderboardBoard = {
    category: MusicalChairCategory;
    label: string;
    standings: Standings;
};

/**
 * Live standings for one category at a time. It follows the category the host is playing (the
 * page refreshes on round changes) until the visitor picks another one from the dropdown.
 */
export function MusicalChairLeaderboard({
    boards,
    live,
    finished,
}: Readonly<{
    /** Only categories that have players. */
    boards: LeaderboardBoard[];
    live: MusicalChairCategory;
    finished: boolean;
}>) {
    const t = useTranslations("musicalChair.leaderboard");
    const [picked, setPicked] = useState<MusicalChairCategory | null>(null);
    const shownCategory = picked ?? live;
    const board = boards.find((b) => b.category === shownCategory) ?? boards[0];
    if (!board) {
        return null;
    }
    const { stillIn, out } = board.standings;

    return (
        <section aria-live="polite">
            <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold">
                    {t("title")}
                    {boards.length === 1 && ` · ${board.label}`}
                </h2>
                {boards.length > 1 && (
                    <Select
                        value={board.category}
                        onValueChange={(v) => setPicked(v as MusicalChairCategory)}
                    >
                        <SelectTrigger aria-label={t("chooseCategory")} className="min-w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start">
                            {boards.map((b) => (
                                <SelectItem key={b.category} value={b.category}>
                                    {b.label}
                                    {b.category === live && !finished && (
                                        <Badge className="bg-sindoor px-1.5 text-[10px] text-white">
                                            {t("live")}
                                        </Badge>
                                    )}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            {finished && <p className="mt-1 text-sm text-muted-foreground">{t("finished")}</p>}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0 rounded-2xl border bg-card p-4">
                    <h3 className="text-sm font-semibold tracking-wide text-success uppercase">
                        {t("stillIn", { count: stillIn.length })}
                    </h3>
                    {stillIn.length ? (
                        <ul className="mt-3 space-y-1.5">
                            {stillIn.map((name) => (
                                <li key={name} className="truncate text-sm font-medium">
                                    {name}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-3 text-sm text-muted-foreground">{t("nobodyLeft")}</p>
                    )}
                </div>
                <div className="min-w-0 rounded-2xl border bg-card p-4">
                    <h3 className="text-sm font-semibold tracking-wide text-sindoor uppercase">
                        {t("out", { count: out.length })}
                    </h3>
                    {out.length ? (
                        <ol className="mt-3 space-y-1.5">
                            {out.map((p) => (
                                <li
                                    key={`${p.round}-${p.name}`}
                                    className="flex items-center gap-2"
                                >
                                    <span
                                        className={cn(
                                            "grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold tabular-nums",
                                            p.place <= 3 && "bg-gold/30",
                                        )}
                                    >
                                        {p.place <= 3 ? (
                                            <HugeiconsIcon
                                                icon={Award01Icon}
                                                className="size-3.5"
                                            />
                                        ) : (
                                            p.place
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                        {p.name}
                                    </span>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {t("round", { n: p.round })}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="mt-3 text-sm text-muted-foreground">{t("nobodyOut")}</p>
                    )}
                </div>
            </div>
        </section>
    );
}
