"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { makeEditionCurrent, startEdition } from "@/actions/admin/content";
import { useActionToast } from "@/components/admin/use-action-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validators";

function Field({
    name,
    label,
    ...props
}: { name: string; label: string } & React.ComponentProps<typeof Input>) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} name={name} {...props} />
        </div>
    );
}

export function StartEditionForm({
    currentYear,
    defaults,
}: {
    currentYear: number;
    defaults: { year: number; name_en: string; name_bn: string; venue: string };
}) {
    const [state, action, pending] = useActionState(startEdition, initialActionState);
    useActionToast(state);
    return (
        <form
            action={action}
            onSubmit={(e) => {
                const year = new FormData(e.currentTarget).get("year");
                const ok = window.confirm(
                    `Start ${year}? The public site switches to ${year}, and registrations and voting for ${currentYear} close. ${currentYear} stays in the archive.`,
                );
                if (!ok) e.preventDefault();
            }}
            className="grid gap-4 sm:grid-cols-2"
        >
            <p className="text-sm text-muted-foreground sm:col-span-2">
                Do this once the new Puja dates are known. Nothing from {currentYear} is deleted:
                its programmes, participants, results and drawings move to the archive.
            </p>
            <Field name="year" label="Year" type="number" defaultValue={defaults.year} required />
            <Field name="venue" label="Venue" defaultValue={defaults.venue} />
            <Field
                name="name_en"
                label="Festival name (English)"
                defaultValue={defaults.name_en}
                required
            />
            <Field name="name_bn" label="Festival name (বাংলা)" defaultValue={defaults.name_bn} />
            <Field name="mahalaya" label="Mahalaya (IST)" type="datetime-local" />
            <Field name="shashthi" label="Shashthi starts (IST)" type="datetime-local" required />
            <Field name="dashami" label="Dashami ends (IST)" type="datetime-local" required />
            <label className="flex items-start gap-2.5 text-sm sm:col-span-2">
                <Checkbox name="copy_programmes" defaultChecked className="mt-0.5" />
                <span>
                    Copy {currentYear}’s programmes as a starting point
                    <span className="block text-xs text-muted-foreground">
                        Titles, descriptions, rules and venues are copied, with dates moved to the
                        new Shashthi. Registration starts closed. No participants or results are
                        copied.
                    </span>
                </span>
            </label>
            <div className="flex items-center gap-4 sm:col-span-2">
                <Button type="submit" disabled={pending}>
                    Start new year
                </Button>
            </div>
        </form>
    );
}

export function MakeCurrentButton({ year }: { year: number }) {
    const [pending, startTransition] = useTransition();
    return (
        <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
                if (!window.confirm(`Make ${year} the year shown on the public site?`)) return;
                startTransition(async () => {
                    try {
                        await makeEditionCurrent(year);
                        toast.success(`${year} is now the year shown on the public site`);
                    } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not change the year");
                    }
                });
            }}
        >
            Make current
        </Button>
    );
}
