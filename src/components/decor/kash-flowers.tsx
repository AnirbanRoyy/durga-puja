import { cn } from "@/lib/utils";

// Deterministic positions so server and client markup match.
const FLOWERS = Array.from({ length: 14 }, (_, i) => {
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const rand = seed - Math.floor(seed);
    return {
        left: (i * 7.3 + rand * 9) % 100,
        delay: -(i * 1.7 + rand * 6),
        duration: 14 + rand * 10,
        size: 14 + rand * 16,
    };
});

/** White kash flowers drifting down — the classic sign that Sharat (autumn) and Puja have arrived. */
export function KashFlowers({ className }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={cn(
                "pointer-events-none absolute inset-0 overflow-hidden contain-paint",
                className,
            )}
        >
            {FLOWERS.map((f, i) => (
                <svg
                    key={i}
                    viewBox="0 0 24 40"
                    className={cn(
                        "absolute top-0 animate-drift text-white/90 motion-reduce:hidden dark:text-white/70",
                    )}
                    style={{
                        left: `${f.left}%`,
                        width: f.size,
                        animationDelay: `${f.delay}s`,
                        animationDuration: `${f.duration}s`,
                    }}
                >
                    <path
                        d="M12 40 C 12 28, 12 18, 12 10"
                        stroke="currentColor"
                        strokeWidth="1"
                        fill="none"
                    />
                    {[0, 1, 2, 3, 4, 5].map((j) => (
                        <path
                            key={j}
                            d={`M12 ${14 + j * 3} q ${j % 2 ? 7 : -7} -6 ${j % 2 ? 10 : -10} -12`}
                            stroke="currentColor"
                            strokeWidth="0.9"
                            fill="none"
                            strokeLinecap="round"
                        />
                    ))}
                    <ellipse cx="12" cy="8" rx="4" ry="7" fill="currentColor" opacity="0.8" />
                </svg>
            ))}
        </div>
    );
}
