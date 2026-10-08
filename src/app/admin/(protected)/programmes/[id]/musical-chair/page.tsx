import { notFound } from "next/navigation";
import { AdminTitle } from "@/components/admin/admin-bits";
import { BackLink } from "@/components/admin/back-link";
import { MusicalChairConsole } from "@/components/admin/musical-chair-console";
import { getProgrammeById, listRegistrations, listRounds, listSongs } from "@/lib/queries";

export const metadata = { title: "Musical chair console" };

export default async function MusicalChairAdminPage(
    props: PageProps<"/admin/programmes/[id]/musical-chair">,
) {
    const { id } = await props.params;
    const programme = await getProgrammeById(id);
    if (!programme || programme.type !== "musical_chair") notFound();

    const [songs, rounds, registrations] = await Promise.all([
        listSongs("musical_chair"),
        listRounds(id),
        listRegistrations(id),
    ]);

    return (
        <>
            <BackLink href={`/admin/programmes/${id}`} label={programme.title_en} />
            <AdminTitle
                title="Musical chair console"
                description="Connect your laptop to the speakers and press Space to start a round."
            />
            <MusicalChairConsole
                programmeId={id}
                songs={songs
                    .filter((s) => s.audio_url)
                    .map((s) => ({
                        id: s.id,
                        title: s.title,
                        url: s.audio_url!,
                        duration: s.duration_sec,
                    }))}
                rounds={rounds}
                playerNames={registrations.map((r) => r.name)}
            />
        </>
    );
}
