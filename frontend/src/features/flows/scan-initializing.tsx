import { useEffect, useState } from 'react';

import { SCAN_STAGES } from '@/hooks/use-scan-stage';
import { cn } from '@/lib/utils';

/**
 * ScanInitializing — the "your scan is starting" loading state shown while a
 * Docker sandbox provisions and the AI agents boot.
 *
 * Motif: TERMINAL-BOOT. A minimal terminal window (blinking cursor + a
 * loading-dot sequence) sits at the centre, ringed by three labelled agent
 * nodes — Researcher / Developer / Executor — whose connector lines light up in
 * sequence as an energy pulse orbits the ring. It reads as the agents booting
 * the shell.
 *
 * All motion is defined in styles/index.css under `scan-*` keyframes and is
 * fully disabled under `prefers-reduced-motion: reduce`, degrading to a calm,
 * complete static illustration. Colours come exclusively from theme tokens
 * (`--primary`, `--border`, `--card`, `--muted-foreground`, …) so it tracks
 * whatever theme is active.
 */

export interface ScanInitializingProps {
    className?: string;
    /** Compact variant for the create-form: smaller illustration, dotted progress row. */
    reducedDetail?: boolean;
    /** 0..3 — selects the active headline and advances the 4-step stepper. */
    stageIndex: number;
}

// Short stepper labels paired with the SCAN_STAGES headlines (shared source of truth
// in use-scan-stage.ts). Index-aligned with SCAN_STAGES.
const STEP_LABELS = ['Sandbox', 'Container', 'Agents', 'Planning'] as const;

// Reassurance lines cycled beneath the headline so the copy never looks frozen while
// the sandbox boots — especially once the headline settles on the final stage.
const REASSURANCE = [
    'Your scan keeps running in the background — you can safely wait here.',
    'Setting up an isolated sandbox for your test…',
    'This can take a moment while the container image is prepared.',
    'Bringing the Researcher, Developer and Executor agents online…',
] as const;

const REASSURANCE_MS = 3800;

type AgentGlyph = 'developer' | 'executor' | 'researcher';

interface AgentNode {
    /** node centre */
    cx: number;
    cy: number;
    /** stagger for the connector energy pulse */
    flowDelay: string;
    key: AgentGlyph;
    label: string;
    labelAnchor: 'end' | 'middle' | 'start';
    /** label anchor */
    lx: number;
    ly: number;
    /** transform-origin for the pulsing "waking" ring, in SVG user units */
    origin: string;
    x1: number;
    /** connector line: from the terminal edge (1) to just short of the node (2) */
    x2: number;
    y1: number;
    y2: number;
}

// Geometry: viewBox 0 0 300 236, ring centre C=(150,128), R=100.
const AGENTS: AgentNode[] = [
    {
        cx: 150,
        cy: 28,
        flowDelay: '0s',
        key: 'researcher',
        label: 'Researcher',
        labelAnchor: 'middle',
        lx: 150,
        ly: 13,
        origin: '150px 28px',
        x1: 150,
        x2: 150,
        y1: 81,
        y2: 39,
    },
    {
        cx: 227,
        cy: 192,
        flowDelay: '0.55s',
        key: 'developer',
        label: 'Developer',
        labelAnchor: 'middle',
        lx: 227,
        ly: 214,
        origin: '227px 192px',
        x1: 206,
        x2: 221,
        y1: 175,
        y2: 188,
    },
    {
        cx: 73,
        cy: 192,
        flowDelay: '1.1s',
        key: 'executor',
        label: 'Executor',
        labelAnchor: 'middle',
        lx: 73,
        ly: 214,
        origin: '73px 192px',
        x1: 94,
        x2: 79,
        y1: 175,
        y2: 188,
    },
];

