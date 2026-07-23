import type {
    AssistantFragmentFragment,
    AssistantLogFragmentFragment,
    FlowFragmentFragment,
    TargetType,
} from '@/graphql/types';

import { MessageLogType, StatusType } from '@/graphql/types';

import type { Finding, ReportModel, ReportSection, ReportTocEntry } from './report-model';

import { formatDuration, pluralize } from './build-report-model';
import { emptySeverityCounts } from './report-model';

const oneLine = (text: string, max = 140): string => {
    const flat = text.replace(/\s+/g, ' ').trim();

    return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
};

// Strip system-injected engagement directives (e.g. <engagement_auth>…</engagement_auth>)
// from a user prompt so the credential-handling boilerplate never leaks into the report.
const cleanInput = (text: string): string =>
    text
        .replace(/<(engagement_\w+)>[\s\S]*?<\/\1>/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

// Short, purely transitional narration ("Let me check…", "Found it!", "Now I'll…")
// reads as a chat log, not a report. Substantive answers/reports are longer and kept.
const TRANSITIONAL =
    /^(let me|let's|lets|now (?:let me|i)|next|then|first|i'll|i will|i'm going to|found it|great|excellent|perfect|good|ok|okay|alright|sure)\b/i;

const isTransitional = (text: string): boolean => {
    const flat = text.replace(/\s+/g, ' ').trim();

    return flat.length <= 160 && (TRANSITIONAL.test(flat) || flat.endsWith(':'));
};

const sectionTitle = (input: string, max = 80): string => {
    const flat = input.replace(/\s+/g, ' ').trim();
    const sentenceEnd = flat.search(/[!.?](\s|$)/);
    const cut = sentenceEnd > 0 && sentenceEnd + 1 <= max ? sentenceEnd + 1 : Math.min(flat.length, max);

    return flat.slice(0, cut).trim() + (cut < flat.length ? '…' : '');
};

// A single conversation topic, structured like a report section rather than a chat
// transcript: the assistant's answer/report content leads, tool activity is condensed
// into a methodology list, and reasoning is dropped.
interface OpenSection {
    actions: string[];
    advice: string[];
    narrative: string[];
    prompt?: string;
    title: string;
}

const newSection = (title: string, prompt?: string): OpenSection => ({
    actions: [],
    advice: [],
    narrative: [],
    prompt,
    title,
});

const actionLine = (log: AssistantLogFragmentFragment): null | string => {
    const subject = log.message?.trim() ?? '';

    switch (log.type) {
        case MessageLogType.Browser: {
            return subject ? `Browsed ${oneLine(subject, 120)}` : 'Browsed a page';
        }

        case MessageLogType.File: {
            return subject ? `Inspected \`${oneLine(subject, 120)}\`` : 'Inspected a file';
        }

        case MessageLogType.Search: {
            return subject ? `Searched “${oneLine(subject, 120)}”` : 'Ran a search';
        }

        case MessageLogType.Terminal: {
            return subject ? `Ran \`${oneLine(subject, 120)}\`` : 'Ran a command';
        }

        default: {
            return null;
        }
    }
};

const flushSection = (open: null | OpenSection, sections: ReportSection[]): void => {
    if (!open || (open.narrative.length === 0 && open.advice.length === 0 && open.actions.length === 0)) {
        return;
    }

    const blocks: string[] = [];

    if (open.prompt) {
        blocks.push(`**Prompt:** ${open.prompt}`);
    }

    blocks.push(...open.narrative);
    open.advice.forEach((advice) => blocks.push(`**Advice:** ${advice}`));

    if (open.actions.length > 0) {
        blocks.push(`**Actions taken:**\n\n${open.actions.map((action) => `- ${action}`).join('\n')}`);
    }

    sections.push({
        findings: [],
        id: `conversation-${sections.length + 1}`,
        resultMarkdown: blocks.join('\n\n'),
        screenshots: [],
        status: StatusType.Finished,
        subtasks: [],
        title: open.title,
    });
};

interface BuildAssistantReportModelOptions {
    findings?: readonly Finding[];
    generatedAt?: string;
    targetType?: TargetType;
}

export const buildAssistantReportModel = (
    flow: null | Pick<FlowFragmentFragment, 'createdAt' | 'id' | 'status' | 'title' | 'updatedAt'> | undefined,
    assistant: null | Pick<AssistantFragmentFragment, 'title'> | undefined,
    logs: null | readonly AssistantLogFragmentFragment[] | undefined,
    options: BuildAssistantReportModelOptions = {},
): ReportModel => {
    const generatedAt = options.generatedAt ?? new Date().toISOString();
    const ordered = [...(logs ?? [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const sections: ReportSection[] = [];
    let open: null | OpenSection = null;
    let toolCalls = 0;

    for (const log of ordered) {
        if (log.type === MessageLogType.Input) {
            flushSection(open, sections);
            const prompt = cleanInput(log.message ?? '');
            open = newSection(sectionTitle(prompt || `Exchange ${sections.length + 1}`), prompt || undefined);

            continue;
        }

        if (log.type === MessageLogType.Done) {
            flushSection(open, sections);
            open = null;

            continue;
        }

        if (!open) {
            open = newSection('Assistant Analysis');
        }

        const message = log.message?.trim() ?? '';

        switch (log.type) {
            case MessageLogType.Advice: {
                if (message) {
                    open.advice.push(message);
                }

                break;
            }

            case MessageLogType.Answer: {
                // Keep substantive answers; drop short transitional narration so the
                // section reads as a report, not a turn-by-turn chat log.
                if (message && !isTransitional(message)) {
                    open.narrative.push(message);
                }

                break;
            }

            case MessageLogType.Ask: {
                if (message) {
                    open.narrative.push(`*Assistant asked: ${message}*`);
                }

                break;
            }

            case MessageLogType.Browser:

            case MessageLogType.File:
            case MessageLogType.Search:
            case MessageLogType.Terminal: {
                toolCalls += 1;
                const action = actionLine(log);

                if (action) {
                    open.actions.push(action);
                }

                break;
            }

            case MessageLogType.Report: {
                if (message) {
                    open.narrative.push(message);
                }

                break;
            }

            default: {
                // thoughts and any other lifecycle types carry no report content.
                break;
            }
        }
    }

    flushSection(open, sections);

    const startMs = flow?.createdAt ? new Date(flow.createdAt).getTime() : Number.NaN;
    const endMs = flow?.updatedAt ? new Date(flow.updatedAt).getTime() : Number.NaN;

    // Findings arrive already sorted high-to-low from the backend extractor.
    const reportFindings = [...(options.findings ?? [])];
    const hasFindings = reportFindings.length > 0;

    const findingsBySeverity = emptySeverityCounts();

    for (const finding of reportFindings) {
        findingsBySeverity[finding.severity] += 1;
    }

    // When findings exist the conversation topics become the "Conversation" methodology
    // below the finding cards; otherwise they are the report body directly.
    const sectionsTitle = hasFindings && sections.length > 0 ? 'Conversation' : undefined;

    const toc: ReportTocEntry[] = [
        { id: 'executive-summary', level: 1, title: 'Executive Summary' },
        ...(hasFindings
            ? ([
                  { id: 'findings-summary', level: 1, title: 'Findings Summary' },
                  { id: 'detailed-findings', level: 1, title: 'Detailed Findings' },
              ] as ReportTocEntry[])
            : []),
        ...(sectionsTitle ? ([{ id: 'methodology', level: 1, title: sectionsTitle }] as ReportTocEntry[]) : []),
        ...sections.map((section) => ({ id: section.id, level: sectionsTitle ? 2 : 1, title: section.title })),
    ];

    const summaryTarget = assistant?.title ? `with the ${assistant.title}` : 'session';
    const toolClause = toolCalls > 0 ? ` and ran ${toolCalls} tool ${pluralize(toolCalls, 'action')}` : '';
    const findingsClause = hasFindings
        ? ` and identified ${reportFindings.length} ${pluralize(reportFindings.length, 'finding')}`
        : '';
    const executiveSummary =
        sections.length > 0
            ? {
                  content: `This assistant ${summaryTarget} worked through ${sections.length} conversation ${pluralize(sections.length, 'topic')}${toolClause}${findingsClause}.`,
                  generatedAt,
              }
            : undefined;

    return {
        executiveSummary,
        findings: reportFindings,
        flow: {
            finishedAt: flow?.updatedAt ? new Date(flow.updatedAt).toISOString() : undefined,
            id: flow?.id ?? '',
            startedAt: flow?.createdAt ? new Date(flow.createdAt).toISOString() : undefined,
            status: flow?.status ?? StatusType.Created,
            target: assistant?.title || undefined,
            targetType: options.targetType,
            title: flow?.title ?? 'Assistant Session',
        },
        generatedAt,
        sections,
        sectionsTitle,
        summary: {
            duration: formatDuration(startMs, endMs),
            findingsBySeverity,
            findingsTotal: reportFindings.length,
            screenshotCount: 0,
            subtasksTotal: toolCalls,
            tasksDone: sections.length,
            tasksFailed: 0,
            tasksRunning: 0,
            tasksTotal: sections.length,
        },
        toc,
    };
};
