import { Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Finding } from '@/lib/report-model';

import { SEVERITY_ORDER } from '@/lib/report-model';
import { getSeverityStyle } from '@/lib/severity-palette';

import { CF_PDF } from './cf-brand';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    countCell: {
        alignItems: 'center',
        flex: 1,
        paddingVertical: 8,
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
        gap: 3,
        marginBottom: 16,
    },
    countValue: {
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 15,
    },
    // Borderless table: green header, zebra body, severity-coloured Risk cell.
    headCell: {
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        letterSpacing: 0.4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        textTransform: 'uppercase',
    },
    headRow: {
        backgroundColor: CF_PDF.greenBar,
        flexDirection: 'row',
    },
    riskCell: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 7,
        width: '22%',
    },
    riskText: {
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
    },
    row: {
        alignItems: 'stretch',
        flexDirection: 'row',
    },
    titleCell: {
        color: CF_PDF.ink,
        fontSize: 9.5,
        paddingHorizontal: 10,
        paddingVertical: 7,
        textDecoration: 'none',
        width: '78%',
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
            <Text style={reportPdfStyles.sectionHeading}>Finding Summary</Text>
            <View style={reportPdfStyles.sectionDivider} />

            {/* Finding counts — borderless coloured cells */}
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
                <View style={[styles.countCell, { backgroundColor: CF_PDF.greenBar }]}>
                    <Text style={styles.countValue}>{findings.length}</Text>
                    <Text style={styles.countLabel}>TOTAL</Text>
                </View>
            </View>

            <View style={styles.headRow}>
                <Text style={[styles.headCell, { width: '78%' }]}>Title</Text>
                <Text style={[styles.headCell, { textAlign: 'center', width: '22%' }]}>Risk</Text>
            </View>

            {findings.map((finding, index) => {
                const style = getSeverityStyle(finding.severity);
                const zebra = index % 2 === 1;

                return (
                    <View
                        key={finding.id}
                        style={styles.row}
                    >
                        <Link
                            src={`#${finding.id}`}
                            style={[styles.titleCell, zebra ? { backgroundColor: '#f4f7f9' } : {}]}
                        >
                            {finding.title}
                        </Link>
                        <View style={[styles.riskCell, { backgroundColor: style.pdf.solid }]}>
                            <Text style={styles.riskText}>{style.label}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

export default FindingsSummaryPdf;
