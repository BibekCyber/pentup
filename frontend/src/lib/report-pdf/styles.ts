import { StyleSheet } from '@react-pdf/renderer';

import { CF_PDF } from './cf-brand';

// The generated PDF is white-labelled for CyberFortify (the delivering firm).
export const PDF_FOOTER_TEXT = 'Confidential — prepared by CyberFortify';
export const PDF_BRAND_NAME = 'CyberFortify';

export const reportPdfStyles = StyleSheet.create({
    chromeFooter: {
        bottom: 24,
        left: 44,
        position: 'absolute',
        right: 44,
    },
    chromeFooterText: {
        color: CF_PDF.muted,
        fontSize: 8,
    },
    chromeHairline: {
        backgroundColor: CF_PDF.hairline,
        height: 1,
    },
    chromeHeader: {
        left: 44,
        position: 'absolute',
        right: 44,
        top: 24,
    },
    chromeHeaderDate: {
        color: CF_PDF.muted,
        fontSize: 8.5,
    },
    chromeHeaderTitle: {
        color: CF_PDF.navy,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
        maxWidth: 360,
    },
    chromeRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    page: {
        backgroundColor: CF_PDF.white,
        color: CF_PDF.body,
        fontFamily: 'Helvetica',
        fontSize: 10.5,
        lineHeight: 1.5,
        paddingBottom: 56,
        paddingHorizontal: 44,
        paddingTop: 64,
    },
    // Each top-level report section renders inside this so every heading starts
    // on a fresh page, matching the CyberFortify template.
    sectionBreak: {
        marginTop: 0,
    },
    sectionDivider: {
        borderBottomColor: CF_PDF.accent,
        borderBottomWidth: 2,
        marginBottom: 10,
    },
    sectionHeading: {
        color: CF_PDF.navy,
        fontFamily: 'Helvetica-Bold',
        fontSize: 16,
        marginBottom: 8,
    },
    subHeading: {
        color: CF_PDF.navyDeep,
        fontFamily: 'Helvetica-Bold',
        fontSize: 11,
        letterSpacing: 0.5,
        marginBottom: 6,
        marginTop: 4,
        textTransform: 'uppercase',
    },
});
