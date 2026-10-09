import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { Timeline } from "@/components/programmes/timeline";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import { getEventSettings, listProgrammes } from "@/lib/queries";

export async function generateMetadata() {
    const t = await getTranslations("timeline");
    return { title: t("title") };
}

export default async function TimelinePage() {
    const [t, event, programmes] = await Promise.all([
        getTranslations("timeline"),
        getEventSettings(),
        listProgrammes(),
    ]);

    return (
        <>
            <LiveRefresh tables={["programmes"]} />
            <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
            <div className="mx-auto max-w-3xl px-4 pt-12">
                <Timeline
                    programmes={programmes}
                    shashthi={event.shashthi}
                    dashami={event.dashami}
                />
            </div>
        </>
    );
}
