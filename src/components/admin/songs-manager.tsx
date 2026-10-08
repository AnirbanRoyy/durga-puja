"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, PlusSignIcon, StarIcon } from "@hugeicons/core-free-icons";
import {
    addMusicalChairSong,
    addYouTubeSong,
    deleteSong,
    updateSong,
} from "@/actions/admin/content";
import { NativeSelect } from "@/components/admin/native-select";
import { UploadButton } from "@/components/admin/upload-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Song } from "@/lib/database.types";
import { initialActionState } from "@/lib/validators";

const CATEGORIES = ["mahalaya", "agomoni", "dhunuchi", "bhajan", "modern", "bollywood", "other"];

export function AddYouTubeSongForm() {
    const [state, action, pending] = useActionState(addYouTubeSong, initialActionState);
    const v = state.ok ? {} : (state.values ?? {});
    return (
        <form action={action} className="grid gap-3">
            <Input name="url" placeholder="Paste a YouTube link" defaultValue={v.url} required />
            <div className="grid gap-3 sm:grid-cols-2">
                <Input name="title" placeholder="Title" defaultValue={v.title} required />
                <Input name="artist" placeholder="Artist (optional)" defaultValue={v.artist} />
            </div>
            <div className="flex flex-wrap items-center gap-4">
                <NativeSelect
                    name="category"
                    options={CATEGORIES}
                    defaultValue={v.category ?? "agomoni"}
                    className="w-40"
                />
                <label className="flex items-center gap-2 text-sm">
                    <Switch name="featured" /> Feature at top
                </label>
                <Button type="submit" disabled={pending} className="ml-auto">
                    <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
                    Add song
                </Button>
            </div>
            {state.code && (
                <p className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>
                    {state.code}
                </p>
            )}
        </form>
    );
}

export function MusicalChairUploader({
    requestId,
    defaultTitle,
}: {
    requestId?: string;
    defaultTitle?: string;
}) {
    const [title, setTitle] = useState(defaultTitle ?? "");
    const [artist, setArtist] = useState("");
    return (
        <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
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

export function SongList({
    songs,
    allowFeature = false,
}: {
    songs: Song[];
    allowFeature?: boolean;
}) {
    const [pending, startTransition] = useTransition();
    const run = (fn: () => Promise<unknown>) =>
        startTransition(async () => {
            try {
                await fn();
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
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                            {[
                                s.artist,
                                s.source === "youtube"
                                    ? s.category
                                    : s.duration_sec
                                      ? `${Math.round(s.duration_sec)}s`
                                      : null,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                    </div>
                    {allowFeature && (
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            title={s.featured ? "Featured" : "Feature this song"}
                            disabled={pending}
                            onClick={() => run(() => updateSong(s.id, { featured: !s.featured }))}
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
                            disabled={pending}
                            onCheckedChange={(active) => run(() => updateSong(s.id, { active }))}
                        />
                        Active
                    </label>
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                            if (confirm(`Delete “${s.title}”?`)) run(() => deleteSong(s.id));
                        }}
                    >
                        <HugeiconsIcon icon={Delete02Icon} className="text-destructive" />
                    </Button>
                </li>
            ))}
        </ul>
    );
}
