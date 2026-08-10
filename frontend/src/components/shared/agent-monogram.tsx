import { AgentType } from '@/graphql/types';
import { cn } from '@/lib/utils';

interface AgentMeta {
    /** Identity color for the tile background. */
    color: string;
    /** Two-character monogram shown on the tile. */
    monogram: string;
}

/**
 * The 15 real {@link AgentType} values mapped to a distinct identity color and a
 * two-character monogram. Mirrored from the EMBER prototype (`redesign/components.js`
 * `AGENT` map) so an agent always reads with the same color + initials everywhere it
 * appears (login hero, prompt settings, agent stacks). Keyed by the snake_case
 * `AgentType` enum values.
 */
const AGENT_META: Record<AgentType, AgentMeta> = {
    [AgentType.Adviser]: { color: '#2FBF71', monogram: 'AD' },
    [AgentType.Assistant]: { color: '#818CF8', monogram: 'AS' },
    [AgentType.Coder]: { color: '#A78BFA', monogram: 'CD' },
    [AgentType.Enricher]: { color: '#34D399', monogram: 'EN' },
    [AgentType.Generator]: { color: '#FBBF24', monogram: 'GN' },
    [AgentType.Installer]: { color: '#94A3B8', monogram: 'IN' },
    [AgentType.Memorist]: { color: '#C084FC', monogram: 'MM' },
    [AgentType.Pentester]: { color: '#FB3B4E', monogram: 'PT' },
    [AgentType.PrimaryAgent]: { color: '#F5A524', monogram: 'PA' },
    [AgentType.Refiner]: { color: '#60A5FA', monogram: 'RN' },
    [AgentType.Reflector]: { color: '#F472B6', monogram: 'RF' },
    [AgentType.Reporter]: { color: '#FF6B2C', monogram: 'RP' },
    [AgentType.Searcher]: { color: '#38BDF8', monogram: 'SR' },
    [AgentType.Summarizer]: { color: '#22D3EE', monogram: 'SM' },
    [AgentType.ToolCallFixer]: { color: '#F87171', monogram: 'TF' },
};

/** Normalizes any input (camelCase/PascalCase/snake_case) to the snake_case map key. */
const normalizeKey = (type: string): AgentType =>
    type
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '') as AgentType;

const getAgentMeta = (type: AgentType | string): AgentMeta =>
    AGENT_META[normalizeKey(String(type))] ?? {
        color: 'var(--ag-default)',
        monogram: (String(type) || '?').slice(0, 2).toUpperCase(),
    };

/** Human-friendly label from a snake_case agent type (e.g. `primary_agent` → `Primary Agent`). */
const agentTypeLabel = (type: string): string =>
    String(type)
        .split('_')
        .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
        .join(' ');

interface AgentMonogramProps {
    className?: string;
    size?: 'default' | 'lg';
    type: AgentType | string;
}

/** A small rounded, colored tile carrying an agent's two-character monogram in dark ink. */
export const AgentMonogram = ({ className, size = 'default', type }: AgentMonogramProps) => {
    const meta = getAgentMeta(type);

    return (
        <span
            className={cn(
                'grid shrink-0 place-items-center rounded-md font-mono font-bold tracking-[-0.02em] text-[#0B0D10]',
                size === 'lg' ? 'size-[30px] rounded-[7px] text-[12px]' : 'size-6 text-[10px]',
                className,
            )}
            style={{ backgroundColor: meta.color }}
            title={agentTypeLabel(String(type))}
        >
            {meta.monogram}
        </span>
    );
};

interface AgentStackProps {
    className?: string;
    /** When set, only the first `max` tiles render, followed by a `+N` overflow tile. */
    max?: number;
    size?: 'default' | 'lg';
    types: (AgentType | string)[];
}

/** An overlapping row of {@link AgentMonogram} tiles, ringed to lift off the surface. */
export const AgentStack = ({ className, max, size = 'default', types }: AgentStackProps) => {
    const shown = max != null ? types.slice(0, max) : types;
    const overflow = max != null ? types.length - shown.length : 0;

    return (
        <div className={cn('flex items-center', className)}>
            {shown.map((type, index) => (
                <AgentMonogram
                    className={cn('ring-background ring-2', index > 0 && '-ml-1.5')}
                    key={`${String(type)}-${index}`}
                    size={size}
                    type={type}
                />
            ))}
            {overflow > 0 ? (
                <span
                    className={cn(
                        'bg-muted text-muted-foreground ring-background grid shrink-0 place-items-center rounded-md font-mono font-bold ring-2',
                        size === 'lg' ? 'size-[30px] rounded-[7px] text-[12px]' : 'size-6 text-[10px]',
                        '-ml-1.5',
                    )}
                >
                    +{overflow}
                </span>
            ) : null}
        </div>
    );
};
