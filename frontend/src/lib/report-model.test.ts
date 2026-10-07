import { describe, expect, it } from 'vitest';

import type { FindingFragmentFragment, FlowFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

import { Severity, StatusType } from '@/graphql/types';

import type { Finding } from './report-model';

import { buildReportMarkdown } from './build-report-markdown';
import { buildReportModel, deriveScopeTargets, deriveSummaryNarrative, mapFindings } from './build-report-model';
import { isSeverityChangeMeaningful } from './report-model';
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
        // Contents list only what the on-screen report actually contains; Scope and the
        // Appendix are PDF-only boilerplate, so linking to them here would go nowhere.
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
        expect(sampleReportModel.summary.findingsBySeverity).toEqual({
            critical: 0,
            high: 3,
            informational: 0,
            low: 3,
            medium: 6,
        });
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

        // Reports state the engagement class (Web / Cloud) and are white-labelled
        // for CyberFortify rather than titled by the raw flow name.
        expect(md).toContain('# Web Application — Penetration Test Report');
        expect(md).toContain('_By CyberFortify_');
        expect(md).toContain('## Executive Summary');
        expect(md).toContain('| Severity | Findings | CVSS Range |');
        expect(md).toContain('## Findings Summary');

        for (const finding of sampleReportModel.findings) {
            expect(md).toContain(finding.title);
        }
    });

    it('uses the finding-centric structure (Detailed Findings, no dynamic methodology)', () => {
        const md = buildReportMarkdown(sampleReportModel);

        // Findings are a dedicated top-level section.
        expect(md).toContain('## Detailed Findings');
        expect(md).toContain('### 1. Insecure Direct Object Reference (IDOR) via Predictable User ID');

        // Reference sub-section order is present.
        expect(md).toContain('**Details of Vulnerability**');
        expect(md).toContain('**Steps to Reproduce**');
        expect(md).toContain('**Impact**');
        expect(md).toContain('**Remediation**');

        // The dynamic per-task methodology log is no longer part of the deliverable.
        expect(md).not.toContain('## Methodology');
        expect(md).not.toContain('### Subtasks');
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
        {
            cvss: 9.1,
            description: 'Logout keeps tokens valid',
            index: 0,
            recommendation: 'Add a Redis token denylist',
            references: ['https://owasp.org/Top10/'],
            severity: Severity.Critical,
            severityUpdated: false,
            taskId: '9',
            title: 'Token Revocation Failure',
        },
        {
            cvss: 9,
            index: 1,
            severity: Severity.Critical,
            severityUpdated: false,
            taskId: '9',
            title: 'Missing Rate Limiting',
        },
        {
            cvss: 6.1,
            index: 2,
            severity: Severity.Medium,
            severityUpdated: false,
            taskId: '9',
            title: 'CORS Misconfiguration',
        },
        {
            cvss: 5.3,
            index: 3,
            severity: Severity.Medium,
            severityUpdated: false,
            taskId: '9',
            title: 'Missing Security Headers',
        },
    ];

    const flow = {
        createdAt: '2026-06-28T10:00:00Z',
        id: '15',
        status: StatusType.Finished,
        title: 'Audit API Auth Flows',
        updatedAt: '2026-06-28T23:00:00Z',
    };
    const tasks = [
        {
            createdAt: '2026-06-28T10:05:00Z',
            flowId: '15',
            id: '9',
            input: 'internal prompt',
            result: 'done',
            status: StatusType.Finished,
            subtasks: [],
            title: 'Assess API Auth & Session',
            updatedAt: '2026-06-28T11:42:00Z',
        },
    ] as unknown as TaskFragmentFragment[];

    it('maps GraphQL findings into renderable findings with stable ids', () => {
        const findings = mapFindings(gqlFindings);

        expect(findings).toHaveLength(4);
        expect(findings[0]?.severity).toBe('critical');
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

describe('deriveScopeTargets', () => {
    const withUrls = (urls: string[]): Finding[] => [{ ...(sampleFindings[0] as Finding), affectedUrls: urls }];

    it('collapses the same host reached over http and https into one https entry', () => {
        expect(deriveScopeTargets(withUrls(['http://example.com/a', 'https://example.com/b']))).toEqual([
            'https://example.com',
        ]);
    });

    it('drops raw backend IPs when a named host is in scope (the Host-header probing artefact)', () => {
        // Exactly the flow-22 defect: the scan reached the site through its backend IPs.
        const targets = deriveScopeTargets(
            withUrls([
                'https://bebekthapa.com.np/',
                'http://13.215.239.219',
                'https://13.215.239.219',
                'http://52.74.6.109',
                'https://52.74.6.109',
            ]),
        );

        expect(targets).toEqual(['https://bebekthapa.com.np']);
    });

    it('keeps IP assets when the engagement has no named host', () => {
        expect(deriveScopeTargets(withUrls(['http://10.0.0.5:8080/x', 'http://10.0.0.5:8080/y']))).toEqual([
            'http://10.0.0.5:8080',
        ]);
    });

    it('falls back to the flow target when no findings carry URLs', () => {
        expect(deriveScopeTargets([], 'acme.test')).toEqual(['acme.test']);
    });

    it('lists the scan target first and merges bare hosts with their URL form', () => {
        // Flow-28 shape: the reporter emitted bare hostnames, not URLs.
        expect(
            deriveScopeTargets(
                withUrls(['old.example.com', 'app.example.com', 'https://app.example.com/admin', 'b.example.com']),
                'https://app.example.com',
            ),
        ).toEqual(['https://app.example.com', 'b.example.com', 'old.example.com']);
    });

    it('reduces annotated host references to the host', () => {
        expect(
            deriveScopeTargets(withUrls(['example.com (DNS zone)', 'example.com (DNS MX/TXT records)']), 'example.com'),
        ).toEqual(['example.com']);
    });

    it('keeps the scan target even when it is a raw IP next to named hosts', () => {
        expect(deriveScopeTargets(withUrls(['https://app.example.com/']), '10.0.0.5')).toEqual([
            '10.0.0.5',
            'https://app.example.com',
        ]);
    });
});

describe('isSeverityChangeMeaningful', () => {
    const base: Finding = { id: 'f', index: 0, severity: 'high', title: 'A' };

    it('sends a genuine re-rating', () => {
        expect(isSeverityChangeMeaningful(base, 'low')).toBe(true);
    });

    it('ignores picking the severity a finding already has', () => {
        expect(isSeverityChangeMeaningful(base, 'high')).toBe(false);
    });

    // Regression: after a CVSS-only edit the original severity equals the current one, so
    // "Reset to original" asks for the same severity. A plain equality guard swallowed it
    // and the reset silently did nothing.
    it('still sends the reset when an override is in force but the severity matches', () => {
        const cvssOnlyEdit: Finding = { ...base, originalSeverity: 'high', severityUpdated: true };

        expect(isSeverityChangeMeaningful(cvssOnlyEdit, 'high')).toBe(true);
    });

    it('ignores findings with no storage address', () => {
        expect(isSeverityChangeMeaningful({ ...base, index: undefined }, 'low')).toBe(false);
    });
});
