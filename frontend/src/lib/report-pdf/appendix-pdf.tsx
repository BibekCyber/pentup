import { StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Severity } from '@/lib/report-model';

import { getSeverityStyle } from '@/lib/severity-palette';

import { CF_PDF } from './cf-brand';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    // --- Body text ---
    cell: {
        color: CF_PDF.body,
        fontSize: 9,
        paddingHorizontal: 8,
        paddingVertical: 7,
    },
    // --- Risk-level chip row (light fill, coloured bold text) ---
    chip: {
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        flex: 1,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        justifyContent: 'center',
        paddingVertical: 8,
        textAlign: 'center',
    },
    chipRow: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 8,
        marginTop: 6,
    },
    // --- Definition list (Overall Risk) with coloured labels ---
    defBody: {
        flex: 1,
    },
    defDesc: {
        color: CF_PDF.body,
        fontSize: 9.5,
        lineHeight: 1.5,
    },
    defItem: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    defLabel: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 9.5,
        marginBottom: 1,
    },
    defMarker: {
        color: CF_PDF.ink,
        fontSize: 9.5,
        minWidth: 14,
    },
    footnote: {
        color: CF_PDF.body,
        fontSize: 8.5,
        fontStyle: 'italic',
        lineHeight: 1.5,
        marginBottom: 8,
    },
    // --- Criteria table (B) ---
    headCell: {
        backgroundColor: CF_PDF.lime,
        color: CF_PDF.limeText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        letterSpacing: 0.4,
        paddingHorizontal: 8,
        paddingVertical: 7,
        textTransform: 'uppercase',
    },
    headRow: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 2,
    },
    intro: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.6,
        marginBottom: 8,
    },
    // --- Simple bullet list (methodology) ---
    liItem: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    liLabel: {
        color: CF_PDF.ink,
        fontFamily: 'Helvetica-Bold',
        width: 80,
    },
    liMarker: {
        color: CF_PDF.ink,
        fontSize: 9.5,
        minWidth: 16,
    },
    liText: {
        color: CF_PDF.body,
        flex: 1,
        fontSize: 9.5,
        lineHeight: 1.5,
    },
    matrix: {
        marginBottom: 12,
        marginTop: 4,
    },
    // --- Risk matrix (image replica) ---
    mAxisLabel: {
        alignItems: 'center',
        backgroundColor: CF_PDF.lime,
        justifyContent: 'center',
    },
    mAxisText: {
        color: CF_PDF.ink,
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
    },
    mCell: {
        alignItems: 'center',
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
        justifyContent: 'center',
        paddingVertical: 11,
        textAlign: 'center',
    },
    mHeadWhite: {
        alignItems: 'center',
        color: CF_PDF.ink,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
        justifyContent: 'center',
        paddingVertical: 6,
        textAlign: 'center',
    },
    row: {
        backgroundColor: CF_PDF.white,
        flexDirection: 'row',
        gap: 2,
        marginBottom: 2,
    },
    sevCell: {
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        paddingHorizontal: 8,
        paddingVertical: 7,
        textAlign: 'center',
    },
    subHeading: {
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 11.5,
        marginBottom: 6,
        marginTop: 14,
    },
});

// 3x3 risk matrix (impact rows x probability columns) -> resulting severity.
const MATRIX: Severity[][] = [
    ['low', 'low', 'medium'], // impact Low
    ['low', 'medium', 'high'], // impact Medium
    ['medium', 'high', 'critical'], // impact High
];
const LEVELS = ['Low', 'Medium', 'High'];

const CHIP_LEVELS: { label: string; severity: Severity }[] = [
    { label: 'Informational*', severity: 'informational' },
    { label: 'Low', severity: 'low' },
    { label: 'Medium', severity: 'medium' },
    { label: 'High', severity: 'high' },
    { label: 'Critical', severity: 'critical' },
];

const IMPACT_LEVELS: [string, string][] = [
    ['Low', 'Minimal or no significant effect.'],
    ['Medium', 'Noticeable impact with moderate consequences.'],
    ['High', 'Severe impact affecting critical systems or sensitive data.'],
];

const EVAL_FACTORS: [string, string][] = [
    ['Impact', 'The extent of damage a vulnerability could cause if exploited.'],
    ['Likelihood', 'The probability that a vulnerability will be successfully exploited.'],
];

