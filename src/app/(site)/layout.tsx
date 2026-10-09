import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getAmbientSettings, getCurrentYear, listEditions } from "@/lib/queries";

async function ambientSrc(): Promise<string | null> {
    try {
        return (await getAmbientSettings()).audio_url;
    } catch {
        // Background music is a nicety; never let it take a page down.
        return null;
    }
}

async function yearsInfo(): Promise<{ years: number[]; currentYear: number } | null> {
    try {
        const [editions, currentYear] = await Promise.all([listEditions(), getCurrentYear()]);
        return { years: editions.map((e) => e.year), currentYear };
    } catch {
        return null;
    }
}

/** Only the music button and year pill need the database, so the header paints right away. */
async function HeaderWithData() {
    const [src, years] = await Promise.all([ambientSrc(), yearsInfo()]);
    return <SiteHeader ambientSrc={src} years={years} />;
}

export default function SiteLayout({ children }: LayoutProps<"/">) {
    return (
        <>
            <Suspense fallback={<SiteHeader />}>
                <HeaderWithData />
            </Suspense>
            <main className="flex-1">{children}</main>
            <SiteFooter />
        </>
    );
}
