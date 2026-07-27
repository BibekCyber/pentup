import { StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { TargetType } from '@/graphql/types';
import { getEngagementLabel } from '@/lib/target-type-colors';

import { CF_PDF } from './cf-brand';
import { Bullets } from './pdf-primitives';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    activity: {
        color: CF_PDF.body,
        flex: 1,
        fontSize: 9.5,
        lineHeight: 1.5,
    },
    activityLabel: {
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
    },
    intro: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.6,
        marginBottom: 12,
    },
    table: {
        marginTop: 4,
    },
    // Borderless table: green header row, white body.
    tCell: {
        color: CF_PDF.body,
        fontSize: 9.5,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    tHead: {
        backgroundColor: CF_PDF.greenBar,
        flexDirection: 'row',
    },
    tHeadCell: {
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        letterSpacing: 0.4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        textTransform: 'uppercase',
    },
    tRow: {
        backgroundColor: CF_PDF.white,
        flexDirection: 'row',
    },
    tRowAlt: {
        backgroundColor: '#f4f7f9',
        flexDirection: 'row',
    },
});

const WEB_ACTIVITIES = [
    'Discovery & Mapping — identification of application workflows, endpoints, parameters, and exposed functionality.',
    'Access Control Testing — review of authentication, session handling, authorization, and privilege-escalation scenarios.',
    'Vulnerability Testing — validation of input handling, injection risks, insecure configurations, security headers, CORS, and API-specific weaknesses.',
    'Manual Validation — business-logic review, exploitation verification, risk rating, and documentation of confirmed findings.',
];

interface ScopeMethodologyPdfProps {
    model: ReportModel;
}

const ScopeMethodologyPdf = ({ model }: ScopeMethodologyPdfProps) => {
    const isCloud = model.flow.targetType === TargetType.Cloud;
    const engagementLabel = getEngagementLabel(model.flow.targetType) || 'Web Application';

    // In-scope assets: the distinct hosts across the findings (a multi-host engagement
    // lists several rows; a single-host one lists just that host). Falls back to the
    // derived flow target when no finding URLs are available.
    const targets = (() => {
        const hosts = new Set<string>();

        for (const finding of model.findings) {
            for (const url of finding.affectedUrls ?? []) {
                try {
                    hosts.add(new URL(url).hostname);
                } catch {
                    if (url.trim()) {
                        hosts.add(url.trim());
                    }
                }
            }
        }

        const list = [...hosts];

        return list.length > 0 ? list : [model.flow.target || 'In-scope assets'];
    })();

    return (
        <View id="scope">
            <Text style={reportPdfStyles.sectionHeading}>Scope &amp; Methodology</Text>
            <View style={reportPdfStyles.sectionDivider} />

            {isCloud ? (
                <Text style={styles.intro}>
                    The assessment covered the in-scope cloud infrastructure assets using a risk-based testing approach
                    aligned with cloud security best practices and the CIS Benchmarks. A combination of automated
                    tooling and manual testing techniques was employed to identify and validate potential
                    misconfigurations and vulnerabilities. Testing activities included:
                </Text>
            ) : (
                <Text style={styles.intro}>
                    The assessment covered the in-scope Web Application and API assets using a risk-based testing
                    approach aligned with the OWASP Web Security Testing Guide (WSTG) and the OWASP API Security Top 10.
                    A combination of automated tooling and manual testing techniques was employed to identify and
                    validate potential vulnerabilities. Testing activities included:
                </Text>
            )}

            <Bullets items={WEB_ACTIVITIES} />

            <View style={styles.table}>
                <View style={styles.tHead}>
                    <Text style={[styles.tHeadCell, { width: '60%' }]}>Asset / Target</Text>
                    <Text style={[styles.tHeadCell, { width: '40%' }]}>Type</Text>
                </View>
                {targets.map((target, i) => (
                    <View
                        key={target}
                        style={i % 2 === 1 ? styles.tRowAlt : styles.tRow}
                    >
                        <Text style={[styles.tCell, { width: '60%' }]}>{target}</Text>
                        <Text style={[styles.tCell, { width: '40%' }]}>{engagementLabel}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

export default ScopeMethodologyPdf;
