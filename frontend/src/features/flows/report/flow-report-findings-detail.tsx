import type { Finding } from '@/lib/report-model';

import FindingCard from '@/components/shared/finding-card';

interface FlowReportFindingsDetailProps {
    findings: Finding[];
}

const FlowReportFindingsDetail = ({ findings }: FlowReportFindingsDetailProps) => {
    if (findings.length === 0) {
        return null;
    }

    return (
        <section
            className="scroll-mt-24 space-y-5"
            id="detailed-findings"
        >
            <div className="space-y-1 border-b pb-2">
                <h2 className="text-foreground text-xl font-semibold">Detailed Findings</h2>
                <p className="text-muted-foreground text-xs">Findings are ordered by severity. Risk ratings are technical and based on CVSS v3.1.</p>
            </div>
            <div className="space-y-6">
                {findings.map((finding, index) => (
                    <FindingCard
                        finding={finding}
                        index={index + 1}
                        key={finding.id}
                    />
                ))}
            </div>
        </section>
    );
};

export default FlowReportFindingsDetail;
