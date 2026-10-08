import type { ReactNode } from "react";
import { Alpana } from "@/components/decor/alpana";
import { cn } from "@/lib/utils";

export function PageHeader({
    eyebrow,
    title,
    description,
    children,
    className,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn("bg-puja-radial relative overflow-hidden border-b", className)}>
            <Alpana className="absolute -top-28 -right-28 size-96 animate-spin-slow text-marigold/25" />
            <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-12">
                {eyebrow && (
                    <p className="text-sm font-semibold tracking-widest text-primary uppercase">
                        {eyebrow}
                    </p>
                )}
                <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{title}</h1>
                {description && (
                    <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
                        {description}
                    </p>
                )}
                {children && <div className="mt-6">{children}</div>}
            </div>
        </section>
    );
}
