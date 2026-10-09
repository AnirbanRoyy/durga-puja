"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DholSpinner } from "@/components/loaders/dhol-loader";
import { withdrawMyRegistration } from "@/actions/public";
import { Button } from "@/components/ui/button";
import {
    RegistrationForm,
    type ExistingRegistration,
} from "@/components/programmes/registration-form";
import type { ProgrammeType } from "@/lib/database.types";

/** What a participant sees instead of the sign-up form once they have registered. */
export function MyRegistration({
    programmeId,
    programmeType,
    mine,
}: {
    programmeId: string;
    programmeType: ProgrammeType;
    mine: ExistingRegistration;
}) {
    const t = useTranslations("forms");
    const success = useTranslations("forms.success");
    const errors = useTranslations("forms.errors");
    const [editing, setEditing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [pending, startTransition] = useTransition();

    function withdraw() {
        startTransition(async () => {
            const result = await withdrawMyRegistration(programmeId);
            if (result.ok) toast.success(success("withdrawn"));
            else toast.error(errors("notYours"));
        });
    }

    const rows: [string, string | number | null][] = [
        [t("name"), mine.name],
        [t("phone"), mine.phone],
        [t("age"), mine.age],
        [t("guardianName"), mine.guardianName],
        [t("notes"), mine.notes],
    ];

    if (editing) {
        return (
            <RegistrationForm
                programmeId={programmeId}
                programmeType={programmeType}
                existing={mine}
                onDone={() => setEditing(false)}
            />
        );
    }

    return (
        <div>
            <p className="mb-3 text-sm font-medium text-primary">{t("yourRegistration")}</p>
            <dl className="grid gap-2 text-sm">
                {rows
                    .filter(([, value]) => value !== null && value !== "")
                    .map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd className="font-medium break-words">{value}</dd>
                        </div>
                    ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">{t("rememberHint")}</p>
            {confirming ? (
                <div className="mt-4 rounded-2xl bg-secondary/60 p-4">
                    <p className="text-sm font-medium">{t("withdrawConfirm")}</p>
                    <div className="mt-3 flex gap-2">
                        <Button
                            variant="destructive"
                            disabled={pending}
                            onClick={withdraw}
                            className="rounded-full"
                        >
                            {pending && <DholSpinner data-icon="inline-start" />}
                            {t("withdrawYes")}
                        </Button>
                        <Button
                            variant="ghost"
                            disabled={pending}
                            onClick={() => setConfirming(false)}
                            className="rounded-full"
                        >
                            {t("keep")}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mt-4 flex gap-2">
                    <Button onClick={() => setEditing(true)} className="rounded-full">
                        {t("edit")}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setConfirming(true)}
                        className="rounded-full"
                    >
                        {t("withdraw")}
                    </Button>
                </div>
            )}
        </div>
    );
}
