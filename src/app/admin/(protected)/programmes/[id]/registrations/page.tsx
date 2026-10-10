import { notFound } from "next/navigation";
import { AdminTitle } from "@/components/admin/admin-bits";
import { RegistrationsManager } from "@/components/admin/registrations-manager";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import { isLineupType, teamSetupOf } from "@/lib/programme-meta";
import { getProgrammeById, listRegistrationsWithPhones } from "@/lib/queries";

export const metadata = { title: "Registrations" };

export default async function RegistrationsPage(
    props: PageProps<"/admin/programmes/[id]/registrations">,
) {
    const { id } = await props.params;
    const programme = await getProgrammeById(id);
    if (!programme) notFound();
    const registrations = await listRegistrationsWithPhones(id);

    return (
        <>
            <LiveRefresh tables={["registrations"]} filter={`programme_id=eq.${id}`} />
            <AdminTitle title="Registrations" description={`${registrations.length} signed up`} />
            <RegistrationsManager
                programmeId={id}
                programmeTitle={programme.slug}
                programme={{
                    id: programme.id,
                    title: programme.title_en,
                    type: programme.type,
                    team: teamSetupOf(programme),
                }}
                lineup={isLineupType(programme.type)}
                locked={programme.order_locked}
                registrations={registrations}
            />
        </>
    );
}
