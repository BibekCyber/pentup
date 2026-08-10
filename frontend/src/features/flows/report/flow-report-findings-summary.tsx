import type { Finding, Severity } from '@/lib/report-model';

import { SeverityBadge } from '@/components/shared/severity-badge';
import { Card, CardContent } from '@/components/ui/card';

import { FindingCvssControl } from './finding-cvss-control';
import { FindingSeverityControl } from './finding-severity-control';

const shorten = (text: string | undefined, max = 120): string => {
    if (!text) {
        return '';
    }

    const flat = text.replaceAll(/\s+/g, ' ').trim();

    return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
};

interface FlowReportFindingsSummaryProps {
    findings: Finding[];
    // Supplied only where triage is possible; without them the table stays read-only.
    onCvssChange?: (finding: Finding, cvss: number) => void;
    onCvssOutOfRange?: (severity: string, min: number, max: number) => void;
    onSeverityChange?: (finding: Finding, severity: Severity) => void;
    severityPending?: boolean;
}

const FlowReportFindingsSummary = ({
    findings,
    onCvssChange,
    onCvssOutOfRange,
    onSeverityChange,
    severityPending,
}: FlowReportFindingsSummaryProps) => {
    if (findings.length === 0) {
        return null;
    }

    return (
        <section
            className="scroll-mt-24 space-y-4"
            id="findings-summary"
        >
            <div className="space-y-1">
                <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
                    Section 02
                </p>
                <h2 className="text-foreground text-xl font-semibold">Findings Summary</h2>
            </div>
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-muted-foreground border-border bg-muted/40 border-b text-left font-mono text-[10px] tracking-wide uppercase">
                                    <th className="px-4 py-2.5 font-medium">#</th>
                                    <th className="px-4 py-2.5 font-medium">Finding</th>
                                    <th className="px-4 py-2.5 font-medium">Severity</th>
                                    <th className="px-4 py-2.5 font-medium">CVSS</th>
                                    <th className="px-4 py-2.5 font-medium">Recommendation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {findings.map((finding, index) => (
                                    <tr
                                        className="border-border hover:bg-muted/40 border-b align-top transition-colors last:border-b-0"
                                        key={finding.id}
                                    >
                                        <td className="text-muted-foreground px-4 py-3 font-mono text-xs tabular-nums">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <a
                                                className="text-foreground hover:text-primary font-medium hover:underline"
                                                href={`#${finding.id}`}
                                            >
                                                {finding.title}
                                            </a>
                                        </td>
                                        <td className="px-4 py-3">
                                            {onSeverityChange ? (
                                                <FindingSeverityControl
                                                    disabled={severityPending}
                                                    finding={finding}
                                                    onChange={onSeverityChange}
                                                />
                                            ) : (
                                                <SeverityBadge severity={finding.severity} />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {onCvssChange ? (
                                                <FindingCvssControl
                                                    disabled={severityPending}
                                                    finding={finding}
                                                    onChange={onCvssChange}
                                                    onOutOfRange={onCvssOutOfRange ?? (() => undefined)}
                                                />
                                            ) : (
                                                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                                                    {finding.cvss?.toFixed(1) ?? '—'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-muted-foreground max-w-md px-4 py-3 text-xs">
                                            {shorten(finding.recommendation)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
};

export default FlowReportFindingsSummary;
