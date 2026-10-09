"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { DholSpinner } from "@/components/loaders/dhol-loader";
import { recoverRegistration, registerForProgramme, updateMyRegistration } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { FormAlert, Honeypot, TextField } from "@/components/forms/form-bits";
import type { ProgrammeType } from "@/lib/database.types";
import { initialActionState } from "@/lib/validators";

export type ExistingRegistration = {
    name: string;
    phone: string;
    age: number | null;
    guardianName: string | null;
    notes: string | null;
};

/** Shown when this network has already registered: proves ownership with the phone number. */
function RecoverForm({ programmeId }: { programmeId: string }) {
    const t = useTranslations("forms");
    const [state, action, pending] = useActionState(recoverRegistration, initialActionState);
    return (
        <form action={action} className="mt-4 grid gap-3 rounded-2xl bg-secondary/60 p-4">
            <p className="text-sm font-medium">{t("recoverTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("recoverHint")}</p>
            <input type="hidden" name="programmeId" value={programmeId} />
            <TextField
                name="phone"
                label={t("phone")}
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="98XXXXXXXX"
                defaultValue={state.values?.phone}
                error={state.errors?.phone}
            />
            <FormAlert state={state} />
            <Button type="submit" variant="outline" disabled={pending} className="rounded-full">
                {pending && <DholSpinner data-icon="inline-start" />}
                {t("recoverSubmit")}
            </Button>
        </form>
    );
}

export function RegistrationForm({
    programmeId,
    programmeType,
    existing,
    onDone,
}: {
    programmeId: string;
    programmeType: ProgrammeType;
    /** When set, the form edits this registration instead of creating one. */
    existing?: ExistingRegistration;
    onDone?: () => void;
}) {
    const t = useTranslations("forms");
    const [state, action, pending] = useActionState(
        existing ? updateMyRegistration : registerForProgramme,
        initialActionState,
    );
    const forKids = programmeType === "drawing" || programmeType === "musical_chair";

    const v = state.values ?? {
        name: existing?.name,
        phone: existing?.phone,
        age: existing?.age?.toString(),
        guardianName: existing?.guardianName ?? undefined,
        notes: existing?.notes ?? undefined,
    };
    const saved = existing && state.ok && state.code === "updated";

    return (
        <form action={action} className="relative grid gap-4 sm:grid-cols-2">
            <Honeypot />
            <input type="hidden" name="programmeId" value={programmeId} />
            <TextField
                name="name"
                label={t("name")}
                required
                autoComplete="name"
                maxLength={80}
                defaultValue={v.name}
                error={state.errors?.name}
            />
            <TextField
                name="phone"
                label={t("phone")}
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="98XXXXXXXX"
                description={t("phoneHint")}
                defaultValue={v.phone}
                error={state.errors?.phone}
            />
            <TextField
                name="age"
                label={t("age")}
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                defaultValue={v.age}
                error={state.errors?.age}
            />
            {forKids && (
                <TextField
                    name="guardianName"
                    label={t("guardianName")}
                    maxLength={80}
                    defaultValue={v.guardianName}
                    error={state.errors?.guardianName}
                />
            )}
            <TextField
                name="notes"
                label={
                    programmeType === "singing"
                        ? t("songChoice")
                        : programmeType === "dance"
                          ? t("danceStyle")
                          : t("notes")
                }
                multiline
                rows={2}
                maxLength={300}
                className="sm:col-span-2"
                defaultValue={v.notes}
                error={state.errors?.notes}
            />
            <FormAlert state={state} className="sm:col-span-2" />
            {state.code === "deviceUsed" && (
                <div className="sm:col-span-2">
                    <RecoverForm programmeId={programmeId} />
                </div>
            )}
            {saved && onDone && (
                <button type="button" onClick={onDone} className="text-sm underline sm:col-span-2">
                    {t("done")}
                </button>
            )}
            <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="h-11 rounded-full sm:col-span-2"
            >
                {pending ? (
                    <DholSpinner data-icon="inline-start" />
                ) : (
                    <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
                )}
                {existing ? t("saveChanges") : t("register")}
            </Button>
        </form>
    );
}
