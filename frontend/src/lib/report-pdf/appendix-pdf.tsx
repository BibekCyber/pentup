import { StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Severity } from '@/lib/report-model';

import { getSeverityStyle } from '@/lib/severity-palette';

import { CF_PDF } from './cf-brand';
import { Bullets } from './pdf-primitives';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    cell: {
        color: CF_PDF.body,
        fontSize: 9,
        paddingHorizontal: 8,
        paddingVertical: 7,
    },
    chip: {
        alignItems: 'center',
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        justifyContent: 'center',
        paddingVertical: 7,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 3,
        marginBottom: 6,
        marginTop: 4,
    },
    footnote: {
        color: CF_PDF.muted,
        fontSize: 8.5,
        lineHeight: 1.5,
        marginBottom: 8,
    },
    headCell: {
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        letterSpacing: 0.4,
        paddingHorizontal: 8,
        paddingVertical: 7,
        textTransform: 'uppercase',
    },
    headRow: {
        backgroundColor: CF_PDF.greenBar,
        flexDirection: 'row',
    },
    intro: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.6,
        marginBottom: 10,
    },
    matrixAxis: {
        alignItems: 'center',
        backgroundColor: CF_PDF.greenBar,
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        justifyContent: 'center',
        paddingVertical: 8,
        textAlign: 'center',
        width: '25%',
    },
    matrixCell: {
        alignItems: 'center',
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        justifyContent: 'center',
        paddingVertical: 8,
        textAlign: 'center',
        width: '25%',
    },
    matrixRow: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 2,
    },
    row: {
        backgroundColor: CF_PDF.white,
        flexDirection: 'row',
    },
    rowAlt: {
        backgroundColor: '#f4f7f9',
        flexDirection: 'row',
    },
    sevCell: {
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        paddingHorizontal: 8,
        paddingVertical: 7,
    },
    subHeading: {
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 11.5,
        marginBottom: 6,
        marginTop: 14,
    },
    subSubHeading: {
        color: CF_PDF.navy,
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
        marginBottom: 4,
        marginTop: 10,
    },
});

// 3x3 risk matrix (impact rows x probability columns) -> resulting severity.
const MATRIX: Severity[][] = [
    ['low', 'low', 'medium'], // impact Low
    ['low', 'medium', 'high'], // impact Medium
    ['medium', 'high', 'critical'], // impact High
];
const IMPACT_ROWS = ['Low', 'Medium', 'High'];
const PROB_COLS = ['Low', 'Medium', 'High'];

// Risk-level chip row, in ascending order per the template.
const CHIP_LEVELS: { label: string; severity: Severity }[] = [
    { label: 'Informational*', severity: 'informational' },
    { label: 'Low', severity: 'low' },
    { label: 'Medium', severity: 'medium' },
    { label: 'High', severity: 'high' },
    { label: 'Critical', severity: 'critical' },
];

const IMPACT_LEVELS = [
    'Low — minimal or no significant effect.',
    'Medium — noticeable impact with moderate consequences.',
    'High — severe impact affecting critical systems or sensitive data.',
];

const RISK_DEFINITIONS = [
    'Informational — these findings do not pose an immediate security risk but highlight areas for improvement. They may include deviations from best practices, minor misconfigurations, or observations that could contribute to security weaknesses over time if left unaddressed.',
    'Low Risk — low-risk issues generally have minimal impact and are unlikely to be exploited. While they do not pose a significant threat, addressing them can help improve overall security hygiene.',
    'Medium Risk — medium-risk vulnerabilities may lead to moderate impact if exploited or have a reasonable likelihood of exploitation. These should be addressed in a timely manner to prevent escalation.',
    'High Risk — high-risk vulnerabilities have a strong likelihood of exploitation or can result in significant damage, such as unauthorized access or disruption of services. These require prompt remediation.',
    'Critical Risk — critical vulnerabilities represent severe security issues that can lead to major consequences, including data breaches, complete system compromise, or significant business impact. Immediate action is strongly recommended.',
];

const CRITERIA: { description: string; range: string; severity: Severity; sla: string }[] = [
    { description: 'Full compromise possible. Immediate exploitation risk.', range: '9.0 – 10.0', severity: 'critical', sla: '24 – 48 hrs' },
    { description: 'Significant risk. Likely exploitation in the wild.', range: '7.0 – 8.9', severity: 'high', sla: '7 days' },
    { description: 'Exploitable under certain conditions.', range: '4.0 – 6.9', severity: 'medium', sla: '30 days' },
    { description: 'Minimal direct impact, may assist chaining.', range: '0.1 – 3.9', severity: 'low', sla: '90 days' },
    { description: 'Best-practice observation. No direct exploitability.', range: '0.0', severity: 'informational', sla: 'Next cycle' },
];

