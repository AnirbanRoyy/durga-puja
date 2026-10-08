"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, QrCodeIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NAV_LINKS } from "@/components/layout/nav-links";
import { cn } from "@/lib/utils";

const DESKTOP_KEYS = new Set(["programmes", "timeline", "music", "results", "about"]);

function isActive(pathname: string, href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader() {
    const t = useTranslations("nav");
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
                <Link href="/" className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-full bg-primary font-heading text-lg text-primary-foreground shadow-md shadow-primary/30">
                        দু
                    </span>
                    <span className="leading-tight">
                        <span className="block font-heading text-base font-semibold">
                            {t("brand")}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                            {t("tagline")}
                        </span>
                    </span>
                </Link>

                <nav className="ml-auto hidden items-center gap-1 lg:flex">
                    {NAV_LINKS.filter((l) => DESKTOP_KEYS.has(l.key)).map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
                                isActive(pathname, link.href) &&
                                    "bg-secondary text-secondary-foreground",
                            )}
                        >
                            {t(link.key)}
                        </Link>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-1.5 lg:ml-2">
                    <LocaleToggle />
                    <ThemeToggle />
                    <Button asChild size="lg" className="hidden rounded-full sm:inline-flex">
                        <Link href="/donate">
                            <HugeiconsIcon icon={QrCodeIcon} data-icon="inline-start" />
                            {t("donate")}
                        </Link>
                    </Button>
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden"
                                aria-label={t("menu")}
                            >
                                <HugeiconsIcon icon={Menu01Icon} />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72">
                            <SheetHeader>
                                <SheetTitle className="font-heading">{t("brand")}</SheetTitle>
                            </SheetHeader>
                            <nav className="flex flex-col gap-1 px-3">
                                {NAV_LINKS.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted",
                                            isActive(pathname, link.href) &&
                                                "bg-secondary text-secondary-foreground",
                                        )}
                                    >
                                        <HugeiconsIcon
                                            icon={link.icon}
                                            className="size-4.5 text-primary"
                                        />
                                        {t(link.key)}
                                    </Link>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
            <div
                aria-hidden
                className="h-px bg-gradient-to-r from-transparent via-marigold/70 to-transparent"
            />
        </header>
    );
}
