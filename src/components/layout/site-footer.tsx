import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Alpana } from "@/components/decor/alpana";
import { OrnamentDivider } from "@/components/decor/ornament-divider";
import { NAV_LINKS } from "@/components/layout/nav-links";

export async function SiteFooter() {
    const t = await getTranslations("footer");
    const nav = await getTranslations("nav");

    return (
        <footer className="relative mt-24 overflow-hidden bg-maroon text-kash">
            <OrnamentDivider className="relative mx-auto max-w-6xl px-4 pt-8" />
            <Alpana className="absolute -right-24 -bottom-24 size-80 text-gold/15" />
            <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
                <div>
                    <p className="font-heading text-2xl">{t("blessing")}</p>
                    <p className="mt-3 max-w-xs text-sm text-kash/70">{t("about")}</p>
                </div>
                <nav className="grid grid-cols-2 gap-2 text-sm">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-kash/80 hover:text-gold"
                        >
                            {nav(link.key)}
                        </Link>
                    ))}
                </nav>
                <div className="text-sm text-kash/70">
                    <p>{t("madeWith")}</p>
                    <Link
                        href="/admin"
                        className="mt-4 inline-block text-xs text-kash/40 hover:text-kash/70"
                    >
                        {t("organisers")}
                    </Link>
                </div>
            </div>
        </footer>
    );
}
