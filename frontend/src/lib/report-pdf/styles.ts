import { StyleSheet } from '@react-pdf/renderer';

import { CF_PDF } from './cf-brand';

// The generated PDF is white-labelled for CyberFortify (the delivering firm).
export const PDF_FOOTER_TEXT = 'Confidential — prepared by CyberFortify';
export const PDF_BRAND_NAME = 'CyberFortify';

// Horizontal page inset; the running bands bleed full width and pad to this.
export const PAGE_INSET = 42;

export const reportPdfStyles = StyleSheet.create({
    // Full-bleed gray footer band, a touch darker than the white body.
    chromeFooter: {
        alignItems: 'center',
        backgroundColor: CF_PDF.band,
        bottom: 0,
        flexDirection: 'row',
        height: 30,
        justifyContent: 'space-between',
        left: 0,
        paddingHorizontal: PAGE_INSET,
        position: 'absolute',
        right: 0,
    },
    // Page number sits as its own fixed element (render works reliably only when the
    // dynamic text is a direct fixed child, not nested inside the flex footer row).
    chromeFooterPage: {
        bottom: 10,
        color: CF_PDF.muted,
        fontSize: 8,
        position: 'absolute',
        right: PAGE_INSET,
    },
    chromeFooterText: {
        color: CF_PDF.muted,
        fontSize: 8,
        // Must override the page's inherited lineHeight (1.5) — a >1 line height on
        // a fixed render() page-number text pushes it out of view in react-pdf 4.x.
        lineHeight: 1,
    },
    // Full-bleed gray header band.
    chromeHeader: {
        alignItems: 'center',
        backgroundColor: CF_PDF.band,
        flexDirection: 'row',
        height: 50,
        justifyContent: 'space-between',
        left: 0,
        paddingHorizontal: PAGE_INSET,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    chromeHeaderLogo: {
        height: 26,
        width: 37,
    },
    chromeHeaderTitle: {
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9.5,
        letterSpacing: 0.3,
    },
    page: {
        backgroundColor: CF_PDF.white,
        color: CF_PDF.body,
        fontFamily: 'Helvetica',
        fontSize: 10.5,
        // NOTE: no page-level lineHeight. A >1 lineHeight here is inherited by the
        // fixed render() page-number and hides it in react-pdf 4.x; every multi-line
        // body style sets its own lineHeight instead.
        paddingBottom: 48,
        paddingHorizontal: PAGE_INSET,
        paddingTop: 70,
    },
    sectionDivider: {
        backgroundColor: CF_PDF.accent,
        height: 2,
        marginBottom: 12,
        width: 60,
    },
    // Section titles read as the template's green banners.
    sectionHeading: {
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 16,
        letterSpacing: 0.3,
        marginBottom: 6,
    },
    subHeading: {
        color: CF_PDF.greenBar,
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
        letterSpacing: 0.5,
        marginBottom: 5,
        marginTop: 8,
        textTransform: 'uppercase',
    },
});
