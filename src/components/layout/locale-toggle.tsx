"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/actions/locale";
import { cn } from "@/lib/utils";

export function LocaleToggle({ className }: { className?: string }) {
    const locale = useLocale();
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    function choose(next: "en" | "bn") {
        if (next === locale) return;
        startTransition(async () => {
            await setLocale(next);
            router.refresh();
        });
    }

    return (
        <div
            role="group"
            aria-label="Language"
            className={cn(
                "inline-flex h-8 items-center rounded-full border border-gold/40 bg-card p-0.5 text-xs font-semibold",
                pending && "opacity-60",
                className,
            )}
        >
            {(
                [
                    ["en", "EN"],
                    ["bn", "বাং"],
                ] as const
            ).map(([value, label]) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => choose(value)}
                    aria-pressed={locale === value}
                    className={cn(
                        "h-full rounded-full px-2.5 transition-colors",
                        locale === value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
