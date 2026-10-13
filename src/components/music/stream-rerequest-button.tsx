"use client";

import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { RepeatIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { STREAM_REREQUEST_EVENT } from "@/constants";

/** Sends a played song back through the request form (so it uses the same checks and limit). */
export function StreamRerequestButton({
    youtubeId,
    disabled,
}: Readonly<{
    youtubeId: string;
    disabled?: boolean;
}>) {
    const t = useTranslations("stream");
    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="shrink-0 rounded-full"
            onClick={() =>
                window.dispatchEvent(
                    new CustomEvent(STREAM_REREQUEST_EVENT, {
                        detail: `https://www.youtube.com/watch?v=${youtubeId}`,
                    }),
                )
            }
        >
            <HugeiconsIcon icon={RepeatIcon} data-icon="inline-start" />
            {t("rerequest")}
        </Button>
    );
}
