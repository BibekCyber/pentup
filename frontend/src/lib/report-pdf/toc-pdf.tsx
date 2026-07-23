import { Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { CF_PDF } from './cf-brand';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    entry: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        marginBottom: 7,
    },
    leader: {
        backgroundColor: CF_PDF.hairline,
        flex: 1,
        height: 1,
        marginBottom: 3,
        marginHorizontal: 6,
    },
    link: {
        color: CF_PDF.accentText,
        fontSize: 10.5,
        textDecoration: 'none',
    },
    marker: {
        color: CF_PDF.muted,
        fontSize: 9,
    },
});

interface TocPdfProps {
    model: ReportModel;
}

const TocPdf = ({ model }: TocPdfProps) => (
    <View>
        <Text style={reportPdfStyles.sectionHeading}>Table of Contents</Text>
        <View style={reportPdfStyles.sectionDivider} />

        {model.toc.map((entry) => (
            <View
                key={entry.id}
                style={[styles.entry, entry.level > 1 ? { marginLeft: 16 } : {}]}
            >
                <Link
                    src={`#${entry.id}`}
                    style={styles.link}
                >
                    {entry.title}
                </Link>
                <View style={styles.leader} />
                <Text style={styles.marker}>›</Text>
            </View>
        ))}
    </View>
);

export default TocPdf;
