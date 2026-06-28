import { Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Finding } from '@/lib/report-model';

import { getSeverityStyle } from '@/lib/severity-palette';

import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    dot: {
        borderRadius: 3,
        height: 6,
        marginRight: 5,
        width: 6,
    },
    headerCell: {
        color: '#64748b',
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        textTransform: 'uppercase',
    },
    headerRow: {
        borderBottomColor: '#cbd5e1',
        borderBottomWidth: 1,
        flexDirection: 'row',
        paddingBottom: 5,
    },
    index: {
        color: '#94a3b8',
        fontSize: 9,
        width: '6%',
    },
    row: {
        alignItems: 'center',
        borderBottomColor: '#e2e8f0',
        borderBottomWidth: 1,
        flexDirection: 'row',
        paddingVertical: 5,
    },
    severity: {
        alignItems: 'center',
        flexDirection: 'row',
        width: '34%',
    },
    severityLabel: {
        color: '#475569',
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
    },
    title: {
        color: '#1d4ed8',
        fontSize: 9.5,
        paddingRight: 6,
        textDecoration: 'none',
        width: '60%',
    },
});

interface FindingsSummaryPdfProps {
    findings: Finding[];
}

const FindingsSummaryPdf = ({ findings }: FindingsSummaryPdfProps) => {
    if (findings.length === 0) {
        return null;
    }

    return (
        <View id="findings-summary">
            <Text style={reportPdfStyles.sectionHeading}>Findings Summary</Text>
            <View style={reportPdfStyles.sectionDivider} />

            <View style={styles.headerRow}>
                <Text style={[styles.headerCell, { width: '6%' }]}>#</Text>
                <Text style={[styles.headerCell, { width: '60%' }]}>Finding</Text>
                <Text style={[styles.headerCell, { width: '34%' }]}>Severity</Text>
            </View>

            {findings.map((finding, index) => {
                const style = getSeverityStyle(finding.severity);

                return (
                    <View key={finding.id} style={styles.row}>
                        <Text style={styles.index}>{index + 1}</Text>
                        <Link src={`#${finding.id}`} style={styles.title}>
                            {finding.title}
                        </Link>
                        <View style={styles.severity}>
                            <View style={[styles.dot, { backgroundColor: style.pdf.solid }]} />
                            <Text style={styles.severityLabel}>{style.label}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

export default FindingsSummaryPdf;
