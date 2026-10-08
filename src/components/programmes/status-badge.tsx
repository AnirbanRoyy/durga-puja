import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ProgrammeStatus } from "@/lib/database.types";
import type { ResultStatus } from "@/lib/programme-meta";
import { cn } from "@/lib/utils";

const STYLES: Record<ProgrammeStatus | ResultStatus, string> = {
    upcoming: "bg-secondary text-secondary-foreground",
    pending: "bg-marigold/20 text-foreground border-marigold/50",
    ongoing: "bg-marigold text-maroon animate-pulse",
    completed: "bg-success/15 text-success border-success/30",
    cancelled: "bg-muted text-muted-foreground line-through decoration-1",
};

export function StatusBadge({
    status,
    className,
}: {
    status: ProgrammeStatus | ResultStatus;
    className?: string;
}) {
    const t = useTranslations("status");
    return <Badge className={cn("border", STYLES[status], className)}>{t(status)}</Badge>;
}
