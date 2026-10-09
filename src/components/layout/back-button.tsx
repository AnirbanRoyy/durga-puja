"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { previousPath } from "@/lib/nav-history";
import { cn } from "@/lib/utils";

/** The page one level up in the URL hierarchy. */
function parentPath(pathname: string): string {
    const parts = pathname.split("/").filter(Boolean);
    return parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : "/";
}

/**
 * A "‹" that moves up the site hierarchy (/programmes/x/results → /programmes/x → /programmes → /).
 * When the page just before this one already is the parent, it uses the browser's back so the
 * parent reappears exactly as it was left (scroll position, filters).
 */
export function BackButton({ className }: { className?: string }) {
    const t = useTranslations("nav");
    const router = useRouter();
    const pathname = usePathname();

    function goBack() {
        const parent = parentPath(pathname);
        if (previousPath() === parent) router.back();
        else router.push(parent);
    }

    return (
        <button
            type="button"
            onClick={goBack}
            aria-label={t("back")}
            className={cn(
                "-ml-2.5 grid size-11 shrink-0 place-items-center rounded-full text-foreground transition-colors outline-none hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring active:bg-foreground/10",
                className,
            )}
        >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-6" strokeWidth={2.25} />
        </button>
    );
}
