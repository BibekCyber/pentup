import { cn } from '@/lib/utils';

/** A tone from the shared operational status ramp (`--st-*`). */
export type StatusTone = 'classifying' | 'created' | 'failed' | 'finished' | 'running' | 'waiting';

// Static utility strings (Tailwind can't resolve dynamically-built class names) mapping
// each tone to its dot background + label text color on the --st-* ramp.
const TONE_STYLES: Record<StatusTone, { dot: string; text: string }> = {
    classifying: { dot: 'bg-[var(--st-classifying)]', text: 'text-[var(--st-classifying)]' },
    created: { dot: 'bg-[var(--st-created)]', text: 'text-[var(--st-created)]' },
    failed: { dot: 'bg-[var(--st-failed)]', text: 'text-[var(--st-failed)]' },
    finished: { dot: 'bg-[var(--st-finished)]', text: 'text-[var(--st-finished)]' },
    running: { dot: 'bg-[var(--st-running)]', text: 'text-[var(--st-running)]' },
    waiting: { dot: 'bg-[var(--st-waiting)]', text: 'text-[var(--st-waiting)]' },
};

interface StatusPillProps {
    className?: string;
    label: string;
    /** Pulse the dot (use for in-progress states like running/waiting/classifying). */
    pulse?: boolean;
    tone: StatusTone;
}

/**
 * The EMBER `.status` primitive: a small colored dot + label on the shared `--st-*`
 * ramp. Intended for settings tables (users / tokens / providers) where a compact,
 * text-first status reads better than an icon badge.
 */
export const StatusPill = ({ className, label, pulse, tone }: StatusPillProps) => {
    const style = TONE_STYLES[tone] ?? TONE_STYLES.created;

    return (
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', style.text, className)}>
            <span
                className={cn(
                    'size-2 shrink-0 rounded-full',
                    style.dot,
                    pulse && 'animate-[pulse_1.6s_ease-in-out_infinite]',
                )}
            />
            {label}
        </span>
    );
};

export default StatusPill;
