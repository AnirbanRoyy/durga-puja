"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { DESKTOP_MEDIA_QUERY } from "@/constants";
import { cn } from "@/lib/utils";

/**
 * A section whose heading folds it away: closed on phones, open on large screens, until the
 * visitor taps the heading. The breakpoint default is pure CSS, so there is no flash on load.
 */
export function CollapsibleSection({
    title,
    aside,
    children,
    className,
}: Readonly<{
    title: ReactNode;
    /** A short note on the right of the heading, always visible. */
    aside?: ReactNode;
    children: ReactNode;
    className?: string;
}>) {
    const id = useId();
    // null = follow the breakpoint; true/false once the visitor has tapped.
    const [open, setOpen] = useState<boolean | null>(null);
    const [desktop, setDesktop] = useState(false);

    useEffect(() => {
        const query = window.matchMedia(DESKTOP_MEDIA_QUERY);
        const sync = () => setDesktop(query.matches);
        sync();
        query.addEventListener("change", sync);
        return () => query.removeEventListener("change", sync);
    }, []);

    const expanded = open ?? desktop;

    return (
        <section className={className}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={id}
                    onClick={() => setOpen(!expanded)}
                    className="-mx-1 flex min-w-0 items-center gap-2 rounded-lg px-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                    <h2 className="text-2xl font-semibold">{title}</h2>
                    <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        className={cn(
                            "size-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                            open === null && "lg:rotate-180",
                            open === true && "rotate-180",
                        )}
                    />
                </button>
                {aside}
            </div>
            <div
                id={id}
                className={cn(open === null && "max-lg:hidden", open === false && "hidden")}
            >
                {children}
            </div>
        </section>
    );
}
