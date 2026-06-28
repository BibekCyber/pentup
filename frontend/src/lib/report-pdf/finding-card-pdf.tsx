import { Image, Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Finding } from '@/lib/report-model';

import { getSeverityStyle } from '@/lib/severity-palette';

const styles = StyleSheet.create({
    badge: {
        borderRadius: 3,
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    body: {
        color: '#334155',
        fontSize: 9.5,
        lineHeight: 1.5,
    },
    card: {
        backgroundColor: '#fcfcfd',
        borderLeftColor: '#e2e8f0',
        borderLeftWidth: 3,
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    chip: {
        backgroundColor: '#f1f5f9',
        color: '#475569',
        fontFamily: 'Courier',
        fontSize: 8,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    header: {
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 6,
    },
    label: {
        color: '#64748b',
        fontFamily: 'Helvetica-Bold',
        fontSize: 7.5,
        letterSpacing: 0.5,
        marginBottom: 2,
        marginTop: 6,
        textTransform: 'uppercase',
    },
    placeholder: {
        backgroundColor: '#f1f5f9',
        color: '#94a3b8',
        fontSize: 8,
        marginTop: 4,
        padding: 10,
        textAlign: 'center',
    },
    recommendation: {
        backgroundColor: '#ecfdf5',
        borderLeftColor: '#6ee7b7',
        borderLeftWidth: 2,
        color: '#065f46',
        fontSize: 9.5,
        lineHeight: 1.5,
        padding: 7,
    },
    reference: {
        color: '#1d4ed8',
        fontSize: 8.5,
        marginBottom: 1,
        textDecoration: 'none',
    },
    screenshot: {
        marginTop: 4,
        objectFit: 'contain',
        width: '100%',
    },
    title: {
        color: '#0f172a',
        fontFamily: 'Helvetica-Bold',
        fontSize: 11.5,
        marginBottom: 6,
    },
    url: {
        color: '#475569',
        fontFamily: 'Courier',
        fontSize: 8.5,
        marginBottom: 1,
    },
});

interface FindingCardPdfProps {
    finding: Finding;
}

const FindingCardPdf = ({ finding }: FindingCardPdfProps) => {
    const style = getSeverityStyle(finding.severity);

    return (
        <View minPresenceAhead={90} style={[styles.card, { borderLeftColor: style.pdf.solid }]}>
            <View wrap={false}>
                <View style={styles.header}>
                    <Text style={[styles.badge, { backgroundColor: style.pdf.solid }]}>{style.label.toUpperCase()}</Text>
                    {typeof finding.cvss === 'number' && <Text style={styles.chip}>CVSS {finding.cvss.toFixed(1)}</Text>}
                    {finding.cve && <Text style={styles.chip}>{finding.cve}</Text>}
                </View>

                <Text style={styles.title}>{finding.title}</Text>
            </View>

            {finding.affectedUrls && finding.affectedUrls.length > 0 && (
                <View>
                    <Text style={styles.label}>Affected URL{finding.affectedUrls.length > 1 ? 's' : ''}</Text>
                    {finding.affectedUrls.map((url) => (
                        <Text key={url} style={styles.url}>
                            {url}
                        </Text>
                    ))}
                </View>
            )}

            {finding.description && <Text style={[styles.body, { marginTop: 6 }]}>{finding.description}</Text>}

            {finding.evidence && (
                <View>
                    <Text style={styles.label}>Evidence</Text>
                    <Text style={styles.body}>{finding.evidence}</Text>
                </View>
            )}

            {finding.recommendation && (
                <View>
                    <Text style={styles.label}>Recommendation</Text>
                    <Text style={styles.recommendation}>{finding.recommendation}</Text>
                </View>
            )}

            {finding.screenshots && finding.screenshots.length > 0 && (
                <View>
                    <Text style={styles.label}>Evidence Screenshots</Text>
                    {finding.screenshots.map((shot) =>
                        shot.dataUrl ? (
                            <Image key={shot.id} src={shot.dataUrl} style={styles.screenshot} />
                        ) : (
                            <Text key={shot.id} style={styles.placeholder}>
                                {shot.name}
                            </Text>
                        ),
                    )}
                </View>
            )}

            {finding.references && finding.references.length > 0 && (
                <View>
                    <Text style={styles.label}>References</Text>
                    {finding.references.map((ref) => (
                        <Link key={ref} src={ref} style={styles.reference}>
                            {ref}
                        </Link>
                    ))}
                </View>
            )}
        </View>
    );
};

export default FindingCardPdf;
