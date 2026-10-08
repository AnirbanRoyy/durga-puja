import { AdminTitle } from "@/components/admin/admin-bits";
import { ProgrammeForm } from "@/components/admin/programme-form";

export const metadata = { title: "New programme" };

export default function NewProgrammePage() {
    return (
        <>
            <AdminTitle title="New programme" />
            <ProgrammeForm />
        </>
    );
}
