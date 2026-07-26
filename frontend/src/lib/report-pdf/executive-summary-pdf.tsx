import { StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { TargetType } from '@/graphql/types';

import { CF_PDF } from './cf-brand';
import { Bullets } from './pdf-primitives';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    paragraph: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.6,
        marginBottom: 12,
    },
    subHeading: {
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 11.5,
        marginBottom: 6,
        marginTop: 6,
    },
});

interface ExecutiveSummaryPdfProps {
    model: ReportModel;
}

const ExecutiveSummaryPdf = ({ model }: ExecutiveSummaryPdfProps) => {
    const client = model.clientName?.trim() || 'the client';
    const isCloud = model.flow.targetType === TargetType.Cloud;
    const asset = isCloud ? 'cloud infrastructure' : 'web application and associated APIs';

    return (
        <View id="executive-summary">
            <Text style={reportPdfStyles.sectionHeading}>Executive Summary</Text>
            <View style={reportPdfStyles.sectionDivider} />

            <Text style={styles.paragraph}>
                {client} engaged CyberFortify to perform a penetration test of its {asset}. The assessment and reporting
                were conducted within the agreed testing window. The objective was to evaluate the security posture of
                the target environment and determine the extent to which it may be vulnerable to exploitation by
                malicious actors. A combination of automated tooling and manual testing techniques was employed to
                identify potential vulnerabilities. This report presents the findings identified during the assessment,
                along with their associated risks and recommended remediation measures.
            </Text>

            <Text style={[styles.subHeading, { fontSize: 12.5, marginBottom: 8, marginTop: 2 }]}>
                Conclusions and Recommendations
            </Text>

            <Text style={styles.subHeading}>Positive Findings</Text>
            <Bullets items={model.positiveFindings} />

            <View style={{ marginTop: 12 }}>
                <Text style={styles.subHeading}>Initial Recommendations</Text>
                <Bullets items={model.initialRecommendations} />
            </View>
        </View>
    );
};

export default ExecutiveSummaryPdf;
