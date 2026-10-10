"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { MusicNote03Icon } from "@hugeicons/core-free-icons";
import { DholSpinner } from "@/components/loaders/dhol-loader";
import { requestStreamSong } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { FormAlert, Honeypot, TextField } from "@/components/forms/form-bits";
import { initialActionState } from "@/lib/validators";

/** Fired by a "Request again" button with the song's YouTube link. */
export const STREAM_REREQUEST_EVENT = "stream:rerequest";

// The form clears after each request; remembering the name makes "Request again" one tap.
const NAME_KEY = "dp_stream_name";

function savedName(): string {
    try {
        return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
        return "";
    }
}

function saveName(name: FormDataEntryValue | null) {
    try {
        if (typeof name === "string" && name.trim()) localStorage.setItem(NAME_KEY, name.trim());
    } catch {}
}

/** Ask for a YouTube song to be played on the pandal speaker. */
export function StreamRequestForm({ left }: { left: number }) {
    const t = useTranslations("stream");
    const [state, action, pending] = useActionState(requestStreamSong, initialActionState);
    const v = state.values ?? {};
    const formRef = useRef<HTMLFormElement>(null);

    // "Request again" fills in the link, then sends straight away if the name is already known.
    useEffect(() => {
        const onRerequest = (event: Event) => {
            const form = formRef.current;
            if (!form) return;
            const link = form.elements.namedItem("link") as HTMLInputElement;
            const name = form.elements.namedItem("name") as HTMLInputElement;
            link.value = (event as CustomEvent<string>).detail;
            if (!name.value.trim()) name.value = savedName();
            form.scrollIntoView({ behavior: "smooth", block: "center" });
            if (name.value.trim().length >= 2) form.requestSubmit();
            else name.focus({ preventScroll: true });
        };
        window.addEventListener(STREAM_REREQUEST_EVENT, onRerequest);
        return () => window.removeEventListener(STREAM_REREQUEST_EVENT, onRerequest);
    }, []);

    return (
        <form
            ref={formRef}
            action={action}
            onSubmit={(event) => saveName(new FormData(event.currentTarget).get("name"))}
            className="relative grid gap-4"
        >
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
            <p className="text-xs text-muted-foreground">{t("requestsLeft", { count: left })}</p>
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
