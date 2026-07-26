import { StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportModel } from '@/lib/report-model';

import { CF_PDF } from './cf-brand';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    paragraph: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.6,
        marginBottom: 10,
    },
});

interface CoverConfidentialityProps {
    model: ReportModel;
}

// Static confidentiality notice (identical across clients apart from the recipient
// name), adapted from the CyberFortify report template. Rendered first on the
// content page, so it needs no page break of its own.
const CoverConfidentiality = ({ model }: CoverConfidentialityProps) => {
    const client = model.clientName?.trim() || 'the named recipient';

    return (
        <View id="confidentiality">
            <Text style={reportPdfStyles.sectionHeading}>Confidentiality</Text>
            <View style={reportPdfStyles.sectionDivider} />

            <Text style={styles.paragraph}>
                This document is classified as &lsquo;Confidential&rsquo;. The information contained within this report,
                including all accompanying attachments, is intended solely for the use of {client}. Any disclosure,
                distribution, copying, or use of this document by individuals or entities other than {client}, or by
                third parties without explicit written authorization, is strictly prohibited. The contents of this
                report may include sensitive and confidential information and may also be governed by non-disclosure
                agreements or contractual obligations of confidentiality.
            </Text>
            <Text style={styles.paragraph}>
                If this document has been received in error, or if the recipient is not authorized to access it,
                CyberFortify requests that the document be securely deleted or returned immediately. Unauthorized use,
                reproduction, or distribution of this report is strictly prohibited. CyberFortify assumes no liability
                for any misuse of this document or the information contained herein by unauthorized parties.
            </Text>
            <Text style={styles.paragraph}>
                All findings, risks, and recommendations presented in this report are based on the information available
                at the time of assessment and the current threat landscape. These may evolve as technologies,
                environments, and threat vectors change over time.
            </Text>
        </View>
    );
};

export default CoverConfidentiality;
