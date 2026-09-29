import { renderToBuffer } from '@react-pdf/renderer';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import ReportDocument from '@/lib/report-pdf/report-document';
import { sampleReportModel } from '@/lib/report-sample';

// An analyst override rescores the finding into its new band and marks the severity
// "(adjusted)". That note is a nested <Text>, which react-pdf is fussy about, so this
// renders the real document rather than trusting the markup to be safe.
describe('finding with an analyst severity override', () => {
    it('renders the whole report with the rescored CVSS and the adjusted note', async () => {
        const model = {
            ...sampleReportModel,
            findings: sampleReportModel.findings.map((finding, index) =>
                index === 0
                    ? { ...finding, cvss: 3.9, originalSeverity: 'critical' as const, severityUpdated: true }
                    : finding,
            ),
        };

        const buffer = await renderToBuffer(<ReportDocument model={model} />);

        expect(buffer.length).toBeGreaterThan(10_000);

        if (process.env.WRITE_PDF) {
            writeFileSync(process.env.WRITE_PDF, buffer);
        }
    });
});
