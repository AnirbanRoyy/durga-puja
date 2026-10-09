import { Skeleton } from "@/components/ui/skeleton";
import { DholLoader } from "@/components/loaders/dhol-loader";
import { cn } from "@/lib/utils";

/** Mirrors <PageHeader>: eyebrow, title, description — with the dhaki where the alpana sits. */
export function PageHeaderSkeleton({ stats = false }: { stats?: boolean }) {
    return (
        <section className="bg-puja-radial relative overflow-hidden border-b">
            <div className="relative mx-auto max-w-6xl px-4 pt-14 pr-32 pb-12 sm:pr-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-4 h-10 w-3/5 max-w-sm sm:h-12" />
                <Skeleton className="mt-4 h-5 w-full max-w-xl" />
                <Skeleton className="mt-2 h-5 w-2/3 max-w-md" />
                {stats && (
                    <div className="mt-6 flex gap-3">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-16 w-24 rounded-2xl" />
                        ))}
                    </div>
                )}
                <DholLoader
                    caption
                    className="absolute right-3 bottom-1 w-28 text-foreground sm:right-8 sm:w-40 lg:w-48"
                />
            </div>
        </section>
    );
}

export function ProgrammeCardSkeleton() {
    return (
        <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between">
                <Skeleton className="size-12 rounded-xl" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-6 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <div className="mt-4 flex gap-4">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-20" />
            </div>
            <Skeleton className="mt-6 h-4 w-28" />
        </div>
    );
}

export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
    return (
        <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}>
            {Array.from({ length: count }, (_, i) => (
                <ProgrammeCardSkeleton key={i} />
            ))}
        </div>
    );
}

function TimelineGroupSkeleton({ rows }: { rows: number }) {
    return (
        <div>
            <div className="mb-4 flex items-baseline gap-3">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-4 w-20" />
            </div>
            <div className="ml-3 space-y-4 border-l-2 border-dashed border-marigold/40 pl-7">
                {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="flex gap-4 rounded-xl border bg-card p-4">
                        <Skeleton className="hidden size-10 rounded-lg sm:block" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-5 w-3/5" />
                            <Skeleton className="h-3.5 w-32" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function HomeSkeleton() {
    return (
        <>
            <section className="bg-puja-radial relative overflow-hidden border-b">
                <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-14 pb-16 text-center sm:pt-20">
                    <DholLoader caption className="w-64 text-foreground sm:w-80" />
                    <Skeleton className="mt-6 h-4 w-48" />
                    <Skeleton className="mt-5 h-16 w-80 max-w-full sm:h-24 sm:w-[28rem]" />
                    <Skeleton className="mt-5 h-5 w-full max-w-xl" />
                    <Skeleton className="mt-2 h-5 w-2/3 max-w-md" />
                    <div className="mt-8 flex gap-3">
                        {[0, 1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-[72px] w-16 rounded-xl sm:w-[72px]" />
                        ))}
                    </div>
                    <div className="mt-10 flex gap-3">
                        <Skeleton className="h-11 w-44 rounded-full" />
                        <Skeleton className="h-11 w-44 rounded-full" />
                    </div>
                </div>
            </section>
            <section className="mx-auto max-w-6xl px-4 pt-20">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-3 h-9 w-72 max-w-full" />
                <CardGridSkeleton count={4} className="mt-8 lg:grid-cols-4" />
            </section>
            <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-20 lg:grid-cols-[1.3fr_1fr]">
                <div>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-3 mb-8 h-9 w-48" />
                    <TimelineGroupSkeleton rows={2} />
                </div>
                <Skeleton className="h-80 rounded-3xl" />
            </section>
        </>
    );
}

export function ProgrammesSkeleton() {
    return (
        <>
            <PageHeaderSkeleton />
            <div className="mx-auto max-w-6xl px-4 pt-12">
                <CardGridSkeleton count={6} />
            </div>
        </>
    );
}

export function ProgrammeDetailSkeleton() {
    return (
        <>
            <PageHeaderSkeleton />
            <div className="mx-auto max-w-6xl px-4 pt-8">
                <Skeleton className="h-8 w-36" />
                <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
                    <div className="space-y-10">
                        <div>
                            <Skeleton className="h-8 w-52" />
                            <div className="mt-5 columns-2 gap-4 sm:columns-3">
                                {[40, 52, 36, 48, 44, 56].map((h, i) => (
                                    <Skeleton
                                        key={i}
                                        className="mb-4 w-full break-inside-avoid rounded-2xl"
                                        style={{ height: `${h * 4}px` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <aside className="rounded-3xl border bg-card p-6">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="mt-3 h-4 w-3/4" />
                        <div className="mt-6 space-y-4">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-9 w-full" />
                                </div>
                            ))}
                            <Skeleton className="h-11 w-full rounded-full" />
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

export function TimelineSkeleton() {
    return (
        <>
            <PageHeaderSkeleton />
            <div className="mx-auto max-w-3xl space-y-10 px-4 pt-12">
                <TimelineGroupSkeleton rows={3} />
                <TimelineGroupSkeleton rows={2} />
                <TimelineGroupSkeleton rows={2} />
            </div>
        </>
    );
}

export function MusicSkeleton() {
    return (
        <>
            <PageHeaderSkeleton />
            <div className="mx-auto max-w-6xl space-y-10 px-4 pt-10">
                <div className="grid items-center gap-6 rounded-3xl border bg-card p-6 sm:grid-cols-[220px_1fr] sm:p-10">
                    <Skeleton className="aspect-square w-full rounded-2xl" />
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-4 w-full max-w-md" />
                        <Skeleton className="h-4 w-2/3 max-w-sm" />
                        <Skeleton className="mt-3 h-11 w-40 rounded-full" />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-9 w-24 rounded-full" />
                    ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 9 }, (_, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 rounded-2xl border bg-card p-2.5"
                        >
                            <Skeleton className="size-16 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3.5 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export function ResultsSkeleton() {
    return (
        <>
            <PageHeaderSkeleton stats />
            <div className="mx-auto max-w-4xl space-y-3 px-4 pt-10">
                {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
                        <Skeleton className="size-11 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-1/2" />
                            <Skeleton className="h-3.5 w-28" />
                        </div>
                        <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                ))}
            </div>
        </>
    );
}

export function ResultDetailSkeleton() {
    return (
        <>
            <PageHeaderSkeleton />
            <div className="mx-auto max-w-4xl px-4 pt-8">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-8 h-8 w-32" />
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="rounded-2xl border bg-card p-4">
                            <Skeleton className="h-8 w-14" />
                            <Skeleton className="mt-2 h-3.5 w-20" />
                        </div>
                    ))}
                </div>
                <Skeleton className="mt-12 h-8 w-40" />
                <div className="mt-8 grid gap-3 sm:grid-cols-3 sm:items-end">
                    <Skeleton className="h-40 rounded-3xl sm:order-1" />
                    <Skeleton className="h-52 rounded-3xl sm:order-2" />
                    <Skeleton className="h-36 rounded-3xl sm:order-3" />
                </div>
                <div className="mt-6 divide-y rounded-2xl border bg-card">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-3">
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export function AboutSkeleton() {
    return (
        <>
            <PageHeaderSkeleton />
            <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-12 lg:grid-cols-[220px_1fr]">
                <div className="hidden space-y-3 lg:block">
                    <Skeleton className="h-3.5 w-24" />
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-5 w-40" />
                    ))}
                </div>
                <div className="max-w-3xl space-y-12">
                    {[0, 1, 2].map((s) => (
                        <div key={s}>
                            <Skeleton className="h-9 w-2/3" />
                            <div className="mt-5 space-y-3">
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-4/5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export function DonateSkeleton() {
    return (
        <>
            <PageHeaderSkeleton />
            <div className="mx-auto max-w-4xl px-4 pt-12">
                <div className="grid items-center gap-10 md:grid-cols-[minmax(0,340px)_1fr]">
                    <Skeleton className="mx-auto aspect-square w-full max-w-[340px] rounded-3xl" />
                    <div>
                        <Skeleton className="h-9 w-56" />
                        <div className="mt-5 space-y-4">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="size-7 rounded-full" />
                                    <Skeleton className="h-5 flex-1" />
                                </div>
                            ))}
                        </div>
                        <Skeleton className="mt-6 h-16 w-full rounded-2xl" />
                    </div>
                </div>
            </div>
        </>
    );
}

export function FeedbackSkeleton() {
    return (
        <>
            <PageHeaderSkeleton />
            <div className="mx-auto max-w-2xl px-4 pt-12">
                <div className="space-y-5 rounded-3xl border bg-card p-6 sm:p-8">
                    <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-11 rounded-xl" />
                        ))}
                    </div>
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-32 w-full" />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Skeleton className="h-9" />
                        <Skeleton className="h-9" />
                    </div>
                    <Skeleton className="h-11 w-full rounded-full" />
                </div>
            </div>
        </>
    );
}

