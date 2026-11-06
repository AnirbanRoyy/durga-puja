import { AdminPermissions } from "@/components/admin/admin-permissions";
import { permissionFlags } from "@/lib/access-rules";
import { checkPermission } from "@/lib/permissions";
import { AdminTitle } from "@/components/admin/admin-bits";
import { StreamConsole } from "@/components/admin/stream-console";
import { getStreamBoard, listPendingQuotaRequests, listSongs } from "@/lib/queries";

export const metadata = { title: "Pandal stream" };

export default async function StreamAdminPage() {
    const target = { area: "stream" } as const;
    const session = await checkPermission("read", target);
    const can = permissionFlags(session, target);
    const [board, quotaRequests, songs] = await Promise.all([
        getStreamBoard(),
        listPendingQuotaRequests(),
        listSongs("music_page"),
    ]);
    const library = songs.flatMap((s) =>
        s.source === "youtube" && s.youtube_id
            ? [{ id: s.id, title: s.title, artist: s.artist, youtubeId: s.youtube_id }]
            : [],
    );
    return (
        <AdminPermissions flags={can}>
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
                library={library}
            />
        </AdminPermissions>
    );
}
