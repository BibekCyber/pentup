import { StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { CF_PDF } from './cf-brand';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    cell: {
        color: CF_PDF.body,
        fontSize: 9.5,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
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
    intro: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.6,
        marginBottom: 10,
    },
    row: {
        backgroundColor: CF_PDF.white,
        flexDirection: 'row',
    },
});

interface DocumentHistoryPdfProps {
    model: ReportModel;
}

const DocumentHistoryPdf = ({ model }: DocumentHistoryPdfProps) => {
    const issued = new Date(model.generatedAt);
    const dateLabel = Number.isNaN(issued.getTime())
        ? '—'
        : issued.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <View id="document-history">
            <Text style={reportPdfStyles.sectionHeading}>Document History</Text>
            <View style={reportPdfStyles.sectionDivider} />

            <Text style={styles.intro}>Revision Overview</Text>

            <View style={styles.headRow}>
                <Text style={[styles.headCell, { width: '30%' }]}>Version</Text>
                <Text style={[styles.headCell, { width: '70%' }]}>Date</Text>
            </View>
            <View style={styles.row}>
                <Text style={[styles.cell, { width: '30%' }]}>1.0</Text>
                <Text style={[styles.cell, { width: '70%' }]}>{dateLabel}</Text>
            </View>
        </View>
    );
};

export default DocumentHistoryPdf;
