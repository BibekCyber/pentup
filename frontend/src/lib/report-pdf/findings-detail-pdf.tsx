import { Text, View } from '@react-pdf/renderer';

import type { Finding } from '@/lib/report-model';

import FindingCardPdf from './finding-card-pdf';
import { reportPdfStyles } from './styles';

interface FindingsDetailPdfProps {
    findings: Finding[];
}

const FindingsDetailPdf = ({ findings }: FindingsDetailPdfProps) => {
    if (findings.length === 0) {
        return null;
    }

    return (
        <View
            break
            id="detailed-findings"
        >
            <Text style={reportPdfStyles.sectionHeading}>Detailed Findings</Text>
            <View style={reportPdfStyles.sectionDivider} />
            <Text style={{ color: '#a8a29e', fontSize: 8.5, marginBottom: 12 }}>
                Findings are ordered by severity. Risk ratings are technical and based on CVSS v3.1.
            </Text>
            {findings.map((finding, index) => (
                <FindingCardPdf
                    finding={finding}
                    index={index + 1}
                    key={finding.id}
                />
            ))}
        </View>
    );
};

export default FindingsDetailPdf;
