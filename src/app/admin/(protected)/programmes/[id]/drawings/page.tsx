import { notFound } from "next/navigation";
import { AdminPermissions } from "@/components/admin/admin-permissions";
import { permissionFlags } from "@/lib/access-rules";
import { checkPermission } from "@/lib/permissions";
import { AdminTitle } from "@/components/admin/admin-bits";
import { DrawingsManager } from "@/components/admin/drawings-manager";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import { countVotes, getProgrammeById, listDrawings } from "@/lib/queries";

export const metadata = { title: "Drawings" };

export default async function DrawingsAdminPage(
    props: PageProps<"/admin/programmes/[id]/drawings">,
) {
    const { id } = await props.params;
    const target = { programmeId: id };
    const session = await checkPermission("read", target);
    const can = permissionFlags(session, target);
    const programme = await getProgrammeById(id);
    if (!programme) {
        notFound();
    }
    const [drawings, votes] = await Promise.all([listDrawings(id), countVotes(id)]);

    return (
        <AdminPermissions flags={can}>
            <LiveRefresh tables={["drawings"]} filter={`programme_id=eq.${id}`} />
            <AdminTitle
                title="Drawings & voting"
                description={`${drawings.length} drawings · ${votes} votes · voting is ${programme.voting_open ? "open" : "closed"}`}
            />
            <DrawingsManager
                programmeId={id}
                drawings={drawings}
                votingOpen={programme.voting_open}
            />
        </AdminPermissions>
    );
}
