import { Camera, Clock, FileText, ListChecks } from 'lucide-react';

import type { ReportModel, Severity } from '@/lib/report-model';

import { SeverityBadge } from '@/components/shared/severity-badge';
import SeverityBar from '@/components/shared/severity-bar';
import { Card, CardContent } from '@/components/ui/card';
import { deriveSummaryNarrative, pluralize } from '@/lib/build-report-model';
import { SEVERITY_ORDER } from '@/lib/report-model';
import { getSeverityStyle } from '@/lib/severity-palette';
import { cn } from '@/lib/utils';

// Letter grade purely derived from the already-computed overall posture (max
// present severity). No new metric — a presentational transform of existing data.
const POSTURE_GRADE: Record<Severity, string> = {
    critical: 'F',
    high: 'D',
    informational: 'A',
    low: 'B',
    medium: 'C',
};

const StatTile = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) => (
    <div className="border-border bg-card flex items-center gap-3 rounded-lg border p-3">
        <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-4.5" />
        </div>
        <div className="min-w-0">
            <p className="text-foreground font-mono text-lg leading-none font-semibold tabular-nums">{value}</p>
            <p className="text-muted-foreground mt-1.5 truncate font-mono text-[10px] tracking-[0.12em] uppercase">
                {label}
            </p>
        </div>
    </div>
);

const overallPosture = (model: ReportModel): Severity | undefined =>
    SEVERITY_ORDER.find((severity) => model.summary.findingsBySeverity[severity] > 0);

interface FlowReportExecutiveSummaryProps {
    model: ReportModel;
}

const FlowReportExecutiveSummary = ({ model }: FlowReportExecutiveSummaryProps) => {
    const { summary } = model;
    const posture = overallPosture(model);
    const hasFindings = summary.findingsTotal > 0;
    const postureStyle = posture ? getSeverityStyle(posture) : undefined;

    return (
        <section
            className="scroll-mt-24 space-y-4"
            id="executive-summary"
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                    <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
                        Section 01
                    </p>
                    <h2 className="text-foreground text-xl font-semibold">Executive Summary</h2>
                </div>
                {posture && postureStyle && (
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
                                Overall Risk
                            </p>
                            <div className="mt-1.5 flex justify-end">
                                <SeverityBadge severity={posture} />
                            </div>
                        </div>
                        <div
                            className={cn(
                                'grid size-20 shrink-0 place-items-center rounded-full border-2 border-current',
                                postureStyle.textClass,
                                postureStyle.rowClass,
                            )}
                        >
                            <div className="text-center">
                                <div className="text-3xl leading-none font-extrabold tracking-tight">
                                    {POSTURE_GRADE[posture]}
                                </div>
                                <div className="text-muted-foreground mt-1 font-mono text-[8px] tracking-[0.16em] uppercase">
                                    Risk
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Card>
                <CardContent className="space-y-2 pt-6">
                    <p className="text-foreground/90 text-sm leading-relaxed">
                        {model.executiveSummary?.content ?? deriveSummaryNarrative(model)}
                    </p>
                    {model.executiveSummary && (
                        <p className="text-muted-foreground font-mono text-[11px]">
                            Generated {new Date(model.executiveSummary.generatedAt).toLocaleString()}
                        </p>
                    )}
                </CardContent>
            </Card>

            <div className={cn('grid grid-cols-2 gap-3', hasFindings ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
                <StatTile
                    icon={ListChecks}
                    label="Tasks completed"
                    value={`${summary.tasksDone}/${summary.tasksTotal}`}
                />
                {hasFindings && (
                    <StatTile
                        icon={FileText}
                        label="Findings"
                        value={String(summary.findingsTotal)}
                    />
                )}
                <StatTile
                    icon={Camera}
                    label={pluralize(summary.screenshotCount, 'Screenshot')}
                    value={String(summary.screenshotCount)}
                />
                <StatTile
                    icon={Clock}
                    label="Duration"
                    value={summary.duration ?? '—'}
                />
            </div>

            {hasFindings && (
                <Card>
                    <CardContent className="space-y-5 p-4">
                        <div className="space-y-3">
                            <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
                                Severity Mix
                            </p>
                            <SeverityBar
                                counts={summary.findingsBySeverity}
                                showCounts
                            />
                        </div>
                        <div className="border-border overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-muted-foreground border-border bg-muted/40 border-b text-left font-mono text-[10px] tracking-wide uppercase">
                                        <th className="px-4 py-2.5 font-medium">Severity</th>
                                        <th className="px-4 py-2.5 text-center font-medium">Findings</th>
                                        <th className="px-4 py-2.5 font-medium">CVSS Range</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {SEVERITY_ORDER.map((severity) => {
                                        const style = getSeverityStyle(severity);
                                        const count = summary.findingsBySeverity[severity];

                                        return (
                                            <tr
                                                className={cn(
                                                    'border-border border-b last:border-b-0',
                                                    count > 0 && style.rowClass,
                                                )}
                                                key={severity}
                                            >
                                                <td className="px-4 py-2.5">
                                                    <span className="flex items-center gap-2">
                                                        <span className={cn('size-2.5 rounded-full', style.dotClass)} />
                                                        <span className="font-medium">{style.label}</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center font-mono font-semibold tabular-nums">
                                                    {count}
                                                </td>
                                                <td className="text-muted-foreground px-4 py-2.5 font-mono text-xs">
                                                    {style.cvssRange}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </section>
    );
};

export default FlowReportExecutiveSummary;
