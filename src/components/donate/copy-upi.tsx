"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, SmartPhone01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

export function CopyUpi({ upiId, upiLink }: { upiId: string; upiLink: string }) {
    const t = useTranslations("donate");
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(upiId);
            setCopied(true);
            toast.success(t("copied"));
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(t("copyFailed"));
        }
    }

    return (
        <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border bg-card p-2 pl-4">
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{t("upiId")}</p>
                    <p className="truncate font-mono font-semibold">{upiId}</p>
                </div>
                <Button variant="secondary" onClick={copy} className="rounded-xl">
                    <HugeiconsIcon
                        icon={copied ? Tick02Icon : Copy01Icon}
                        data-icon="inline-start"
                    />
                    {copied ? t("copied") : t("copy")}
                </Button>
            </div>
            {/* UPI deep links only work on phones with a UPI app installed. */}
            <Button asChild size="lg" className="h-11 w-full rounded-full md:hidden">
                <a href={upiLink}>
                    <HugeiconsIcon icon={SmartPhone01Icon} data-icon="inline-start" />
                    {t("payWithApp")}
                </a>
            </Button>
        </div>
    );
}
