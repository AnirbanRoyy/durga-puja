"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, PencilEdit02Icon, PlusSignIcon, StarIcon } from "@hugeicons/core-free-icons";
import {
    addMusicalChairSong,
    addYouTubeSong,
    deleteSong,
    editSong,
    updateSong,
} from "@/actions/admin/content";
import { useAdminCan } from "@/components/admin/admin-permissions";
import { NativeSelect } from "@/components/admin/native-select";
import { UploadButton } from "@/components/admin/upload-button";
import { useActionToast } from "@/components/admin/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SONG_CATEGORIES } from "@/constants";
import type { Song } from "@/lib/database.types";
import { initialActionState } from "@/lib/validators";

export function AddYouTubeSongForm({
    pool = "music_page",
}: Readonly<{
    pool?: "music_page" | "musical_chair";
}>) {
    const [state, action, pending] = useActionState(addYouTubeSong, initialActionState);
    useActionToast(state);
    const v = state.ok ? {} : (state.values ?? {});
    return (
        <form action={action} className="grid grid-cols-1 gap-3">
            <input type="hidden" name="pool" value={pool} />
            <Input name="url" placeholder="Paste a YouTube link" defaultValue={v.url} required />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input name="title" placeholder="Title" defaultValue={v.title} required />
                <Input name="artist" placeholder="Artist (optional)" defaultValue={v.artist} />
            </div>
            <div className="flex flex-wrap items-center gap-4">
                <NativeSelect
                    name="category"
                    options={SONG_CATEGORIES}
                    defaultValue={v.category ?? "agomoni"}
                    className="w-40"
                />
                {pool === "music_page" && (
                    <label className="flex items-center gap-2 text-sm">
                        <Switch name="featured" /> Feature at top
                    </label>
                )}
                <Button type="submit" disabled={pending} className="ml-auto">
                    <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
                    Add song
                </Button>
            </div>
        </form>
    );
}

/** The small grey detail under a song title: the category, or the length of an MP3. */
function songDetail(song: Song): string | null {
    if (song.source === "youtube") {
        return song.category;
    }
    return song.duration_sec ? `${Math.round(song.duration_sec)}s` : null;
}

export function MusicalChairUploader({
    requestId,
    defaultTitle,
}: Readonly<{
    requestId?: string;
    defaultTitle?: string;
}>) {
    const [title, setTitle] = useState(defaultTitle ?? "");
    const [artist, setArtist] = useState("");
    return (
        <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Song title"
                />
                <Input
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Artist (optional)"
                />
            </div>
            {title.trim() ? (
                <UploadButton
                    kind="audio"
                    folder="musical-chair"
                    onUploaded={async (file) => {
                        await addMusicalChairSong({
                            title,
                            artist,
                            audioUrl: file.url,
                            publicId: file.publicId,
                            durationSec: file.duration,
                            requestId,
                        });
                        toast.success(`Added “${title}” to the musical chair pool`);
                        setTitle("");
                        setArtist("");
                    }}
                >
                    Upload MP3 & add
                </UploadButton>
            ) : (
                <p className="text-xs text-muted-foreground">Enter a title, then upload the MP3.</p>
            )}
            <p className="text-xs text-muted-foreground">
                Use the full song or a clip of at least 60s — each round starts at a random point
                after the first 20s.
            </p>
        </div>
    );
}

/** Inline form to fix a song's details. MP3s only take a new title and artist. */
function EditSongForm({ song, onDone }: Readonly<{ song: Song; onDone: () => void }>) {
    const [state, action, pending] = useActionState(editSong, initialActionState);
    useActionToast(state);
    useEffect(() => {
        if (state.ok) {
            onDone();
        }
    }, [state, onDone]);
    const v = state.ok ? {} : (state.values ?? {});
    const isYouTube = song.source === "youtube";
    return (
        <form action={action} className="grid grid-cols-1 gap-3 pt-3">
            <input type="hidden" name="id" value={song.id} />
            {isYouTube && (
                <Input
                    name="url"
                    placeholder="YouTube link"
                    aria-label="YouTube link"
                    defaultValue={v.url ?? `https://youtu.be/${song.youtube_id}`}
                    required
                />
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                    name="title"
                    placeholder="Title"
                    aria-label="Title"
                    defaultValue={v.title ?? song.title}
                    required
                />
                <Input
                    name="artist"
                    placeholder="Artist (optional)"
                    aria-label="Artist"
                    defaultValue={v.artist ?? song.artist ?? ""}
                />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {isYouTube ? (
                    <NativeSelect
                        name="category"
                        options={SONG_CATEGORIES}
                        defaultValue={v.category ?? song.category}
                        aria-label="Category"
                        className="w-40"
                    />
                ) : (
                    <p className="text-xs text-muted-foreground">
                        To change the file, delete and re-upload.
                    </p>
                )}
                <div className="ml-auto flex gap-2">
                    <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={pending}>
                        Save
                    </Button>
                </div>
            </div>
        </form>
    );
}

export function SongList({
    songs,
    allowFeature = false,
}: Readonly<{
    songs: Song[];
    allowFeature?: boolean;
}>) {
    const [pending, startTransition] = useTransition();
    const [editingId, setEditingId] = useState<string | null>(null);
    const can = useAdminCan();
    const stopEditing = useCallback(() => setEditingId(null), []);
    const run = (fn: () => Promise<unknown>, success: string) =>
        startTransition(async () => {
            try {
                await fn();
                toast.success(success);
            } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
            }
        });

    if (songs.length === 0) {
        return (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nothing here yet.
            </p>
        );
    }

    return (
        <ul className="divide-y rounded-2xl border bg-card">
            {songs.map((s) => (
                <li key={s.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{s.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                                {[s.artist, songDetail(s)].filter(Boolean).join(" · ")}
                            </p>
                        </div>
                        {can.update && (
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                title="Edit song"
                                aria-label={`Edit “${s.title}”`}
                                aria-expanded={editingId === s.id}
                                disabled={pending}
                                onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                            >
                                <HugeiconsIcon icon={PencilEdit02Icon} />
                            </Button>
                        )}
                        {allowFeature && can.update && (
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                title={s.featured ? "Featured" : "Feature this song"}
                                disabled={pending}
                                onClick={() =>
                                    run(
                                        () => updateSong(s.id, { featured: !s.featured }),
                                        s.featured ? "Removed from the top" : "Featured at the top",
                                    )
                                }
                            >
                                <HugeiconsIcon
                                    icon={StarIcon}
                                    className={s.featured ? "text-gold" : "text-muted-foreground"}
                                />
                            </Button>
                        )}
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Switch
                                checked={s.active}
                                disabled={pending || !can.update}
                                onCheckedChange={(active) =>
                                    run(
                                        () => updateSong(s.id, { active }),
                                        active
                                            ? "Song shown on the site"
                                            : "Song hidden from the site",
                                    )
                                }
                            />
                            Active
                        </label>
                        {can.delete && (
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                disabled={pending}
                                onClick={() => {
                                    if (confirm(`Delete “${s.title}”?`)) {
                                        run(() => deleteSong(s.id), "Song deleted");
                                    }
                                }}
                            >
                                <HugeiconsIcon icon={Delete02Icon} className="text-destructive" />
                            </Button>
                        )}
                    </div>
                    {editingId === s.id && <EditSongForm song={s} onDone={stopEditing} />}
                </li>
            ))}
        </ul>
    );
}
