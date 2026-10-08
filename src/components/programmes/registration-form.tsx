"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { DholSpinner } from "@/components/loaders/dhol-loader";
import { registerForProgramme } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { FormAlert, Honeypot, TextField } from "@/components/forms/form-bits";
import type { ProgrammeType } from "@/lib/database.types";
import { initialActionState } from "@/lib/validators";

export function RegistrationForm({
    programmeId,
    programmeType,
}: {
    programmeId: string;
    programmeType: ProgrammeType;
}) {
    const t = useTranslations("forms");
    const [state, action, pending] = useActionState(registerForProgramme, initialActionState);
    const forKids = programmeType === "drawing" || programmeType === "musical_chair";

    const v = state.values ?? {};

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
                {t("register")}
            </Button>
        </form>
    );
}