const RISK_DEFS: { desc: string; label: string; severity: Severity }[] = [
    {
        desc: 'These findings do not pose an immediate security risk but highlight areas for improvement. They may include deviations from best practices, minor misconfigurations, or observations that could contribute to security weaknesses over time if left unaddressed.',
        label: 'Informational',
        severity: 'informational',
    },
    {
        desc: 'Low-risk issues generally have minimal impact and are unlikely to be exploited. While they do not pose a significant threat, addressing them can help improve overall security hygiene.',
        label: 'Low Risk',
        severity: 'low',
    },
    {
        desc: 'Medium-risk vulnerabilities may lead to moderate impact if exploited or have a reasonable likelihood of exploitation. These should be addressed in a timely manner to prevent escalation.',
        label: 'Medium Risk',
        severity: 'medium',
    },
    {
        desc: 'High-risk vulnerabilities have a strong likelihood of exploitation or can result in significant damage, such as unauthorized access or disruption of services. These require prompt remediation.',
        label: 'High Risk',
        severity: 'high',
    },
    {
        desc: 'Critical vulnerabilities represent severe security issues that can lead to major consequences, including data breaches, complete system compromise, or significant business impact. Immediate action is strongly recommended.',
        label: 'Critical Risk',
        severity: 'critical',
    },
];

const CRITERIA: { description: string; range: string; severity: Severity; sla: string }[] = [
    {
        description: 'Full compromise possible. Immediate exploitation risk.',
        range: '9.0 – 10.0',
        severity: 'critical',
        sla: '24 – 48 hrs',
    },
    {
        description: 'Significant risk. Likely exploitation in the wild.',
        range: '7.0 – 8.9',
        severity: 'high',
        sla: '7 days',
    },
    { description: 'Exploitable under certain conditions.', range: '4.0 – 6.9', severity: 'medium', sla: '30 days' },
    { description: 'Minimal direct impact may assist chaining.', range: '0.1 – 3.9', severity: 'low', sla: '90 days' },
    {
        description: 'Best-practice observation. No direct exploitability.',
        range: '0.0',
        severity: 'informational',
        sla: 'Next cycle',
    },
];

// The risk matrix, replicating the client report: a lime "Risk/Probability/Impact"
// frame around a yellow->red heatmap, with white gaps between cells.
const RiskMatrix = () => (
    <View style={styles.matrix}>
        {/* Header block: Risk (left, tall) + Probability over Low/Medium/High */}
        <View style={{ flexDirection: 'row', gap: 2, marginBottom: 2 }}>
            <View style={[styles.mAxisLabel, { flex: 25 }]}>
                <Text style={styles.mAxisText}>Risk</Text>
            </View>
            <View style={{ flex: 73 }}>
                <View style={[styles.mAxisLabel, { marginBottom: 2, paddingVertical: 6 }]}>
                    <Text style={styles.mAxisText}>Probability</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                    {LEVELS.map((level) => (
                        <Text
                            key={level}
                            style={[styles.mHeadWhite, { backgroundColor: '#f3f4f6', flex: 1 }]}
                        >
                            {level}
                        </Text>
                    ))}
                </View>
            </View>
        </View>

        {/* Data block: Impact (left, tall) + level labels + heatmap cells */}
        <View style={{ flexDirection: 'row', gap: 2 }}>
            <View style={[styles.mAxisLabel, { flex: 8 }]}>
                <Text style={[styles.mAxisText, { transform: 'rotate(270deg)' }]}>Impact</Text>
            </View>
            <View style={{ flex: 90 }}>
                {MATRIX.map((cells, r) => (
                    <View
                        key={LEVELS[r]}
                        style={{ flexDirection: 'row', gap: 2, marginBottom: 2 }}
                    >
                        <Text
                            style={[styles.mHeadWhite, { backgroundColor: '#f3f4f6', flex: 17, paddingVertical: 11 }]}
                        >
                            {LEVELS[r]}
                        </Text>
                        {cells.map((sev, c) => (
                            <Text
                                key={LEVELS[c]}
                                style={[styles.mCell, { backgroundColor: getSeverityStyle(sev).pdf.solid, flex: 24 }]}
                            >
                                {getSeverityStyle(sev).label}
                            </Text>
                        ))}
                    </View>
                ))}
            </View>
        </View>
    </View>
);

