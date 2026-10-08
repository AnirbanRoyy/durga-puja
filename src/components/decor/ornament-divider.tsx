import { cn } from "@/lib/utils";

/** Fading gold hairlines with a small diamond-and-dots motif in the middle. Inherits text colour. */
export function OrnamentDivider({ className }: { className?: string }) {
    return (
        <div aria-hidden className={cn("flex items-center gap-4 text-gold", className)}>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-60" />
            <svg viewBox="0 0 56 20" className="h-4 w-12 shrink-0" fill="none">
                <path d="M28 2 36 10 28 18 20 10Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M28 6.5 31.5 10 28 13.5 24.5 10Z" fill="currentColor" />
                <circle cx="12" cy="10" r="2" fill="currentColor" />
                <circle cx="44" cy="10" r="2" fill="currentColor" />
                <path d="M16 10h2.5M37.5 10H40" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-60" />
        </div>
    );
}
