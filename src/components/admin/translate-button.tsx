"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { translateForAdmin } from "@/actions/admin/translate";
import { Button } from "@/components/ui/button";

/**
 * Fills a Bengali field from an English one. The text is only suggested: it lands in the field so
 * the organiser can read and fix it before saving.
 */
export function TranslateButton({
    getEnglish,
    onResult,
    onError,
    label = "Translate to বাংলা",
}: {
    getEnglish: () => string;
    onResult: (bengali: string) => void;
    onError?: (message: string) => void;
    label?: string;
}) {
    const [pending, start] = useTransition();
    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
                start(async () => {
                    const result = await translateForAdmin(getEnglish());
                    if (result.ok) onResult(result.text);
                    else onError?.(result.reason);
                })
            }
        >
            {pending ? "Translating…" : label}
        </Button>
    );
}

/**
 * "Translate" for plain form fields that are not React-controlled: reads the English field by id,
 * writes the suggestion into the Bengali field by id, and tells the organiser if it can't.
 */
export function FieldTranslateButton({ from, to }: { from: string; to: string }) {
    return (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <TranslateButton
                getEnglish={() =>
                    (document.getElementById(from) as HTMLInputElement | null)?.value ?? ""
                }
                onResult={(bengali) => {
                    toast.success("Bengali suggested. Please check it before saving.");
                    const el = document.getElementById(to) as
                        HTMLInputElement | HTMLTextAreaElement | null;
                    if (!el) return;
                    const proto =
                        el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
                    Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set?.call(
                        el,
                        bengali,
                    );
                    el.dispatchEvent(new Event("input", { bubbles: true }));
                }}
                onError={(message) => toast.error(message)}
            />
            <span className="text-xs text-muted-foreground">
                Left blank, it is translated automatically when you save.
            </span>
        </div>
    );
}
