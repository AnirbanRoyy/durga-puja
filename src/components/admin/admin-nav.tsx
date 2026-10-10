"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowUpRight01Icon,
    Calendar03Icon,
    DashboardSquare01Icon,
    Logout01Icon,
    Message01Icon,
    MusicNote03Icon,
    PlayListIcon,
    UserGroupIcon,
    Settings01Icon,
    VolumeHighIcon,
    StarIcon,
} from "@hugeicons/core-free-icons";
import { logout } from "@/actions/admin-auth";
import { BrandMark } from "@/components/layout/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

const LINKS = [
    { href: "/admin", label: "Dashboard", icon: DashboardSquare01Icon },
    { href: "/admin/programmes", label: "Programmes", icon: StarIcon },
    { href: "/admin/registrations", label: "Registrations", icon: UserGroupIcon },
    { href: "/admin/stream", label: "Pandal stream", icon: VolumeHighIcon },
    { href: "/admin/songs", label: "Songs", icon: MusicNote03Icon },
    { href: "/admin/song-requests", label: "Song requests", icon: PlayListIcon },
    { href: "/admin/feedback", label: "Feedback", icon: Message01Icon },
    { href: "/admin/years", label: "Years", icon: Calendar03Icon },
    { href: "/admin/settings", label: "Settings", icon: Settings01Icon },
];

export function AdminNav() {
    const pathname = usePathname();
    return (
        <aside className="border-b bg-card lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
            <div className="flex items-center gap-2.5 px-4 py-4">
                <BrandMark />
                <span className="font-heading font-semibold">Puja Admin</span>
                <div className="ml-auto lg:hidden">
                    <ThemeToggle />
                </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
                {LINKS.map((link) => {
                    const active =
                        link.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(link.href);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted",
                                active && "bg-secondary text-secondary-foreground",
                            )}
                        >
                            <HugeiconsIcon icon={link.icon} className="size-4.5" />
                            {link.label}
                        </Link>
                    );
                })}
                <Link
                    href="/"
                    target="_blank"
                    className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                >
                    <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4.5" />
                    View site
                </Link>
                <form action={logout} className="lg:mt-auto">
                    <button
                        type="submit"
                        className="flex w-full shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                    >
                        <HugeiconsIcon icon={Logout01Icon} className="size-4.5" />
                        Log out
                    </button>
                </form>
            </nav>
            <div className="hidden px-4 lg:block">
                <ThemeToggle />
            </div>
        </aside>
    );
}
