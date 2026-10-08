import { cn } from "@/lib/utils";

/**
 * Stylised "trinayan" — the three eyes of Maa Durga as painted on protima faces:
 * long almond eyes with swept tails, arched brows, and the vertical third eye.
 */
export function Trinayan({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 420 230" aria-hidden className={cn("pointer-events-none", className)}>
            <defs>
                <radialGradient id="tn-iris" cx="50%" cy="45%" r="55%">
                    <stop offset="0%" stopColor="var(--gold)" />
                    <stop offset="70%" stopColor="var(--maroon)" />
                    <stop offset="100%" stopColor="#1a0505" />
                </radialGradient>
                <linearGradient id="tn-third" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--sindoor)" />
                    <stop offset="100%" stopColor="var(--marigold)" />
                </linearGradient>
            </defs>

            {/* Third eye */}
            <g transform="translate(210 58)">
                <path
                    d="M0 -40 C 16 -22, 16 22, 0 40 C -16 22, -16 -22, 0 -40 Z"
                    fill="var(--kash)"
                    stroke="currentColor"
                    strokeWidth="4"
                />
                <ellipse rx="7" ry="13" fill="url(#tn-third)" />
                <ellipse rx="2.5" ry="5" fill="#1a0505" />
            </g>

            {/* Brows */}
            <path
                d="M40 112 C 90 70, 150 66, 190 92"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
            />
            <path
                d="M380 112 C 330 70, 270 66, 230 92"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
            />

            {/* Left eye */}
            <g>
                <path
                    d="M18 150 C 70 104, 150 100, 192 140 C 150 172, 80 176, 18 150 Z"
                    fill="var(--kash)"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinejoin="round"
                />
                <path
                    d="M18 150 L 2 140"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                />
                <circle cx="120" cy="138" r="24" fill="url(#tn-iris)" />
                <circle cx="120" cy="138" r="9" fill="#1a0505" />
                <circle cx="128" cy="130" r="4" fill="white" opacity="0.9" />
            </g>

            {/* Right eye */}
            <g>
                <path
                    d="M402 150 C 350 104, 270 100, 228 140 C 270 172, 340 176, 402 150 Z"
                    fill="var(--kash)"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinejoin="round"
                />
                <path
                    d="M402 150 L 418 140"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                />
                <circle cx="300" cy="138" r="24" fill="url(#tn-iris)" />
                <circle cx="300" cy="138" r="9" fill="#1a0505" />
                <circle cx="308" cy="130" r="4" fill="white" opacity="0.9" />
            </g>

            {/* Nose tip and bindi dots */}
            <path
                d="M210 150 C 204 180, 200 196, 214 204"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
            />
            {[0, 1, 2, 3, 4].map((i) => (
                <circle
                    key={i}
                    cx={210 + (i - 2) * 16}
                    cy={112 + Math.abs(i - 2) * 4}
                    r="3"
                    fill="var(--sindoor)"
                />
            ))}
        </svg>
    );
}
