import { notFound } from "next/navigation";
import { AdminPermissions } from "@/components/admin/admin-permissions";
import { permissionFlags } from "@/lib/access-rules";
import { checkPermission } from "@/lib/permissions";
import { AdminTitle } from "@/components/admin/admin-bits";
import { ResultsEditor } from "@/components/admin/results-editor";
import { getProgrammeById, listRegistrations, listResults } from "@/lib/queries";

export const metadata = { title: "Results" };

export default async function ResultsAdminPage(props: PageProps<"/admin/programmes/[id]/results">) {
    const { id } = await props.params;
    const target = { programmeId: id };
    const session = await checkPermission("read", target);
    const can = permissionFlags(session, target);
    const programme = await getProgrammeById(id);
    if (!programme) {
        notFound();
    }
    const [results, registrations] = await Promise.all([listResults(id), listRegistrations(id)]);

    return (
        <AdminPermissions flags={can}>
            <AdminTitle
                title="Results"
                description="Enter the winners. The public results page shows these plus automatic insights."
            />
            <ResultsEditor
                programmeId={id}
                completed={programme.status === "completed"}
                initial={results.map((r) => ({
                    position: r.position,
                    name: r.name,
                    score: r.score ?? "",
                    remark: r.remark ?? "",
                }))}
                names={registrations.map((r) => r.name)}
            />
        </AdminPermissions>
    );
}
