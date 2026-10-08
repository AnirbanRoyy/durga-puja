import { cn } from "@/lib/utils";

const SKIN = "#c47a45";
const INK = "#2a0a0d";
const KURTA = "#fbf1d9";
const WOOD = "#8a3f14";
const GOLD = "#e0a82e";

/**
 * A dhaki beating a dhol — the loading indicator. Server-component friendly (no hooks), so it can
 * sit in loading.tsx files that Next.js prefetches. Animation lives in globals.css (.dhol-*).
 */
export function DholLoader({
    className,
    caption = false,
}: {
    className?: string;
    /** Bilingual caption; leave off where space is tight. */
    caption?: boolean;
}) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={cn("flex flex-col items-center", className)}
        >
            <svg viewBox="0 0 160 150" className="w-full" aria-hidden>
                {/* ground shadow */}
                <ellipse cx="80" cy="146" rx="36" ry="4" fill="currentColor" opacity="0.12" />

                {/* legs (dhoti) and feet */}
                <path
                    d="M63 104 61 141H75L79 108Z"
                    fill={KURTA}
                    stroke={INK}
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
                <path
                    d="M97 104 99 141H85L81 108Z"
                    fill={KURTA}
                    stroke={INK}
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
                <ellipse
                    cx="67"
                    cy="144"
                    rx="9"
                    ry="3.5"
                    fill={SKIN}
                    stroke={INK}
                    strokeWidth="1.5"
                />
                <ellipse
                    cx="93"
                    cy="144"
                    rx="9"
                    ry="3.5"
                    fill={SKIN}
                    stroke={INK}
                    strokeWidth="1.5"
                />

                <g className="dhol-sway">
                    {/* torso in a kurta, with a red gamchha across the shoulder */}
                    <path
                        d="M58 58Q80 51 102 58L98 107H62Z"
                        fill={KURTA}
                        stroke={INK}
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M60 59 76 56 98 92 92 98Z"
                        fill="var(--sindoor)"
                        opacity="0.9"
                        stroke={INK}
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                    />

                    {/* neck + head */}
                    <rect
                        x="75.5"
                        y="46"
                        width="9"
                        height="9"
                        rx="2"
                        fill={SKIN}
                        stroke={INK}
                        strokeWidth="1.5"
                    />
                    <circle cx="80" cy="38" r="12.5" fill={SKIN} stroke={INK} strokeWidth="2" />
                    <circle cx="75.2" cy="38" r="1.4" fill={INK} />
                    <circle cx="84.8" cy="38" r="1.4" fill={INK} />
                    <path
                        d="M73 44Q80 48 87 44"
                        fill="none"
                        stroke={INK}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <path
                        d="M74.5 41.5Q80 43 85.5 41.5"
                        fill="none"
                        stroke={INK}
                        strokeWidth="1.4"
                        strokeLinecap="round"
                    />
                    {/* pheta (turban) with a trailing end */}
                    <path
                        d="M66 35Q67 20 80 19Q93 20 94 35Q80 28 66 35Z"
                        fill="var(--sindoor)"
                        stroke={INK}
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M92 30q11 2 9 14"
                        fill="none"
                        stroke="var(--sindoor)"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    <circle cx="80" cy="25" r="2.4" fill={GOLD} stroke={INK} strokeWidth="1" />

                    {/* straps from the neck to the dhol */}
                    <path d="M72 57 42 80" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
                    <path d="M88 57 118 80" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />

                    {/* the dhol: barrel, rope lacing, two heads */}
                    <path
                        d="M42 74Q80 65 118 74V106Q80 115 42 106Z"
                        fill={WOOD}
                        stroke={INK}
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    {[50, 61, 72, 83, 94, 105].map((x) => (
                        <path
                            key={x}
                            d={`M${x} 71.5 ${x + 6} 109`}
                            stroke={GOLD}
                            strokeWidth="1.6"
                            strokeLinecap="round"
                        />
                    ))}
                    <ellipse
                        cx="42"
                        cy="90"
                        rx="6"
                        ry="17"
                        fill={KURTA}
                        stroke={INK}
                        strokeWidth="2"
                    />
                    <ellipse
                        cx="118"
                        cy="90"
                        rx="6"
                        ry="17"
                        fill={KURTA}
                        stroke={INK}
                        strokeWidth="2"
                    />

                    {/* sound arcs that flash when a head is struck */}
                    <g
                        className="dhol-wave-left"
                        fill="none"
                        stroke={GOLD}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    >
                        <path d="M33 80Q28 90 33 100" />
                        <path d="M27 76Q20 90 27 104" />
                    </g>
                    <g
                        className="dhol-wave-right"
                        fill="none"
                        stroke={GOLD}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    >
                        <path d="M127 80Q132 90 127 100" />
                        <path d="M133 76Q140 90 133 104" />
                    </g>

                    {/* left arm: thin stick */}
                    <g className="dhol-arm-left">
                        <path
                            d="M60 62 46 88"
                            stroke={KURTA}
                            strokeWidth="9"
                            strokeLinecap="round"
                        />
                        <path
                            d="M60 62 46 88"
                            stroke={INK}
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            opacity="0.5"
                        />
                        <path
                            d="M46 89 29 72"
                            stroke={GOLD}
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <circle cx="46" cy="89" r="5" fill={SKIN} stroke={INK} strokeWidth="1.5" />
                    </g>
                    {/* right arm: thick curved dagra */}
                    <g className="dhol-arm-right">
                        <path
                            d="M100 62 114 88"
                            stroke={KURTA}
                            strokeWidth="9"
                            strokeLinecap="round"
                        />
                        <path
                            d="M100 62 114 88"
                            stroke={INK}
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            opacity="0.5"
                        />
                        <path
                            d="M114 89 131 72"
                            stroke={GOLD}
                            strokeWidth="4.5"
                            strokeLinecap="round"
                        />
                        <circle cx="114" cy="89" r="5" fill={SKIN} stroke={INK} strokeWidth="1.5" />
                    </g>
                </g>
            </svg>
            {caption ? (
                <p className="mt-1 text-center text-xs font-medium whitespace-nowrap text-muted-foreground sm:text-sm">
                    Loading…
                    <span className="hidden text-muted-foreground/70 sm:inline"> · লোড হচ্ছে…</span>
                </p>
            ) : (
                <span className="sr-only">Loading</span>
            )}
        </div>
    );
}

/**
 * Tiny drum for buttons and toasts — replaces the spinning circle. Uses currentColor so it takes
 * the button's text colour.
 */
export function DholSpinner({ className, ...props }: React.ComponentProps<"svg">) {
    return (
        <svg
            viewBox="0 0 24 24"
            role="status"
            aria-label="Loading"
            className={cn("size-4 shrink-0", className)}
            {...props}
        >
            <path d="M3 11Q12 8.5 21 11V19Q12 21.5 3 19Z" fill="currentColor" opacity="0.9" />
            <path
                d="M7 10.2 8.2 20.6M12 9.8V21M17 10.2 15.8 20.6"
                stroke="var(--background)"
                strokeWidth="1"
                opacity="0.55"
            />
            <ellipse cx="3" cy="15" rx="1.6" ry="4.2" fill="currentColor" />
            <ellipse cx="21" cy="15" rx="1.6" ry="4.2" fill="currentColor" />
            <path
                className="dhol-mini-left"
                d="M7 5 4 1.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                className="dhol-mini-right"
                d="M17 5 20 1.5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
            />
        </svg>
    );
}
