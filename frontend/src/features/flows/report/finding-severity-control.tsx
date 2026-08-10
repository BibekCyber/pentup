import { Check, ChevronDown, RotateCcw } from 'lucide-react';

import type { Finding, Severity } from '@/lib/report-model';

import { SeverityBadge } from '@/components/shared/severity-badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SEVERITY_ORDER } from '@/lib/report-model';
import { getSeverityStyle } from '@/lib/severity-palette';
import { cn } from '@/lib/utils';

interface FindingSeverityControlProps {
    disabled?: boolean;
    finding: Finding;
    onChange: (finding: Finding, severity: Severity) => void;
}

// Re-rates a finding in place. Severity is the single value the whole report derives from
// — counts, colours, ordering, the executive summary and the PDF — so changing it here is
// all that is needed to keep the report consistent.
//
// Findings without an `index` cannot be addressed in storage (older reports predate it),
// so they fall back to the read-only badge rather than offering an edit that would fail.
export const FindingSeverityControl = ({ disabled, finding, onChange }: FindingSeverityControlProps) => {
    if (finding.index === undefined) {
        return <SeverityBadge severity={finding.severity} />;
    }

    const originalStyle = finding.originalSeverity ? getSeverityStyle(finding.originalSeverity) : undefined;

    // A finding can be adjusted by rating, by score, or both — say which, so the marker is
    // informative rather than just a badge.
    const ratingChanged = Boolean(originalStyle) && originalStyle?.label !== getSeverityStyle(finding.severity).label;
    const scoreChanged = finding.originalCvss !== undefined && finding.originalCvss !== finding.cvss;
    const adjustedFrom = [
        ratingChanged ? `severity from ${originalStyle?.label}` : undefined,
        scoreChanged ? `CVSS from ${finding.originalCvss?.toFixed(1)}` : undefined,
    ]
        .filter(Boolean)
        .join(' and ');

    return (
        <div className="space-y-1.5">
            <DropdownMenu>
                <DropdownMenuTrigger
                    className={cn(
                        'rounded-full transition-opacity',
                        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
                        disabled ? 'pointer-events-none opacity-60' : 'hover:opacity-80',
                    )}
                    disabled={disabled}
                    title="Change severity"
                >
                    <span className="inline-flex items-center gap-1">
                        <SeverityBadge severity={finding.severity} />
                        {/* Without an affordance the chip reads as a static label and
                            nobody discovers that severities can be re-rated. */}
                        <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
                    </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuLabel className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                        Set severity
                    </DropdownMenuLabel>
                    {SEVERITY_ORDER.map((severity) => {
                        const style = getSeverityStyle(severity);

                        return (
                            <DropdownMenuItem
                                key={severity}
                                onClick={() => onChange(finding, severity)}
                            >
                                <span className={cn('size-2 shrink-0 rounded-[2px]', style.dotClass)} />
                                {style.label}
                                {severity === finding.severity && <Check className="text-primary ml-auto size-3.5" />}
                            </DropdownMenuItem>
                        );
                    })}
                    {finding.severityUpdated && finding.originalSeverity && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-muted-foreground"
                                onClick={() => onChange(finding, finding.originalSeverity as Severity)}
                            >
                                <RotateCcw className="size-3.5" />
                                Reset to original ({originalStyle?.label})
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            {finding.severityUpdated && (
                <p
                    className="text-primary font-mono text-[9px] font-medium tracking-wider uppercase"
                    title={adjustedFrom ? `Adjusted by analyst: ${adjustedFrom}` : 'Adjusted by analyst'}
                >
                    • Adjusted
                </p>
            )}
        </div>
    );
};
