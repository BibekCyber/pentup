import { Image, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Finding } from '@/lib/report-model';

import { getSeverityStyle } from '@/lib/severity-palette';

import { CF_PDF } from './cf-brand';
import { Bullets } from './pdf-primitives';

const styles = StyleSheet.create({
    // Facts table — borderless, green label cells, white value cells.
    factLabel: {
        backgroundColor: CF_PDF.greenBar,
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    factRow: {
        flexDirection: 'row',
        marginBottom: 1,
    },
    factValue: {
        backgroundColor: '#f4f7f9',
        color: CF_PDF.ink,
        fontFamily: 'Courier',
        fontSize: 8.5,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    paragraph: {
        color: CF_PDF.body,
        fontSize: 9.5,
        lineHeight: 1.6,
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
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
        letterSpacing: 0.4,
        marginBottom: 4,
        marginTop: 12,
        textTransform: 'uppercase',
    },
    titleBar: {
        backgroundColor: CF_PDF.greenBar,
        marginBottom: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    titleText: {
        color: CF_PDF.white,
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
            <View style={styles.titleBar}>
                <Text style={styles.titleText}>{finding.title}</Text>
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
                    <Text style={styles.sectionLabel}>Description</Text>
                    <Text style={styles.paragraph}>{finding.description}</Text>
                </View>
            )}

            {finding.impact && finding.impact.length > 0 && (
                <View>
                    <Text style={styles.sectionLabel}>Business Impact</Text>
                    <Bullets items={finding.impact} />
                </View>
            )}

            {finding.stepsToReproduce && finding.stepsToReproduce.length > 0 && (
                <View>
                    <Text style={styles.sectionLabel}>Steps to Reproduce</Text>
                    <Bullets
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

            {finding.recommendation && (
                <View>
                    <Text style={styles.sectionLabel}>Recommendation</Text>
                    <Bullets items={toBullets(finding.recommendation)} />
                </View>
            )}

            {finding.references && finding.references.length > 0 && (
                <View>
                    <Text style={styles.sectionLabel}>References</Text>
                    <Bullets
                        items={finding.references}
                        link
                    />
                </View>
            )}
        </View>
    );
};

export default FindingCardPdf;
