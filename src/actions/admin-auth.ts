"use server";

import { redirect } from "next/navigation";
import { endAdminSession, isCorrectPassword, startAdminSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/validators";
import { getClientIp } from "@/lib/visitor";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
    if (!(await rateLimit(`admin-login:${await getClientIp()}`, 10, 900))) {
        return { ok: false, code: "Too many attempts. Try again in 15 minutes." };
    }
    const password = String(formData.get("password") ?? "");
    if (!password || !isCorrectPassword(password)) {
        return { ok: false, code: "Wrong password." };
    }
    await startAdminSession();
    const next = String(formData.get("next") ?? "");
    redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
    await endAdminSession();
    redirect("/admin/login");
}