const AppendixPdf = () => (
    <View id="appendix">
        <Text style={reportPdfStyles.sectionHeading}>Appendix</Text>
        <View style={reportPdfStyles.sectionDivider} />

        <Text style={styles.subHeading}>A. Risk Rating Matrix</Text>
        <Text style={styles.intro}>
            For each identified vulnerability, the risk level is determined using a structured matrix based on two key
            factors. Impact — the severity of the potential impact — selects the appropriate row, and Likelihood
            (Probability) — the likelihood of exploitation — selects the appropriate column. The intersection of these
            two values provides the overall risk rating.
        </Text>

        {/* Header row: corner + probability columns */}
        <View style={styles.matrixRow}>
            <Text style={styles.matrixAxis}>Impact / Prob.</Text>
            {PROB_COLS.map((col) => (
                <Text
                    key={col}
                    style={styles.matrixAxis}
                >
                    {col}
                </Text>
            ))}
        </View>
        {MATRIX.map((cells, r) => (
            <View
                key={IMPACT_ROWS[r]}
                style={styles.matrixRow}
            >
                <Text style={styles.matrixAxis}>{IMPACT_ROWS[r]}</Text>
                {cells.map((sev, c) => (
                    <Text
                        key={PROB_COLS[c]}
                        style={[styles.matrixCell, { backgroundColor: getSeverityStyle(sev).pdf.solid }]}
                    >
                        {getSeverityStyle(sev).label}
                    </Text>
                ))}
            </View>
        ))}

        <Text style={[styles.intro, { marginTop: 10 }]}>
            This matrix serves as a simplified visual model to help classify and prioritise vulnerabilities based on
            their potential business impact and likelihood of exploitation. Risk perception varies across organisations;
            therefore, this model can be tailored to align with specific business requirements. For this assessment, the
            following risk levels are used:
        </Text>

        <View style={styles.chipRow}>
            {CHIP_LEVELS.map((chip) => (
                <Text
                    key={chip.label}
                    style={[styles.chip, { backgroundColor: getSeverityStyle(chip.severity).pdf.solid }]}
                >
                    {chip.label}
                </Text>
            ))}
        </View>
        <Text style={styles.footnote}>
            * Informational findings are not considered direct risks but highlight observations that may be useful for
            improving security posture.
        </Text>

        <Text style={styles.subHeading}>Risk Evaluation Methodology</Text>
        <Text style={styles.intro}>
            The overall risk rating is derived from the combination of Impact — the extent of damage a vulnerability
            could cause if exploited — and Likelihood — the probability that the vulnerability will be successfully
            exploited. These two factors are assessed independently and then mapped to the matrix above to determine the
            final risk level.
        </Text>

        <Text style={styles.subSubHeading}>Impact</Text>
        <Text style={styles.intro}>
            Impact reflects the potential consequences of a successful attack. This may range from negligible effects to
            severe outcomes such as data breaches or full system compromise. Impact levels are categorised as:
        </Text>
        <Bullets items={IMPACT_LEVELS} />

        <Text style={styles.subSubHeading}>Likelihood (Probability)</Text>
        <Text style={styles.intro}>
            Likelihood represents the probability that a vulnerability will be exploited under real-world conditions.
            This assessment considers factors such as how easy the vulnerability is to exploit, how accessible the
            affected component is, the business importance of the impacted asset, and the overall complexity of the
            system and network environment. Based on this evaluation, likelihood is classified as Low, Medium, or High.
        </Text>

        <Text style={styles.subSubHeading}>Overall Risk</Text>
        <Text style={styles.intro}>
            The overall risk rating is determined by combining the assessed impact and likelihood values and mapping them
            to the defined risk rating matrix. This provides a consistent method for prioritising vulnerabilities based
            on their potential effect on the organisation. The risk levels used in this report are defined as follows:
        </Text>
        <Bullets items={RISK_DEFINITIONS} />

        <Text style={styles.subHeading}>B. Risk Rating Criteria</Text>
        <View style={styles.headRow}>
            <Text style={[styles.headCell, { width: '18%' }]}>Severity</Text>
            <Text style={[styles.headCell, { width: '17%' }]}>CVSS Range</Text>
            <Text style={[styles.headCell, { width: '47%' }]}>Description</Text>
            <Text style={[styles.headCell, { width: '18%' }]}>Remediation SLA</Text>
        </View>
        {CRITERIA.map((item, i) => {
            const style = getSeverityStyle(item.severity);

            return (
                <View
                    key={item.severity}
                    style={i % 2 === 1 ? styles.rowAlt : styles.row}
                >
                    <Text style={[styles.sevCell, { backgroundColor: style.pdf.solid, width: '18%' }]}>
                        {style.label.toUpperCase()}
                    </Text>
                    <Text style={[styles.cell, { fontFamily: 'Courier', width: '17%' }]}>{item.range}</Text>
                    <Text style={[styles.cell, { width: '47%' }]}>{item.description}</Text>
                    <Text style={[styles.cell, { width: '18%' }]}>{item.sla}</Text>
                </View>
            );
        })}
    </View>
);

export default AppendixPdf;
