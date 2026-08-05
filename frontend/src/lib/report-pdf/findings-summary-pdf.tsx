import { Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Finding } from '@/lib/report-model';

import { SEVERITY_ORDER } from '@/lib/report-model';
import { getSeverityStyle } from '@/lib/severity-palette';

import { CF_PDF } from './cf-brand';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    consult: {
        color: CF_PDF.muted,
        fontSize: 8,
        fontStyle: 'italic',
        marginBottom: 12,
    },
    countCell: {
        alignItems: 'center',
        flex: 1,
        paddingVertical: 8,
    },
    countLabel: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 6.5,
        letterSpacing: 0.5,
        marginTop: 2,
    },
    countRow: {
        flexDirection: 'row',
        gap: 3,
        marginBottom: 6,
    },
    countValue: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 15,
    },
    // Borderless table: lime header, severity-coloured Risk cell (left), white gaps
    // between cells and rows for the client report's "white border" look.
    headCell: {
        backgroundColor: CF_PDF.lime,
        color: CF_PDF.limeText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        letterSpacing: 0.4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        textTransform: 'uppercase',
    },
    headRow: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 2,
    },
    note: {
        color: CF_PDF.ink,
        fontSize: 8.5,
        fontStyle: 'italic',
        marginBottom: 8,
    },
    riskCell: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 7,
        width: '20%',
    },
    riskText: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
    },
    row: {
        alignItems: 'stretch',
        flexDirection: 'row',
        gap: 2,
        marginBottom: 2,
    },
    subHeading: {
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 11.5,
        marginBottom: 4,
    },
    titleCell: {
        backgroundColor: '#f3f4f6',
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
                        <Text style={[styles.countValue, { color: style.pdf.onSolid }]}>{count}</Text>
                        <Text style={[styles.countLabel, { color: style.pdf.onSolid }]}>
                            {style.label === 'Informational' ? 'INFO' : style.label.toUpperCase()}
                        </Text>
                    </View>
                ))}
                <View style={[styles.countCell, { backgroundColor: '#6b7280' }]}>
                    <Text style={[styles.countValue, { color: CF_PDF.white }]}>{findings.length}</Text>
                    <Text style={[styles.countLabel, { color: CF_PDF.white }]}>TOTAL</Text>
                </View>
            </View>

            <Text style={styles.consult}>
                *Consult the appendix for an explanation of the risk categories mentioned.
            </Text>

            <Text style={styles.subHeading}>Vulnerabilities Listing</Text>
            <Text style={styles.note}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontStyle: 'normal' }}>Note: </Text>
                Findings are listed below in descending order of severity, each with its risk rating.
            </Text>

            <View style={styles.headRow}>
                <Text style={[styles.headCell, { textAlign: 'center', width: '20%' }]}>Risk</Text>
                <Text style={[styles.headCell, { width: '78%' }]}>Title</Text>
            </View>

            {findings.map((finding) => {
                const style = getSeverityStyle(finding.severity);

                return (
                    <View
                        key={finding.id}
                        style={styles.row}
                    >
                        <View style={[styles.riskCell, { backgroundColor: style.pdf.solid }]}>
                            <Text style={[styles.riskText, { color: style.pdf.onSolid }]}>{style.label}</Text>
                        </View>
                        <Link
                            src={`#${finding.id}`}
                            style={styles.titleCell}
                        >
                            {finding.title}
                        </Link>
                    </View>
                );
            })}
        </View>
    );
};

export default FindingsSummaryPdf;
