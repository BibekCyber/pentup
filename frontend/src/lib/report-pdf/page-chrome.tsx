import { Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { getEngagementLabel } from '@/lib/target-type-colors';

import { PDF_BRAND_NAME, reportPdfStyles } from './styles';

const formatDate = (iso: string): string => {
    const date = new Date(iso);

    return Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
};

interface PageChromeProps {
    model: ReportModel;
}

const PageChrome = ({ model }: PageChromeProps) => {
    const engagement = getEngagementLabel(model.flow.targetType);
    const headerTitle = engagement ? `${engagement} · Penetration Test Report` : model.flow.title;
    const footerRight = model.flow.target || engagement || PDF_BRAND_NAME;

    return (
        <>
            <View
                fixed
                style={reportPdfStyles.chromeHeader}
            >
                <View style={reportPdfStyles.chromeRow}>
                    <Text style={reportPdfStyles.chromeHeaderTitle}>{headerTitle}</Text>
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
                    <Text style={reportPdfStyles.chromeFooterText}>Confidential — prepared by {PDF_BRAND_NAME}</Text>
                    <Text style={reportPdfStyles.chromeFooterText}>{footerRight}</Text>
                </View>
            </View>
        </>
    );
};

export default PageChrome;
