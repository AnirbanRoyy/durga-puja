"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addLibrarySongsToStream } from "@/actions/admin/stream";
import { AdminCard } from "@/components/admin/admin-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LibrarySong = { id: string; title: string; artist: string | null; youtubeId: string };

/** The Music page's song library: tick some or all and add them to the stream playlist in one go. */
export function StreamLibrary({
    songs,
    inPlaylist,
    playingId,
}: Readonly<{
    songs: LibrarySong[];
    /** YouTube ids already approved in the playlist (including the one playing). */
    inPlaylist: Set<string>;
    playingId: string | null;
}>) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [query, setQuery] = useState("");
    const [picked, setPicked] = useState<Set<string>>(new Set());

    const needle = query.trim().toLowerCase();
    const shown = songs.filter(
        (s) =>
            !needle ||
            s.title.toLowerCase().includes(needle) ||
            (s.artist ?? "").toLowerCase().includes(needle),
    );
    const selectable = shown.filter((s) => !inPlaylist.has(s.youtubeId));
    const selectedCount = [...picked].filter((id) => songs.some((s) => s.id === id)).length;
    const allShownPicked = selectable.length > 0 && selectable.every((s) => picked.has(s.id));

    const toggle = (id: string) =>
        setPicked((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const toggleAll = () =>
        setPicked((prev) => {
            const next = new Set(prev);
            for (const s of selectable) {
                if (allShownPicked) next.delete(s.id);
                else next.add(s.id);
            }
            return next;
        });

    const add = () =>
        start(async () => {
            const result = await addLibrarySongsToStream([...picked]);
            if (!result.ok) {
                toast.error(result.message);
                return;
            }
            setPicked(new Set());
            if (!result.added) toast.info("Those songs are already in the playlist.");
            else toast.success(`Added ${result.added} song${result.added === 1 ? "" : "s"}`);
            router.refresh();
        });

    return (
        <AdminCard title={`Add from the song library (${songs.length})`}>
            {songs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No YouTube songs in the library yet.{" "}
                    <Link href="/admin/songs" className="underline">
                        Add some on the Songs page
                    </Link>
                    .
                </p>
            ) : (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search title or artist…"
                        aria-label="Search the song library"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={allShownPicked}
                                disabled={selectable.length === 0}
                                onChange={toggleAll}
                                className="size-4 accent-primary"
                            />
                            Select all{needle ? " shown" : ""}
                        </label>
                        <span className="text-muted-foreground">{selectedCount} selected</span>
                    </div>
                    <ul className="max-h-96 divide-y overflow-y-auto rounded-lg border">
                        {shown.map((song) => {
                            const listed = inPlaylist.has(song.youtubeId);
                            const playing = song.youtubeId === playingId;
                            return (
                                <li key={song.id}>
                                    <label
                                        className={`flex items-center gap-3 px-3 py-2 ${
                                            listed ? "opacity-60" : "cursor-pointer"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={picked.has(song.id)}
                                            disabled={listed}
                                            onChange={() => toggle(song.id)}
                                            className="size-4 shrink-0 accent-primary"
                                        />
                                        <Image
                                            src={`https://i.ytimg.com/vi/${song.youtubeId}/mqdefault.jpg`}
                                            alt=""
                                            width={96}
                                            height={54}
                                            className="aspect-video w-14 shrink-0 rounded object-cover"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="line-clamp-1 block text-sm font-medium">
                                                {song.title}
                                            </span>
                                            {song.artist && (
                                                <span className="line-clamp-1 block text-xs text-muted-foreground">
                                                    {song.artist}
                                                </span>
                                            )}
                                        </span>
                                        {listed && (
                                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                                                {playing ? "Playing" : "In playlist"}
                                            </span>
                                        )}
                                    </label>
                                </li>
                            );
                        })}
                        {!shown.length && (
                            <li className="px-3 py-4 text-sm text-muted-foreground">
                                No songs match.
                            </li>
                        )}
                    </ul>
                    <Button disabled={pending || selectedCount === 0} onClick={add}>
                        {selectedCount ? `Add ${selectedCount} to playlist` : "Pick songs to add"}
                    </Button>
                </div>
            )}
        </AdminCard>
    );
}
