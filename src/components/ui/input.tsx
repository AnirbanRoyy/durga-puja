"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "cn";
import { CLEARABLE_INPUT_TYPES } from "@/constants";

const inputClass =
    "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
    if (!CLEARABLE_INPUT_TYPES.has(type) || props.disabled || props.readOnly) {
        return (
            <input type={type} data-slot="input" className={cn(inputClass, className)} {...props} />
        );
    }
    return <ClearableInput className={className} type={type} {...props} />;
}

/**
 * A text input with an X that empties it in one tap. The caller's className goes on the wrapper
 * (text inputs only pass layout classes such as widths or `hidden sm:block`).
 */
function ClearableInput({ className, ref, onChange, ...props }: React.ComponentProps<"input">) {
    const t = useTranslations("forms");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const controlled = props.value !== undefined;
    const [typed, setTyped] = React.useState(() => String(props.defaultValue ?? "") !== "");
    const hasText = controlled ? String(props.value ?? "") !== "" : typed;

    const setRefs = React.useCallback(
        (node: HTMLInputElement | null) => {
            inputRef.current = node;
            if (typeof ref === "function") {
                return ref(node);
            }
            if (ref) {
                ref.current = node;
            }
        },
        [ref],
    );

    // React resets action forms after they submit; pick up the value the input reset to.
    React.useEffect(() => {
        const form = inputRef.current?.form;
        if (!form || controlled) {
            return;
        }
        const onReset = () => setTimeout(() => setTyped(Boolean(inputRef.current?.value)), 0);
        form.addEventListener("reset", onReset);
        return () => form.removeEventListener("reset", onReset);
    }, [controlled]);

    const clear = () => {
        const input = inputRef.current;
        if (!input) {
            return;
        }
        // Set the value the way typing does, so React's onChange runs and controlled parents update.
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
    };

    return (
        <div data-slot="input-wrapper" className={cn("relative w-full min-w-0", className)}>
            <input
                ref={setRefs}
                data-slot="input"
                className={cn(inputClass, "pr-8")}
                onChange={(e) => {
                    setTyped(e.target.value !== "");
                    onChange?.(e);
                }}
                {...props}
            />
            {hasText && (
                <button
                    type="button"
                    aria-label={t("clear")}
                    title={t("clear")}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={clear}
                >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </button>
            )}
        </div>
    );
}

export { Input };
