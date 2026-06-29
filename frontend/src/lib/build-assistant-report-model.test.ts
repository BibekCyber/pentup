import { describe, expect, it } from 'vitest';

import type { AssistantLogFragmentFragment } from '@/graphql/types';

import { MessageLogType, ResultFormat, StatusType } from '@/graphql/types';

import { assistantSampleLogs, assistantSampleReportModel } from './assistant-report-sample';
import { buildAssistantReportModel } from './build-assistant-report-model';

const flow = {
    createdAt: '2026-03-31T10:00:00.000Z',
    id: '1',
    status: StatusType.Finished,
    title: 'Chat',
    updatedAt: '2026-03-31T10:30:00.000Z',
};

let seq = 0;

const mk = (type: MessageLogType, message = '', result = ''): AssistantLogFragmentFragment => {
    seq += 1;

    return {
        appendPart: false,
        assistantId: '1',
        createdAt: new Date(Date.parse('2026-03-31T10:00:00.000Z') + seq * 1000).toISOString(),
        flowId: '1',
        id: `l${seq}`,
        message,
        result,
        resultFormat: ResultFormat.Markdown,
        thinking: null,
        type,
    };
};

describe('buildAssistantReportModel', () => {
    it('groups one input + answer into a single section', () => {
        const model = buildAssistantReportModel(flow, { title: 'A' }, [mk(MessageLogType.Input, 'Scan the site for me please.'), mk(MessageLogType.Answer, 'Done — here are the results.'), mk(MessageLogType.Done)], { generatedAt: 'now' });

        expect(model.sections).toHaveLength(1);
        expect(model.sections[0]?.title).toBe('Scan the site for me please.');
        expect(model.sections[0]?.resultMarkdown).toContain('Done — here are the results.');
        expect(model.sections[0]?.resultMarkdown).toContain('**Prompt:** Scan the site for me please.');
    });

    it('opens a new section on each input and closes on done', () => {
        const model = buildAssistantReportModel(flow, null, [mk(MessageLogType.Input, 'First topic.'), mk(MessageLogType.Answer, 'A1'), mk(MessageLogType.Input, 'Second topic.'), mk(MessageLogType.Answer, 'A2')], { generatedAt: 'now' });

        expect(model.sections).toHaveLength(2);
        expect(model.sections.map((section) => section.id)).toEqual(['conversation-1', 'conversation-2']);
    });

    it('prunes empty sections (input with no substantive output)', () => {
        const model = buildAssistantReportModel(flow, null, [mk(MessageLogType.Input, 'Hello?'), mk(MessageLogType.Done), mk(MessageLogType.Input, 'Real question.'), mk(MessageLogType.Answer, 'Real answer.')], { generatedAt: 'now' });

        expect(model.sections).toHaveLength(1);
        expect(model.sections[0]?.title).toBe('Real question.');
    });

    it('hides thoughts and counts tool calls', () => {
        const model = buildAssistantReportModel(
            flow,
            null,
            [mk(MessageLogType.Input, 'Run a scan.'), mk(MessageLogType.Thoughts, 'internal reasoning that must not appear'), mk(MessageLogType.Terminal, 'nmap', 'open ports'), mk(MessageLogType.Search, 'cve lookup', 'results'), mk(MessageLogType.Answer, 'Findings summarised.')],
            { generatedAt: 'now' },
        );

        expect(model.sections[0]?.resultMarkdown).not.toContain('internal reasoning');
        expect(model.summary.subtasksTotal).toBe(2);
    });
});

describe('assistant sample fixture', () => {
    it('produces a multi-topic report with no structured findings', () => {
        expect(assistantSampleReportModel.sections.length).toBeGreaterThanOrEqual(2);
        expect(assistantSampleReportModel.findings).toHaveLength(0);
        expect(assistantSampleReportModel.summary.findingsTotal).toBe(0);
        expect(assistantSampleLogs.length).toBeGreaterThan(0);
        expect(assistantSampleReportModel.sections[0]?.resultMarkdown).toContain('Strict-Transport-Security');
    });
});
