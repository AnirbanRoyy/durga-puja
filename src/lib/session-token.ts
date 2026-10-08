import { jwtVerify, SignJWT } from "jose";

// Shared by proxy.ts and server code; keep free of `server-only` / next/headers imports.

export const ADMIN_COOKIE = "dp_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function secretKey(): Uint8Array {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) {
        throw new Error("Missing environment variable ADMIN_SESSION_SECRET.");
    }
    return new TextEncoder().encode(secret);
}

export async function signAdminToken(): Promise<string> {
    return new SignJWT({ role: "admin" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${ADMIN_SESSION_MAX_AGE}s`)
        .sign(secretKey());
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
    if (!token) return false;
    try {
        const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
        return payload.role === "admin";
    } catch {
        return false;
    }
}
