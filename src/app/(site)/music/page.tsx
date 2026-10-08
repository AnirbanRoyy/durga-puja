import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { MusicLibrary } from "@/components/music/music-library";
import { listSongs } from "@/lib/queries";

export async function generateMetadata() {
    const t = await getTranslations("music");
    return { title: t("title") };
}

export default async function MusicPage() {
    const [t, songs] = await Promise.all([getTranslations("music"), listSongs("music_page")]);
    const tracks = songs
        .filter((s) => s.youtube_id)
        .map((s) => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            youtubeId: s.youtube_id!,
            category: s.category,
            featured: s.featured,
        }));

    return (
        <>
            <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
            <div className="mx-auto max-w-6xl px-4 pt-10">
                <MusicLibrary tracks={tracks} />
            </div>
        </>
    );
}
