"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { MusicNote03Icon } from "@hugeicons/core-free-icons";
import { DholSpinner } from "@/components/loaders/dhol-loader";
import { requestStreamSong } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { FormAlert, Honeypot, TextField } from "@/components/forms/form-bits";
import { initialActionState } from "@/lib/validators";

/** Ask for a YouTube song to be played on the pandal speaker. */
export function StreamRequestForm() {
    const t = useTranslations("stream");
    const [state, action, pending] = useActionState(requestStreamSong, initialActionState);
    const v = state.values ?? {};

    return (
        <form action={action} className="relative grid gap-4">
            <Honeypot />
            <TextField
                name="link"
                label={t("linkLabel")}
                type="url"
                required
                placeholder="https://youtu.be/…"
                defaultValue={state.ok ? undefined : v.link}
                key={state.ok ? "sent" : "editing"}
                error={state.errors?.link}
            />
            <TextField
                name="name"
                label={t("nameLabel")}
                required
                maxLength={40}
                autoComplete="given-name"
                defaultValue={v.name}
                error={state.errors?.name}
            />
            <FormAlert state={state} />
            <Button type="submit" disabled={pending} size="lg" className="h-10 rounded-full">
                {pending ? (
                    <DholSpinner data-icon="inline-start" />
                ) : (
                    <HugeiconsIcon icon={MusicNote03Icon} data-icon="inline-start" />
                )}
                {t("send")}
            </Button>
        </form>
    );
}
