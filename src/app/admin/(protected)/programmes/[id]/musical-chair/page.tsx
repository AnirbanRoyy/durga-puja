import { notFound } from "next/navigation";
import { AdminPermissions } from "@/components/admin/admin-permissions";
import { permissionFlags } from "@/lib/access-rules";
import { checkPermission } from "@/lib/permissions";
import { AdminTitle } from "@/components/admin/admin-bits";
import { MusicalChairConsole } from "@/components/admin/musical-chair-console";
import type { PoolSong } from "@/components/admin/round-player";
import {
    getProgrammeById,
    listMusicalChairPlayers,
    listMusicalChairRequests,
    listRounds,
    listSongs,
} from "@/lib/queries";

export const metadata = { title: "Musical chair console" };

export default async function MusicalChairAdminPage(
    props: Readonly<PageProps<"/admin/programmes/[id]/musical-chair">>,
) {
    const { id } = await props.params;
    const target = { programmeId: id };
    const session = await checkPermission("read", target);
    const can = permissionFlags(session, target);
    const programme = await getProgrammeById(id);
    if (programme?.type !== "musical_chair") {
        notFound();
    }

    const [songs, library, requests, rounds, players] = await Promise.all([
        listSongs("musical_chair"),
        listSongs("music_page"),
        listMusicalChairRequests(id),
        listRounds(id),
        listMusicalChairPlayers(id),
    ]);

    return (
        <AdminPermissions flags={can}>
            <AdminTitle
                title="Musical chair console"
                description="Connect your laptop to the speakers and press Space to start a round."
            />
            <MusicalChairConsole
                programmeId={id}
                songs={songs.flatMap((s): PoolSong[] => {
                    if (s.source === "youtube" && s.youtube_id) {
                        return [
                            {
                                id: s.id,
                                title: s.title,
                                kind: "youtube",
                                ref: s.youtube_id,
                                duration: null,
                            },
                        ];
                    }
                    if (s.audio_url) {
                        return [
                            {
                                id: s.id,
                                title: s.title,
                                kind: "audio",
                                ref: s.audio_url,
                                duration: s.duration_sec,
                            },
                        ];
                    }
                    return [];
                })}
                library={library.flatMap((s) =>
                    s.source === "youtube" && s.youtube_id
                        ? [{ id: s.id, title: s.title, artist: s.artist, youtubeId: s.youtube_id }]
                        : [],
                )}
                requests={requests}
                rounds={rounds}
                players={players}
            />
        </AdminPermissions>
    );
}
