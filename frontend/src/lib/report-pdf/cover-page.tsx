import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { getEngagementLabel } from '@/lib/target-type-colors';

import { CF_LOGO_DATA_URI, CF_PDF } from './cf-brand';

// The CyberFortify cover gradient (navy -> mint), rebuilt as stacked colour bands.
// react-pdf always paints <Image> above sibling text, so a background image can't
// sit behind the cover copy — bands are plain Views and honour normal paint order.
const PAGE_H = 840;
const BANDS = 90;
const FROM = [15, 48, 74]; // #0f304a navy
const TO = [168, 216, 200]; // ~#a8d8c8 mint
const GRADIENT_BANDS = Array.from({ length: BANDS }, (_, i) => {
    const t = i / (BANDS - 1);
    const rgb = FROM.map((c, k) => Math.round(c + (TO[k] - c) * t));

    return { color: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`, top: (PAGE_H / BANDS) * i };
});
const BAND_H = PAGE_H / BANDS + 1.5;

const styles = StyleSheet.create({
    band: {
        height: BAND_H,
        left: 0,
        position: 'absolute',
        right: 0,
    },
    byline: {
        color: CF_PDF.navy,
        fontFamily: 'Helvetica-Bold',
        fontSize: 12,
        letterSpacing: 0.4,
    },
    confidential: {
        color: CF_PDF.navyDeep,
        fontSize: 8.5,
        lineHeight: 1.5,
        marginTop: 6,
        maxWidth: 380,
        opacity: 0.8,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 56,
        paddingVertical: 56,
    },
    kicker: {
        color: CF_PDF.accent,
        fontFamily: 'Helvetica-Bold',
        fontSize: 11,
        letterSpacing: 3,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    logo: {
        height: 52,
        width: 74,
    },
    logoPanel: {
        alignSelf: 'flex-start',
        backgroundColor: CF_PDF.white,
        borderRadius: 8,
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    metaLabel: {
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        letterSpacing: 0.5,
        opacity: 0.8,
        textTransform: 'uppercase',
    },
    metaValue: {
        color: CF_PDF.white,
        fontSize: 11,
        marginTop: 2,
    },
    page: {
        flexDirection: 'column',
    },
    rule: {
        backgroundColor: CF_PDF.accent,
        height: 3,
        marginTop: 14,
        width: 54,
    },
    title: {
        color: CF_PDF.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 32,
        lineHeight: 1.12,
    },
});

interface CoverPageProps {
    model: ReportModel;
}

const CoverPage = ({ model }: CoverPageProps) => {
    const engagement = getEngagementLabel(model.flow.targetType);
    const title = engagement || model.flow.target || model.flow.title;
    const issued = new Date(model.generatedAt);
    const issuedLabel = Number.isNaN(issued.getTime())
        ? ''
        : issued.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <Page
            size="A4"
            style={styles.page}
        >
            {GRADIENT_BANDS.map((band) => (
                <View
                    key={band.top}
                    style={[styles.band, { backgroundColor: band.color, top: band.top }]}
                />
            ))}

            <View style={styles.content}>
                {/* Top block — white text over the dark navy end of the gradient. */}
                <View>
                    <View style={styles.logoPanel}>
                        <Image
                            src={CF_LOGO_DATA_URI}
                            style={styles.logo}
                        />
                    </View>

                    <View style={{ marginTop: 46 }}>
                        <Text style={styles.kicker}>Penetration Testing Report</Text>
                        <Text style={styles.title}>{title}</Text>
                        <View style={styles.rule} />

                        <View style={{ flexDirection: 'row', gap: 40, marginTop: 22 }}>
                            {model.clientName?.trim() && (
                                <View>
                                    <Text style={styles.metaLabel}>Prepared For</Text>
                                    <Text style={styles.metaValue}>{model.clientName.trim()}</Text>
                                </View>
                            )}
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
                        </View>
                    </View>
                </View>

                {/* Bottom block — dark text over the light mint end of the gradient. */}
                <View>
                    <Text style={styles.byline}>By CyberFortify</Text>
                    <Text style={styles.confidential}>
                        Confidential. This report and its contents are intended solely for the named recipient.
                        Unauthorized disclosure, distribution, or reproduction is strictly prohibited.
                    </Text>
                </View>
            </View>
        </Page>
    );
};

export default CoverPage;
