"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { HeadphonesIcon, PauseIcon, PlayIcon, ShuffleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Alpana } from "@/components/decor/alpana";
import { usePlayer, type PlayableTrack } from "@/components/music/youtube-player-provider";
import type { SongCategory } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type LibraryTrack = PlayableTrack & { category: SongCategory; featured: boolean };

function shuffled<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export function MusicLibrary({ tracks }: { tracks: LibraryTrack[] }) {
    const t = useTranslations("music");
    const categories = useTranslations("songCategories");
    const { playQueue, current, isPlaying, toggle } = usePlayer();
    const [category, setCategory] = useState<SongCategory | "all">("all");

    const featured =
        tracks.find((tr) => tr.featured) ?? tracks.find((tr) => tr.category === "mahalaya");
    const available = useMemo(
        () => [...new Set(tracks.map((tr) => tr.category))] as SongCategory[],
        [tracks],
    );
    const visible = category === "all" ? tracks : tracks.filter((tr) => tr.category === category);

    if (tracks.length === 0) {
        return (
            <div className="flex flex-col items-center rounded-3xl border border-dashed p-12 text-center">
                <HugeiconsIcon icon={HeadphonesIcon} className="size-10 text-marigold" />
                <p className="mt-3 text-muted-foreground">{t("empty")}</p>
            </div>
        );
    }

    function playFrom(list: LibraryTrack[], track: LibraryTrack) {
        if (current?.id === track.id) {
            toggle();
            return;
        }
        playQueue(list, list.indexOf(track));
    }

    return (
        <div className="space-y-10">
            {featured && (
                <section className="relative overflow-hidden rounded-3xl bg-maroon p-6 text-kash sm:p-10">
                    <Alpana className="absolute -top-24 -right-24 size-96 animate-spin-slow text-gold/20" />
                    <div className="relative grid items-center gap-6 sm:grid-cols-[220px_1fr]">
                        <Image
                            src={`https://i.ytimg.com/vi/${featured.youtubeId}/hqdefault.jpg`}
                            alt=""
                            width={480}
                            height={360}
                            className="aspect-square w-full rounded-2xl object-cover shadow-2xl"
                        />
                        <div>
                            <p className="text-xs font-semibold tracking-widest text-gold uppercase">
                                {t("featured")}
                            </p>
                            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
                                {featured.title}
                            </h2>
                            {featured.artist && (
                                <p className="mt-1 text-kash/75">{featured.artist}</p>
                            )}
                            <p className="mt-3 max-w-lg text-sm text-kash/70">
                                {t("featuredBody")}
                            </p>
                            <Button
                                size="lg"
                                onClick={() => playFrom(tracks, featured)}
                                className="mt-5 h-11 rounded-full bg-gold px-6 text-maroon hover:bg-gold/90"
                            >
                                <HugeiconsIcon
                                    icon={
                                        current?.id === featured.id && isPlaying
                                            ? PauseIcon
                                            : PlayIcon
                                    }
                                    data-icon="inline-start"
                                />
                                {current?.id === featured.id && isPlaying
                                    ? t("pause")
                                    : t("listen")}
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            <section>
                <div className="flex flex-wrap items-center gap-2">
                    {(["all", ...available] as const).map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setCategory(c)}
                            className={cn(
                                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                                category === c
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "bg-card hover:border-marigold/60",
                            )}
                        >
                            {c === "all" ? t("all") : categories(c)}
                        </button>
                    ))}
                    <div className="ml-auto flex gap-2">
                        <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => playQueue(visible)}
                        >
                            <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />
                            {t("playAll")}
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => playQueue(shuffled(visible))}
                        >
                            <HugeiconsIcon icon={ShuffleIcon} data-icon="inline-start" />
                            {t("shuffle")}
                        </Button>
                    </div>
                </div>

                <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((track) => {
                        const active = current?.id === track.id;
                        return (
                            <li key={track.id}>
                                <button
                                    type="button"
                                    onClick={() => playFrom(visible, track)}
                                    className={cn(
                                        "group flex w-full items-center gap-3 rounded-2xl border bg-card p-2.5 text-left transition-colors hover:border-marigold/60",
                                        active && "border-primary bg-primary/5",
                                    )}
                                >
                                    <span className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                                        <Image
                                            src={`https://i.ytimg.com/vi/${track.youtubeId}/mqdefault.jpg`}
                                            alt=""
                                            fill
                                            sizes="64px"
                                            className="object-cover"
                                        />
                                        <span
                                            className="absolute inset-0 grid place-items-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 data-[active=true]:opacity-100"
                                            data-active={active}
                                        >
                                            <HugeiconsIcon
                                                icon={active && isPlaying ? PauseIcon : PlayIcon}
                                                className="size-6"
                                            />
                                        </span>
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold">
                                            {track.title}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {track.artist ?? categories(track.category)}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>
        </div>
    );
}
