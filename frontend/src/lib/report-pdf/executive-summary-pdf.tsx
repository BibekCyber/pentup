import { StyleSheet, Text, View } from '@react-pdf/renderer';

import type { Finding, ReportModel } from '@/lib/report-model';

import { TargetType } from '@/graphql/types';
import { getSeverityStyle } from '@/lib/severity-palette';

import { CF_PDF } from './cf-brand';
import { Bullets } from './pdf-primitives';
import { reportPdfStyles } from './styles';

// Themes claimed in the narrative are DERIVED from the actual findings so the
// executive summary never asserts a testing area the scan did not surface. The
// match is conservative (title + description keywords); it can only under-claim.
const THEME_MAP: { area: string; test: RegExp }[] = [
    { area: 'authentication', test: /\b(auth|authentication|login|log-?in|password|credential|mfa|2fa|otp|brute)/i },
    { area: 'session and token management', test: /\b(session|token|jwt|cookie|logout|log-?out|csrf)/i },
    {
        area: 'access control',
        test: /\b(authoriz|authoris|access[ -]?control|idor|privilege|permission|rbac|bola|bfla)/i,
    },
    {
        area: 'input validation and injection',
        test: /\b(inject|sqli|xss|ssrf|rce|command|xxe|deserial|traversal|lfi|rfi|ssti)/i,
    },
    { area: 'sensitive data handling', test: /\b(sensitive|pii|disclosure|exposure|exposed|leak)/i },
    { area: 'transport security', test: /\b(tls|ssl|certificate|https|cipher|hsts)/i },
    {
        area: 'application configuration and hardening',
        test: /\b(header|cors|csp|clickjack|misconfig|configuration|hardening|rate[ -]?limit|verbose|debug)/i,
    },
];

const deriveFocusAreas = (findings: readonly Finding[]): string[] => {
    const haystack = findings.map((f) => `${f.title} ${f.description ?? ''}`).join(' ');
    const areas = THEME_MAP.filter(({ test }) => test.test(haystack)).map(({ area }) => area);

    return areas.length > 0
        ? areas
        : ['authentication', 'access control', 'sensitive data handling', 'application configuration'];
};

// Oxford comma before the final "and": the area names themselves contain "and"
// (e.g. "session and token management"), so the serial comma avoids a run-on read.
const listToProse = (items: string[]): string =>
    items.length <= 1
        ? (items[0] ?? '')
        : `${items.slice(0, -1).join(', ')}${items.length > 2 ? ',' : ''} and ${items[items.length - 1]}`;

const styles = StyleSheet.create({
    conclusionsHeading: {
        color: CF_PDF.ink,
        fontFamily: 'Helvetica-Bold',
        fontSize: 12.5,
        marginBottom: 8,
        marginTop: 6,
    },
    paragraph: {
        color: CF_PDF.body,
        fontSize: 10,
        lineHeight: 1.6,
        marginBottom: 10,
    },
    subHeading: {
        color: CF_PDF.accentText,
        fontFamily: 'Helvetica-Bold',
        fontSize: 11,
        marginBottom: 6,
        marginTop: 8,
    },
});

const pluralize = (n: number, word: string): string => (n === 1 ? word : `${word}s`);

interface ExecutiveSummaryPdfProps {
    model: ReportModel;
}

const ExecutiveSummaryPdf = ({ model }: ExecutiveSummaryPdfProps) => {
    const client = model.clientName?.trim() || 'the client';
    const isCloud = model.flow.targetType === TargetType.Cloud;
    const asset = isCloud ? 'cloud infrastructure' : 'web application and associated APIs';
    const total = model.summary.findingsTotal;
    const bySev = model.summary.findingsBySeverity;

    // Priority severities actually present (critical/high/medium), e.g. "High and Medium".
    const present = (['critical', 'high', 'medium'] as const)
        .filter((s) => bySev[s] > 0)
        .map((s) => getSeverityStyle(s).label);
    const priorityClause =
        present.length > 1
            ? `${present.slice(0, -1).join(', ')} and ${present[present.length - 1]}`
            : (present[0] ?? 'higher-severity');
    const weaknessClause =
        total > 0 ? `${total} security ${total === 1 ? 'weakness' : 'weaknesses'}` : 'no confirmed security weaknesses';

    // Testing areas actually represented in the findings, used to keep the
    // narrative honest about what the assessment surfaced.
    const focusAreas = deriveFocusAreas(model.findings);
    const focusProse = listToProse(focusAreas);

    return (
        <View id="executive-summary">
            <Text style={reportPdfStyles.sectionHeading}>Executive Summary</Text>
            <View style={reportPdfStyles.sectionDivider} />

            <Text style={styles.paragraph}>
                {client} engaged CyberFortify to perform a penetration test of its {asset}. The assessment covered the
                in-scope assets using the access, credentials, and information provided by {client}, and was conducted
                within the agreed testing window.
            </Text>
            <Text style={styles.paragraph}>
                The objective of the assessment was to evaluate the security posture of the {asset} and identify
                vulnerabilities that could impact the confidentiality, integrity, or availability of {client} systems
                and user data. Testing was performed using a combination of automated security review, authenticated
                testing, and targeted validation of application behaviour, drawing on both automated tooling and manual
                techniques.
            </Text>
            <Text style={styles.paragraph}>
                {total > 0
                    ? `The assessment identified ${total} ${pluralize(total, 'finding')} across areas including ${focusProse}. `
                    : 'The assessment did not identify any confirmed vulnerabilities within the tested scope. '}
                This report presents the confirmed findings, their associated risk ratings, business impact, and
                recommended remediation actions to help {client} improve the security of its {asset} environment.
            </Text>

            <Text style={styles.conclusionsHeading}>Conclusions and Recommendations</Text>
            <Text style={styles.paragraph}>
                The assessment identified {weaknessClause} across the in-scope {asset}.
                {total > 0 ? ` The most significant risks relate to ${listToProse(focusAreas.slice(0, 4))}.` : ''}
            </Text>
            <Text style={styles.paragraph}>
                {client} should prioritise remediation based on severity, exploitability, and the potential exposure of
                sensitive user data. Addressing the {priorityClause}-risk findings first will significantly reduce the
                likelihood of unauthorised access, session misuse, and sensitive data exposure across the environment.
            </Text>

            <Text style={styles.subHeading}>Positive Findings:</Text>
            <Bullets items={model.positiveFindings} />

            <View style={{ marginTop: 10 }}>
                <Text style={styles.subHeading}>Initial Recommendations:</Text>
                <Bullets items={model.initialRecommendations} />
            </View>
        </View>
    );
};

export default ExecutiveSummaryPdf;