/** Tiny agent glyphs, drawn around the node centre (0,0). Stroke = currentColor. */
const AgentGlyphMark = ({ kind }: { kind: AgentGlyph }) => {
    if (kind === 'researcher') {
        // magnifier
        return (
            <g
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.3}
            >
                <circle
                    cx={-1.2}
                    cy={-1.2}
                    r={3}
                />
                <line
                    x1={1.1}
                    x2={3.4}
                    y1={1.1}
                    y2={3.4}
                />
            </g>
        );
    }

    if (kind === 'developer') {
        // code chevrons  </>
        return (
            <g
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.3}
            >
                <polyline points="-1.6,-3.4 -4.4,0 -1.6,3.4" />
                <polyline points="1.6,-3.4 4.4,0 1.6,3.4" />
            </g>
        );
    }

    // executor — terminal prompt  >_
    return (
        <g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.3}
        >
            <polyline points="-3.4,-2.6 -0.4,0 -3.4,2.6" />
            <line
                x1={1}
                x2={4}
                y1={3}
                y2={3}
            />
        </g>
    );
};

const ScanIllustration = ({ compact, stageIndex }: { compact: boolean; stageIndex: number }) => {
    const size = compact ? 168 : 236;

    return (
        <svg
            aria-hidden="true"
            className="max-w-full"
            focusable="false"
            height={size}
            viewBox="0 0 300 236"
            width={size * (300 / 236)}
        >
            {/* ---- orbit rings ---- */}
            <circle
                cx={150}
                cy={128}
                fill="none"
                opacity={0.7}
                r={100}
                stroke="var(--border)"
                strokeDasharray="2 6"
                strokeWidth={1}
            />
            <circle
                cx={150}
                cy={128}
                fill="none"
                opacity={0.35}
                r={100}
                stroke="var(--border)"
                strokeWidth={1}
            />

            {/* orbiting energy pulse — travels the ring, momentarily energising each agent */}
            <g className="scan-orbit">
                <circle
                    cx={150}
                    cy={28}
                    fill="var(--primary)"
                    r={3.2}
                />
                <circle
                    cx={150}
                    cy={28}
                    fill="none"
                    opacity={0.4}
                    r={6.5}
                    stroke="var(--primary)"
                    strokeWidth={1}
                />
            </g>

            {/* ---- connectors (base + animated energy pulse) ---- */}
            {AGENTS.map((agent, index) => {
                const active = index < stageIndex;

                return (
                    <g key={`link-${agent.key}`}>
                        <line
                            opacity={active ? 0.55 : 1}
                            stroke={active ? 'var(--primary)' : 'var(--border)'}
                            strokeLinecap="round"
                            strokeWidth={1.5}
                            x1={agent.x1}
                            x2={agent.x2}
                            y1={agent.y1}
                            y2={agent.y2}
                        />
                        <line
                            className="scan-flow"
                            stroke="var(--primary)"
                            strokeLinecap="round"
                            strokeWidth={1.5}
                            style={{ animationDelay: agent.flowDelay }}
                            x1={agent.x1}
                            x2={agent.x2}
                            y1={agent.y1}
                            y2={agent.y2}
                        />
                    </g>
                );
            })}

            {/* ---- agent nodes ---- */}
            {AGENTS.map((agent, index) => {
                const active = index < stageIndex;
                const waking = index === stageIndex;

                return (
                    <g key={`node-${agent.key}`}>
                        {/* pulsing "waking" ring for the current stage's agent */}
                        {waking && (
                            <circle
                                className="scan-wake"
                                cx={agent.cx}
                                cy={agent.cy}
                                fill="none"
                                r={11}
                                stroke="var(--primary)"
                                strokeWidth={1.5}
                                style={{ transformOrigin: agent.origin }}
                            />
                        )}
                        {/* disc masks the ring behind the node */}
                        <circle
                            cx={agent.cx}
                            cy={agent.cy}
                            fill="var(--card)"
                            r={11}
                        />
                        <circle
                            cx={agent.cx}
                            cy={agent.cy}
                            fill={active ? 'var(--primary)' : 'var(--card)'}
                            r={9}
                            stroke={active ? 'var(--primary)' : 'var(--border)'}
                            strokeWidth={1.5}
                        />
                        <g
                            className={active ? 'text-primary-foreground' : 'text-muted-foreground'}
                            transform={`translate(${agent.cx} ${agent.cy})`}
                        >
                            <AgentGlyphMark kind={agent.key} />
                        </g>
                        <text
                            className={active || waking ? 'fill-foreground' : 'fill-muted-foreground'}
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 10,
                                fontWeight: active || waking ? 600 : 500,
                                letterSpacing: '0.06em',
                            }}
                            textAnchor={agent.labelAnchor}
                            x={agent.lx}
                            y={agent.ly}
                        >
                            {agent.label}
                        </text>
                    </g>
                );
            })}

            {/* ---- terminal window ---- */}
            <g>
                {/* soft shadow plate */}
                <rect
                    fill="var(--muted-foreground)"
                    height={94}
                    opacity={0.08}
                    rx={12}
                    width={132}
                    x={84}
                    y={83}
                />
                {/* window body */}
                <rect
                    fill="var(--card)"
                    height={94}
                    rx={12}
                    stroke="var(--border)"
                    strokeWidth={1.25}
                    width={132}
                    x={84}
                    y={81}
                />
                {/* chrome bar */}
                <path
                    d="M84 93 a12 12 0 0 1 12 -12 h108 a12 12 0 0 1 12 12 v6 h-132 z"
                    fill="var(--muted)"
                    opacity={0.6}
                />
                <line
                    stroke="var(--border)"
                    strokeWidth={1}
                    x1={84}
                    x2={216}
                    y1={99}
                    y2={99}
                />
                <circle
                    cx={96}
                    cy={90}
                    fill="var(--muted-foreground)"
                    opacity={0.55}
                    r={2.4}
                />
                <circle
                    cx={105}
                    cy={90}
                    fill="var(--muted-foreground)"
                    opacity={0.4}
                    r={2.4}
                />
                <circle
                    cx={114}
                    cy={90}
                    fill="var(--muted-foreground)"
                    opacity={0.28}
                    r={2.4}
                />
                <text
                    className="fill-muted-foreground"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.04em' }}
                    textAnchor="middle"
                    x={150}
                    y={93}
                >
                    agent@sandbox
                </text>

                {/* prompt line: $ + typed command + blinking cursor */}
                <text
                    className="fill-primary"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}
                    x={96}
                    y={121}
                >
                    $
                </text>
                <rect
                    fill="var(--muted-foreground)"
                    height={6}
                    opacity={0.32}
                    rx={2}
                    width={60}
                    x={107}
                    y={114}
                />
                <rect
                    className="scan-cursor"
                    fill="var(--primary)"
                    height={11}
                    rx={1}
                    width={6}
                    x={172}
                    y={111}
                />

                {/* loading-dot sequence */}
                <circle
                    className="scan-dot"
                    cx={99}
                    cy={137}
                    fill="var(--primary)"
                    r={3}
                    style={{ animationDelay: '0s' }}
                />
                <circle
                    className="scan-dot"
                    cx={110}
                    cy={137}
                    fill="var(--primary)"
                    r={3}
                    style={{ animationDelay: '0.18s' }}
                />
                <circle
                    className="scan-dot"
                    cx={121}
                    cy={137}
                    fill="var(--primary)"
                    r={3}
                    style={{ animationDelay: '0.36s' }}
                />

                {/* faux output lines */}
                <rect
                    fill="var(--muted-foreground)"
                    height={5}
                    opacity={0.2}
                    rx={2}
                    width={96}
                    x={96}
                    y={149}
                />
                <rect
                    fill="var(--muted-foreground)"
                    height={5}
                    opacity={0.14}
                    rx={2}
                    width={64}
                    x={96}
                    y={160}
                />
            </g>
        </svg>
    );
};

