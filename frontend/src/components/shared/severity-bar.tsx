import type { SeverityCounts } from '@/lib/report-model';

import { SEVERITY_ORDER } from '@/lib/report-model';
import { getSeverityStyle } from '@/lib/severity-palette';
import { cn } from '@/lib/utils';

interface SeverityBarProps {
    className?: string;
    counts: SeverityCounts;
    showCounts?: boolean;
}

// Pure presentational stacked-severity mix bar. Given the per-severity counts
// already computed in the report model, it renders a single ember-graphite bar
// whose segments are proportional to each severity, plus optional sev-pill counts.
const SeverityBar = ({ className, counts, showCounts = false }: SeverityBarProps) => {
    const total = SEVERITY_ORDER.reduce((sum, severity) => sum + counts[severity], 0);

    return (
        <div className={cn('space-y-3', className)}>
            <div className="bg-muted flex h-2 overflow-hidden rounded-full">
                {total > 0 &&
                    SEVERITY_ORDER.filter((severity) => counts[severity] > 0).map((severity) => (
                        <span
                            className={cn('block h-full', getSeverityStyle(severity).dotClass)}
                            key={severity}
                            style={{ width: `${(counts[severity] / total) * 100}%` }}
                        />
                    ))}
            </div>

            {showCounts && (
                <div className="flex flex-wrap gap-2">
                    {SEVERITY_ORDER.filter((severity) => counts[severity] > 0).map((severity) => {
                        const style = getSeverityStyle(severity);

                        return (
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase',
                                    style.badgeClass,
                                )}
                                key={severity}
                            >
                                <span className={cn('size-2 shrink-0 rounded-[2px]', style.dotClass)} />
                                {style.label}
                                <span className="tabular-nums">{counts[severity]}</span>
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SeverityBar;
