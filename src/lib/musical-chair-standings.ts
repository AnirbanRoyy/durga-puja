import type { MusicalChairRound } from "@/lib/database.types";
import type { MusicalChairCategory } from "@/lib/musical-chair-categories";

export type Standings = {
    /** Registered players not yet out. */
    stillIn: string[];
    /** Players out, latest first, with the place they finish in (1 = winner). */
    out: { name: string; round: number; place: number }[];
};

const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Who is still in and who is out. The k-th player out finishes in place (players - k + 1); anyone
 * typed in by the host who never registered still counts as a player.
 */
export function musicalChairStandings(
    playerNames: string[],
    rounds: Pick<MusicalChairRound, "round_no" | "eliminated_name">[],
): Standings {
    const eliminated = rounds
        .filter((r) => r.eliminated_name?.trim())
        .sort((a, b) => a.round_no - b.round_no)
        .map((r) => ({ name: r.eliminated_name!.trim(), round: r.round_no }));
    const outKeys = new Set(eliminated.map((e) => key(e.name)));
    const registered = new Set(playerNames.map(key));
    const extra = eliminated.filter((e) => !registered.has(key(e.name))).length;
    const total = playerNames.length + extra;
    return {
        stillIn: playerNames.filter((n) => !outKeys.has(key(n))),
        out: eliminated.map((e, i) => ({ ...e, place: total - i })).reverse(),
    };
}

/** Registered players who can still be marked out (the current round's own pick stays listed). */
export function playersStillIn(
    playerNames: string[],
    rounds: Pick<MusicalChairRound, "round_no" | "eliminated_name">[],
    currentRound?: number,
): string[] {
    const out = new Set(
        rounds
            .filter((r) => r.round_no !== currentRound && r.eliminated_name?.trim())
            .map((r) => key(r.eliminated_name!)),
    );
    return playerNames.filter((n) => !out.has(key(n)));
}

/**
 * The musical chair category the host is playing now: the category of the latest round. Before any
 * round has been played, it is the first category that has players, or null when there is none.
 */
export function liveMusicalChairCategory(
    rounds: MusicalChairRound[],
    categoriesWithPlayers: MusicalChairCategory[],
): MusicalChairCategory | null {
    let latest: MusicalChairRound | null = null;
    for (const round of rounds) {
        if (!round.category) {
            continue;
        }
        if (latest === null || round.created_at > latest.created_at) {
            latest = round;
        }
    }

    if (latest?.category) {
        return latest.category;
    }
    return categoriesWithPlayers[0] ?? null;
}
