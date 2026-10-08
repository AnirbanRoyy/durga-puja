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

export default async function SiteLayout({ children }: LayoutProps<"/">) {
    return (
        <>
            <SiteHeader ambientSrc={await ambientSrc()} />
            <main className="flex-1">{children}</main>
            <SiteFooter />
        </>
    );
}