export function CommunitySkeleton() {
    return (
        <>
            <PageHeaderSkeleton />
            <div className="mx-auto max-w-4xl px-4 pt-12">
                <div className="grid items-center gap-10 md:grid-cols-[minmax(0,340px)_1fr]">
                    <Skeleton className="mx-auto aspect-square w-full max-w-[340px] rounded-3xl" />
                    <div>
                        <Skeleton className="h-9 w-48" />
                        <div className="mt-5 space-y-4">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="size-7 rounded-full" />
                                    <Skeleton className="h-5 flex-1" />
                                </div>
                            ))}
                        </div>
                        <Skeleton className="mt-6 h-12 w-52 rounded-full" />
                        <Skeleton className="mt-10 h-6 w-36" />
                        <div className="mt-3 space-y-3">
                            {[0, 1, 2].map((i) => (
                                <Skeleton key={i} className="h-4 w-4/5" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export function ArchiveSkeleton() {
    return (
        <>
            <PageHeaderSkeleton />
            <div className="mx-auto grid max-w-5xl gap-5 px-4 pt-12 sm:grid-cols-2">
                {[0, 1].map((i) => (
                    <div key={i} className="rounded-3xl border bg-card p-6">
                        <Skeleton className="h-12 w-28" />
                        <Skeleton className="mt-3 h-5 w-40" />
                        <Skeleton className="mt-2 h-4 w-48" />
                        <div className="mt-5 grid grid-cols-3 gap-2">
                            {[0, 1, 2].map((j) => (
                                <Skeleton key={j} className="h-14 rounded-xl" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

export function ArchiveYearSkeleton() {
    return (
        <>
            <PageHeaderSkeleton stats />
            <div className="mx-auto max-w-5xl space-y-10 px-4 pt-8">
                <Skeleton className="h-12 w-full rounded-2xl" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-40 rounded-3xl" />
                    ))}
                </div>
                <div className="space-y-3">
                    {[0, 1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 rounded-2xl" />
                    ))}
                </div>
            </div>
        </>
    );
}
