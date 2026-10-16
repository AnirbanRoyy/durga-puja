import { AdminPermissions } from "@/components/admin/admin-permissions";
import { permissionFlags } from "@/lib/access-rules";
import { checkPermission } from "@/lib/permissions";
import { AdminTitle } from "@/components/admin/admin-bits";
import { SongRequestsManager } from "@/components/admin/song-requests-manager";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import { listSongRequests } from "@/lib/queries";

export const metadata = { title: "Song requests" };

export default async function SongRequestsAdminPage() {
    const target = { area: "song_requests" } as const;
    const session = await checkPermission("read", target);
    const can = permissionFlags(session, target);
    const requests = await listSongRequests(true);
    return (
        <AdminPermissions flags={can}>
            <LiveRefresh tables={["song_requests"]} />
            <AdminTitle
                title="Song requests"
                description="Most-requested first. Upload an MP3 to add a song to the musical chair pool."
            />
            <SongRequestsManager requests={requests} />
        </AdminPermissions>
    );
}
