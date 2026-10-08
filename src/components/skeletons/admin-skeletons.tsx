import { Skeleton } from "@/components/ui/skeleton";
import { DholLoader } from "@/components/loaders/dhol-loader";

/** Mirrors <AdminTitle>, with a small dhaki on the right. */
export function AdminTitleSkeleton({ back = false }: { back?: boolean }) {
    return (
        <div className="mb-8">
            {back && <Skeleton className="mb-3 h-4 w-32" />}
            <div className="flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <Skeleton className="h-9 w-56 max-w-full" />
                    <Skeleton className="mt-3 h-4 w-72 max-w-full" />
                </div>
                <DholLoader caption className="w-28 shrink-0 text-foreground sm:w-36" />
            </div>
        </div>
    );
}

function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <div className={`rounded-2xl border bg-card p-5 ${className ?? ""}`}>
            <Skeleton className="mb-4 h-6 w-32" />
            <div className="space-y-3">
                {Array.from({ length: lines }, (_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                ))}
            </div>
        </div>
    );
}

export function AdminDashboardSkeleton() {
    return (
        <>
            <AdminTitleSkeleton />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl border bg-card p-5">
                        <Skeleton className="h-10 w-16" />
                        <Skeleton className="mt-3 h-4 w-28" />
                    </div>
                ))}
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <CardSkeleton lines={6} />
                <div className="space-y-6">
                    <CardSkeleton lines={3} />
                    <CardSkeleton lines={3} />
                </div>
            </div>
        </>
    );
}

export function AdminTableSkeleton({
    rows = 6,
    cols = 4,
    back = false,
    toolbar = false,
}: {
    rows?: number;
    cols?: number;
    back?: boolean;
    toolbar?: boolean;
}) {
    return (
        <>
            <AdminTitleSkeleton back={back} />
            {toolbar && (
                <div className="mb-6 flex flex-wrap gap-2">
                    <Skeleton className="h-8 w-44" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-28" />
                </div>
            )}
            <div className="overflow-hidden rounded-2xl border bg-card">
                <div className="flex gap-4 bg-muted/50 px-4 py-3">
                    {Array.from({ length: cols }, (_, i) => (
                        <Skeleton key={i} className="h-3.5 flex-1 bg-muted-foreground/20" />
                    ))}
                </div>
                <div className="divide-y">
                    {Array.from({ length: rows }, (_, r) => (
                        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
                            {Array.from({ length: cols }, (_, c) => (
                                <Skeleton
                                    key={c}
                                    className={c === 0 ? "h-5 flex-[2]" : "h-5 flex-1"}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export function AdminFormSkeleton({
    back = false,
    fields = 8,
}: {
    back?: boolean;
    fields?: number;
}) {
    return (
        <>
            <AdminTitleSkeleton back={back} />
            <div className="grid max-w-3xl gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                    {Array.from({ length: fields }, (_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    ))}
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-20 w-full" />
                </div>
                <Skeleton className="h-10 w-40" />
            </div>
        </>
    );
}

export function AdminListSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <>
            <AdminTitleSkeleton />
            <div className="mb-4 flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-full" />
                ))}
            </div>
            <div className="space-y-3">
                {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="rounded-2xl border bg-card p-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="size-10 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-1/2" />
                                <Skeleton className="h-3.5 w-1/3" />
                            </div>
                            <Skeleton className="h-8 w-24" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

export function AdminSongsSkeleton() {
    const column = (
        <div className="space-y-4">
            <Skeleton className="h-7 w-52" />
            <div className="space-y-3 rounded-2xl border bg-card p-5">
                <Skeleton className="h-8 w-full" />
                <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-8" />
                    <Skeleton className="h-8" />
                </div>
                <Skeleton className="h-8 w-32" />
            </div>
            <div className="divide-y rounded-2xl border bg-card">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-2/3" />
                            <Skeleton className="h-3.5 w-1/3" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
    return (
        <>
            <AdminTitleSkeleton />
            <div className="grid gap-8 xl:grid-cols-2">
                {column}
                {column}
            </div>
        </>
    );
}

export function AdminGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <>
            <AdminTitleSkeleton back />
            <div className="mb-6 flex flex-wrap gap-2">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-56" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: count }, (_, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border bg-card">
                        <Skeleton className="aspect-[4/3] w-full rounded-none" />
                        <div className="space-y-2 p-3">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

export function AdminConsoleSkeleton() {
    return (
        <>
            <AdminTitleSkeleton back />
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="space-y-6">
                    <Skeleton className="h-72 rounded-3xl" />
                    <div className="flex gap-3">
                        <Skeleton className="h-14 flex-1 rounded-2xl" />
                        <Skeleton className="h-14 w-36 rounded-2xl" />
                    </div>
                    <CardSkeleton lines={1} />
                </div>
                <div className="space-y-6">
                    <CardSkeleton lines={3} />
                    <CardSkeleton lines={4} />
                </div>
            </div>
        </>
    );
}

export function AdminProgrammeSkeleton() {
    return (
        <>
            <AdminTitleSkeleton />
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 rounded-2xl" />
                ))}
            </div>
            <Skeleton className="mb-8 h-14 rounded-2xl" />
            <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
                {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ))}
            </div>
        </>
    );
}

export function AdminSettingsSkeleton() {
    return (
        <>
            <AdminTitleSkeleton />
            <div className="grid max-w-3xl gap-8">
                <CardSkeleton lines={5} />
                <CardSkeleton lines={3} />
                <CardSkeleton lines={5} />
            </div>
        </>
    );
}
