import type { Finding } from '@/lib/report-model';

import { SeverityBadge } from '@/components/shared/severity-badge';
import { Card, CardContent } from '@/components/ui/card';

const shorten = (text: string | undefined, max = 120): string => {
    if (!text) {
        return '';
    }

    const flat = text.replaceAll(/\s+/g, ' ').trim();

    return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
};

interface FlowReportFindingsSummaryProps {
    findings: Finding[];
}

const FlowReportFindingsSummary = ({ findings }: FlowReportFindingsSummaryProps) => {
    if (findings.length === 0) {
        return null;
    }

    return (
        <section
            className="scroll-mt-24 space-y-4"
            id="findings-summary"
        >
            <h2 className="text-foreground text-xl font-semibold">Findings Summary</h2>
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-muted-foreground border-border border-b text-left text-xs uppercase">
                                    <th className="px-4 py-2.5 font-medium">#</th>
                                    <th className="px-4 py-2.5 font-medium">Finding</th>
                                    <th className="px-4 py-2.5 font-medium">Severity</th>
                                    <th className="px-4 py-2.5 font-medium">Recommendation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {findings.map((finding, index) => (
                                    <tr
                                        className="border-border hover:bg-muted/40 border-b align-top transition-colors last:border-b-0"
                                        key={finding.id}
                                    >
                                        <td className="text-muted-foreground px-4 py-3 tabular-nums">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <a
                                                className="text-foreground hover:text-primary font-medium hover:underline"
                                                href={`#${finding.id}`}
                                            >
                                                {finding.title}
                                            </a>
                                        </td>
                                        <td className="px-4 py-3">
                                            <SeverityBadge severity={finding.severity} />
                                        </td>
                                        <td className="text-muted-foreground max-w-md px-4 py-3 text-xs">{shorten(finding.recommendation)}</td>
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
