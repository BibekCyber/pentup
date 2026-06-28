import { Document, Page, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import CoverPage from './cover-page';
import ExecutiveSummaryPdf from './executive-summary-pdf';
import FindingsSummaryPdf from './findings-summary-pdf';
import PageChrome from './page-chrome';
import SectionPdf from './section-pdf';
import { reportPdfStyles } from './styles';
import TocPdf from './toc-pdf';

interface ReportDocumentProps {
    model: ReportModel;
}

const ReportDocument = ({ model }: ReportDocumentProps) => (
    <Document author="PentAGI" title={model.flow.title}>
        <CoverPage model={model} />

        <Page size="A4" style={reportPdfStyles.page}>
            <PageChrome model={model} />

            <TocPdf model={model} />

            <View style={{ marginTop: 18 }}>
                <ExecutiveSummaryPdf model={model} />
            </View>

            {model.findings.length > 0 && (
                <View style={{ marginTop: 18 }}>
                    <FindingsSummaryPdf findings={model.findings} />
                </View>
            )}

            {model.sections.map((section) => (
                <SectionPdf key={section.id} section={section} />
            ))}
        </Page>
    </Document>
);

export default ReportDocument;
