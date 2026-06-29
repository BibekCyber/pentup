import { StyleSheet } from '@react-pdf/renderer';

import { BRAND } from '@/lib/severity-palette';

export const PDF_FOOTER_TEXT = 'Confidential — prepared by PentAGI';

export const reportPdfStyles = StyleSheet.create({
    chromeFooter: {
        bottom: 24,
        left: 44,
        position: 'absolute',
        right: 44,
    },
    chromeFooterText: {
        color: '#94a3b8',
        fontSize: 8,
    },
    chromeHairline: {
        backgroundColor: '#e2e8f0',
        height: 1,
    },
    chromeHeader: {
        left: 44,
        position: 'absolute',
        right: 44,
        top: 24,
    },
    chromeHeaderDate: {
        color: '#94a3b8',
        fontSize: 8.5,
    },
    chromeHeaderTitle: {
        color: '#475569',
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
        backgroundColor: '#ffffff',
        color: '#334155',
        fontFamily: 'Helvetica',
        fontSize: 10.5,
        lineHeight: 1.5,
        paddingBottom: 56,
        paddingHorizontal: 44,
        paddingTop: 64,
    },
    sectionDivider: {
        borderBottomColor: BRAND.solid,
        borderBottomWidth: 2,
        marginBottom: 10,
    },
    sectionHeading: {
        color: '#0f172a',
        fontFamily: 'Helvetica-Bold',
        fontSize: 15,
        marginBottom: 8,
    },
    subHeading: {
        color: '#334155',
        fontFamily: 'Helvetica-Bold',
        fontSize: 11,
        letterSpacing: 0.5,
        marginBottom: 6,
        marginTop: 4,
        textTransform: 'uppercase',
    },
});
