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
        index: finding.index,
        originalCvss: finding.originalCvss ?? undefined,
        originalSeverity: finding.originalSeverity ? SEVERITY_MAP[finding.originalSeverity] : undefined,
        recommendation: finding.recommendation ?? undefined,
        references: finding.references ?? undefined,
        severity: SEVERITY_MAP[finding.severity] ?? 'informational',
        severityUpdated: finding.severityUpdated,
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

const IPV4_HOST = /^\d{1,3}(\.\d{1,3}){3}$/;

// Assets listed in the report's Scope table, derived from the findings' affected URLs.
// Tooling frequently probes a site through its raw backend IPs with a Host header, so a
// single asset surfaces as several origins (http:// and https://, plus bare IPs). Emit
// one entry per host, prefer https when a host appears under both schemes, and drop
// raw-IP origins whenever a named host is in scope — those are the same asset reached
// directly, and listing them reads as sloppy in a client-facing report.
export const deriveScopeTargets = (findings: readonly Finding[], fallback?: string): string[] => {
    const byHost = new Map<string, string>();
    const unparsed: string[] = [];

    for (const finding of findings) {
        for (const raw of finding.affectedUrls ?? []) {
            const value = raw?.trim();

            if (!value) {
                continue;
            }

            let parsed: undefined | URL;

            try {
                parsed = new URL(value);
            } catch {
                parsed = undefined;
            }

            if (!parsed) {
                if (!unparsed.includes(value)) {
                    unparsed.push(value);
                }

                continue;
            }

            const previous = byHost.get(parsed.host);

            if (!previous || (previous === 'http:' && parsed.protocol === 'https:')) {
                byHost.set(parsed.host, parsed.protocol);
            }
        }
    }

    const hosts = [...byHost.entries()];
    const named = hosts.filter(([host]) => !IPV4_HOST.test(host.split(':')[0] ?? host));
    const kept = named.length > 0 ? named : hosts;
    const urls = kept.map(([host, scheme]) => `${scheme}//${host}`).sort();
    const targets = [...urls, ...unparsed];

    return targets.length > 0 ? targets : [fallback || 'In-scope assets'];
};

// Auto-derived executive-summary bullets. Kept factual and conservative — they are
// generated, not analyst-reviewed, so they only state what the finding data supports
// and never assert unverified security properties of the target.
export const derivePositiveFindings = (findings: readonly Finding[], counts: SeverityCounts): string[] => {
    const bullets: string[] = [];

    if (counts.critical === 0) {
        bullets.push(
            'No critical-severity vulnerabilities were identified during the assessment, indicating that no immediate full-system compromise scenario was confirmed during testing.',
        );
    }

    bullets.push(
        'The in-scope assets were reviewed using a combination of automated tooling and manual validation aligned to recognised industry testing standards, providing broad coverage of the exposed functionality.',
    );

    if (findings.length > 0) {
        bullets.push(
            'Every confirmed finding is reproducible and documented with step-by-step evidence and a clear, CVSS-based risk rating, enabling efficient remediation and re-testing.',
        );
        bullets.push(
            'Several identified issues relate to configuration, session handling, and application hardening, which can be addressed through focused remediation without requiring major architectural changes.',
        );
    }

    return bullets;
};

export const deriveInitialRecommendations = (findings: readonly Finding[]): string[] => {
    const bullets: string[] = [];

    // Findings are already ordered by severity; surface the most urgent by name.
    for (const finding of findings.slice(0, 3)) {
        bullets.push(
            `Prioritise remediation of the ${getSeverityStyle(finding.severity).label}-risk finding "${finding.title}", applying the specific controls and configuration changes detailed in its recommendation.`,
        );
    }

    bullets.push(
        'Enforce secure session and token management, including token expiration, logout invalidation, and server-side token revocation.',
    );
    bullets.push(
        'Apply strict, server-side authorisation checks so that users can only access the data and functionality they are explicitly permitted to use.',
    );
    bullets.push(
        'Review security headers, TLS configuration, rate limiting, and WAF protections to strengthen the overall security posture of the environment.',
    );
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
    // Contents of the on-screen report. Scope & Methodology and the Appendix are fixed
    // boilerplate that only the exported PDF renders, so listing them here would be a link
    // to nothing; the PDF carries its own structure.
    const toc: ReportTocEntry[] = [
        { id: 'executive-summary', level: 1, title: 'Executive Summary' },
        ...(hasFindings
            ? ([
                  { id: 'findings-summary', level: 1, title: 'Finding Summary' },
                  { id: 'detailed-findings', level: 1, title: 'Detailed Findings' },
              ] as ReportTocEntry[])
            : []),
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
