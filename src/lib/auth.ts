import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";
import {
    ADMIN_COOKIE,
    ADMIN_SESSION_MAX_AGE,
    signAdminToken,
    verifyAdminToken,
} from "@/lib/session-token";

export function isCorrectPassword(input: string): boolean {
    // Hash both sides so the comparison is constant-time regardless of length.
    const a = createHash("sha256").update(input).digest();
    const b = createHash("sha256").update(serverEnv.adminPassword()).digest();
    return timingSafeEqual(a, b);
}

export async function startAdminSession(): Promise<void> {
    const store = await cookies();
    store.set(ADMIN_COOKIE, await signAdminToken(), {
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

export async function isAdmin(): Promise<boolean> {
    return verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** Call at the top of every admin server action and admin-only route handler. */
export async function requireAdmin(): Promise<void> {
    if (!(await isAdmin())) {
        throw new Error("Unauthorized");
    }
}
