import { Document, Page, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { getEngagementLabel } from '@/lib/target-type-colors';

import AppendixPdf from './appendix-pdf';
import CoverConfidentiality from './confidentiality-pdf';
import CoverPage from './cover-page';
import ExecutiveSummaryPdf from './executive-summary-pdf';
import FindingsDetailPdf from './findings-detail-pdf';
import FindingsSummaryPdf from './findings-summary-pdf';
import PageChrome from './page-chrome';
import ScopeMethodologyPdf from './scope-methodology-pdf';
import SectionPdf from './section-pdf';
import { reportPdfStyles } from './styles';
import TocPdf from './toc-pdf';

interface ReportDocumentProps {
    model: ReportModel;
}

// White-labelled for CyberFortify. Each top-level section starts on a new page,
// mirroring the CyberFortify report template.
const ReportDocument = ({ model }: ReportDocumentProps) => (
    <Document
        author="CyberFortify"
        title={getEngagementLabel(model.flow.targetType) || model.flow.title}
    >
        <CoverPage model={model} />

        {/* One Page per top-level section, so every heading starts on a fresh page
            (matching the CyberFortify template). react-pdf auto-continues a section
            that overflows onto further physical pages, and the fixed chrome repeats
            on each. Separate Pages avoid the transform-matrix crash that scattered
            `break` props on shared-Page children trigger. */}
        <Page
            size="A4"
            style={reportPdfStyles.page}
        >
            <PageChrome model={model} />
            <CoverConfidentiality />
        </Page>

        <Page
            size="A4"
            style={reportPdfStyles.page}
        >
            <PageChrome model={model} />
            <TocPdf model={model} />
        </Page>

        <Page
            size="A4"
            style={reportPdfStyles.page}
        >
            <PageChrome model={model} />
            <ExecutiveSummaryPdf model={model} />
        </Page>

        <Page
            size="A4"
            style={reportPdfStyles.page}
        >
            <PageChrome model={model} />
            <ScopeMethodologyPdf model={model} />
        </Page>

        {model.findings.length > 0 && (
            <Page
                size="A4"
                style={reportPdfStyles.page}
            >
                <PageChrome model={model} />
                <FindingsSummaryPdf findings={model.findings} />
            </Page>
        )}

        {model.findings.length > 0 && (
            <Page
                size="A4"
                style={reportPdfStyles.page}
            >
                <PageChrome model={model} />
                <FindingsDetailPdf findings={model.findings} />
            </Page>
        )}

        {model.sectionsTitle && model.sections.length > 0 && (
            <Page
                size="A4"
                style={reportPdfStyles.page}
            >
                <PageChrome model={model} />
                <View id="methodology">
                    <Text style={reportPdfStyles.sectionHeading}>{model.sectionsTitle}</Text>
                    <View style={reportPdfStyles.sectionDivider} />
                </View>
                {model.sections.map((section) => (
                    <SectionPdf
                        key={section.id}
                        section={section}
                    />
                ))}
            </Page>
        )}

        <Page
            size="A4"
            style={reportPdfStyles.page}
        >
            <PageChrome model={model} />
            <AppendixPdf />
        </Page>
    </Document>
);

export default ReportDocument;