const AppendixPdf = () => (
    <View id="appendix">
        <Text style={reportPdfStyles.sectionHeading}>Appendix</Text>
        <View style={reportPdfStyles.sectionDivider} />

        <Text style={styles.subHeading}>A. Risk Rating Matrix</Text>
        <Text style={styles.intro}>
            For each identified vulnerability, the risk level is determined using a structured matrix based on two key
            factors:
        </Text>
        <View style={styles.liItem}>
            <Text style={styles.liMarker}>•</Text>
            <Text style={styles.liText}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>Impact</Text> — Select the appropriate row based on the
                severity of the potential impact.
            </Text>
        </View>
        <View style={styles.liItem}>
            <Text style={styles.liMarker}>•</Text>
            <Text style={styles.liText}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>Likelihood (Probability)</Text> — Select the appropriate
                column based on the likelihood of exploitation.
            </Text>
        </View>
        <View style={[styles.liItem, { marginBottom: 10 }]}>
            <Text style={styles.liMarker}>•</Text>
            <Text style={styles.liText}>The intersection of these two values provides the overall risk rating.</Text>
        </View>

        <RiskMatrix />

        <Text style={styles.subHeading}>Purpose of the Risk Matrix</Text>
        <Text style={styles.intro}>
            This matrix serves as a simplified visual model to help classify and prioritize vulnerabilities based on
            their potential business impact and likelihood of exploitation. It is important to note that risk perception
            varies across organizations; therefore, this model can be tailored to align with specific business
            requirements. For this assessment, the following risk levels are used:
        </Text>

        <View style={styles.chipRow}>
            {CHIP_LEVELS.map((chip) => (
                <Text
                    key={chip.label}
                    style={[styles.chip, { color: getSeverityStyle(chip.severity).pdf.text }]}
                >
                    {chip.label}
                </Text>
            ))}
        </View>
        <Text style={styles.footnote}>
            *Informational findings are not considered direct risks but highlight observations that may be useful for
            improving security posture.
        </Text>

        <Text
            minPresenceAhead={90}
            style={styles.subHeading}
        >
            Risk Evaluation Methodology
        </Text>
        <Text style={styles.intro}>The overall risk rating is derived from the combination of:</Text>
        {EVAL_FACTORS.map(([label, desc]) => (
            <View
                key={label}
                style={styles.liItem}
            >
                <Text style={styles.liMarker}>•</Text>
                <Text style={styles.liLabel}>{label}</Text>
                <Text style={styles.liText}>{desc}</Text>
            </View>
        ))}
        <Text style={[styles.intro, { marginTop: 6 }]}>
            These two factors are assessed independently and then mapped to the matrix to determine the final risk
            level.
        </Text>

        <Text
            minPresenceAhead={90}
            style={styles.subHeading}
        >
            Impact
        </Text>
        <Text style={styles.intro}>
            Impact reflects the potential consequences of a successful attack. This may range from negligible effects to
            severe outcomes such as data breaches or full system compromise. Impact levels are categorized as:
        </Text>
        {IMPACT_LEVELS.map(([label, desc]) => (
            <View
                key={label}
                style={styles.liItem}
            >
                <Text style={styles.liMarker}>•</Text>
                <Text style={styles.liLabel}>{label}</Text>
                <Text style={styles.liText}>{desc}</Text>
            </View>
        ))}

        <Text
            minPresenceAhead={90}
            style={styles.subHeading}
        >
            Likelihood (Probability)
        </Text>
        <Text style={styles.intro}>
            Likelihood represents the probability that a vulnerability will be exploited under real-world conditions.
            This assessment considers factors such as how easy the vulnerability is to exploit, how accessible the
            affected component is, the business importance of the impacted asset, and the overall complexity of the
            system and network environment. Based on this evaluation, likelihood is classified as Low, Medium, or High.
        </Text>

        <Text
            minPresenceAhead={140}
            style={styles.subHeading}
        >
            Overall Risk
        </Text>
        <Text style={styles.intro}>
            The overall risk rating is determined by combining the assessed impact and likelihood values and mapping
            them to the defined risk rating matrix. This provides a consistent method for prioritizing vulnerabilities
            based on their potential effect on the organization. The risk levels used in this report are defined as
            follows:
        </Text>
        {RISK_DEFS.map((def) => (
            <View
                key={def.label}
                style={styles.defItem}
                wrap={false}
            >
                <Text style={styles.defMarker}>•</Text>
                <View style={styles.defBody}>
                    <Text style={[styles.defLabel, { color: getSeverityStyle(def.severity).pdf.text }]}>
                        {def.label}
                    </Text>
                    <Text style={styles.defDesc}>{def.desc}</Text>
                </View>
            </View>
        ))}

        <Text
            minPresenceAhead={110}
            style={styles.subHeading}
        >
            B. Risk Rating Criteria
        </Text>
        <View style={styles.headRow}>
            <Text style={[styles.headCell, { width: '18%' }]}>Severity</Text>
            <Text style={[styles.headCell, { width: '17%' }]}>CVSS Range</Text>
            <Text style={[styles.headCell, { width: '45%' }]}>Description</Text>
            <Text style={[styles.headCell, { width: '18%' }]}>Remediation SLA</Text>
        </View>
        {CRITERIA.map((item) => {
            const style = getSeverityStyle(item.severity);

            return (
                <View
                    key={item.severity}
                    style={styles.row}
                >
                    <Text
                        style={[
                            styles.sevCell,
                            { backgroundColor: style.pdf.solid, color: style.pdf.onSolid, width: '18%' },
                        ]}
                    >
                        {style.label === 'Informational' ? 'INFO' : style.label.toUpperCase()}
                    </Text>
                    <Text style={[styles.cell, { backgroundColor: '#f3f4f6', width: '17%' }]}>{item.range}</Text>
                    <Text style={[styles.cell, { backgroundColor: '#f3f4f6', width: '45%' }]}>{item.description}</Text>
                    <Text style={[styles.cell, { backgroundColor: '#f3f4f6', width: '18%' }]}>{item.sla}</Text>
                </View>
            );
        })}
    </View>
);

export default AppendixPdf;
