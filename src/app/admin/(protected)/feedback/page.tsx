import { AdminTitle } from "@/components/admin/admin-bits";
import { FeedbackInbox } from "@/components/admin/feedback-inbox";
import { listFeedback } from "@/lib/queries";

export const metadata = { title: "Feedback" };

export default async function FeedbackAdminPage() {
    const feedback = await listFeedback();
    return (
        <>
            <AdminTitle
                title="Feedback"
                description="Suggestions, complaints and kind words from visitors."
            />
            <FeedbackInbox items={feedback} />
        </>
    );
}
