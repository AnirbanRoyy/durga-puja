import "server-only";
import { z } from "zod";
import type { Programme, TeamMember } from "@/lib/database.types";
import { teamLimits } from "@/lib/programme-meta";
import { db } from "@/lib/supabase/server";
import {
    fieldErrors,
    pairRegistrationSchema,
    registrationSchema,
    teamRegistrationSchema,
    type FieldErrors,
} from "@/lib/validators";

export type RegistrationProgramme = Pick<
    Programme,
    | "id"
    | "slug"
    | "registration_open"
    | "status"
    | "max_participants"
    | "order_locked"
    | "team_format"
    | "team_min_size"
    | "team_max_size"
>;

/** Everything stored for a sign-up, whatever the programme's format (individual, team or pair). */
export type RegistrationInput = {
    name: string;
    phone: string;
    age: number | null;
    guardianName: string | null;
    notes: string | null;
    members: TeamMember[];
};

export type ParsedRegistration =
    | { ok: true; programme: RegistrationProgramme; input: RegistrationInput }
    | { ok: false; programme: RegistrationProgramme | null; errors: FieldErrors };

const PROGRAMME_COLUMNS =
    "id, slug, registration_open, status, max_participants, order_locked, team_format, team_min_size, team_max_size";

/** The members typed into the form: blank rows are dropped, and the leader's row is re-found. */
function readTeamForm(values: Record<string, string>) {
    const rows: { name: string; row: number }[] = [];
    for (let row = 0; row < 20; row++) {
        const name = values[`member_${row}`];
        if (name === undefined) break;
        if (name.trim()) rows.push({ name, row });
    }
    const leaderRow = Number(values.leader);
    return {
        members: rows.map((r) => r.name),
        leader: rows.findIndex((r) => r.row === leaderRow),
    };
}

/** Validates a registration form against the programme's own format. */
export async function parseRegistration(
    values: Record<string, string>,
): Promise<ParsedRegistration> {
    const id = z.uuid().safeParse(values.programmeId);
    if (!id.success) return { ok: false, programme: null, errors: { form: "invalid" } };

    const { data: programme, error } = await db()
        .from("programmes")
        .select(PROGRAMME_COLUMNS)
        .eq("id", id.data)
        .maybeSingle();
    if (error) throw error;
    if (!programme) return { ok: false, programme: null, errors: { form: "invalid" } };

    if (programme.team_format === "team") {
        const { min, max } = teamLimits(programme);
        const parsed = teamRegistrationSchema(min, max).safeParse({
            programmeId: values.programmeId,
            teamName: values.teamName ?? "",
            phone: values.phone ?? "",
            notes: values.notes,
            ...readTeamForm(values),
        });
        if (!parsed.success) return { ok: false, programme, errors: fieldErrors(parsed.error) };
        const team = parsed.data;
        return {
            ok: true,
            programme,
            input: {
                name: team.teamName,
                phone: team.phone,
                age: null,
                guardianName: null,
                notes: team.notes,
                members: team.members.map((name, i) => ({
                    name,
                    role: i === team.leader ? "leader" : "member",
                })),
            },
        };
    }

    if (programme.team_format === "pair") {
        const parsed = pairRegistrationSchema.safeParse(values);
        if (!parsed.success) return { ok: false, programme, errors: fieldErrors(parsed.error) };
        const pair = parsed.data;
        return {
            ok: true,
            programme,
            input: {
                name: `${pair.brotherName} & ${pair.sisterName}`,
                phone: pair.phone,
                age: null,
                guardianName: null,
                notes: pair.notes,
                members: [
                    { name: pair.brotherName, role: "brother" },
                    { name: pair.sisterName, role: "sister" },
                ],
            },
        };
    }

    const parsed = registrationSchema.safeParse(values);
    if (!parsed.success) return { ok: false, programme, errors: fieldErrors(parsed.error) };
    return { ok: true, programme, input: { ...parsed.data, members: [] } };
}
