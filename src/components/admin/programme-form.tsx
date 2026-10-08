"use client";

import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { saveProgramme } from "@/actions/admin/programmes";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/admin/native-select";
import type { Programme } from "@/lib/database.types";
import { isoToIstLocal } from "@/lib/datetime";
import { PROGRAMME_STATUSES, PROGRAMME_TYPES } from "@/lib/programme-meta";
import { initialActionState } from "@/lib/validators";

function Row({
    name,
    label,
    error,
    hint,
    children,
}: {
    name: string;
    label: string;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <Field data-invalid={Boolean(error) || undefined}>
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            {children}
            {hint && !error && <FieldDescription>{hint}</FieldDescription>}
            {error && <FieldError>{error}</FieldError>}
        </Field>
    );
}

export function ProgrammeForm({ programme }: { programme?: Programme }) {
    const [state, action, pending] = useActionState(saveProgramme, initialActionState);
    const v = (key: keyof Programme, fallback = ""): string =>
        state.values?.[key] ?? (programme?.[key] != null ? String(programme[key]) : fallback);
    const e = state.errors ?? {};

    return (
        <form action={action} className="grid max-w-3xl gap-5">
            {programme && <input type="hidden" name="id" value={programme.id} />}

            <div className="grid gap-5 sm:grid-cols-2">
                <Row name="title_en" label="Title (English)" error={e.title_en}>
                    <Input id="title_en" name="title_en" defaultValue={v("title_en")} required />
                </Row>
                <Row name="title_bn" label="Title (বাংলা)">
                    <Input id="title_bn" name="title_bn" defaultValue={v("title_bn")} />
                </Row>
                <Row
                    name="type"
                    label="Type"
                    hint="Decides which public section appears (voting, lineup, song requests)."
                >
                    <NativeSelect
                        id="type"
                        name="type"
                        defaultValue={v("type", "other")}
                        options={PROGRAMME_TYPES}
                    />
                </Row>
                <Row name="status" label="Status">
                    <NativeSelect
                        id="status"
                        name="status"
                        defaultValue={v("status", "upcoming")}
                        options={PROGRAMME_STATUSES}
                    />
                </Row>
                <Row name="starts_at" label="Starts (IST)">
                    <Input
                        id="starts_at"
                        name="starts_at"
                        type="datetime-local"
                        defaultValue={
                            state.values?.starts_at ?? isoToIstLocal(programme?.starts_at)
                        }
                    />
                </Row>
                <Row name="ends_at" label="Ends (IST)">
                    <Input
                        id="ends_at"
                        name="ends_at"
                        type="datetime-local"
                        defaultValue={state.values?.ends_at ?? isoToIstLocal(programme?.ends_at)}
                    />
                </Row>
                <Row name="venue" label="Venue">
                    <Input id="venue" name="venue" defaultValue={v("venue")} />
                </Row>
                <Row
                    name="max_participants"
                    label="Max participants"
                    hint="Leave empty for no limit."
                >
                    <Input
                        id="max_participants"
                        name="max_participants"
                        type="number"
                        min={1}
                        defaultValue={v("max_participants")}
                    />
                </Row>
                <Row
                    name="slug"
                    label="URL slug"
                    error={e.slug}
                    hint="Auto-generated from the title if left empty."
                >
                    <Input
                        id="slug"
                        name="slug"
                        defaultValue={v("slug")}
                        placeholder="drawing-competition"
                    />
                </Row>
                <Row
                    name="sort_order"
                    label="Sort order"
                    hint="Tie-breaker for programmes at the same time."
                >
                    <Input
                        id="sort_order"
                        name="sort_order"
                        type="number"
                        defaultValue={v("sort_order", "0")}
                    />
                </Row>
            </div>

            <Row name="description_en" label="Description (English)">
                <Textarea
                    id="description_en"
                    name="description_en"
                    rows={3}
                    defaultValue={v("description_en")}
                />
            </Row>
            <Row name="description_bn" label="Description (বাংলা)">
                <Textarea
                    id="description_bn"
                    name="description_bn"
                    rows={3}
                    defaultValue={v("description_bn")}
                />
            </Row>
            <Row name="rules_en" label="Rules (English)">
                <Textarea id="rules_en" name="rules_en" rows={4} defaultValue={v("rules_en")} />
            </Row>
            <Row name="rules_bn" label="Rules (বাংলা)">
                <Textarea id="rules_bn" name="rules_bn" rows={4} defaultValue={v("rules_bn")} />
            </Row>
            <Row
                name="admin_notes"
                label="Notes"
                hint="Shown publicly on the results page (or as the reason if cancelled)."
            >
                <Textarea
                    id="admin_notes"
                    name="admin_notes"
                    rows={3}
                    defaultValue={v("admin_notes")}
                />
            </Row>
            <input type="hidden" name="cover_image_url" value={v("cover_image_url")} />

            <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-3">
                {(
                    [
                        ["registration_open", "Registration open"],
                        ["voting_open", "Voting open"],
                        ["hide_vote_counts", "Hide vote counts"],
                    ] as const
                ).map(([name, label]) => (
                    <label key={name} className="flex items-center gap-3 text-sm font-medium">
                        <Switch name={name} defaultChecked={Boolean(programme?.[name])} />
                        {label}
                    </label>
                ))}
            </div>

            {state.code && (
                <p
                    role="status"
                    className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}
                >
                    {state.code}
                </p>
            )}
            <div>
                <Button type="submit" disabled={pending} size="lg" className="h-10">
                    <HugeiconsIcon
                        icon={pending ? Loading03Icon : Tick02Icon}
                        className={pending ? "animate-spin" : undefined}
                        data-icon="inline-start"
                    />
                    {programme ? "Save changes" : "Create programme"}
                </Button>
            </div>
        </form>
    );
}
