import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { TeamMember } from "@/lib/database.types";
import { db } from "@/lib/supabase/server";

const MAX_AGE = 60 * 60 * 24 * 60;

export type MyRegistration = {
    registrationId: string;
    name: string;
    members: TeamMember[];
    phone: string;
    age: number | null;
    guardianName: string | null;
    notes: string | null;
    claimKey: string | null;
};

function cookieName(programmeId: string): string {
    return `dp_reg_${programmeId}`;
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function newEditToken(): { token: string; hash: string } {
    const token = randomBytes(24).toString("base64url");
    return { token, hash: hashToken(token) };
}

/** Remember this registration in the participant's browser. Server actions only. */
export async function rememberRegistration(
    programmeId: string,
    registrationId: string,
    token: string,
): Promise<void> {
    (await cookies()).set(cookieName(programmeId), `${registrationId}.${token}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: MAX_AGE,
    });
}

export async function forgetRegistration(programmeId: string): Promise<void> {
    (await cookies()).delete(cookieName(programmeId));
}

/** The visitor's own registration for this programme, proven by the cookie's secret; else null. */
export async function getMyRegistration(programmeId: string): Promise<MyRegistration | null> {
    const raw = (await cookies()).get(cookieName(programmeId))?.value;
    const [registrationId, token] = raw?.split(".") ?? [];
    if (!registrationId || !token) return null;

    const { data: contact } = await db()
        .from("registration_contacts")
        .select("phone, age, guardian_name, notes, edit_token_hash, claim_key")
        .eq("registration_id", registrationId)
        .eq("programme_id", programmeId)
        .maybeSingle();
    if (!contact?.edit_token_hash) return null;

    const given = Buffer.from(hashToken(token));
    const stored = Buffer.from(contact.edit_token_hash);
    if (given.length !== stored.length || !timingSafeEqual(given, stored)) return null;

    const { data: registration } = await db()
        .from("registrations")
        .select("name, members")
        .eq("id", registrationId)
        .maybeSingle();
    if (!registration) return null;

    return {
        registrationId,
        name: registration.name,
        members: registration.members,
        phone: contact.phone,
        age: contact.age,
        guardianName: contact.guardian_name,
        notes: contact.notes,
        claimKey: contact.claim_key,
    };
}
