import { AdminTitle } from "@/components/admin/admin-bits";
import { AllRegistrations } from "@/components/admin/all-registrations";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import { teamSetupOf } from "@/lib/programme-meta";
import { getCurrentYear, listAllRegistrationsForAdmin, listEditions } from "@/lib/queries";

export const metadata = { title: "Registrations" };

export default async function AllRegistrationsPage(props: PageProps<"/admin/registrations">) {
    const { year: yearParam } = await props.searchParams;
    const [currentYear, editions] = await Promise.all([getCurrentYear(), listEditions()]);
    const requested = Number(Array.isArray(yearParam) ? yearParam[0] : yearParam);
    const year = editions.some((e) => e.year === requested) ? requested : currentYear;
    const { programmes, registrations } = await listAllRegistrationsForAdmin(year);

    return (
        <>
            <LiveRefresh tables={["registrations"]} />
            <AdminTitle
                title="Registrations"
                description="Everyone who signed up, across all programmes. Edit or delete any entry."
            />
            <AllRegistrations
                year={year}
                years={editions.map((e) => e.year)}
                programmes={programmes.map((p) => ({
                    id: p.id,
                    title: p.title_en,
                    type: p.type,
                    team: teamSetupOf(p),
                }))}
                registrations={registrations}
            />
        </>
    );
}
