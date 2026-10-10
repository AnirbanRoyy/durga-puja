import { AdminTitle } from "@/components/admin/admin-bits";
import { StreamConsole } from "@/components/admin/stream-console";
import { getStreamBoard, listPendingQuotaRequests } from "@/lib/queries";

export const metadata = { title: "Pandal stream" };

export default async function StreamAdminPage() {
    const [board, quotaRequests] = await Promise.all([
        getStreamBoard(),
        listPendingQuotaRequests(),
    ]);
    return (
        <>
            <AdminTitle
                title="Pandal stream"
                description="Approve the songs visitors request, then stream them to the pandal speaker."
            />
            <StreamConsole
                isStreaming={board.state.is_streaming}
                nowPlaying={board.nowPlaying}
                upNext={board.upNext}
                queue={board.queue}
                pending={board.pending}
                quotaRequests={quotaRequests}
            />
        </>
    );
}
