// Logo mark, wordmark and user avatars.

export function LogoMark({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#ededef" />
            <path
                d="M9 10.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6.5L12 25v-3.5H9a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
                fill="#0a0a0b"
            />
            <path d="m13.5 14-2 2 2 2M18.5 14l2 2-2 2" stroke="#ffb224" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function Logo() {
    return (
        <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-fg">
            <LogoMark size={22} />
            <span className="text-[15px]">DevChat</span>
        </span>
    );
}

// Deterministic, muted hue per user so the same person always gets the same color.
function hueFor(seed: string): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return h % 360;
}

export function Avatar({
    name,
    seed,
    src,
    size = 32,
}: {
    name?: string | null;
    seed?: string;
    src?: string | null;
    size?: number;
}) {
    const label = (name || '?').trim();
    const initial = label.replace(/^guest-/i, '')[0]?.toUpperCase() || '?';
    const hue = hueFor(seed || label);
    const radius = Math.round(size * 0.28);

    if (src) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={src}
                alt=""
                width={size}
                height={size}
                referrerPolicy="no-referrer"
                className="shrink-0 object-cover"
                style={{ width: size, height: size, borderRadius: radius }}
            />
        );
    }
    return (
        <span
            aria-hidden="true"
            className="inline-flex shrink-0 select-none items-center justify-center font-semibold"
            style={{
                width: size,
                height: size,
                borderRadius: radius,
                fontSize: Math.round(size * 0.42),
                background: `hsl(${hue} 32% 20%)`,
                color: `hsl(${hue} 70% 82%)`,
            }}
        >
            {initial}
        </span>
    );
}
