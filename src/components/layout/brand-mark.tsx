import Image from "next/image";
import { cn } from "@/lib/utils";

/** The site's logo: the Durga eyes on a red circle, the same artwork as the favicon. */
export function BrandMark({
    size = 36,
    className,
    priority = false,
}: {
    size?: number;
    className?: string;
    priority?: boolean;
}) {
    return (
        <Image
            src="/brand-icon.png"
            alt=""
            width={size}
            height={size}
            priority={priority}
            className={cn("shrink-0 rounded-full shadow-md shadow-primary/30", className)}
        />
    );
}
