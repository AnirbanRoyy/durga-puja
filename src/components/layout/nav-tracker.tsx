"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordNavigation } from "@/lib/nav-history";

/** Renders nothing; counts route changes so the back button knows whether there is a page to go back to. */
export function NavTracker() {
    const pathname = usePathname();
    const previous = useRef(pathname);
    useEffect(() => {
        if (previous.current !== pathname) {
            recordNavigation(previous.current);
            previous.current = pathname;
        }
    }, [pathname]);
    return null;
}
