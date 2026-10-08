import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Plain <select> styled like Input — keeps server-action forms simple (no controlled state). */
export function NativeSelect({
    options,
    className,
    ...props
}: { options: readonly string[] } & ComponentProps<"select">) {
    return (
        <select
            className={cn(
                "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm capitalize outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
                className,
            )}
            {...props}
        >
            {options.map((o) => (
                <option key={o} value={o}>
                    {o.replace("_", " ")}
                </option>
            ))}
        </select>
    );
}