const Stepper = ({ stageIndex }: { stageIndex: number }) => (
    <ol
        aria-hidden="true"
        className="flex w-full max-w-sm items-start justify-between gap-1"
    >
        {STEP_LABELS.map((step, index) => {
            const done = index < stageIndex;
            const current = index === stageIndex;

            return (
                <li
                    className="relative flex flex-1 flex-col items-center gap-2"
                    key={step}
                >
                    {/* connector to previous step */}
                    {index > 0 && (
                        <span
                            className={cn(
                                'absolute top-3 right-1/2 h-px w-full -translate-y-1/2',
                                done || current ? 'bg-primary/60' : 'bg-border',
                            )}
                        />
                    )}
                    <span className="relative z-10 flex size-6 items-center justify-center">
                        {current && (
                            <span
                                aria-hidden="true"
                                className="scan-step-pulse border-primary absolute inset-0 rounded-full border"
                            />
                        )}
                        {done ? (
                            <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full">
                                <svg
                                    aria-hidden="true"
                                    className="size-3"
                                    fill="none"
                                    viewBox="0 0 12 12"
                                >
                                    <path
                                        d="M2.5 6.2 5 8.5 9.5 3.5"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.6}
                                    />
                                </svg>
                            </span>
                        ) : current ? (
                            <span className="border-primary bg-background flex size-6 items-center justify-center rounded-full border-2">
                                <span className="bg-primary size-2 rounded-full" />
                            </span>
                        ) : (
                            <span className="border-border bg-background flex size-6 items-center justify-center rounded-full border">
                                <span className="bg-muted-foreground/40 size-1.5 rounded-full" />
                            </span>
                        )}
                    </span>
                    <span
                        className={cn(
                            'text-center text-[11px] leading-tight',
                            current
                                ? 'text-foreground font-semibold'
                                : done
                                  ? 'text-muted-foreground'
                                  : 'text-muted-foreground/70',
                        )}
                    >
                        {step}
                    </span>
                </li>
            );
        })}
    </ol>
);

