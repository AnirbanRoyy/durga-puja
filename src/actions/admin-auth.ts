"use server";

import { redirect } from "next/navigation";
import { ADMIN_LOGIN_PATH, SUPER_ADMIN_USERNAME } from "@/constants";
import { hasAnyAccess, sessionFromRow } from "@/lib/access-rules";
import { endAdminSession, isCorrectPassword, startAdminSession } from "@/lib/auth";
import { dummyPasswordHash, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/validators";
import { getClientIp } from "@/lib/visitor";

const WRONG_LOGIN = "Wrong username or password.";
const NO_PORTAL_ACCESS = "You don't have access to the admin portal.";

/** The user id when the username and password match an active user, else null. */
async function verifyUserLogin(username: string, password: string): Promise<string | null> {
    const { data: user, error } = await db()
        .from("users")
        .select("id, password_hash, active")
        .eq("username", username)
        .maybeSingle();
    if (error) {
        throw error;
    }
    if (!user || !user.active) {
        // Spend the same time as a real check, so response times don't reveal which usernames exist.
        await verifyPassword(password, await dummyPasswordHash());
        return null;
    }
    const matches = await verifyPassword(password, user.password_hash);
    return matches ? user.id : null;
}

async function userHasPortalAccess(userId: string): Promise<boolean> {
    const { data, error } = await db().rpc("admin_session", { p_user_id: userId });
    if (error) {
        throw error;
    }
    return data !== null && hasAnyAccess(sessionFromRow(data));
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
    const username = String(formData.get("username") ?? "")
        .trim()
        .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const values = { username };

    if (!(await rateLimit(`admin-login:${await getClientIp()}`, 10, 900))) {
        return { ok: false, code: "Too many attempts. Try again in 15 minutes.", values };
    }
    if (!username || !password) {
        return { ok: false, code: WRONG_LOGIN, values };
    }

    let subject: string;
    if (username === SUPER_ADMIN_USERNAME) {
        if (!isCorrectPassword(password)) {
            return { ok: false, code: WRONG_LOGIN, values };
        }
        subject = SUPER_ADMIN_USERNAME;
    } else {
        const userId = await verifyUserLogin(username, password);
        if (!userId) {
            return { ok: false, code: WRONG_LOGIN, values };
        }
        if (!(await userHasPortalAccess(userId))) {
            return { ok: false, code: NO_PORTAL_ACCESS, values };
        }
        await db()
            .from("users")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", userId);
        subject = userId;
    }

    await startAdminSession(subject);
    const next = String(formData.get("next") ?? "");
    redirect(next.startsWith("/admin") && next !== ADMIN_LOGIN_PATH ? next : "/admin");
}

export async function logout() {
    await endAdminSession();
    redirect(ADMIN_LOGIN_PATH);
}
