"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon, MusicNote03Icon } from "@hugeicons/core-free-icons";
import { requestSong } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { FormAlert, Honeypot, TextField } from "@/components/forms/form-bits";
import { initialActionState } from "@/lib/validators";

export function SongRequestForm() {
    const t = useTranslations("forms");
    const [state, action, pending] = useActionState(requestSong, initialActionState);
    const v = state.values ?? {};

    return (
        <form action={action} className="relative grid gap-4">
            <Honeypot />
            <TextField
                name="title"
                label={t("songTitle")}
                required
                maxLength={120}
                defaultValue={v.title}
                error={state.errors?.title}
            />
            <TextField
                name="artist"
                label={t("artist")}
                maxLength={80}
                defaultValue={v.artist}
                error={state.errors?.artist}
            />
            <TextField
                name="link"
                label={t("link")}
                type="url"
                placeholder="https://youtu.be/…"
                defaultValue={v.link}
                error={state.errors?.link}
            />
            <TextField
                name="requestedBy"
                label={t("yourName")}
                maxLength={60}
                defaultValue={v.requestedBy}
                error={state.errors?.requestedBy}
            />
            <FormAlert state={state} />
            <Button type="submit" disabled={pending} size="lg" className="h-10 rounded-full">
                <HugeiconsIcon
                    icon={pending ? Loading03Icon : MusicNote03Icon}
                    className={pending ? "animate-spin" : undefined}
                    data-icon="inline-start"
                />
                {t("requestSong")}
            </Button>
        </form>
    );
}
