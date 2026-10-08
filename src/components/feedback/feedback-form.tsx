"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon } from "@hugeicons/core-free-icons";
import { DholSpinner } from "@/components/loaders/dhol-loader";
import { submitFeedback } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { FormAlert, Honeypot, TextField } from "@/components/forms/form-bits";
import { initialActionState } from "@/lib/validators";
import { cn } from "@/lib/utils";

const KINDS = ["suggestion", "complaint", "appreciation"] as const;

export function FeedbackForm() {
    const t = useTranslations("feedback");
    const forms = useTranslations("forms");
    const [state, action, pending] = useActionState(submitFeedback, initialActionState);
    const v = state.values ?? {};

    return (
        <form action={action} className="relative grid gap-5">
            <Honeypot />
            <fieldset>
                <legend className="mb-2 text-sm font-medium">{t("kind")}</legend>
                <div className="grid grid-cols-3 gap-2">
                    {KINDS.map((kind) => (
                        <label
                            key={kind}
                            className={cn(
                                "cursor-pointer rounded-xl border bg-background px-3 py-2.5 text-center text-sm font-medium transition-colors",
                                "has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary",
                                "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                            )}
                        >
                            <input
                                type="radio"
                                name="kind"
                                value={kind}
                                defaultChecked={(v.kind ?? "suggestion") === kind}
                                className="sr-only"
                            />
                            {t(`kinds.${kind}`)}
                        </label>
                    ))}
                </div>
            </fieldset>
            <TextField
                name="message"
                label={t("message")}
                required
                multiline
                rows={5}
                maxLength={2000}
                placeholder={t("messagePlaceholder")}
                defaultValue={v.message}
                error={state.errors?.message}
            />
            <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                    name="name"
                    label={forms("yourNameOptional")}
                    maxLength={80}
                    defaultValue={v.name}
                />
                <TextField
                    name="contact"
                    label={t("contact")}
                    maxLength={120}
                    description={t("contactHint")}
                    defaultValue={v.contact}
                />
            </div>
            <FormAlert state={state} />
            <Button type="submit" size="lg" disabled={pending} className="h-11 rounded-full">
                {pending ? (
                    <DholSpinner data-icon="inline-start" />
                ) : (
                    <HugeiconsIcon icon={Message01Icon} data-icon="inline-start" />
                )}
                {t("submit")}
            </Button>
        </form>
    );
}
