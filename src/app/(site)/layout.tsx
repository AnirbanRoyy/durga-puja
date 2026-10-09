import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getAmbientSettings, getCurrentYear, listEditions } from "@/lib/queries";

/**
 * Cloudinary can re-encode the loop at a lower bitrate on the fly: roughly 60% fewer bytes for the
 * same background sound. Anything that isn't a plain Cloudinary audio URL is left alone.
 */
function lighterAudio(url: string | null): string | null {
    if (!url) return null;
    const marker = "res.cloudinary.com/";
    const at = url.indexOf("/video/upload/");
    if (!url.includes(marker) || at === -1) return url;
    const rest = url.slice(at + "/video/upload/".length);
    // Already has transformations (the next segment isn't a version like v123456).
    if (!/^v\d+\//.test(rest)) return url;
    return `${url.slice(0, at)}/video/upload/br_96k/${rest}`;
}

async function ambientSrc(): Promise<string | null> {
    try {
        return lighterAudio((await getAmbientSettings()).audio_url);
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
