import { StyleSheet } from '@react-pdf/renderer';

import { CF_PDF } from './cf-brand';

// The generated PDF is white-labelled for CyberFortify (the delivering firm).
export const PDF_FOOTER_TEXT = 'Confidential — prepared by CyberFortify';
export const PDF_BRAND_NAME = 'CyberFortify';

// Horizontal page inset — matches the client report's generous ~70pt margins.
export const PAGE_INSET = 68;

export const reportPdfStyles = StyleSheet.create({
    // Minimal footer — just a hairline rule with the page number below it (no fill,
    // no confidential note), matching the client report.
    chromeFooter: {
        borderTopColor: CF_PDF.hairline,
        borderTopWidth: 1,
        bottom: 60,
        left: PAGE_INSET,
        position: 'absolute',
        right: PAGE_INSET,
    },
    // Page number sits as its own fixed element (render works reliably only when the
    // dynamic text is a direct fixed child, not nested inside the flex footer row).
    chromeFooterPage: {
        bottom: 42,
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
    // Light-gray header band — full width and flush to the top edge (all gray, no
    // white strip above it). Content stays inset to the body's left/right margin via
    // paddingHorizontal; the gap below the band is balanced against the footer gap.
    chromeHeader: {
        alignItems: 'center',
        backgroundColor: CF_PDF.band,
        flexDirection: 'row',
        height: 54,
        justifyContent: 'space-between',
        left: 0,
        paddingHorizontal: PAGE_INSET,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    chromeHeaderLogo: {
        height: 34,
        width: 49,
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
        // Even breathing room top and bottom: header band is 54 tall (flush to top),
        // so 96 leaves a ~42pt gap below it; the footer hairline sits at 60, so 102
        // leaves a matching ~42pt gap above it. No body content collides with chrome.
        paddingBottom: 102,
        paddingHorizontal: PAGE_INSET,
        paddingTop: 96,
    },
    // No visible rule under headings (their report has none) — kept as a spacer.
    sectionDivider: {
        height: 0,
        marginBottom: 4,
    },
    // Section titles: uppercase dark-green, like the client report.
    sectionHeading: {
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 16,
        letterSpacing: 0.3,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    subHeading: {
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
        letterSpacing: 0.5,
        marginBottom: 5,
        marginTop: 8,
        textTransform: 'uppercase',
    },
});
