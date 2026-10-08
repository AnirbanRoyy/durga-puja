import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getAmbientSettings } from "@/lib/queries";

async function ambientSrc(): Promise<string | null> {
    try {
        return (await getAmbientSettings()).audio_url;
    } catch {
        // Background music is a nicety; never let it take a page down.
        return null;
    }
}

/** Only the music button depends on the database, so the header paints right away without it. */
async function HeaderWithAmbient() {
    return <SiteHeader ambientSrc={await ambientSrc()} />;
}

export default function SiteLayout({ children }: LayoutProps<"/">) {
    return (
        <>
            <Suspense fallback={<SiteHeader />}>
                <HeaderWithAmbient />
            </Suspense>
            <main className="flex-1">{children}</main>
            <SiteFooter />
        </>
    );
}
