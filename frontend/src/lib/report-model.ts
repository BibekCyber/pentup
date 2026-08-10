import { StatusType, TargetType } from '@/graphql/types';

export type Severity = 'critical' | 'high' | 'informational' | 'low' | 'medium';

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'informational'];

// CVSS v3.1 bands, mirroring the table the report's appendix publishes to the client and
// the server-side validation in pkg/tools. A score outside its severity's band contradicts
// the report's own document.
export const SEVERITY_BANDS: Record<Severity, { max: number; min: number }> = {
    critical: { max: 10, min: 9 },
    high: { max: 8.9, min: 7 },
    informational: { max: 0, min: 0 },
    low: { max: 3.9, min: 0.1 },
    medium: { max: 6.9, min: 4 },
};

// Whether re-rating a finding to `severity` is a real change worth sending.
//
// Picking the severity a finding already has is normally a no-op — except when an override
// is in force, where it IS the reset: after a CVSS-only edit the original severity equals
// the current one, so a plain equality guard silently swallows "Reset to original".
export const isSeverityChangeMeaningful = (finding: Finding, severity: Severity): boolean =>
    finding.index !== undefined && (finding.severity !== severity || Boolean(finding.severityUpdated));

export interface Finding {
    affectedUrls?: string[];
    cve?: string;
    cvss?: number;
    description?: string;
    evidence?: string;
    id: string;
    impact?: string[];
    // Position in the stored findings array — the address used to re-rate a finding.
    // Display order is severity-sorted, so list position is not a stable identifier.
    index?: number;
    originalCvss?: number;
    originalSeverity?: Severity;
    recommendation?: string;
    references?: string[];
    screenshots?: ReportScreenshot[];
    severity: Severity;
    severityUpdated?: boolean;
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
