import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";
import { signAdminToken, verifyAdminToken } from "@/lib/session-token";
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE } from "@/constants";

// Authentication only (who is signed in). What they may do lives in `@/lib/permissions`.

/** Checks the Super Admin password from the environment. */
export function isCorrectPassword(input: string): boolean {
    // Hash both sides so the comparison is constant-time regardless of length.
    const a = createHash("sha256").update(input).digest();
    const b = createHash("sha256").update(serverEnv.adminPassword()).digest();
    return timingSafeEqual(a, b);
}

/** Signs in "superadmin" or a user id. */
export async function startAdminSession(subject: string): Promise<void> {
    const store = await cookies();
    store.set(ADMIN_COOKIE, await signAdminToken(subject), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: ADMIN_SESSION_MAX_AGE,
    });
}

export async function endAdminSession(): Promise<void> {
    (await cookies()).delete(ADMIN_COOKIE);
}

/** The signed-in subject from the session cookie ("superadmin" or a user id), or null. */
export async function readAdminSubject(): Promise<string | null> {
    return verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}
