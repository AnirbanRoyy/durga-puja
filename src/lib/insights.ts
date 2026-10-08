import "server-only";
import type { Programme, Result } from "@/lib/database.types";
import {
    countVotes,
    listDrawings,
    listRegistrations,
    listResults,
    listRounds,
} from "@/lib/queries";

export type Insight = { key: string; value: number | string };
export type LeaderboardEntry = {
    position: number;
    name: string;
    score: string | null;
    remark: string | null;
};

/** Builds the stats cards and leaderboard shown on a completed programme's results page. */
export async function buildInsights(
    programme: Programme,
): Promise<{ insights: Insight[]; leaderboard: LeaderboardEntry[] }> {
    const [registrations, results] = await Promise.all([
        listRegistrations(programme.id),
        listResults(programme.id),
    ]);
    const insights: Insight[] = [];
    let leaderboard: LeaderboardEntry[] = results.map(toEntry);

    if (programme.starts_at && programme.ends_at) {
        const minutes = Math.round(
            (new Date(programme.ends_at).getTime() - new Date(programme.starts_at).getTime()) /
                60000,
        );
        if (minutes > 0) insights.push({ key: "duration", value: minutes });
    }

    switch (programme.type) {
        case "musical_chair": {
            const rounds = await listRounds(programme.id);
            insights.unshift({ key: "participants", value: registrations.length });
            insights.push({ key: "rounds", value: rounds.length });
            insights.push({
                key: "songsPlayed",
                value: new Set(rounds.map((r) => r.song_title).filter(Boolean)).size,
            });
            // Without manual results, the last players eliminated rank highest.
            if (leaderboard.length === 0) {
                const eliminated = rounds.filter((r) => r.eliminated_name).reverse();
                leaderboard = eliminated.slice(0, 10).map((r, i) => ({
                    position: i + 2,
                    name: r.eliminated_name!,
                    score: null,
                    remark: null,
                }));
            }
            break;
        }
        case "drawing": {
            const [drawings, votes] = await Promise.all([
                listDrawings(programme.id),
                countVotes(programme.id),
            ]);
            insights.unshift({ key: "entries", value: drawings.length });
            insights.push({ key: "votes", value: votes });
            if (leaderboard.length === 0) {
                leaderboard = [...drawings]
                    .sort(
                        (a, b) =>
                            b.vote_count - a.vote_count ||
                            (a.last_vote_at ?? "").localeCompare(b.last_vote_at ?? ""),
                    )
                    .slice(0, 10)
                    .map((d, i) => ({
                        position: i + 1,
                        name: d.child_name,
                        score: String(d.vote_count),
                        remark: d.title,
                    }));
            }
            break;
        }
        case "singing":
        case "dance": {
            insights.unshift({ key: "participants", value: registrations.length });
            insights.push({
                key: "performed",
                value: registrations.filter((r) => r.performance_status === "done").length,
            });
            insights.push({
                key: "absent",
                value: registrations.filter((r) => r.performance_status === "absent").length,
            });
            break;
        }
        default:
            insights.unshift({ key: "participants", value: registrations.length });
    }

    return { insights, leaderboard };
}

function toEntry(r: Result): LeaderboardEntry {
    return { position: r.position, name: r.name, score: r.score, remark: r.remark };
}
