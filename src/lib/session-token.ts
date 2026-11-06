import { jwtVerify, SignJWT } from "jose";
import { ADMIN_SESSION_MAX_AGE } from "@/constants";

// Shared by proxy.ts and server code; keep free of `server-only` / next/headers imports.
// The token's subject is "superadmin" or a `users.id`. Tokens from before access control (no
// subject) no longer verify, so everyone signs in again once.

const TOKEN_VERSION = 2;

function secretKey(): Uint8Array {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) {
        throw new Error("Missing environment variable ADMIN_SESSION_SECRET.");
    }
    return new TextEncoder().encode(secret);
}

export async function signAdminToken(subject: string): Promise<string> {
    return new SignJWT({ v: TOKEN_VERSION })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(subject)
        .setIssuedAt()
        .setExpirationTime(`${ADMIN_SESSION_MAX_AGE}s`)
        .sign(secretKey());
}

/** The signed-in subject ("superadmin" or a user id), or null when the token is missing or invalid. */
export async function verifyAdminToken(token: string | undefined): Promise<string | null> {
    if (!token) {
        return null;
    }
    try {
        const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
        if (payload.v !== TOKEN_VERSION || typeof payload.sub !== "string" || !payload.sub) {
            return null;
        }
        return payload.sub;
    } catch {
        return null;
    }
}
