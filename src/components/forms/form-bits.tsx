"use client";

import type { ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/validators";
import { cn } from "@/lib/utils";

type TextFieldProps = {
    name: string;
    label: string;
    error?: string;
    description?: string;
    multiline?: boolean;
} & Omit<ComponentProps<"input">, "name"> &
    Pick<ComponentProps<"textarea">, "rows">;

/** Label + input + translated error, wired for uncontrolled server-action forms. */
export function TextField({
    name,
    label,
    error,
    description,
    multiline,
    rows,
    className,
    ...inputProps
}: TextFieldProps) {
    const t = useTranslations("forms.errors");
    const id = `field-${name}`;
    const invalid = Boolean(error);
    return (
        <Field data-invalid={invalid || undefined} className={className}>
            <FieldLabel htmlFor={id}>
                {label}
                {inputProps.required && <span className="text-primary">*</span>}
            </FieldLabel>
            {multiline ? (
                <Textarea
                    id={id}
                    name={name}
                    rows={rows ?? 4}
                    aria-invalid={invalid}
                    required={inputProps.required}
                    placeholder={inputProps.placeholder}
                    defaultValue={inputProps.defaultValue as string | undefined}
                    maxLength={inputProps.maxLength}
                />
            ) : (
                <Input id={id} name={name} aria-invalid={invalid} {...inputProps} />
            )}
            {description && !invalid && <FieldDescription>{description}</FieldDescription>}
            {invalid && <FieldError>{t.has(error!) ? t(error!) : t("invalid")}</FieldError>}
        </Field>
    );
}

/** Invisible trap field; real people never fill it in. */
export function Honeypot() {
    return (
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
        </div>
    );
}

export function FormAlert({ state, className }: { state: ActionState; className?: string }) {
    const errors = useTranslations("forms.errors");
    const success = useTranslations("forms.success");
    if (!state.code || (state.code === "invalid" && state.errors)) return null;
    const ok = state.ok;
    const text = ok
        ? success.has(state.code)
            ? success(state.code)
            : success("generic")
        : errors.has(state.code)
          ? errors(state.code)
          : errors("generic");
    return (
        <div
            role={ok ? "status" : "alert"}
            className={cn(
                "flex items-start gap-2.5 rounded-xl border p-3 text-sm",
                ok
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-destructive/30 bg-destructive/10 text-destructive",
                className,
            )}
        >
            <HugeiconsIcon
                icon={ok ? CheckmarkCircle02Icon : Alert02Icon}
                className="mt-0.5 size-4 shrink-0"
            />
            <span>{text}</span>
        </div>
    );
}
