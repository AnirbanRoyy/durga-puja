import { AdminCard, AdminTitle } from "@/components/admin/admin-bits";
import {
    AddYouTubeSongForm,
    MusicalChairUploader,
    SongList,
} from "@/components/admin/songs-manager";
import { listSongs } from "@/lib/queries";

export const metadata = { title: "Songs" };

export default async function SongsAdminPage() {
    const [musicPage, musicalChair] = await Promise.all([
        listSongs("music_page", true),
        listSongs("musical_chair", true),
    ]);

    return (
        <>
            <AdminTitle
                title="Songs"
                description="Two separate libraries: what visitors listen to, and what plays in musical chair."
            />
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Music page (YouTube)</h2>
                    <AdminCard>
                        <AddYouTubeSongForm />
                    </AdminCard>
                    <SongList songs={musicPage} allowFeature />
                </div>
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Musical chair</h2>
                    <AdminCard>
                        <AddYouTubeSongForm pool="musical_chair" />
                    </AdminCard>
                    <AdminCard>
                        <p className="mb-3 text-sm font-medium">Or upload an MP3</p>
                        <MusicalChairUploader />
                    </AdminCard>
                    <SongList songs={musicalChair} />
                </div>
            </div>
        </>
    );
}
