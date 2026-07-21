import { Image, Link, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Finding } from '@/lib/report-model';

import { BRAND, getSeverityStyle } from '@/lib/severity-palette';

const styles = StyleSheet.create({
    badge: {
        borderRadius: 2,
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 7.5,
        letterSpacing: 0.5,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    body: {
        paddingHorizontal: 10,
        paddingTop: 8,
    },
    card: {
        borderLeftWidth: 3,
        marginBottom: 18,
        paddingLeft: 0,
    },
    chip: {
        backgroundColor: '#ffffff',
        color: '#57534e',
        fontFamily: 'Courier',
        fontSize: 8,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    factCol: {
        flexDirection: 'column',
    },
    factLabel: {
        color: '#a8a29e',
        fontFamily: 'Helvetica-Bold',
        fontSize: 7,
        letterSpacing: 0.5,
        marginBottom: 1,
        textTransform: 'uppercase',
    },
    facts: {
        backgroundColor: '#faf7f4',
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    factUrl: {
        color: '#57534e',
        fontFamily: 'Courier',
        fontSize: 8,
        marginBottom: 1,
    },
    factValue: {
        color: '#44403c',
        fontSize: 9,
    },
    headerBar: {
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    headerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 5,
    },
    listItem: {
        flexDirection: 'row',
        marginBottom: 2.5,
    },
    listMarker: {
        color: '#78716c',
        fontSize: 9,
        minWidth: 16,
    },
    listText: {
        color: '#44403c',
        flex: 1,
        fontSize: 9.5,
        lineHeight: 1.45,
    },
    paragraph: {
        color: '#44403c',
        fontSize: 9.5,
        lineHeight: 1.5,
    },
    placeholder: {
        backgroundColor: '#f5f3f0',
        color: '#a8a29e',
        fontSize: 8,
        marginTop: 4,
        padding: 10,
        textAlign: 'center',
    },
    reference: {
        color: '#c2410c',
        fontSize: 8.5,
        marginBottom: 1,
        textDecoration: 'none',
    },
    remediation: {
        backgroundColor: BRAND.tint,
        borderLeftColor: BRAND.solid,
        borderLeftWidth: 2,
        color: '#7c3a06',
        fontSize: 9.5,
        lineHeight: 1.5,
        padding: 7,
    },
    screenshot: {
        marginTop: 4,
        objectFit: 'contain',
        width: '100%',
    },
    sectionLabel: {
        color: '#57534e',
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        letterSpacing: 0.4,
        marginBottom: 3,
        marginTop: 9,
        textTransform: 'uppercase',
    },
    title: {
        color: '#1c1917',
        fontFamily: 'Helvetica-Bold',
        fontSize: 12,
    },
});

const BulletList = ({ items, ordered }: { items: string[]; ordered?: boolean }) => (
    <View>
        {items.map((item, i) => (
            <View
                key={i}
                style={styles.listItem}
            >
                <Text style={styles.listMarker}>{ordered ? `${i + 1}.` : '•'}</Text>
                <Text style={styles.listText}>{item}</Text>
            </View>
        ))}
    </View>
);

interface FindingCardPdfProps {
    finding: Finding;
    index: number;
}

const FindingCardPdf = ({ finding, index }: FindingCardPdfProps) => {
    const style = getSeverityStyle(finding.severity);

    return (
        <View style={[styles.card, { borderLeftColor: style.pdf.solid }]}>
            <View wrap={false}>
                <View style={[styles.headerBar, { backgroundColor: style.pdf.tint }]}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.badge, { backgroundColor: style.pdf.solid }]}>
                            {style.label.toUpperCase()}
                        </Text>
                        {typeof finding.cvss === 'number' && (
                            <Text style={styles.chip}>CVSS {finding.cvss.toFixed(1)}</Text>
                        )}
                        {finding.cve && <Text style={styles.chip}>{finding.cve}</Text>}
                    </View>
                    <Text style={styles.title}>
                        {index}. {finding.title}
                    </Text>
                </View>

                <View style={styles.facts}>
                    <View style={[styles.factCol, { width: '18%' }]}>
                        <Text style={styles.factLabel}>CVSS</Text>
                        <Text style={styles.factValue}>
                            {typeof finding.cvss === 'number' ? finding.cvss.toFixed(1) : '—'}
                        </Text>
                    </View>
                    <View style={[styles.factCol, { width: '22%' }]}>
                        <Text style={styles.factLabel}>Risk Rating</Text>
                        <Text style={[styles.factValue, { color: style.pdf.text, fontFamily: 'Helvetica-Bold' }]}>
                            {style.label}
                        </Text>
                    </View>
                    <View style={[styles.factCol, { width: '60%' }]}>
                        <Text style={styles.factLabel}>
                            Affected URL{(finding.affectedUrls?.length ?? 0) > 1 ? 's' : ''}
                        </Text>
                        {(finding.affectedUrls ?? ['—']).map((url) => (
                            <Text
                                key={url}
                                style={styles.factUrl}
                            >
                                {url}
                            </Text>
                        ))}
                    </View>
                </View>
            </View>

            <View style={styles.body}>
                {finding.description && (
                    <View>
                        <Text style={styles.sectionLabel}>Details of Vulnerability</Text>
                        <Text style={styles.paragraph}>{finding.description}</Text>
                    </View>
                )}

                {finding.stepsToReproduce && finding.stepsToReproduce.length > 0 && (
                    <View>
                        <Text style={styles.sectionLabel}>Steps to Reproduce</Text>
                        <BulletList
                            items={finding.stepsToReproduce}
                            ordered
                        />
                    </View>
                )}

                {finding.screenshots && finding.screenshots.length > 0 && (
                    <View>
                        {finding.screenshots.map((shot) =>
                            shot.dataUrl ? (
                                <Image
                                    key={shot.id}
                                    src={shot.dataUrl}
                                    style={styles.screenshot}
                                />
                            ) : (
                                <Text
                                    key={shot.id}
                                    style={styles.placeholder}
                                >
                                    {shot.name}
                                </Text>
                            ),
                        )}
                    </View>
                )}

                {finding.impact && finding.impact.length > 0 && (
                    <View>
                        <Text style={styles.sectionLabel}>Impact</Text>
                        <BulletList items={finding.impact} />
                    </View>
                )}

                {finding.recommendation && (
                    <View>
                        <Text style={styles.sectionLabel}>Remediation</Text>
                        <Text style={styles.remediation}>{finding.recommendation}</Text>
                    </View>
                )}

                {finding.references && finding.references.length > 0 && (
                    <View>
                        <Text style={styles.sectionLabel}>References</Text>
                        {finding.references.map((ref) => (
                            <Link
                                key={ref}
                                src={ref}
                                style={styles.reference}
                            >
                                {ref}
                            </Link>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
};

export default FindingCardPdf;
