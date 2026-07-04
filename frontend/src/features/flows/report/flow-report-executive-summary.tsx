import { Camera, Clock, FileText, ListChecks } from 'lucide-react';

import type { ReportModel, Severity } from '@/lib/report-model';

import { SeverityBadge } from '@/components/shared/severity-badge';
import { Card, CardContent } from '@/components/ui/card';
import { deriveSummaryNarrative, pluralize } from '@/lib/build-report-model';
import { SEVERITY_ORDER } from '@/lib/report-model';
import { getSeverityStyle } from '@/lib/severity-palette';
import { cn } from '@/lib/utils';

const StatTile = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) => (
    <div className="border-border bg-card flex items-center gap-3 rounded-lg border p-3">
        <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-4.5" />
        </div>
        <div className="min-w-0">
            <p className="text-foreground text-lg leading-none font-semibold">{value}</p>
            <p className="text-muted-foreground mt-1 truncate text-xs">{label}</p>
        </div>
    </div>
);

const overallPosture = (model: ReportModel): Severity | undefined => SEVERITY_ORDER.find((severity) => model.summary.findingsBySeverity[severity] > 0);

interface FlowReportExecutiveSummaryProps {
    model: ReportModel;
}

const FlowReportExecutiveSummary = ({ model }: FlowReportExecutiveSummaryProps) => {
    const { summary } = model;
    const posture = overallPosture(model);
    const hasFindings = summary.findingsTotal > 0;

    return (
        <section
            className="scroll-mt-24 space-y-4"
            id="executive-summary"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-foreground text-xl font-semibold">Executive Summary</h2>
                {posture && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Overall risk</span>
                        <SeverityBadge severity={posture} />
                    </div>
                )}
            </div>

            <Card>
                <CardContent className="space-y-2 pt-6">
                    <p className="text-foreground/90 text-sm leading-relaxed">{model.executiveSummary?.content ?? deriveSummaryNarrative(model)}</p>
                    {model.executiveSummary && <p className="text-muted-foreground text-xs">Generated {new Date(model.executiveSummary.generatedAt).toLocaleString()}</p>}
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
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-muted-foreground border-border border-b text-left text-xs uppercase">
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
                                            className={cn('border-border border-b last:border-b-0', count > 0 && style.rowClass)}
                                            key={severity}
                                        >
                                            <td className="px-4 py-2.5">
                                                <span className="flex items-center gap-2">
                                                    <span className={cn('size-2.5 rounded-full', style.dotClass)} />
                                                    <span className="font-medium">{style.label}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center font-semibold tabular-nums">{count}</td>
                                            <td className="text-muted-foreground px-4 py-2.5 font-mono text-xs">{style.cvssRange}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}
        </section>
    );
};

export default FlowReportExecutiveSummary;
