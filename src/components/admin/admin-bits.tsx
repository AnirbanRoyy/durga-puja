import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminTitle({
    title,
    description,
    actions,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 className="text-3xl font-semibold">{title}</h1>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function AdminCard({
    title,
    children,
    className,
}: {
    title?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn("rounded-2xl border bg-card p-5", className)}>
            {title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
            {children}
        </section>
    );
}

export function Stat({
    label,
    value,
    hint,
}: {
    label: string;
    value: number | string;
    hint?: string;
}) {
    return (
        <div className="rounded-2xl border bg-card p-5">
            <p className="font-heading text-4xl font-semibold text-primary tabular-nums">{value}</p>
            <p className="mt-1 text-sm font-medium">{label}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}
