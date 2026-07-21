import { Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    entry: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        marginBottom: 7,
    },
    leader: {
        backgroundColor: '#e7e5e4',
        flex: 1,
        height: 1,
        marginBottom: 3,
        marginHorizontal: 6,
    },
    link: {
        color: '#c2410c',
        fontSize: 10.5,
        textDecoration: 'none',
    },
    marker: {
        color: '#a8a29e',
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
