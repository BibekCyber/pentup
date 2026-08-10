import { useState } from 'react';

import type { Finding } from '@/lib/report-model';

import { Input } from '@/components/ui/input';
import { SEVERITY_BANDS } from '@/lib/report-model';
import { cn } from '@/lib/utils';

interface FindingCvssControlProps {
    disabled?: boolean;
    finding: Finding;
    onChange: (finding: Finding, cvss: number) => void;
    // Reports an out-of-band entry so the analyst learns the range instead of watching the
    // field silently snap back.
    onOutOfRange: (severity: string, min: number, max: number) => void;
}

// CVSS is editable, but only inside the band its severity denotes: the report's appendix
// publishes that mapping to the client, so a score outside it contradicts the document.
// Re-rating a finding moves the score to the top of the new band; this lets the analyst
// then set the precise value they stand behind.
export const FindingCvssControl = ({ disabled, finding, onChange, onOutOfRange }: FindingCvssControlProps) => {
    const band = SEVERITY_BANDS[finding.severity];
    const stored = finding.cvss;
    const formatted = stored === undefined ? '' : stored.toFixed(1);
    const [draft, setDraft] = useState(formatted);
    const [synced, setSynced] = useState(stored);

    // A re-rate rescores the finding server-side, so the input must follow the new value
    // rather than keep showing what the analyst typed for the previous rating. Adjusting
    // state during render is React's own pattern for this — an effect would render the
    // stale value first and then immediately re-render.
    if (stored !== synced) {
        setSynced(stored);
        setDraft(formatted);
    }

    if (finding.index === undefined) {
        return (
            <span className="text-muted-foreground font-mono text-xs tabular-nums">{stored?.toFixed(1) ?? '—'}</span>
        );
    }

    // Informational findings score 0.0 by definition — there is no range to choose from.
    if (band.min === band.max) {
        return <span className="text-muted-foreground font-mono text-xs tabular-nums">{band.min.toFixed(1)}</span>;
    }

    const commit = () => {
        const value = Number.parseFloat(draft);

        if (Number.isNaN(value)) {
            setDraft(formatted);

            return;
        }

        if (value < band.min || value > band.max) {
            onOutOfRange(finding.severity, band.min, band.max);
            setDraft(formatted);

            return;
        }

        const rounded = Math.round(value * 10) / 10;

        if (rounded !== stored) {
            onChange(finding, rounded);
        }
    };

    return (
        <Input
            aria-label={`CVSS score (${band.min.toFixed(1)}–${band.max.toFixed(1)})`}
            className={cn('h-7 w-16 px-2 font-mono text-xs tabular-nums', disabled && 'pointer-events-none opacity-60')}
            disabled={disabled}
            max={band.max}
            min={band.min}
            onBlur={commit}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.currentTarget.blur();
                }

                if (event.key === 'Escape') {
                    setDraft(formatted);
                    event.currentTarget.blur();
                }
            }}
            step={0.1}
            title={`${finding.severity} scores between ${band.min.toFixed(1)} and ${band.max.toFixed(1)}`}
            type="number"
            value={draft}
        />
    );
};
