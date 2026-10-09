"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Archive02Icon, ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * The year pill in the header. Shows the year being viewed (this year, or an archived year)
 * and lets visitors jump to any earlier Puja.
 */
export function YearSwitcher({
    years,
    currentYear,
    className,
    onNavigate,
}: {
    years: number[];
    currentYear: number;
    className?: string;
    /** Called after a year is picked, e.g. to close the mobile menu. */
    onNavigate?: () => void;
}) {
    const t = useTranslations("archive");
    const format = useFormatter();
    const pathname = usePathname();
    const archived = /^\/archive\/(\d{4})/.exec(pathname);
    const viewing = archived ? Number(archived[1]) : currentYear;
    const isPast = viewing !== currentYear;
    const label = (year: number) => format.number(year, { useGrouping: false });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={t("pickYear")}
                className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold tabular-nums transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                    isPast
                        ? "border-marigold bg-marigold/20 text-foreground"
                        : "border-primary/30 text-primary",
                    className,
                )}
            >
                {isPast && <HugeiconsIcon icon={Archive02Icon} className="size-3.5" />}
                {label(viewing)}
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
                <DropdownMenuLabel>{t("pickYear")}</DropdownMenuLabel>
                {years.map((year) => (
                    <DropdownMenuItem key={year} asChild>
                        <Link
                            href={year === currentYear ? "/" : `/archive/${year}`}
                            onClick={onNavigate}
                            className="flex items-center justify-between gap-3 tabular-nums"
                        >
                            <span>
                                {label(year)}
                                {year === currentYear && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        {t("thisYear")}
                                    </span>
                                )}
                            </span>
                            {year === viewing && (
                                <HugeiconsIcon icon={Tick02Icon} className="size-4 text-primary" />
                            )}
                        </Link>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/archive" onClick={onNavigate} className="flex items-center gap-2">
                        <HugeiconsIcon icon={Archive02Icon} className="size-4" />
                        {t("allYears")}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
