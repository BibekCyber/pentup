import { StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Severity } from '@/lib/report-model';

import { getSeverityStyle } from '@/lib/severity-palette';

import { CF_PDF } from './cf-brand';
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
        fontSize: 8,
        letterSpacing: 0.5,
        paddingHorizontal: 8,
        paddingVertical: 7,
        textTransform: 'uppercase',
    },
    headRow: {
        backgroundColor: CF_PDF.navy,
        flexDirection: 'row',
    },
    intro: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.6,
        marginBottom: 12,
    },
    row: {
        borderBottomColor: CF_PDF.hairline,
        borderBottomWidth: 1,
        borderLeftColor: CF_PDF.hairline,
        borderLeftWidth: 1,
        borderRightColor: CF_PDF.hairline,
        borderRightWidth: 1,
        flexDirection: 'row',
    },
    sevCell: {
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        paddingHorizontal: 8,
        paddingVertical: 7,
    },
});

interface CriteriaRow {
    description: string;
    range: string;
    severity: Severity;
    sla: string;
}

const CRITERIA: CriteriaRow[] = [
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

const AppendixPdf = () => (
    <View id="appendix">
        <Text style={reportPdfStyles.sectionHeading}>Appendix — Risk Rating Criteria</Text>
        <View style={reportPdfStyles.sectionDivider} />

        <Text style={styles.intro}>
            Each finding is rated by combining its potential business impact with the likelihood of exploitation. The
            resulting severity, its CVSS v3.1 range, and the recommended remediation window are defined below.
        </Text>

        <View style={styles.headRow}>
            <Text style={[styles.headCell, { width: '18%' }]}>Severity</Text>
            <Text style={[styles.headCell, { width: '17%' }]}>CVSS Range</Text>
            <Text style={[styles.headCell, { width: '47%' }]}>Description</Text>
            <Text style={[styles.headCell, { width: '18%' }]}>Remediation SLA</Text>
        </View>
        {CRITERIA.map((item) => {
            const style = getSeverityStyle(item.severity);

            return (
                <View
                    key={item.severity}
                    style={styles.row}
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
