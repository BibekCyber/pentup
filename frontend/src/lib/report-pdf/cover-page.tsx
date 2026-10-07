import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { CF_LOGO_ON_DARK_DATA_URI, CF_PDF } from './cf-brand';

// The CyberFortify cover gradient (navy -> mint), rebuilt as stacked colour bands.
// react-pdf always paints <Image> above sibling text, so a background image can't
// sit behind the cover copy — bands are plain Views and honour normal paint order.
const PAGE_H = 840;
const BANDS = 90;
const FROM = [15, 48, 74]; // #0f304a navy
const TO = [168, 216, 200]; // ~#a8d8c8 mint
const GRADIENT_BANDS = Array.from({ length: BANDS }, (_, i) => {
    const t = i / (BANDS - 1);
    const rgb = FROM.map((c, k) => Math.round(c + ((TO[k] ?? c) - c) * t));

    return { color: `rgb(${rgb.join(', ')})`, top: (PAGE_H / BANDS) * i };
});
const BAND_H = PAGE_H / BANDS + 1.5;

const styles = StyleSheet.create({
    band: {
        height: BAND_H,
        left: 0,
        position: 'absolute',
        right: 0,
    },
    // "COMMISSIONED BY" — small lime caps above the client name.
    commissionedLabel: {
        color: CF_PDF.lime,
        fontFamily: 'Helvetica-Bold',
        fontSize: 11,
        letterSpacing: 0.6,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    commissionedValue: {
        color: CF_PDF.navyDeep,
        fontFamily: 'Helvetica-Bold',
        fontSize: 30,
        lineHeight: 1.15,
    },
    confidential: {
        color: CF_PDF.navyDeep,
        fontSize: 8.5,
        lineHeight: 1.5,
        marginTop: 18,
        maxWidth: 380,
        opacity: 0.8,
        textAlign: 'justify',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 56,
        paddingVertical: 56,
    },
    // Transparent PNG straight on the gradient (no white panel); the cover variant
    // has a white wordmark so it reads on the dark navy.
    logo: {
        alignSelf: 'flex-start',
        height: 102,
        width: 150,
    },
    page: {
        flexDirection: 'column',
    },
    reportTitle: {
        color: CF_PDF.navy,
        fontFamily: 'Helvetica-Bold',
        fontSize: 26,
        lineHeight: 1.25,
    },
});

// A URL target reads better on the cover as its bare host ("app.example.com").
const displayTarget = (target: string): string => target.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '');

interface CoverPageProps {
    model: ReportModel;
}

// Laid out to the client's cover mock-up: logo top-left, "Commissioned by" + client
// in the middle, the report title at the foot.
const CoverPage = ({ model }: CoverPageProps) => {
    const clientName = model.clientName?.trim();
    const target = model.flow.target?.trim();
    // No client name entered yet: show the assessed target instead of leaving a gap,
    // relabelled — "Commissioned by <host>" would name the website as the client.
    const headline = clientName
        ? { label: 'Commissioned By', value: clientName.toUpperCase() }
        : target
          ? { label: 'Target', value: displayTarget(target) }
          : null;

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
                <Image
                    src={CF_LOGO_ON_DARK_DATA_URI}
                    style={styles.logo}
                />

                <View>
                    {headline && (
                        <>
                            <Text style={styles.commissionedLabel}>{headline.label}</Text>
                            <Text style={styles.commissionedValue}>{headline.value}</Text>
                        </>
                    )}
                </View>

                <View>
                    <Text style={styles.reportTitle}>Penetration Test{'\n'}Report</Text>
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
