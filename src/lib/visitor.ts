import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { serverEnv } from "@/lib/env";

export const VISITOR_COOKIE = "dp_vid";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Anonymous per-browser id. proxy.ts sets it on first visit; this is the fallback. */
export async function getVisitorId(): Promise<string> {
    const store = await cookies();
    const existing = store.get(VISITOR_COOKIE)?.value;
    if (existing) return existing;
    const id = randomUUID();
    store.set(VISITOR_COOKIE, id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: ONE_YEAR,
    });
    return id;
}

function hashVisitor(visitorId: string): string {
    return createHmac("sha256", serverEnv.voterHashSecret()).update(visitorId).digest("hex");
}

/** Stable, non-reversible id stored alongside votes. Server actions only (may set a cookie). */
export async function getVoterHash(): Promise<string> {
    return hashVisitor(await getVisitorId());
}

/** Read-only variant safe for server components; null on a brand-new visitor's first request. */
export async function peekVoterHash(): Promise<string | null> {
    const id = (await cookies()).get(VISITOR_COOKIE)?.value;
    return id ? hashVisitor(id) : null;
}

export async function getClientIp(): Promise<string> {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
