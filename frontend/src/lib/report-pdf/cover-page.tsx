import { Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { getStatusStyle } from '@/lib/severity-palette';

import { PDF_FOOTER_TEXT } from './styles';

const ACCENT = '#c2410c';

const styles = StyleSheet.create({
    confidential: {
        bottom: 40,
        color: '#a8a29e',
        fontSize: 9,
        left: 56,
        position: 'absolute',
    },
    kicker: {
        color: '#78716c',
        fontFamily: 'Helvetica-Bold',
        fontSize: 11,
        letterSpacing: 3,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    metaLabel: {
        color: '#a8a29e',
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    metaValue: {
        color: '#44403c',
        fontSize: 11,
        marginTop: 2,
    },
    page: {
        backgroundColor: '#ffffff',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingHorizontal: 56,
        paddingVertical: 72,
    },
    statusPill: {
        alignSelf: 'flex-start',
        borderRadius: 3,
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
        marginTop: 2,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    title: {
        color: '#1c1917',
        fontFamily: 'Helvetica-Bold',
        fontSize: 30,
        lineHeight: 1.15,
        marginBottom: 18,
    },
    topBar: {
        backgroundColor: ACCENT,
        height: 10,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    wordmark: {
        color: ACCENT,
        fontFamily: 'Helvetica-Bold',
        fontSize: 18,
        letterSpacing: 1,
    },
    wordmarkRule: {
        backgroundColor: ACCENT,
        height: 3,
        marginTop: 8,
        width: 48,
    },
});

interface CoverPageProps {
    model: ReportModel;
}

const CoverPage = ({ model }: CoverPageProps) => {
    const status = getStatusStyle(model.flow.status);
    const issued = new Date(model.generatedAt);
    const issuedLabel = Number.isNaN(issued.getTime())
        ? ''
        : issued.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <Page
            size="A4"
            style={styles.page}
        >
            <View style={styles.topBar} />

            <View>
                <Text style={styles.wordmark}>PentAGI</Text>
                <View style={styles.wordmarkRule} />
            </View>

            <View style={{ marginTop: 90 }}>
                <Text style={styles.kicker}>Penetration Testing Report</Text>
                <Text style={styles.title}>{model.flow.title}</Text>

                <View style={{ flexDirection: 'row', gap: 40, marginTop: 12 }}>
                    {model.flow.target && (
                        <View>
                            <Text style={styles.metaLabel}>Target</Text>
                            <Text style={styles.metaValue}>{model.flow.target}</Text>
                        </View>
                    )}
                    <View>
                        <Text style={styles.metaLabel}>Date Issued</Text>
                        <Text style={styles.metaValue}>{issuedLabel}</Text>
                    </View>
                    <View>
                        <Text style={styles.metaLabel}>Status</Text>
                        <Text style={[styles.statusPill, { backgroundColor: status.pdf.solid }]}>{status.label}</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.confidential}>{PDF_FOOTER_TEXT}</Text>
        </Page>
    );
};

export default CoverPage;
