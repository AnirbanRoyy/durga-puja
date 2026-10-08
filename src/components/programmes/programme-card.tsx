import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowRight01Icon,
    Clock01Icon,
    Location01Icon,
    UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { StatusBadge } from "@/components/programmes/status-badge";
import type { Programme } from "@/lib/database.types";
import { pick } from "@/lib/localize";
import { acceptsRegistrations, TYPE_ICON } from "@/lib/programme-meta";
import { cn } from "@/lib/utils";

export function ProgrammeCard({
    programme,
    registrations,
    className,
}: {
    programme: Programme;
    registrations?: number;
    className?: string;
}) {
    const t = useTranslations("programmes");
    const locale = useLocale();
    const format = useFormatter();
    const title = pick(locale, programme.title_en, programme.title_bn);
    const description = pick(locale, programme.description_en, programme.description_bn);

    return (
        <Link
            href={`/programmes/${programme.slug}`}
            className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:-translate-y-1 hover:border-marigold/60 hover:shadow-xl hover:shadow-marigold/10",
                programme.status === "cancelled" && "opacity-70",
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-sindoor to-marigold text-primary-foreground shadow-md shadow-sindoor/25">
                    <HugeiconsIcon icon={TYPE_ICON[programme.type]} className="size-6" />
                </span>
                <StatusBadge status={programme.status} />
            </div>
            <h3 className="mt-4 text-xl font-semibold">{title}</h3>
            {description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {programme.starts_at && (
                    <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                        {format.dateTime(new Date(programme.starts_at), {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                        })}
                    </span>
                )}
                {programme.venue && (
                    <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon icon={Location01Icon} className="size-3.5" />
                        {programme.venue}
                    </span>
                )}
                {registrations !== undefined && registrations > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon icon={UserGroupIcon} className="size-3.5" />
                        {t("registeredCount", { count: registrations })}
                    </span>
                )}
            </div>
            <div className="mt-auto flex items-center justify-between pt-5 text-sm font-semibold text-primary">
                <span>{acceptsRegistrations(programme) ? t("registerNow") : t("viewDetails")}</span>
                <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-4 transition-transform group-hover:translate-x-1"
                />
            </div>
        </Link>
    );
}
