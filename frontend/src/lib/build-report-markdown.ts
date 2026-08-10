import type { Finding, ReportModel } from './report-model';

import { SEVERITY_ORDER } from './report-model';
import { getSeverityStyle } from './severity-palette';
import { getEngagementLabel } from './target-type-colors';

const findingHeading = (finding: Finding, index: number): string => {
    const style = getSeverityStyle(finding.severity);
    const parts = [`${style.label}`];

    if (typeof finding.cvss === 'number') {
        parts.push(`CVSS ${finding.cvss.toFixed(1)}`);
    }

    if (finding.cve) {
        parts.push(finding.cve);
    }

    return `### ${index}. ${finding.title} (${parts.join(' · ')})`;
};

const renderFinding = (finding: Finding, index: number): string => {
    const lines: string[] = [findingHeading(finding, index), ''];

    const facts: string[] = [];

    if (typeof finding.cvss === 'number') {
        facts.push(`**CVSS:** ${finding.cvss.toFixed(1)}`);
    }

    facts.push(`**Risk Rating:** ${getSeverityStyle(finding.severity).label}`);

    if (finding.affectedUrls?.length) {
        facts.push(`**Affected URL${finding.affectedUrls.length > 1 ? 's' : ''}:** ${finding.affectedUrls.join(', ')}`);
    }

    lines.push(facts.join('  \n'), '');

    if (finding.description) {
        lines.push('**Details of Vulnerability**', '', finding.description.trim(), '');
    }

    if (finding.stepsToReproduce?.length) {
        lines.push('**Steps to Reproduce**', '');
        finding.stepsToReproduce.forEach((step, idx) => lines.push(`${idx + 1}. ${step}`));
        lines.push('');
    }

    if (finding.evidence) {
        lines.push('**Evidence**', '', finding.evidence.trim(), '');
    }

    if (finding.impact?.length) {
        lines.push('**Impact**', '');
        finding.impact.forEach((item) => lines.push(`- ${item}`));
        lines.push('');
    }

    if (finding.recommendation) {
        lines.push('**Remediation**', '', finding.recommendation.trim(), '');
    }

    if (finding.references?.length) {
        lines.push('**References**', '');
        finding.references.forEach((ref) => lines.push(`- ${ref}`));
        lines.push('');
    }

    return lines.join('\n');
};

export const buildReportMarkdown = (model: ReportModel): string => {
    const engagement = getEngagementLabel(model.flow.targetType);
    const lines: string[] = [
        `# ${engagement || model.flow.title} — Penetration Test Report`,
        '',
        '_By CyberFortify_',
        '',
    ];

    const meta: string[] = [];

    if (model.flow.target) {
        meta.push(`**Target:** ${model.flow.target}`);
    }

    if (model.summary.duration) {
        meta.push(`**Duration:** ${model.summary.duration}`);
    }

    if (meta.length > 0) {
        lines.push(meta.join('  \n'), '');
    }

    lines.push('## Executive Summary', '');

    if (model.executiveSummary?.content) {
        lines.push(model.executiveSummary.content.trim(), '');
    }

    lines.push('| Severity | Findings | CVSS Range |', '| --- | --- | --- |');
    SEVERITY_ORDER.forEach((severity) => {
        const style = getSeverityStyle(severity);
        lines.push(`| ${style.label} | ${model.summary.findingsBySeverity[severity]} | ${style.cvssRange} |`);
    });
    lines.push('');

    lines.push(
        `Tasks: ${model.summary.tasksDone}/${model.summary.tasksTotal} completed` +
            (model.summary.tasksFailed > 0 ? `, ${model.summary.tasksFailed} failed` : '') +
            ` · Findings: ${model.summary.findingsTotal}` +
            ` · Screenshots: ${model.summary.screenshotCount}`,
        '',
    );

    if (model.findings.length > 0) {
        lines.push(
            '## Findings Summary',
            '',
            '| # | Finding | Severity | Recommendation |',
            '| --- | --- | --- | --- |',
        );
        model.findings.forEach((finding, idx) => {
            const recommendation = (finding.recommendation ?? '').replaceAll('\n', ' ').slice(0, 140);
            lines.push(
                `| ${idx + 1} | ${finding.title} | ${getSeverityStyle(finding.severity).label} | ${recommendation} |`,
            );
        });
        lines.push('');

        lines.push(
            '## Detailed Findings',
            '',
            '_Findings are ordered by severity. Risk ratings are technical and based on CVSS v3.1._',
            '',
        );
        model.findings.forEach((finding, idx) => lines.push(renderFinding(finding, idx + 1)));
    }

    // The dynamic per-task methodology / assistant conversation log is intentionally
    // omitted from the deliverable (PDF, web view and markdown alike).

    return lines.join('\n').trim();
};
