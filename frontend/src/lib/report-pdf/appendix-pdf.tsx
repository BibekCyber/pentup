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
});

// 3x3 risk matrix (impact rows x probability columns) -> resulting severity.
const MATRIX: Severity[][] = [
    ['low', 'low', 'medium'], // impact Low
    ['low', 'medium', 'high'], // impact Medium
    ['medium', 'high', 'critical'], // impact High
];
const IMPACT_ROWS = ['Low', 'Medium', 'High'];
const PROB_COLS = ['Low', 'Medium', 'High'];

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
    { description: 'Minimal direct impact, may assist chaining.', range: '0.1 – 3.9', severity: 'low', sla: '90 days' },
    {
        description: 'Best-practice observation. No direct exploitability.',
        range: '0.0',
        severity: 'informational',
        sla: 'Next cycle',
    },
];

const RISK_DEFINITIONS = [
    'Informational — no immediate security risk; highlights areas for improvement or deviations from best practice.',
    'Low — minimal impact and unlikely to be exploited; addressing improves overall security hygiene.',
    'Medium — moderate impact or a reasonable likelihood of exploitation; should be addressed in a timely manner.',
    'High — strong likelihood of exploitation or significant damage such as unauthorized access; requires prompt remediation.',
    'Critical — severe issues that can lead to data breaches or complete system compromise; immediate action is strongly recommended.',
];

const AppendixPdf = () => (
    <View id="appendix">
        <Text style={reportPdfStyles.sectionHeading}>Appendix</Text>
        <View style={reportPdfStyles.sectionDivider} />

        <Text style={styles.subHeading}>A. Risk Rating Matrix</Text>
        <Text style={styles.intro}>
            For each identified vulnerability the risk level is determined using a structured matrix based on two
            factors: the severity of the potential impact, and the likelihood (probability) of exploitation. The
            intersection of these two values provides the overall risk rating.
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
            This matrix is a simplified visual model to help classify and prioritise vulnerabilities by their potential
            business impact and likelihood of exploitation. Risk perception varies across organisations, so the model
            can be tailored to specific business requirements. Informational findings are not considered direct risks but
            highlight observations that may improve security posture.
        </Text>

        <Text style={styles.subHeading}>Risk Evaluation Methodology</Text>
        <Text style={styles.intro}>
            The overall risk rating combines the assessed impact (the extent of damage a vulnerability could cause if
            exploited) with the likelihood (the probability that it will be successfully exploited under real-world
            conditions). These two factors are assessed independently and mapped to the matrix above to determine the
            final risk level. The risk levels used in this report are defined as follows:
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
