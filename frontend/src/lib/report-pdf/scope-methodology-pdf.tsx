import { StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { TargetType } from '@/graphql/types';
import { getEngagementLabel } from '@/lib/target-type-colors';

import { CF_PDF } from './cf-brand';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    activity: {
        color: CF_PDF.body,
        flex: 1,
        fontSize: 9.5,
        lineHeight: 1.5,
    },
    activityLabel: {
        color: CF_PDF.navy,
        fontFamily: 'Helvetica-Bold',
    },
    activityRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 6,
    },
    bullet: {
        backgroundColor: CF_PDF.accent,
        borderRadius: 2,
        height: 4,
        marginTop: 6,
        width: 4,
    },
    intro: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.6,
        marginBottom: 12,
    },
    table: {
        marginTop: 6,
    },
    tCell: {
        color: CF_PDF.body,
        fontSize: 9,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    tHead: {
        backgroundColor: CF_PDF.navy,
        flexDirection: 'row',
    },
    tHeadCell: {
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        letterSpacing: 0.5,
        paddingHorizontal: 8,
        paddingVertical: 6,
        textTransform: 'uppercase',
    },
    tRow: {
        borderBottomColor: CF_PDF.hairline,
        borderBottomWidth: 1,
        borderLeftColor: CF_PDF.hairline,
        borderLeftWidth: 1,
        borderRightColor: CF_PDF.hairline,
        borderRightWidth: 1,
        flexDirection: 'row',
    },
});

const ACTIVITIES = [
    [
        'Discovery & Mapping',
        'Identification of application workflows, endpoints, parameters, and exposed functionality.',
    ],
    [
        'Access Control Testing',
        'Review of authentication, session handling, authorization, and privilege-escalation scenarios.',
    ],
    [
        'Vulnerability Testing',
        'Validation of input handling, injection risks, insecure configurations, security headers, and service-specific weaknesses.',
    ],
    [
        'Manual Validation',
        'Business-logic review, exploitation verification, risk rating, and documentation of confirmed findings.',
    ],
];

interface ScopeMethodologyPdfProps {
    model: ReportModel;
}

const ScopeMethodologyPdf = ({ model }: ScopeMethodologyPdfProps) => {
    const engagement = getEngagementLabel(model.flow.targetType) || 'target';
    const isCloud = model.flow.targetType === TargetType.Cloud;
    const alignment = isCloud
        ? 'a risk-based testing approach aligned with cloud security best practices and the CIS Benchmarks'
        : 'a risk-based testing approach aligned with the OWASP WSTG and OWASP API Security Top 10';

    return (
        <View id="scope">
            <Text style={reportPdfStyles.sectionHeading}>Scope &amp; Methodology</Text>
            <View style={reportPdfStyles.sectionDivider} />

            <Text style={styles.intro}>
                The assessment covered the in-scope {engagement} assets using {alignment}. A combination of automated
                tooling and manual testing techniques was employed to identify and validate potential vulnerabilities.
                Testing activities included:
            </Text>

            {ACTIVITIES.map(([label, desc]) => (
                <View
                    key={label}
                    style={styles.activityRow}
                >
                    <View style={styles.bullet} />
                    <Text style={styles.activity}>
                        <Text style={styles.activityLabel}>{label}: </Text>
                        {desc}
                    </Text>
                </View>
            ))}

            <View style={styles.table}>
                <View style={styles.tHead}>
                    <Text style={[styles.tHeadCell, { width: '55%' }]}>Asset / Target</Text>
                    <Text style={[styles.tHeadCell, { width: '45%' }]}>Type</Text>
                </View>
                <View style={styles.tRow}>
                    <Text style={[styles.tCell, { width: '55%' }]}>{model.flow.target || 'In-scope assets'}</Text>
                    <Text style={[styles.tCell, { width: '45%' }]}>
                        {getEngagementLabel(model.flow.targetType) || '—'}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default ScopeMethodologyPdf;
