import { Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Finding } from '@/lib/report-model';

import { SEVERITY_ORDER } from '@/lib/report-model';
import { getSeverityStyle } from '@/lib/severity-palette';

import { CF_PDF } from './cf-brand';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    countCell: {
        alignItems: 'center',
        borderColor: CF_PDF.white,
        borderWidth: 1,
        flex: 1,
        paddingVertical: 7,
    },
    countLabel: {
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 6.5,
        letterSpacing: 0.5,
        marginTop: 2,
    },
    countRow: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 16,
    },
    countValue: {
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 15,
    },
    dot: {
        borderRadius: 3,
        height: 6,
        marginRight: 5,
        width: 6,
    },
    headerCell: {
        color: CF_PDF.muted,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        textTransform: 'uppercase',
    },
    headerRow: {
        borderBottomColor: CF_PDF.navy,
        borderBottomWidth: 1,
        flexDirection: 'row',
        paddingBottom: 5,
    },
    idCell: {
        color: CF_PDF.muted,
        fontFamily: 'Courier',
        fontSize: 8.5,
        width: '12%',
    },
    row: {
        alignItems: 'center',
        borderBottomColor: CF_PDF.hairline,
        borderBottomWidth: 1,
        flexDirection: 'row',
        paddingVertical: 5,
    },
    severity: {
        alignItems: 'center',
        flexDirection: 'row',
        width: '28%',
    },
    severityLabel: {
        color: CF_PDF.body,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
    },
    title: {
        color: CF_PDF.accentText,
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

    const counts = SEVERITY_ORDER.map((severity) => ({
        count: findings.filter((finding) => finding.severity === severity).length,
        style: getSeverityStyle(severity),
    }));

    return (
        <View id="findings-summary">
            <Text style={reportPdfStyles.sectionHeading}>Findings Summary</Text>
            <View style={reportPdfStyles.sectionDivider} />

            {/* Finding counts */}
            <View style={styles.countRow}>
                {counts.map(({ count, style }) => (
                    <View
                        key={style.label}
                        style={[styles.countCell, { backgroundColor: style.pdf.solid }]}
                    >
                        <Text style={styles.countValue}>{count}</Text>
                        <Text style={styles.countLabel}>{style.label.toUpperCase()}</Text>
                    </View>
                ))}
                <View style={[styles.countCell, { backgroundColor: CF_PDF.navy }]}>
                    <Text style={styles.countValue}>{findings.length}</Text>
                    <Text style={styles.countLabel}>TOTAL</Text>
                </View>
            </View>

            <View style={styles.headerRow}>
                <Text style={[styles.headerCell, { width: '12%' }]}>ID</Text>
                <Text style={[styles.headerCell, { width: '60%' }]}>Finding</Text>
                <Text style={[styles.headerCell, { width: '28%' }]}>Severity</Text>
            </View>

            {findings.map((finding, index) => {
                const style = getSeverityStyle(finding.severity);

                return (
                    <View
                        key={finding.id}
                        style={styles.row}
                    >
                        <Text style={styles.idCell}>CF-{index + 1}</Text>
                        <Link
                            src={`#${finding.id}`}
                            style={styles.title}
                        >
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
