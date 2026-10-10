"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { requestQuotaReset } from "@/actions/public";
import { FormAlert, Honeypot, TextField } from "@/components/forms/form-bits";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/validators";

type Status = "pending" | "rejected" | null;

/** Shown when a network has used all its song requests: ask the organisers for more. */
export function StreamQuotaForm({ status }: Readonly<{ status: Status }>) {
    const t = useTranslations("stream");
    const [state, action, pending] = useActionState(requestQuotaReset, initialActionState);
    const nameRef = useRef<HTMLInputElement>(null);

    // The request form remembers the visitor's name; reuse it.
    useEffect(() => {
        try {
            const saved = localStorage.getItem("dp_stream_name");
            if (saved && nameRef.current && !nameRef.current.value) nameRef.current.value = saved;
        } catch {}
    }, []);

    if (status === "rejected" || state.code === "quotaDeclined") {
        return (
            <output className="block rounded-xl bg-secondary/60 p-3 text-sm">
                {t("quotaDeclined")}
            </output>
        );
    }
    if (status === "pending" || state.ok) {
        return (
            <output className="block rounded-xl bg-marigold/15 p-3 text-sm">
                {t("quotaWaiting")}
            </output>
        );
    }

    return (
        <form action={action} className="relative grid gap-3 rounded-xl border bg-secondary/40 p-3">
            <Honeypot />
            <p className="text-sm font-medium">{t("quotaTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("quotaHint")}</p>
            <TextField
                ref={nameRef}
                name="quotaName"
                label={t("nameLabel")}
                required
                maxLength={40}
                autoComplete="given-name"
                defaultValue={state.values?.quotaName}
                error={state.errors?.quotaName}
            />
            <FormAlert state={state} />
            <Button type="submit" variant="outline" disabled={pending} className="rounded-full">
                {t("quotaSend")}
            </Button>
        </form>
    );
}
