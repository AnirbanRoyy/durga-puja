import type { Metadata, Viewport } from "next";
import { Fraunces, Hind_Siliguri, Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextIntlClientProvider } from "next-intl";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Providers } from "@/components/layout/providers";
import { getEventSettings } from "@/lib/queries";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const hindSiliguri = Hind_Siliguri({
    variable: "--font-bengali",
    subsets: ["bengali", "latin"],
    weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
    const [t, locale, format, event] = await Promise.all([
        getTranslations("meta"),
        getLocale(),
        getFormatter(),
        getEventSettings().catch(() => null),
    ]);
    const day = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short" });
    const values = {
        year: format.number(event?.year ?? new Date().getFullYear(), { useGrouping: false }),
        start: event ? day(event.shashthi) : "",
        end: event ? day(event.dashami) : "",
    };
    const title = t("title", values);
    const description = t("description", values);
    return {
        metadataBase: new URL(SITE_URL),
        title: { default: title, template: `%s · ${t("siteName")}` },
        description,
        keywords: t("keywords", values)
            .split(",")
            .map((k) => k.trim()),
        applicationName: t("siteName"),
        alternates: { canonical: "./" },
        openGraph: {
            type: "website",
            siteName: t("siteName"),
            title,
            description,
            url: "./",
            locale: locale === "bn" ? "bn_IN" : "en_IN",
            alternateLocale: locale === "bn" ? ["en_IN"] : ["bn_IN"],
        },
        twitter: { card: "summary_large_image", title, description },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-image-preview": "large",
                "max-snippet": -1,
            },
        },
        // The site has its own EN/বাং toggle, so stop Chrome offering to translate it.
        other: { google: "notranslate" },
        category: "events",
    };
}

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#B91C1C" },
        { media: "(prefers-color-scheme: dark)", color: "#2a0a0d" },
    ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
    const locale = await getLocale();
    return (
        <html
            lang={locale}
            translate="no"
            suppressHydrationWarning
            className={`${inter.variable} ${fraunces.variable} ${hindSiliguri.variable} h-full antialiased`}
        >
            <body className="flex min-h-full flex-col">
                <NextIntlClientProvider>
                    <Providers>{children}</Providers>
                </NextIntlClientProvider>
                <SpeedInsights />
            </body>
        </html>
    );
}
