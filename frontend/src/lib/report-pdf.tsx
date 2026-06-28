import { Document, Page, pdf } from '@react-pdf/renderer';

import type { ReportModel } from './report-model';

import { Log } from './log';
import { embedReportScreenshots } from './report-pdf/embed-image';
import { renderMarkdownBlocks } from './report-pdf/markdown-pdf';
import ReportDocumentComponent from './report-pdf/report-document';
import { reportPdfStyles } from './report-pdf/styles';

export { default as ReportDocument } from './report-pdf/report-document';

const triggerDownload = (blob: Blob, fileName: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

// Back-compat: render a plain markdown string into a single, unstyled PDF document.
const PDFReportDocument = ({ content }: { content: string }) => (
    <Document>
        <Page size="A4" style={reportPdfStyles.page}>
            {renderMarkdownBlocks(content)}
        </Page>
    </Document>
);

export const generatePDFFromMarkdownNew = async (content: string, fileName: string): Promise<void> => {
    try {
        const blob = await pdf(<PDFReportDocument content={content} />).toBlob();
        triggerDownload(blob, `${fileName}.pdf`);
    } catch (error) {
        Log.error('Failed to generate PDF:', error);
        throw error;
    }
};

export const generatePDFBlobNew = async (content: string): Promise<Blob> => {
    try {
        return await pdf(<PDFReportDocument content={content} />).toBlob();
    } catch (error) {
        Log.error('Failed to generate PDF blob:', error);
        throw error;
    }
};

export const generateReportPdfBlob = async (model: ReportModel): Promise<Blob> => {
    const embedded = await embedReportScreenshots(model);

    return pdf(<ReportDocumentComponent model={embedded} />).toBlob();
};

export const generateReportPdf = async (model: ReportModel, fileName: string): Promise<void> => {
    try {
        const blob = await generateReportPdfBlob(model);
        triggerDownload(blob, `${fileName}.pdf`);
    } catch (error) {
        Log.error('Failed to generate report PDF:', error);
        throw error;
    }
};
