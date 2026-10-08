import type { Metadata, Viewport } from "next";
import { Fraunces, Hind_Siliguri, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Providers } from "@/components/layout/providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const hindSiliguri = Hind_Siliguri({
    variable: "--font-bengali",
    subsets: ["bengali", "latin"],
    weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("meta");
    return {
        title: { default: t("title"), template: `%s · ${t("title")}` },
        description: t("description"),
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
            suppressHydrationWarning
            className={`${inter.variable} ${fraunces.variable} ${hindSiliguri.variable} h-full antialiased`}
        >
            <body className="flex min-h-full flex-col">
                <NextIntlClientProvider>
                    <Providers>{children}</Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
