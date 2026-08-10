import { Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { TargetType } from '@/graphql/types';
import { deriveScopeTargets } from '@/lib/build-report-model';
import { getEngagementLabel } from '@/lib/target-type-colors';

import { CF_PDF } from './cf-brand';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    activityItem: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    activityLabel: {
        color: CF_PDF.ink,
        fontFamily: 'Helvetica-Bold',
    },
    activityMarker: {
        color: CF_PDF.ink,
        fontSize: 9.5,
        minWidth: 14,
    },
    activityText: {
        color: CF_PDF.body,
        flex: 1,
        fontSize: 9.5,
        lineHeight: 1.5,
    },
    intro: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.6,
        marginBottom: 10,
    },
    lead: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.6,
        marginBottom: 6,
        marginTop: 4,
    },
    table: {
        marginTop: 4,
    },
    tCell: {
        color: CF_PDF.body,
        fontSize: 9.5,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    tCellFill: {
        backgroundColor: '#f3f4f6',
        color: CF_PDF.ink,
        fontSize: 9,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    tHead: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 2,
    },
    tHeadCell: {
        backgroundColor: CF_PDF.lime,
        color: CF_PDF.limeText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        letterSpacing: 0.4,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    tLink: {
        backgroundColor: '#f3f4f6',
        color: CF_PDF.ink,
        fontSize: 9,
        paddingHorizontal: 10,
        paddingVertical: 7,
        textDecoration: 'none',
    },
    tRow: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 2,
    },
});

const WEB_ACTIVITIES: { desc: string; label: string }[] = [
    {
        desc: 'Identification of application workflows, endpoints, parameters, authentication flows, and exposed functionality.',
        label: 'Discovery & Mapping',
    },
    {
        desc: 'Review of login behaviour, authentication, JWT/session handling, session expiration, logout behaviour, and token revocation.',
        label: 'Authentication & Session Testing',
    },
    {
        desc: 'Validation of user authorisation controls across sensitive functions and user-specific resources, including privilege-escalation scenarios.',
        label: 'Access Control Testing',
    },
    {
        desc: 'Validation of input handling, injection risks, insecure configurations, security headers, CORS, and API-specific weaknesses.',
        label: 'Vulnerability Testing',
    },
    {
        desc: 'Review of security headers, TLS configuration, rate-limiting behaviour, exposed service information, and general hardening controls.',
        label: 'Configuration Review',
    },
    {
        desc: 'Verification of exploitability, assessment of business impact, risk rating, and documentation of confirmed findings.',
        label: 'Manual Validation',
    },
];

interface ScopeMethodologyPdfProps {
    model: ReportModel;
}

const ScopeMethodologyPdf = ({ model }: ScopeMethodologyPdfProps) => {
    const isCloud = model.flow.targetType === TargetType.Cloud;
    const engagementLabel = getEngagementLabel(model.flow.targetType) || 'Web Application';

    const targets = deriveScopeTargets(model.findings, model.flow.target);

    return (
        <View id="scope">
            <Text style={reportPdfStyles.sectionHeading}>Scope &amp; Methodology</Text>
            <View style={reportPdfStyles.sectionDivider} />

            {isCloud ? (
                <Text style={styles.intro}>
                    The assessment covered the in-scope cloud infrastructure assets. Testing followed a risk-based
                    approach aligned with cloud security best practices and the CIS Benchmarks, using a combination of
                    automated tooling and manual techniques to identify and validate misconfigurations and
                    vulnerabilities.
                </Text>
            ) : (
                <Text style={styles.intro}>
                    The assessment covered the in-scope Web Application and API assets. Testing was focused on the
                    functionality available through the provided assets and followed a risk-based approach aligned with
                    the OWASP Web Security Testing Guide (WSTG) and the OWASP API Security Top 10, using a combination
                    of automated tooling and manual techniques.
                </Text>
            )}

            <Text style={styles.lead}>Testing activities included:</Text>
            {WEB_ACTIVITIES.map((activity) => (
                <View
                    key={activity.label}
                    style={styles.activityItem}
                >
                    <Text style={styles.activityMarker}>•</Text>
                    <Text style={styles.activityText}>
                        <Text style={styles.activityLabel}>{activity.label}: </Text>
                        {activity.desc}
                    </Text>
                </View>
            ))}

            <Text style={[styles.lead, { marginTop: 10 }]}>
                The assessment was conducted with the following assets in the scope.
            </Text>
            <View style={styles.table}>
                <View style={styles.tHead}>
                    <Text style={[styles.tHeadCell, { flex: 35 }]}>Assets</Text>
                    <Text style={[styles.tHeadCell, { flex: 63 }]}>URLs</Text>
                </View>
                {targets.map((target, i) => (
                    <View
                        key={target}
                        style={styles.tRow}
                    >
                        <Text style={[styles.tCellFill, { flex: 35 }]}>{i === 0 ? engagementLabel : ''}</Text>
                        {target.startsWith('http') ? (
                            <Link
                                src={target}
                                style={[styles.tLink, { flex: 63 }]}
                            >
                                {target}
                            </Link>
                        ) : (
                            <Text style={[styles.tCellFill, { flex: 63 }]}>{target}</Text>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
};

export default ScopeMethodologyPdf;
