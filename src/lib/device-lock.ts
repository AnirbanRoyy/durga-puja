import "server-only";
import { Redis } from "@upstash/redis";

/**
 * One registration per network address per programme, tracked in Redis as a single bit:
 * key `user:<ip>:<programme>`, bit 0 = 1 once someone from that address has registered.
 * Fails open (never blocks anyone) when Redis is not configured or is unreachable.
 */
const TTL_SECONDS = 60 * 60 * 24 * 60; // outlives the festival, then cleans itself up

let client: Redis | null | undefined;

function redis(): Redis | null {
    if (client !== undefined) return client;
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    client = url && token ? new Redis({ url, token }) : null;
    return client;
}

function lockKey(ip: string, programme: string): string {
    return `user:${ip}:${programme}`;
}

/** Atomically sets the bit. Returns false if this address had already registered. */
export async function claimDevice(ip: string, programme: string): Promise<boolean> {
    const r = redis();
    if (!r || ip === "unknown") return true;
    try {
        const key = lockKey(ip, programme);
        const previous = await r.setbit(key, 0, 1);
        if (previous === 0) await r.expire(key, TTL_SECONDS);
        return previous === 0;
    } catch (error) {
        console.error("device-lock: claim failed", error);
        return true;
    }
}

/** Clears the bit again, e.g. when the registration did not actually go through. */
export async function releaseDevice(ip: string, programme: string): Promise<void> {
    const r = redis();
    if (!r || ip === "unknown") return;
    try {
        await r.setbit(lockKey(ip, programme), 0, 0);
    } catch (error) {
        console.error("device-lock: release failed", error);
    }
}
