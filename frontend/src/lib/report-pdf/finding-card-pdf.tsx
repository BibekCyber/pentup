import { Image, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Finding } from '@/lib/report-model';

import { getSeverityStyle } from '@/lib/severity-palette';

import { CF_PDF } from './cf-brand';
import { Bullets } from './pdf-primitives';

const styles = StyleSheet.create({
    // Facts block — light-gray label cells (like the client report's gray label
    // column) with plain values; only the title bar is severity-coloured.
    factLabel: {
        backgroundColor: '#f3f4f6',
        color: CF_PDF.ink,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    factRow: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 2,
    },
    factValue: {
        color: CF_PDF.ink,
        fontSize: 9,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    paragraph: {
        color: CF_PDF.body,
        fontSize: 9.5,
        lineHeight: 1.6,
        textAlign: 'justify',
    },
    placeholder: {
        backgroundColor: '#f1f5f8',
        color: CF_PDF.muted,
        fontSize: 8,
        marginTop: 4,
        padding: 10,
        textAlign: 'center',
    },
    screenshot: {
        marginTop: 6,
        objectFit: 'contain',
        width: '100%',
    },
    sectionLabel: {
        color: CF_PDF.ink,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
        letterSpacing: 0.4,
        marginBottom: 4,
        marginTop: 12,
        textTransform: 'uppercase',
    },
    titleBar: {
        marginBottom: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    titleText: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 12,
        textAlign: 'center',
    },
});

// Turn a free-text recommendation into bullets: split on line breaks, and if it is
// a single block, split into sentences so it still reads as a professional list.
const toBullets = (text: string): string[] => {
    const lines = text
        .split('\n')
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);

    if (lines.length > 1) {
        return lines;
    }

    return (lines[0] ?? text)
        .split(/(?<=\.)\s+(?=[A-Z])/)
        .map((s) => s.trim())
        .filter(Boolean);
};

interface FindingCardPdfProps {
    finding: Finding;
}

const FindingCardPdf = ({ finding }: FindingCardPdfProps) => {
    const style = getSeverityStyle(finding.severity);
    const targets = finding.affectedUrls?.length ? finding.affectedUrls : ['—'];

    return (
        <View>
            <View style={[styles.titleBar, { backgroundColor: style.pdf.solid }]}>
                <Text style={[styles.titleText, { color: style.pdf.onSolid }]}>{finding.title}</Text>
            </View>

            {/* Facts — CVSS + Severity on one row, Targets below. No Finding ID. */}
            <View style={styles.factRow}>
                <Text style={[styles.factLabel, { width: '18%' }]}>CVSS Score</Text>
                <Text style={[styles.factValue, { width: '24%' }]}>
                    {typeof finding.cvss === 'number' ? finding.cvss.toFixed(1) : '—'}
                </Text>
                <Text style={[styles.factLabel, { width: '18%' }]}>Severity</Text>
                <Text style={[styles.factValue, { color: style.pdf.text, fontFamily: 'Helvetica-Bold', width: '40%' }]}>
                    {style.label}
                    {/* An analyst override is a human judgement, not a recalculation: the
                        CVSS cell above is intentionally empty, so label the rating rather
                        than leave the reader wondering why no score is shown. */}
                    {finding.severityUpdated && (
                        <Text style={{ color: CF_PDF.muted, fontFamily: 'Helvetica' }}> (adjusted)</Text>
                    )}
                </Text>
            </View>
            <View style={styles.factRow}>
                <Text style={[styles.factLabel, { width: '18%' }]}>Targets</Text>
                <View style={[styles.factValue, { width: '82%' }]}>
                    {targets.map((url) => (
                        <Text key={url}>{url}</Text>
                    ))}
                </View>
            </View>

            {finding.description && (
                <View>
                    {/* Keep the label with at least the first lines of the paragraph. */}
                    <Text
                        minPresenceAhead={40}
                        style={styles.sectionLabel}
                    >
                        Description
                    </Text>
                    <Text style={styles.paragraph}>{finding.description}</Text>
                </View>
            )}

            {finding.impact && finding.impact.length > 0 && (
                <Bullets
                    heading={<Text style={styles.sectionLabel}>Business Impact</Text>}
                    items={finding.impact}
                />
            )}

            {finding.stepsToReproduce && finding.stepsToReproduce.length > 0 && (
                <Bullets
                    heading={<Text style={styles.sectionLabel}>Steps to Reproduce</Text>}
                    items={finding.stepsToReproduce}
                />
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

            {finding.recommendation && (
                <Bullets
                    heading={<Text style={styles.sectionLabel}>Recommendation</Text>}
                    items={toBullets(finding.recommendation)}
                />
            )}

            {finding.references && finding.references.length > 0 && (
                <Bullets
                    heading={<Text style={styles.sectionLabel}>References</Text>}
                    items={finding.references}
                    link
                />
            )}
        </View>
    );
};

export default FindingCardPdf;
