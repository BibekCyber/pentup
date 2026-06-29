import { describe, expect, it } from 'vitest';

import type { FindingFragmentFragment, FlowFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

import { Severity, StatusType } from '@/graphql/types';

import type { Finding } from './report-model';

import { buildReportMarkdown } from './build-report-markdown';
import { buildReportModel, deriveSummaryNarrative, mapFindings } from './build-report-model';
import { sampleFindings, sampleReportModel } from './report-sample';
import { getSeverityStyle, getStatusStyle } from './severity-palette';

const flow: Pick<FlowFragmentFragment, 'createdAt' | 'id' | 'status' | 'title' | 'updatedAt'> = {
    createdAt: '2026-03-31T09:00:00.000Z',
    id: '10',
    status: StatusType.Finished,
    title: 'Test Flow',
    updatedAt: '2026-03-31T10:30:00.000Z',
};

const task = (id: string, status: StatusType = StatusType.Finished): TaskFragmentFragment => ({
    createdAt: flow.createdAt,
    flowId: '10',
    id,
    input: 'do the thing',
    result: 'result markdown',
    status,
    subtasks: [],
    title: `Task ${id}`,
    updatedAt: flow.updatedAt,
});

describe('buildReportModel', () => {
    it('handles an empty flow with no tasks or findings', () => {
        const model = buildReportModel(flow, [], [], { generatedAt: 'now' });

        expect(model.sections).toHaveLength(0);
        expect(model.findings).toHaveLength(0);
        expect(model.summary.tasksTotal).toBe(0);
        expect(model.summary.findingsTotal).toBe(0);
        expect(model.toc.map((entry) => entry.id)).toEqual(['executive-summary']);
    });

    it('handles a missing flow gracefully', () => {
        const model = buildReportModel(null, null, []);

        expect(model.flow.title).toBe('Untitled Flow');
        expect(model.flow.status).toBe(StatusType.Created);
        expect(model.sections).toHaveLength(0);
    });

    it('maps tasks with no findings', () => {
        const model = buildReportModel(flow, [task('1'), task('2', StatusType.Failed)], [], { generatedAt: 'now' });

        expect(model.summary.tasksTotal).toBe(2);
        expect(model.summary.tasksDone).toBe(1);
        expect(model.summary.tasksFailed).toBe(1);
        expect(model.summary.findingsTotal).toBe(0);
        expect(model.summary.findingsBySeverity).toEqual({ critical: 0, high: 0, informational: 0, low: 0, medium: 0 });
        expect(model.summary.duration).toBe('1h 30m');
    });

    it('groups and sorts findings across multiple severities high-to-low', () => {
        const findings: Finding[] = [
            { cvss: 2, id: 'a', severity: 'low', taskId: '1', title: 'Low one' },
            { cvss: 9.5, id: 'b', severity: 'critical', taskId: '1', title: 'Critical one' },
            { cvss: 5, id: 'c', severity: 'medium', taskId: '2', title: 'Medium one' },
            { cvss: 8, id: 'd', severity: 'high', taskId: '999', title: 'Orphan high' },
        ];
        const model = buildReportModel(flow, [task('1'), task('2')], findings, { generatedAt: 'now' });

        expect(model.findings.map((finding) => finding.severity)).toEqual(['critical', 'high', 'medium', 'low']);
        expect(model.summary.findingsBySeverity).toEqual({ critical: 1, high: 1, informational: 0, low: 1, medium: 1 });

        const section1 = model.sections.find((section) => section.id === 'task-1');
        expect(section1?.findings.map((finding) => finding.id)).toEqual(['b', 'a']);
        expect(model.toc.some((entry) => entry.id === 'findings-summary')).toBe(true);
    });
});

describe('sample report fixture', () => {
    it('reflects the reference report severity distribution', () => {
        expect(sampleReportModel.findings).toHaveLength(12);
        expect(sampleReportModel.summary.findingsBySeverity).toEqual({ critical: 0, high: 3, informational: 0, low: 3, medium: 6 });
        expect(sampleReportModel.sections).toHaveLength(3);
        expect(sampleReportModel.flow.target).toBe('abc.xyz.com');
    });

    it('sorts the top finding as the highest severity', () => {
        expect(sampleReportModel.findings[0]?.severity).toBe('high');
        expect(sampleFindings).toHaveLength(12);
    });
});

describe('buildReportMarkdown', () => {
    it('renders the executive summary, risk table and every finding title', () => {
        const md = buildReportMarkdown(sampleReportModel);

        expect(md).toContain('# Web Application Penetration Test');
        expect(md).toContain('## Executive Summary');
        expect(md).toContain('| Severity | Findings | CVSS Range |');
        expect(md).toContain('## Findings Summary');

        for (const finding of sampleReportModel.findings) {
            expect(md).toContain(finding.title);
        }
    });

    it('uses the finding-centric structure (Detailed Findings + Methodology, no findings nested in tasks)', () => {
        const md = buildReportMarkdown(sampleReportModel);

        // Findings are a dedicated top-level section, methodology follows.
        expect(md).toContain('## Detailed Findings');
        expect(md).toContain('## Methodology');
        expect(md).toContain('### 1. Insecure Direct Object Reference (IDOR) via Predictable User ID');

        // Reference sub-section order is present.
        expect(md).toContain('**Details of Vulnerability**');
        expect(md).toContain('**Steps to Reproduce**');
        expect(md).toContain('**Impact**');
        expect(md).toContain('**Remediation**');

        // Findings live only under Detailed Findings, not nested under task sections.
        expect(md).not.toContain('### Findings');
        expect(md.indexOf('## Detailed Findings')).toBeLessThan(md.indexOf('## Methodology'));
    });
});

describe('palette defaults', () => {
    it('returns defaults for unknown values', () => {
        expect(getSeverityStyle('informational').label).toBe('Informational');
        expect(getStatusStyle(undefined).label).toBe('Unknown');
        expect(getStatusStyle(StatusType.Finished).label).toBe('Finished');
    });
});

describe('mapFindings + buildReportModel (backend findings drive a coherent report)', () => {
    const gqlFindings: FindingFragmentFragment[] = [
        { cvss: 9.1, description: 'Logout keeps tokens valid', recommendation: 'Add a Redis token denylist', references: ['https://owasp.org/Top10/'], severity: Severity.Critical, taskId: '9', title: 'Token Revocation Failure' },
        { cvss: 9, severity: Severity.Critical, taskId: '9', title: 'Missing Rate Limiting' },
        { cvss: 6.1, severity: Severity.Medium, taskId: '9', title: 'CORS Misconfiguration' },
        { cvss: 5.3, severity: Severity.Medium, taskId: '9', title: 'Missing Security Headers' },
    ];

    const flow = { createdAt: '2026-06-28T10:00:00Z', id: '15', status: StatusType.Finished, title: 'Audit API Auth Flows', updatedAt: '2026-06-28T23:00:00Z' };
    const tasks = [{ createdAt: '2026-06-28T10:05:00Z', flowId: '15', id: '9', input: 'internal prompt', result: 'done', status: StatusType.Finished, subtasks: [], title: 'Assess API Auth & Session', updatedAt: '2026-06-28T11:42:00Z' }] as unknown as TaskFragmentFragment[];

    it('maps GraphQL findings into renderable findings with stable ids', () => {
        const findings = mapFindings(gqlFindings);

        expect(findings).toHaveLength(4);
        expect(findings[0].severity).toBe('critical');
        expect(new Set(findings.map((f) => f.id)).size).toBe(4);
    });

    it('produces a severity summary that matches the findings (no 0-findings discrepancy)', () => {
        const model = buildReportModel(flow, tasks, mapFindings(gqlFindings));

        expect(model.summary.findingsTotal).toBe(4);
        expect(model.summary.findingsBySeverity.critical).toBe(2);
        expect(model.summary.findingsBySeverity.medium).toBe(2);
        expect(model.summary.findingsBySeverity.high).toBe(0);

        const narrative = deriveSummaryNarrative(model);
        expect(narrative).toContain('4 findings');
        expect(narrative).not.toContain('no structured findings');
    });

    it('derives duration from task activity, not flow.updatedAt', () => {
        const model = buildReportModel(flow, tasks, mapFindings(gqlFindings));

        // createdAt 10:00 → last task activity 11:42 = 1h 42m, NOT 13h (flow.updatedAt 23:00).
        expect(model.summary.duration).toBe('1h 42m');
    });

    it('returns an empty list when findings are absent', () => {
        expect(mapFindings(null)).toEqual([]);
        expect(mapFindings(undefined)).toEqual([]);
    });
});
