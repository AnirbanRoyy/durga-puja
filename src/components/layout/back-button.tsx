"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { hasInAppHistory } from "@/lib/nav-history";
import { cn } from "@/lib/utils";

/** The page above this one, used when there is no previous page inside the site to return to. */
function parentPath(pathname: string): string {
    const parts = pathname.split("/").filter(Boolean);
    return parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : "/";
}

/** A "‹" that returns to the previous page, or to the parent page when the visitor arrived directly. */
export function BackButton({ className }: { className?: string }) {
    const t = useTranslations("nav");
    const router = useRouter();
    const pathname = usePathname();

    function goBack() {
        if (hasInAppHistory()) router.back();
        else router.push(parentPath(pathname));
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
