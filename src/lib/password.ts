import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Stored as `scrypt$N$r$p$salt$hash` (salt and hash in base64), so the cost can be raised later
// without breaking existing passwords.

const COST = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function deriveKey(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, KEY_LENGTH, options, (error, key) => {
            if (error) {
                reject(error);
            } else {
                resolve(key);
            }
        });
    });
}

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const key = await deriveKey(password, salt, COST);
    return ["scrypt", COST.N, COST.r, COST.p, salt.toString("base64"), key.toString("base64")].join(
        "$",
    );
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") {
        return false;
    }
    const [, n, r, p, saltText, hashText] = parts;
    const expected = Buffer.from(hashText, "base64");
    if (expected.length !== KEY_LENGTH) {
        return false;
    }
    try {
        const key = await deriveKey(password, Buffer.from(saltText, "base64"), {
            N: Number(n),
            r: Number(r),
            p: Number(p),
        });
        return timingSafeEqual(key, expected);
    } catch {
        return false;
    }
}

/** A real hash of a random password, so failed sign-ins for unknown users take as long as wrong passwords. */
let dummyHash: Promise<string> | null = null;
export function dummyPasswordHash(): Promise<string> {
    if (!dummyHash) {
        dummyHash = hashPassword(randomBytes(16).toString("hex"));
    }
    return dummyHash;
}
