import { checkPermission } from "@/lib/permissions";
import { AdminTitle } from "@/components/admin/admin-bits";
import { ProgrammeForm } from "@/components/admin/programme-form";

export const metadata = { title: "New programme" };

export default async function NewProgrammePage() {
    await checkPermission("create", { area: "all_programmes" });
    return (
        <>
            <AdminTitle title="New programme" />
            <ProgrammeForm />
        </>
    );
}
