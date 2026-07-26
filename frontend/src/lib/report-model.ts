import { StatusType, TargetType } from '@/graphql/types';

export type Severity = 'critical' | 'high' | 'informational' | 'low' | 'medium';

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'informational'];

export interface Finding {
    affectedUrls?: string[];
    cve?: string;
    cvss?: number;
    description?: string;
    evidence?: string;
    id: string;
    impact?: string[];
    recommendation?: string;
    references?: string[];
    screenshots?: ReportScreenshot[];
    severity: Severity;
    stepsToReproduce?: string[];
    taskId?: string;
    title: string;
}

export interface ReportModel {
    // Client the report is prepared for (drives the header + confidentiality copy).
    // Optional so a report renders before a name is entered.
    clientName?: string;
    executiveSummary?: {
        content: string;
        generatedAt: string;
    };
    findings: Finding[];
    flow: {
        finishedAt?: string;
        id: string;
        startedAt?: string;
        status: StatusType;
        target?: string;
        // Engagement class of the parent scan (Web / Cloud). Reports state the
        // engagement type rather than the raw flow title; optional so older
        // reports built without it still render.
        targetType?: TargetType;
        title: string;
    };
    generatedAt: string;
    // Auto-derived executive-summary bullet lists (no manual edit yet).
    initialRecommendations: string[];
    positiveFindings: string[];
    sections: ReportSection[];
    sectionsTitle?: string;
    summary: ReportSummary;
    toc: ReportTocEntry[];
}

export interface ReportScreenshot {
    alt?: string;
    dataUrl?: string;
    id: string;
    name: string;
    url: string;
}

export interface ReportSection {
    findings: Finding[];
    id: string;
    input?: string;
    resultMarkdown?: string;
    screenshots: ReportScreenshot[];
    status: StatusType;
    subtasks: ReportSubItem[];
    title: string;
}

export interface ReportSubItem {
    description?: string;
    id: string;
    resultMarkdown?: string;
    status: StatusType;
    title: string;
}

export interface ReportSummary {
    duration?: string;
    findingsBySeverity: SeverityCounts;
    findingsTotal: number;
    screenshotCount: number;
    subtasksTotal: number;
    tasksDone: number;
    tasksFailed: number;
    tasksRunning: number;
    tasksTotal: number;
}

export interface ReportTocEntry {
    id: string;
    level: number;
    title: string;
}

export type SeverityCounts = Record<Severity, number>;

export const emptySeverityCounts = (): SeverityCounts => ({
    critical: 0,
    high: 0,
    informational: 0,
    low: 0,
    medium: 0,
});
