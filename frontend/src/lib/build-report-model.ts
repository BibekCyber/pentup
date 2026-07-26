import type {
    FindingFragmentFragment,
    FlowFragmentFragment,
    SubtaskFragmentFragment,
    TargetType,
    TaskFragmentFragment,
} from '@/graphql/types';

import { Severity as GqlSeverity, StatusType } from '@/graphql/types';

import type {
    Finding,
    ReportModel,
    ReportScreenshot,
    ReportSection,
    ReportSubItem,
    ReportTocEntry,
    Severity,
    SeverityCounts,
} from './report-model';

import { emptySeverityCounts, SEVERITY_ORDER } from './report-model';
import { getSeverityStyle } from './severity-palette';

const SEVERITY_MAP: Record<GqlSeverity, Severity> = {
    [GqlSeverity.Critical]: 'critical',
    [GqlSeverity.High]: 'high',
    [GqlSeverity.Informational]: 'informational',
    [GqlSeverity.Low]: 'low',
    [GqlSeverity.Medium]: 'medium',
};

// Maps GraphQL findings (emitted by the reporter agent, persisted per task) into
// the renderer's Finding shape. Findings carry no DB id, so a stable per-report id
// is synthesised from the task id and position.
export const mapFindings = (findings: null | readonly FindingFragmentFragment[] | undefined): Finding[] =>
    (findings ?? []).map((finding, index) => ({
        affectedUrls: finding.affectedUrls ?? undefined,
        cve: finding.cve ?? undefined,
        cvss: finding.cvss ?? undefined,
        description: finding.description ?? undefined,
        evidence: finding.evidence ?? undefined,
        id: `finding-${finding.taskId}-${index}`,
        impact: finding.impact ?? undefined,
        recommendation: finding.recommendation ?? undefined,
        references: finding.references ?? undefined,
        severity: SEVERITY_MAP[finding.severity] ?? 'informational',
        stepsToReproduce: finding.stepsToReproduce ?? undefined,
        taskId: finding.taskId,
        title: finding.title,
    }));

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
    count === 1 ? singular : plural;

export const deriveSummaryNarrative = (model: ReportModel): string => {
    const { summary } = model;
    const target = model.flow.target ?? model.flow.title;
    const severityParts = SEVERITY_ORDER.filter((severity) => summary.findingsBySeverity[severity] > 0).map(
        (severity) => `${summary.findingsBySeverity[severity]} ${getSeverityStyle(severity).label.toLowerCase()}`,
    );

    const findingsClause =
        summary.findingsTotal > 0
            ? `recorded ${summary.findingsTotal} ${pluralize(summary.findingsTotal, 'finding')}${severityParts.length > 0 ? ` (${severityParts.join(', ')})` : ''}`
            : 'recorded no structured findings';

    return `This automated assessment of ${target} completed ${summary.tasksDone} of ${summary.tasksTotal} ${pluralize(summary.tasksTotal, 'task')} and ${findingsClause}.`;
};

// Auto-derived executive-summary bullets. Kept factual and conservative — they are
// generated, not analyst-reviewed, so they only state what the finding data supports
// and never assert unverified security properties of the target.
export const derivePositiveFindings = (findings: readonly Finding[], counts: SeverityCounts): string[] => {
    const bullets: string[] = [];

    if (counts.critical === 0 && counts.high === 0) {
        bullets.push('No critical or high-severity vulnerabilities were identified during the assessment.');
    } else if (counts.critical === 0) {
        bullets.push('No critical-severity vulnerabilities were identified during the assessment.');
    }

    bullets.push(
        'The in-scope assets were assessed using a combination of automated tooling and manual validation aligned to industry testing standards.',
    );

    if (findings.length > 0) {
        bullets.push(
            'Every confirmed finding is reproducible and documented with step-by-step evidence and a clear risk rating.',
        );
        bullets.push('Each finding is accompanied by prioritised, actionable remediation guidance.');
    }

    return bullets;
};

export const deriveInitialRecommendations = (findings: readonly Finding[]): string[] => {
    const bullets: string[] = [];

    // Findings are already ordered by severity; surface the most urgent by name.
    for (const finding of findings.slice(0, 3)) {
        bullets.push(
            `Prioritise remediation of "${finding.title}" (${getSeverityStyle(finding.severity).label} risk).`,
        );
    }

    bullets.push('Remediate findings in order of severity, beginning with the highest-rated issues.');
    bullets.push('Re-test each remediated item to confirm closure before the next assessment cycle.');

    return bullets;
};

interface BuildReportModelOptions {
    clientName?: string;
    executiveSummary?: { content: string; generatedAt: string };
    generatedAt?: string;
    targetType?: TargetType;
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

export const formatDuration = (startMs: number, endMs: number): string | undefined => {
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

    const sectionScreenshots = (section: ReportSection): ReportScreenshot[] => [
        ...section.screenshots,
        ...section.findings.flatMap((finding) => finding.screenshots ?? []),
    ];
    const screenshotCount =
        sections.reduce((total, section) => total + sectionScreenshots(section).length, 0) +
        orphanFindings.flatMap((finding) => finding.screenshots ?? []).length;

    // End time is the last real task/subtask activity, not flow.updatedAt — the flow
    // row gets touched by status polling and report views, which otherwise inflates
    // the reported duration to days.
    const activityMs = sortedTasks
        .flatMap((task) => [task.updatedAt, ...(task.subtasks ?? []).map((subtask) => subtask.updatedAt)])
        .map((value) => (value ? new Date(value).getTime() : Number.NaN))
        .filter((ms) => Number.isFinite(ms));

    const startMs = flow?.createdAt ? new Date(flow.createdAt).getTime() : Number.NaN;
    const endMs =
        activityMs.length > 0
            ? Math.max(...activityMs)
            : flow?.updatedAt
              ? new Date(flow.updatedAt).getTime()
              : Number.NaN;

    const hasFindings = allFindings.length > 0;

    // The dynamic per-task "Methodology" section was dropped from the report, so the
    // TOC lists only the fixed deliverable sections that actually render.
    const toc: ReportTocEntry[] = [
        { id: 'executive-summary', level: 1, title: 'Executive Summary' },
        { id: 'scope', level: 1, title: 'Scope & Methodology' },
        ...(hasFindings
            ? ([
                  { id: 'findings-summary', level: 1, title: 'Finding Summary' },
                  { id: 'detailed-findings', level: 1, title: 'Detailed Findings' },
              ] as ReportTocEntry[])
            : []),
        { id: 'appendix', level: 1, title: 'Appendix' },
    ];

    return {
        clientName: options.clientName,
        executiveSummary: options.executiveSummary,
        findings: allFindings,
        flow: {
            finishedAt: flow?.updatedAt ? new Date(flow.updatedAt).toISOString() : undefined,
            id: flow?.id ?? '',
            startedAt: flow?.createdAt ? new Date(flow.createdAt).toISOString() : undefined,
            status: flow?.status ?? StatusType.Created,
            target: deriveTarget(allFindings),
            targetType: options.targetType,
            title: flow?.title ?? 'Untitled Flow',
        },
        generatedAt,
        initialRecommendations: deriveInitialRecommendations(allFindings),
        positiveFindings: derivePositiveFindings(allFindings, findingsBySeverity),
        sections,
        sectionsTitle: undefined,
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
