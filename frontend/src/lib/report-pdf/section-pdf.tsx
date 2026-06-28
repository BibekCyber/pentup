import { StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReportSection } from '@/lib/report-model';

import { getStatusStyle } from '@/lib/severity-palette';

import FindingCardPdf from './finding-card-pdf';
import { renderMarkdownBlocks } from './markdown-pdf';
import { reportPdfStyles } from './styles';

const styles = StyleSheet.create({
    headingRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    objective: {
        backgroundColor: '#f8fafc',
        borderLeftColor: '#cbd5e1',
        borderLeftWidth: 2,
        color: '#475569',
        fontSize: 9.5,
        lineHeight: 1.5,
        marginBottom: 8,
        padding: 7,
    },
    section: {
        marginTop: 18,
    },
    statusPill: {
        borderRadius: 3,
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 7.5,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    subtask: {
        borderLeftColor: '#cbd5e1',
        borderLeftWidth: 2,
        marginBottom: 12,
        paddingLeft: 10,
    },
    subtaskDescription: {
        color: '#64748b',
        fontSize: 9,
        lineHeight: 1.45,
        marginBottom: 2,
    },
    subtaskHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
    },
    subtaskTitle: {
        color: '#334155',
        flex: 1,
        fontFamily: 'Helvetica-Bold',
        fontSize: 10.5,
        paddingRight: 6,
    },
});

interface SectionPdfProps {
    section: ReportSection;
}

const SectionPdf = ({ section }: SectionPdfProps) => {
    const status = getStatusStyle(section.status);

    return (
        <View id={section.id} minPresenceAhead={90} style={styles.section}>
            <View style={styles.headingRow} wrap={false}>
                <Text style={reportPdfStyles.sectionHeading}>{section.title}</Text>
                <Text style={[styles.statusPill, { backgroundColor: status.pdf.solid }]}>{status.label}</Text>
            </View>
            <View style={reportPdfStyles.sectionDivider} />

            {section.input && <Text style={styles.objective}>{section.input}</Text>}

            {section.resultMarkdown && <View>{renderMarkdownBlocks(section.resultMarkdown)}</View>}

            {section.findings.length > 0 && (
                <View>
                    <Text minPresenceAhead={140} style={[reportPdfStyles.subHeading, { marginTop: 8 }]}>
                        Findings
                    </Text>
                    {section.findings.map((finding) => (
                        <FindingCardPdf finding={finding} key={finding.id} />
                    ))}
                </View>
            )}

            {section.subtasks.length > 0 && (
                <View>
                    <Text minPresenceAhead={140} style={[reportPdfStyles.subHeading, { marginTop: 8 }]}>
                        Subtasks
                    </Text>
                    {section.subtasks.map((subtask) => {
                        const subStatus = getStatusStyle(subtask.status);

                        return (
                            <View key={subtask.id} minPresenceAhead={90} style={styles.subtask}>
                                <View style={styles.subtaskHeader} wrap={false}>
                                    <Text style={styles.subtaskTitle}>{subtask.title}</Text>
                                    <Text style={[styles.statusPill, { backgroundColor: subStatus.pdf.solid }]}>{subStatus.label}</Text>
                                </View>
                                {subtask.description && <Text style={styles.subtaskDescription}>{subtask.description}</Text>}
                                {subtask.resultMarkdown && <View>{renderMarkdownBlocks(subtask.resultMarkdown)}</View>}
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

export default SectionPdf;