export const ScanInitializing = ({ className, reducedDetail = false, stageIndex }: ScanInitializingProps) => {
    const stage = Math.min(Math.max(stageIndex, 0), SCAN_STAGES.length - 1);
    const headline = SCAN_STAGES[stage] ?? SCAN_STAGES[0];

    const [reassuranceIndex, setReassuranceIndex] = useState(0);

    useEffect(() => {
        const id = window.setInterval(() => {
            setReassuranceIndex((current) => (current + 1) % REASSURANCE.length);
        }, REASSURANCE_MS);

        return () => window.clearInterval(id);
    }, []);

    return (
        <div
            className={cn('flex flex-col items-center text-center', reducedDetail ? 'gap-4' : 'gap-6', className)}
            data-slot="scan-initializing"
        >
            <ScanIllustration
                compact={reducedDetail}
                stageIndex={stage}
            />

            <div className="flex flex-col items-center gap-1.5">
                <div
                    aria-atomic="true"
                    aria-live="polite"
                    role="status"
                >
                    <p className={cn('text-foreground font-medium', reducedDetail ? 'text-sm' : 'text-base')}>
                        {headline}
                    </p>
                </div>
                <p
                    aria-hidden="true"
                    className="text-muted-foreground animate-scan-fade min-h-8 max-w-xs text-xs text-balance"
                    key={reassuranceIndex}
                >
                    {REASSURANCE[reassuranceIndex]}
                </p>
            </div>

            {reducedDetail ? (
                <div
                    aria-hidden="true"
                    className="flex items-center gap-2"
                >
                    {STEP_LABELS.map((step, index) => (
                        <span
                            className={cn(
                                'size-2 rounded-full transition-colors',
                                index <= stage ? 'bg-primary' : 'bg-muted-foreground/30',
                            )}
                            key={step}
                        />
                    ))}
                </div>
            ) : (
                <Stepper stageIndex={stage} />
            )}
        </div>
    );
};

export default ScanInitializing;
