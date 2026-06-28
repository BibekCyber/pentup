import type { FlowFragmentFragment, SubtaskFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

import { StatusType } from '@/graphql/types';

import type { Finding, ReportModel, ReportScreenshot, ReportSection, ReportSubItem, ReportTocEntry, SeverityCounts } from './report-model';

import { emptySeverityCounts, SEVERITY_ORDER } from './report-model';
import { getSeverityStyle } from './severity-palette';

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string => (count === 1 ? singular : plural);

export const deriveSummaryNarrative = (model: ReportModel): string => {
    const { summary } = model;
    const target = model.flow.target ?? model.flow.title;
    const severityParts = SEVERITY_ORDER.filter((severity) => summary.findingsBySeverity[severity] > 0).map((severity) => `${summary.findingsBySeverity[severity]} ${getSeverityStyle(severity).label.toLowerCase()}`);

    const findingsClause =
        summary.findingsTotal > 0
            ? `recorded ${summary.findingsTotal} ${pluralize(summary.findingsTotal, 'finding')}${severityParts.length > 0 ? ` (${severityParts.join(', ')})` : ''}`
            : 'recorded no structured findings';

    return `This automated assessment of ${target} completed ${summary.tasksDone} of ${summary.tasksTotal} ${pluralize(summary.tasksTotal, 'task')} and ${findingsClause}.`;
};

interface BuildReportModelOptions {
    executiveSummary?: { content: string; generatedAt: string };
    generatedAt?: string;
}

const compareFindings = (a: Finding, b: Finding): number => {
    const weightDiff = getSeverityStyle(b.severity).weight - getSeverityStyle(a.severity).weight;

    if (weightDiff !== 0) {
        return weightDiff;
    }

    const cvssDiff = (b.cvss ?? 0) - (a.cvss ?? 0);

    if (cvssDiff !== 0) {
        return cvssDiff;
    }

    return a.title.localeCompare(b.title);
};

const formatDuration = (startMs: number, endMs: number): string | undefined => {
    const ms = endMs - startMs;

    if (!Number.isFinite(ms) || ms <= 0) {
        return undefined;
    }

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
};

const deriveTarget = (findings: Finding[]): string | undefined => {
    const hostCounts = new Map<string, number>();

    for (const finding of findings) {
        for (const rawUrl of finding.affectedUrls ?? []) {
            try {
                const { hostname } = new URL(rawUrl);
                hostCounts.set(hostname, (hostCounts.get(hostname) ?? 0) + 1);
            } catch {
                // Ignore non-URL affected references.
            }
        }
    }

    let target: string | undefined;
    let best = 0;

    for (const [host, count] of hostCounts) {
        if (count > best) {
            best = count;
            target = host;
        }
    }

    return target;
};

const toReportSubItem = (subtask: SubtaskFragmentFragment): ReportSubItem => ({
    description: subtask.description?.trim() || undefined,
    id: `subtask-${subtask.id}`,
    resultMarkdown: subtask.result?.trim() || undefined,
    status: subtask.status,
    title: subtask.title,
});

export const buildReportModel = (
    flow: null | Pick<FlowFragmentFragment, 'createdAt' | 'id' | 'status' | 'title' | 'updatedAt'> | undefined,
    tasks: null | readonly TaskFragmentFragment[] | undefined,
    findings: readonly Finding[] = [],
    options: BuildReportModelOptions = {},
): ReportModel => {
    const generatedAt = options.generatedAt ?? new Date().toISOString();
    const sortedTasks = [...(tasks ?? [])].sort((a, b) => Number(a.id) - Number(b.id));

    const findingsByTask = new Map<string, Finding[]>();
    const orphanFindings: Finding[] = [];

    for (const finding of findings) {
        if (finding.taskId && sortedTasks.some((task) => task.id === finding.taskId)) {
            const bucket = findingsByTask.get(finding.taskId) ?? [];
            bucket.push(finding);
            findingsByTask.set(finding.taskId, bucket);
        } else {
            orphanFindings.push(finding);
        }
    }

    const sections: ReportSection[] = sortedTasks.map((task) => {
        const sectionFindings = [...(findingsByTask.get(task.id) ?? [])].sort(compareFindings);
        const subtasks = [...(task.subtasks ?? [])].sort((a, b) => Number(a.id) - Number(b.id)).map(toReportSubItem);

        return {
            findings: sectionFindings,
            id: `task-${task.id}`,
            input: task.input?.trim() || undefined,
            resultMarkdown: task.result?.trim() || undefined,
            screenshots: [],
            status: task.status,
            subtasks,
            title: task.title,
        };
    });

    const allFindings = [...findings].sort(compareFindings);

    const findingsBySeverity: SeverityCounts = emptySeverityCounts();

    for (const finding of allFindings) {
        findingsBySeverity[finding.severity] += 1;
    }

    const sectionScreenshots = (section: ReportSection): ReportScreenshot[] => [...section.screenshots, ...section.findings.flatMap((finding) => finding.screenshots ?? [])];
    const screenshotCount = sections.reduce((total, section) => total + sectionScreenshots(section).length, 0) + orphanFindings.flatMap((finding) => finding.screenshots ?? []).length;

    const startMs = flow?.createdAt ? new Date(flow.createdAt).getTime() : Number.NaN;
    const endMs = flow?.updatedAt ? new Date(flow.updatedAt).getTime() : Number.NaN;

    const toc: ReportTocEntry[] = [
        { id: 'executive-summary', level: 1, title: 'Executive Summary' },
        ...(allFindings.length > 0 ? [{ id: 'findings-summary', level: 1, title: 'Findings Summary' } as ReportTocEntry] : []),
        ...sections.map((section) => ({ id: section.id, level: 1, title: section.title })),
    ];

    return {
        executiveSummary: options.executiveSummary,
        findings: allFindings,
        flow: {
            finishedAt: flow?.updatedAt ? new Date(flow.updatedAt).toISOString() : undefined,
            id: flow?.id ?? '',
            startedAt: flow?.createdAt ? new Date(flow.createdAt).toISOString() : undefined,
            status: flow?.status ?? StatusType.Created,
            target: deriveTarget(allFindings),
            title: flow?.title ?? 'Untitled Flow',
        },
        generatedAt,
        sections,
        summary: {
            duration: formatDuration(startMs, endMs),
            findingsBySeverity,
            findingsTotal: allFindings.length,
            screenshotCount,
            subtasksTotal: sections.reduce((total, section) => total + section.subtasks.length, 0),
            tasksDone: sections.filter((section) => section.status === StatusType.Finished).length,
            tasksFailed: sections.filter((section) => section.status === StatusType.Failed).length,
            tasksRunning: sections.filter((section) => section.status === StatusType.Running).length,
            tasksTotal: sections.length,
        },
        toc,
    };
};
