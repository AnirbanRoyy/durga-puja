"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { DholSpinner } from "@/components/loaders/dhol-loader";
import { recoverRegistration, registerForProgramme, updateMyRegistration } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { FormAlert, Honeypot, TextField } from "@/components/forms/form-bits";
import type { ProgrammeType, TeamMember } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { initialActionState } from "@/lib/validators";

export type ExistingRegistration = {
    name: string;
    phone: string;
    age: number | null;
    guardianName: string | null;
    notes: string | null;
    members?: TeamMember[];
};

/** How a team or pair programme signs people up; absent for ordinary individual programmes. */
export type TeamSetup = { format: "team" | "pair"; min: number; max: number };

type Values = Record<string, string | undefined>;
type FormState = { errors?: Record<string, string> };

function ErrorText({ code }: { code?: string }) {
    const t = useTranslations("forms.errors");
    if (!code) return null;
    return <p className="text-sm text-destructive">{t.has(code) ? t(code) : t("invalid")}</p>;
}

/** Team name, 2–4 member names with one marked leader. Rows are added and removed at the end. */
function TeamFields({
    team,
    v,
    state,
    existing,
}: {
    team: TeamSetup;
    v: Values;
    state: FormState;
    existing?: ExistingRegistration;
}) {
    const t = useTranslations("forms");
    const [count, setCount] = useState(
        Math.min(team.max, Math.max(team.min, existing?.members?.length ?? team.min)),
    );
    const existingLeader = existing?.members?.findIndex((m) => m.role === "leader");

    return (
        <>
            <TextField
                name="teamName"
                label={t("teamName")}
                required
                maxLength={60}
                defaultValue={v.teamName}
                error={state.errors?.teamName ?? state.errors?.name}
            />
            <fieldset className="grid gap-3">
                <legend className="text-sm font-medium">
                    {t("members")} <span className="text-primary">*</span>
                </legend>
                <p className="-mt-1 text-xs text-muted-foreground">
                    {t("membersHint", { min: team.min, max: team.max })}
                </p>
                {Array.from({ length: count }, (_, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <TextField
                            name={`member_${i}`}
                            label={t("memberN", { n: i + 1 })}
                            required={i < team.min}
                            maxLength={60}
                            className="min-w-0 flex-1"
                            defaultValue={v[`member_${i}`] ?? existing?.members?.[i]?.name}
                            error={state.errors?.[`member_${i}`]}
                        />
                        <label className="mt-7 flex shrink-0 items-center gap-1.5 text-sm">
                            <input
                                type="radio"
                                name="leader"
                                value={i}
                                required
                                defaultChecked={
                                    (v.leader ??
                                        (existingLeader != null && existingLeader >= 0
                                            ? String(existingLeader)
                                            : undefined)) === String(i)
                                }
                                className="size-4 accent-primary"
                            />
                            {t("leader")}
                        </label>
                    </div>
                ))}
                <ErrorText code={state.errors?.leader ?? state.errors?.members} />
                <div className="flex gap-2">
                    {count < team.max && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setCount((c) => c + 1)}
                        >
                            {t("addMember")}
                        </Button>
                    )}
                    {count > team.min && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setCount((c) => c - 1)}
                        >
                            {t("removeMember")}
                        </Button>
                    )}
                </div>
            </fieldset>
        </>
    );
}

function PairFields({
    v,
    state,
    existing,
}: {
    v: Values;
    state: FormState;
    existing?: ExistingRegistration;
}) {
    const t = useTranslations("forms");
    const brother = existing?.members?.find((m) => m.role === "brother")?.name;
    const sister = existing?.members?.find((m) => m.role === "sister")?.name;
    return (
        <>
            <TextField
                name="brotherName"
                label={t("brotherName")}
                required
                maxLength={60}
                defaultValue={v.brotherName ?? brother}
                error={state.errors?.brotherName}
            />
            <TextField
                name="sisterName"
                label={t("sisterName")}
                required
                maxLength={60}
                defaultValue={v.sisterName ?? sister}
                error={state.errors?.sisterName}
            />
        </>
    );
}

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
    team,
    existing,
    onDone,
}: {
    programmeId: string;
    programmeType: ProgrammeType;
    team?: TeamSetup;
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
        teamName: existing?.name,
        phone: existing?.phone,
        age: existing?.age?.toString(),
        guardianName: existing?.guardianName ?? undefined,
        notes: existing?.notes ?? undefined,
    };
    const saved = existing && state.ok && state.code === "updated";
    // Individual sign-up is two columns on wide screens; team and pair forms are a single column.
    const wide = team ? undefined : "sm:col-span-2";

    return (
        <form action={action} className={cn("relative grid gap-4", !team && "sm:grid-cols-2")}>
            <Honeypot />
            <input type="hidden" name="programmeId" value={programmeId} />
            {team?.format === "team" && (
                <TeamFields team={team} v={v} state={state} existing={existing} />
            )}
            {team?.format === "pair" && <PairFields v={v} state={state} existing={existing} />}
            {!team && (
                <TextField
                    name="name"
                    label={t("name")}
                    required
                    autoComplete="name"
                    maxLength={80}
                    defaultValue={v.name}
                    error={state.errors?.name}
                />
            )}
            <TextField
                name="phone"
                label={team?.format === "team" ? t("leaderPhone") : t("phone")}
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="98XXXXXXXX"
                description={t("phoneHint")}
                defaultValue={v.phone}
                error={state.errors?.phone}
            />
            {!team && (
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
            )}
            {forKids && !team && (
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
                className={wide}
                defaultValue={v.notes}
                error={state.errors?.notes}
            />
            <FormAlert state={state} className={wide} />
            {state.code === "deviceUsed" && (
                <div className={wide}>
                    <RecoverForm programmeId={programmeId} />
                </div>
            )}
            {saved && onDone && (
                <button type="button" onClick={onDone} className={cn("text-sm underline", wide)}>
                    {t("done")}
                </button>
            )}
            <Button
                type="submit"
                size="lg"
                disabled={pending}
                className={cn("h-11 rounded-full", wide)}
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
