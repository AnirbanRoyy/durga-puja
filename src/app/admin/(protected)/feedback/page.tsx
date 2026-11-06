import { AdminPermissions } from "@/components/admin/admin-permissions";
import { permissionFlags } from "@/lib/access-rules";
import { checkPermission } from "@/lib/permissions";
import { AdminTitle } from "@/components/admin/admin-bits";
import { FeedbackInbox } from "@/components/admin/feedback-inbox";
import { listFeedback } from "@/lib/queries";

export const metadata = { title: "Feedback" };

export default async function FeedbackAdminPage() {
    const target = { area: "feedback" } as const;
    const session = await checkPermission("read", target);
    const can = permissionFlags(session, target);
    const feedback = await listFeedback();
    return (
        <AdminPermissions flags={can}>
            <AdminTitle
                title="Feedback"
                description="Suggestions, complaints and kind words from visitors."
            />
            <FeedbackInbox items={feedback} />
        </AdminPermissions>
    );
}
