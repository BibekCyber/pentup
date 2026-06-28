import { describe, expect, it } from 'vitest';

import type { FlowFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

import { StatusType } from '@/graphql/types';

import type { Finding } from './report-model';

import { buildReportMarkdown } from './build-report-markdown';
import { buildReportModel } from './build-report-model';
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
});

describe('palette defaults', () => {
    it('returns defaults for unknown values', () => {
        expect(getSeverityStyle('informational').label).toBe('Informational');
        expect(getStatusStyle(undefined).label).toBe('Unknown');
        expect(getStatusStyle(StatusType.Finished).label).toBe('Finished');
    });
});
