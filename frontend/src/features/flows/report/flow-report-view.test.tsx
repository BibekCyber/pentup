import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { assistantSampleReportModel } from '@/lib/assistant-report-sample';
import { sampleReportModel } from '@/lib/report-sample';

import FlowReportView from './flow-report-view';

describe('FlowReportView', () => {
    it('renders the full web report tree to HTML without throwing', () => {
        const html = renderToStaticMarkup(
            <FlowReportView
                model={sampleReportModel}
                onCopyMarkdown={() => {}}
                onDownloadMarkdown={() => {}}
                onDownloadPdf={() => {}}
            />,
        );

        expect(html).toContain('Executive Summary');
        expect(html).toContain('Findings Summary');
        expect(html).toContain('Insecure Direct Object Reference (IDOR) via Predictable User ID');

        // The per-task narrative was dropped from the deliverable, so the on-screen report
        // must not render it either — the two views describe the same report.
        expect(html).not.toContain('Reconnaissance &amp; Infrastructure Assessment');
        expect(html.length).toBeGreaterThan(5000);
    });

    it('renders an assistant conversation report (same view, different sections)', () => {
        const html = renderToStaticMarkup(<FlowReportView model={assistantSampleReportModel} />);

        expect(html).toContain('Executive Summary');
        expect(html).toContain('conversation');

        // Assistant reports render their findings, not the transcript sections.
        expect(html).not.toContain('Strict-Transport-Security');
        expect(html.length).toBeGreaterThan(3000);
    });

    it('renders the empty state for a flow with no content', () => {
        const empty = { ...sampleReportModel, findings: [], sections: [] };
        const html = renderToStaticMarkup(<FlowReportView model={empty} />);

        expect(html).toContain('No content to report yet');
    });
});
