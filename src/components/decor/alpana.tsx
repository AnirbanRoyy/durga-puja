import { cn } from "@/lib/utils";

type Ring = { radius: number; petals: number; length: number; width: number };

const RINGS: Ring[] = [
    { radius: 18, petals: 8, length: 16, width: 7 },
    { radius: 44, petals: 12, length: 22, width: 9 },
    { radius: 74, petals: 16, length: 26, width: 10 },
    { radius: 104, petals: 24, length: 20, width: 7 },
];

/** Hand-drawn style alpana mandala built from concentric petal rings. */
export function Alpana({ className }: { className?: string }) {
    return (
        <svg
            viewBox="-130 -130 260 260"
            aria-hidden
            className={cn("pointer-events-none text-current", className)}
        >
            <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <circle r="8" />
                <circle r="3" fill="currentColor" />
                {RINGS.map((ring, ri) => (
                    <g key={ri}>
                        <circle r={ring.radius + ring.length + 4} strokeDasharray="2 5" />
                        {Array.from({ length: ring.petals }, (_, i) => {
                            const angle =
                                (360 / ring.petals) * i + (ri % 2 ? 360 / ring.petals / 2 : 0);
                            const r0 = ring.radius;
                            const r1 = ring.radius + ring.length;
                            const w = ring.width;
                            return (
                                <g key={i} transform={`rotate(${angle})`}>
                                    <path
                                        d={`M0 ${-r0} C ${w} ${-r0 - ring.length * 0.35}, ${w * 0.6} ${-r1 + 2}, 0 ${-r1} C ${-w * 0.6} ${-r1 + 2}, ${-w} ${-r0 - ring.length * 0.35}, 0 ${-r0} Z`}
                                    />
                                    <circle cy={-r1 - 3} r="1.6" fill="currentColor" />
                                </g>
                            );
                        })}
                    </g>
                ))}
            </g>
        </svg>
    );
}
