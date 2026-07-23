import { StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { deriveSummaryNarrative, pluralize } from '@/lib/build-report-model';
import { SEVERITY_ORDER } from '@/lib/report-model';
import { getSeverityStyle } from '@/lib/severity-palette';

import { CF_PDF } from './cf-brand';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    countCell: {
        color: CF_PDF.navy,
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
        textAlign: 'center',
        width: '20%',
    },
    dot: {
        borderRadius: 4,
        height: 7,
        marginRight: 6,
        width: 7,
    },
    paragraph: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.55,
        marginBottom: 4,
    },
    posture: {
        color: CF_PDF.muted,
        fontSize: 9,
        marginTop: 8,
    },
    rangeCell: {
        color: CF_PDF.muted,
        fontFamily: 'Courier',
        fontSize: 9,
        width: '30%',
    },
    row: {
        alignItems: 'center',
        borderBottomColor: CF_PDF.hairline,
        borderBottomWidth: 1,
        flexDirection: 'row',
        paddingHorizontal: 6,
        paddingVertical: 6,
    },
    sevCell: {
        alignItems: 'center',
        flexDirection: 'row',
        width: '50%',
    },
    sevLabel: {
        color: CF_PDF.body,
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
    },
    tableHeader: {
        borderBottomColor: CF_PDF.navy,
        borderBottomWidth: 1,
        flexDirection: 'row',
        paddingBottom: 5,
    },
    tableHeaderCell: {
        color: CF_PDF.muted,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        textTransform: 'uppercase',
    },
    tile: {
        backgroundColor: CF_PDF.navyTint,
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    tileLabel: {
        color: CF_PDF.muted,
        fontSize: 8,
        marginTop: 2,
    },
    tileRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    tileValue: {
        color: CF_PDF.navy,
        fontFamily: 'Helvetica-Bold',
        fontSize: 15,
    },
});

interface ExecutiveSummaryPdfProps {
    model: ReportModel;
}

const ExecutiveSummaryPdf = ({ model }: ExecutiveSummaryPdfProps) => {
    const { summary } = model;
    const hasFindings = summary.findingsTotal > 0;
    const posture = SEVERITY_ORDER.find((severity) => summary.findingsBySeverity[severity] > 0);

    const tiles: Array<{ label: string; value: string }> = [
        { label: 'Tasks completed', value: `${summary.tasksDone}/${summary.tasksTotal}` },
        ...(hasFindings ? [{ label: 'Findings', value: String(summary.findingsTotal) }] : []),
        { label: pluralize(summary.screenshotCount, 'Screenshot'), value: String(summary.screenshotCount) },
        { label: 'Duration', value: summary.duration ?? '—' },
    ];

    return (
        <View id="executive-summary">
            <Text style={reportPdfStyles.sectionHeading}>Executive Summary</Text>
            <View style={reportPdfStyles.sectionDivider} />

            <View>
                <Text style={styles.paragraph}>{model.executiveSummary?.content ?? deriveSummaryNarrative(model)}</Text>
            </View>

            <View style={styles.tileRow}>
                {tiles.map((tile) => (
                    <View
                        key={tile.label}
                        style={styles.tile}
                    >
                        <Text style={styles.tileValue}>{tile.value}</Text>
                        <Text style={styles.tileLabel}>{tile.label}</Text>
                    </View>
                ))}
            </View>

            {hasFindings && (
                <>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Severity</Text>
                        <Text style={[styles.tableHeaderCell, { textAlign: 'center', width: '20%' }]}>Findings</Text>
                        <Text style={[styles.tableHeaderCell, { width: '30%' }]}>CVSS Range</Text>
                    </View>

                    {SEVERITY_ORDER.map((severity) => {
                        const style = getSeverityStyle(severity);
                        const count = summary.findingsBySeverity[severity];

                        return (
                            <View
                                key={severity}
                                style={[styles.row, count > 0 ? { backgroundColor: style.pdf.tint } : {}]}
                            >
                                <View style={styles.sevCell}>
                                    <View style={[styles.dot, { backgroundColor: style.pdf.solid }]} />
                                    <Text style={styles.sevLabel}>{style.label}</Text>
                                </View>
                                <Text style={styles.countCell}>{count}</Text>
                                <Text style={styles.rangeCell}>{style.cvssRange}</Text>
                            </View>
                        );
                    })}

                    {posture && (
                        <Text style={styles.posture}>Overall risk posture: {getSeverityStyle(posture).label}</Text>
                    )}
                </>
            )}
        </View>
    );
};

export default ExecutiveSummaryPdf;
