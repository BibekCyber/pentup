import { Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { PDF_FOOTER_TEXT, reportPdfStyles } from './styles';

const formatDate = (iso: string): string => {
    const date = new Date(iso);

    return Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
};

interface PageChromeProps {
    model: ReportModel;
}

const PageChrome = ({ model }: PageChromeProps) => (
    <>
        <View
            fixed
            style={reportPdfStyles.chromeHeader}
        >
            <View style={reportPdfStyles.chromeRow}>
                <Text style={reportPdfStyles.chromeHeaderTitle}>{model.flow.title}</Text>
                <Text style={reportPdfStyles.chromeHeaderDate}>{formatDate(model.generatedAt)}</Text>
            </View>
            <View style={[reportPdfStyles.chromeHairline, { marginTop: 5 }]} />
        </View>
        <View
            fixed
            style={reportPdfStyles.chromeFooter}
        >
            <View style={[reportPdfStyles.chromeHairline, { marginBottom: 5 }]} />
            <View style={reportPdfStyles.chromeRow}>
                <Text style={reportPdfStyles.chromeFooterText}>{PDF_FOOTER_TEXT}</Text>
                <Text style={reportPdfStyles.chromeFooterText}>{model.flow.target ?? model.flow.title}</Text>
            </View>
        </View>
    </>
);

export default PageChrome;
