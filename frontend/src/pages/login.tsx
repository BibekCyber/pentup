import type { CSSProperties } from 'react';

import { Loader2 } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';

import Logo from '@/components/icons/logo';
import LoginForm from '@/features/authentication/login-form';
import { getSafeReturnUrl } from '@/lib/utils/auth';
import { useUser } from '@/providers/user-provider';

// ---- constellation: hexagon / circuitry texture (dots + connecting lines) ----
const NODES: Array<[number, number]> = [
    [70, 120],
    [210, 70],
    [360, 120],
    [480, 60],
    [140, 230],
    [300, 210],
    [450, 250],
    [60, 370],
    [220, 360],
    [380, 380],
    [500, 410],
    [150, 500],
    [310, 520],
    [450, 560],
    [90, 640],
    [250, 660],
    [400, 700],
    [520, 700],
    [180, 760],
    [340, 780],
];

const EDGES: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [0, 4],
    [1, 5],
    [2, 5],
    [2, 6],
    [3, 6],
    [4, 5],
    [5, 6],
    [4, 7],
    [4, 8],
    [5, 8],
    [5, 9],
    [6, 9],
    [6, 10],
    [7, 8],
    [8, 9],
    [9, 10],
    [8, 11],
    [8, 12],
    [9, 12],
    [9, 13],
    [10, 13],
    [11, 12],
    [12, 13],
    [11, 14],
    [12, 15],
    [12, 16],
    [13, 16],
    [13, 17],
    [14, 15],
    [15, 16],
    [16, 17],
    [14, 18],
    [15, 18],
    [15, 19],
    [16, 19],
    [18, 19],
];

const HOT: Record<number, boolean> = { 5: true, 9: true, 12: true, 16: true };

const Constellation = () => (
    <svg
        className="size-full"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 560 820"
    >
        <path
            d="M300,255 L432,330 L432,480 L300,555 L168,480 L168,330 Z"
            stroke="rgba(245,114,20,.16)"
            strokeWidth="1"
        />
        <path
            d="M300,320 L378,365 L378,455 L300,500 L222,455 L222,365 Z"
            stroke="rgba(255,255,255,.05)"
            strokeWidth="1"
        />
        {EDGES.map(([ai, bi], i) => {
            const a = NODES[ai];
            const b = NODES[bi];
            const hot = HOT[ai] && HOT[bi];

            return (
                <line
                    key={`e-${i}`}
                    stroke={hot ? 'rgba(245,114,20,.34)' : 'rgba(255,255,255,.09)'}
                    strokeWidth="1"
                    x1={a[0]}
                    x2={b[0]}
                    y1={a[1]}
                    y2={b[1]}
                />
            );
        })}
        {NODES.map(([x, y], i) =>
            HOT[i] ? (
                <g key={`n-${i}`}>
                    <circle
                        cx={x}
                        cy={y}
                        r="9"
                        stroke="rgba(245,114,20,.30)"
                        strokeWidth="1"
                    />
                    <circle
                        cx={x}
                        cy={y}
                        fill="var(--primary)"
                        r="3.4"
                    />
                </g>
            ) : (
                <circle
                    cx={x}
                    cy={y}
                    fill="rgba(255,255,255,.34)"
                    key={`n-${i}`}
                    r="2.3"
                />
            ),
        )}
    </svg>
);

// ---- agent monogram row ----
const AGENTS: Array<{ color: string; monogram: string }> = [
    { color: '#38BDF8', monogram: 'RE' },
    { color: '#A78BFA', monogram: 'DE' },
    { color: '#34D399', monogram: 'EX' },
];

const Login = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { isLoading } = useUser();

    // Extract the return URL from either location state or query parameters
    const returnUrl = getSafeReturnUrl((location.state?.from as string) || searchParams.get('returnUrl'), '/');

    return (
        <div
            className="grid h-dvh w-full lg:grid-cols-[1.1fr_0.9fr]"
            style={{ background: 'var(--bg)' }}
        >
            {/* ===== LEFT — security console hero ===== */}
            {/* A security console is conventionally dark: pin the dark-theme design tokens
                on this panel (and its children, which reference --foreground / --border /
                .overline etc.) so it renders identically in BOTH light and dark app themes —
                light-mode tokens would otherwise wash out the gradient and hide the text. */}
            <div
                className="relative hidden flex-col justify-between overflow-hidden px-10 py-12 lg:flex xl:px-20"
                style={
                    {
                        '--border': 'rgba(255, 255, 255, 0.09)',
                        '--foreground': '#e9ebed',
                        '--ink-3': '#6e747e',
                        '--muted-foreground': '#9ba1ab',
                        background: 'radial-gradient(120% 100% at 20% 10%, #17140F, #0A0C0E 60%)',
                        color: '#e9ebed',
                    } as CSSProperties
                }
            >
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{ opacity: 0.5 }}
                >
                    <Constellation />
                </div>
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            'repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.015) 3px 4px)',
                    }}
                />

                {/* top — brand lockup */}
                <div className="relative z-10 flex items-center gap-3">
                    <Logo className="text-primary size-8" />
                    <div>
                        <div className="text-foreground text-[22px] font-bold tracking-tight">
                            <span className="text-primary">AI</span> Pentest
                        </div>
                        <div className="mt-1 overline">Autonomous penetration testing</div>
                        <div className="text-muted-foreground mt-1 text-[11px]">
                            by <span className="text-foreground/90 font-semibold">CyberFortify</span>
                        </div>
                    </div>
                </div>

                {/* middle — headline */}
                <div className="relative z-10 max-w-[460px]">
                    <div className="text-primary mb-4 overline">Operator Console</div>
                    <h1 className="text-foreground text-[38px] leading-[1.1] font-bold tracking-[-0.03em]">
                        Ship findings,
                        <br />
                        not false positives.
                    </h1>
                    <p className="text-muted-foreground mt-4 max-w-[420px] text-[14.5px] leading-relaxed">
                        Autonomous agents run the recon, exploitation and reporting — you review confirmed,
                        evidence-backed results, not a triage backlog.
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                        <div className="flex">
                            {AGENTS.map((a, i) => (
                                <span
                                    className="agent"
                                    key={a.monogram}
                                    style={{
                                        background: a.color,
                                        boxShadow: '0 0 0 2px #0A0C0E',
                                        marginLeft: i ? '-6px' : 0,
                                    }}
                                >
                                    {a.monogram}
                                </span>
                            ))}
                        </div>
                        <span className="text-muted-foreground font-mono text-[11.5px]">
                            Researcher · Developer · Executor working in parallel
                        </span>
                    </div>
                </div>
            </div>

            {/* ===== RIGHT — sign-in card ===== */}
            <div
                className="flex items-center justify-center px-8 py-12 sm:px-12 lg:px-16 xl:px-24"
                style={{ background: 'var(--bg)' }}
            >
                {!isLoading ? (
                    <LoginForm returnUrl={returnUrl} />
                ) : (
                    <Loader2 className="text-primary size-16 animate-spin" />
                )}
            </div>
        </div>
    );
};

export default Login;
