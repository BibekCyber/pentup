import type { ReactNode } from 'react';

import { Document, Image, Page, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { getEngagementLabel } from '@/lib/target-type-colors';

import AppendixPdf from './appendix-pdf';
import { CF_LOGO_DATA_URI, CF_PDF } from './cf-brand';
import CoverConfidentiality from './confidentiality-pdf';
import CoverPage from './cover-page';
import DocumentHistoryPdf from './document-history-pdf';
import ExecutiveSummaryPdf from './executive-summary-pdf';
import FindingCardPdf from './finding-card-pdf';
import FindingsSummaryPdf from './findings-summary-pdf';
import ScopeMethodologyPdf from './scope-methodology-pdf';
import { PDF_BRAND_NAME, reportPdfStyles } from './styles';
import TocPdf from './toc-pdf';

interface ReportDocumentProps {
    model: ReportModel;
}

// A content page with the running header/footer bands and page number. The chrome is
// INLINED here (not in a nested child component): react-pdf's render() page-number
// callback only fires when it and the fixed chrome are direct children of <Page>.
// Declared at module scope so it isn't recreated on every render.
const Sheet = ({ children, model }: { children: ReactNode; model: ReportModel }) => {
    const issued = new Date(model.generatedAt);
    const year = Number.isNaN(issued.getTime()) ? '' : issued.getFullYear();
    const client = model.clientName?.trim() || 'Client';

    return (
        <Page
            size="A4"
            style={reportPdfStyles.page}
        >
            <View
                fixed
                style={reportPdfStyles.chromeHeader}
            >
                <Image
                    src={CF_LOGO_DATA_URI}
                    style={reportPdfStyles.chromeHeaderLogo}
                />
                <Text style={reportPdfStyles.chromeHeaderTitle}>
                    {client} · Pentest · {year}
                </Text>
            </View>
            <View
                fixed
                style={reportPdfStyles.chromeFooter}
            >
                <Text style={reportPdfStyles.chromeFooterText}>Confidential — prepared by {PDF_BRAND_NAME}</Text>
            </View>
            <Text
                fixed
                render={({ pageNumber }) => `${pageNumber} | Page`}
                style={reportPdfStyles.chromeFooterPage}
            />
            {children}
        </Page>
    );
};

// White-labelled for CyberFortify. One Page per top-level section (every heading
// starts fresh), and one Page per detailed finding, mirroring the client template.
const ReportDocument = ({ model }: ReportDocumentProps) => {
    const engagement = getEngagementLabel(model.flow.targetType) || 'Web Application';
    const detailTitle = `Detailed Findings — ${engagement}`;
    const [firstFinding, ...restFindings] = model.findings;

    return (
        <Document
            author="CyberFortify"
            title={getEngagementLabel(model.flow.targetType) || model.flow.title}
        >
            <CoverPage model={model} />

            <Sheet model={model}>
                <CoverConfidentiality model={model} />
            </Sheet>

            <Sheet model={model}>
                <DocumentHistoryPdf model={model} />
            </Sheet>

            <Sheet model={model}>
                <TocPdf model={model} />
            </Sheet>

            <Sheet model={model}>
                <ExecutiveSummaryPdf model={model} />
            </Sheet>

            <Sheet model={model}>
                <ScopeMethodologyPdf model={model} />
            </Sheet>

            {model.findings.length > 0 && (
                <>
                    <Sheet model={model}>
                        <FindingsSummaryPdf findings={model.findings} />
                    </Sheet>

                    {/* Detailed findings: banner + first finding share a page; each
                        subsequent finding starts its own page. */}
                    <Sheet model={model}>
                        <View id="detailed-findings">
                            <Text style={[reportPdfStyles.sectionHeading, { textTransform: 'uppercase' }]}>
                                {detailTitle}
                            </Text>
                            <View style={reportPdfStyles.sectionDivider} />
                            <Text
                                style={{
                                    color: CF_PDF.muted,
                                    fontSize: 8.5,
                                    lineHeight: 1.5,
                                    marginBottom: 12,
                                }}
                            >
                                Please note: the risk ratings in the following findings are technical. Statements about
                                business risk are best estimates and depend on circumstances not fully known at the time
                                of assessment.
                            </Text>
                            {firstFinding && (
                                <View id={firstFinding.id}>
                                    <FindingCardPdf finding={firstFinding} />
                                </View>
                            )}
                        </View>
                    </Sheet>

                    {restFindings.map((finding) => (
                        <Sheet
                            key={finding.id}
                            model={model}
                        >
                            <View id={finding.id}>
                                <FindingCardPdf finding={finding} />
                            </View>
                        </Sheet>
                    ))}
                </>
            )}

            <Sheet model={model}>
                <AppendixPdf />
            </Sheet>
        </Document>
    );
};

export default ReportDocument;
