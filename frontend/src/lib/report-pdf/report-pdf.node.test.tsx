import { renderToBuffer } from '@react-pdf/renderer';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { sampleReportModel } from '@/lib/report-sample';

import ReportDocument from './report-document';

describe('PDF report document', () => {
    it('renders the sample report to a valid, non-trivial PDF', async () => {
        const buffer = await renderToBuffer(<ReportDocument model={sampleReportModel} />);

        expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
        expect(buffer.length).toBeGreaterThan(5000);

        if (process.env.WRITE_PDF) {
            writeFileSync(process.env.WRITE_PDF, buffer);
        }
    }, 30_000);
});
