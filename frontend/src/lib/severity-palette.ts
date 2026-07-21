import type { LucideIcon } from 'lucide-react';

import {
    AlertCircle,
    AlertOctagon,
    AlertTriangle,
    CheckCircle2,
    CircleDashed,
    CircleX,
    Clock,
    Info,
    Loader2,
    PlayCircle,
} from 'lucide-react';

import { StatusType } from '@/graphql/types';

import type { Severity } from './report-model';

// Single brand accent. Used consistently for structural chrome (cover, section rules,
// key-fact panels, remediation accent) so the report has ONE coordinated accent —
// severity colours are the only other colour axis, reserved for finding severity.
export const BRAND = {
    border: '#fed7aa',
    solid: '#f57214',
    subtle: '#ffedd5',
    text: '#c2410c',
    tint: '#fff7ed',
};

export interface SeverityStyle {
    badgeClass: string;
    borderClass: string;
    cvssRange: string;
    dotClass: string;
    icon: LucideIcon;
    label: string;
    pdf: {
        border: string;
        onSolid: string;
        solid: string;
        text: string;
        tint: string;
    };
    rowClass: string;
    textClass: string;
    weight: number;
}

const SEVERITY_STYLES: Record<Severity, SeverityStyle> = {
    critical: {
        badgeClass: 'bg-[var(--sev-crit-bg)] text-[var(--sev-crit)] border-[var(--sev-crit)]/25',
        borderClass: 'border-l-[var(--sev-crit)]',
        cvssRange: '9.0 – 10.0',
        dotClass: 'bg-[var(--sev-crit)]',
        icon: AlertOctagon,
        label: 'Critical',
        pdf: { border: '#f5c2c9', onSolid: '#ffffff', solid: '#d0102e', text: '#9b0c22', tint: '#fdecee' },
        rowClass: 'bg-[var(--sev-crit-bg)]',
        textClass: 'text-[var(--sev-crit)]',
        weight: 5,
    },
    high: {
        badgeClass: 'bg-[var(--sev-high-bg)] text-[var(--sev-high)] border-[var(--sev-high)]/25',
        borderClass: 'border-l-[var(--sev-high)]',
        cvssRange: '7.0 – 8.9',
        dotClass: 'bg-[var(--sev-high)]',
        icon: AlertTriangle,
        label: 'High',
        pdf: { border: '#f2ceb3', onSolid: '#ffffff', solid: '#c2410c', text: '#973309', tint: '#fbeee5' },
        rowClass: 'bg-[var(--sev-high-bg)]',
        textClass: 'text-[var(--sev-high)]',
        weight: 4,
    },
    informational: {
        badgeClass: 'bg-[var(--sev-info-bg)] text-[var(--sev-info)] border-[var(--sev-info)]/25',
        borderClass: 'border-l-[var(--sev-info)]',
        cvssRange: '0.0',
        dotClass: 'bg-[var(--sev-info)]',
        icon: Info,
        label: 'Informational',
        pdf: { border: '#d1d4da', onSolid: '#ffffff', solid: '#585f6b', text: '#454b55', tint: '#eef0f2' },
        rowClass: 'bg-[var(--sev-info-bg)]',
        textClass: 'text-[var(--sev-info)]',
        weight: 1,
    },
    low: {
        badgeClass: 'bg-[var(--sev-low-bg)] text-[var(--sev-low)] border-[var(--sev-low)]/25',
        borderClass: 'border-l-[var(--sev-low)]',
        cvssRange: '0.1 – 3.9',
        dotClass: 'bg-[var(--sev-low)]',
        icon: Info,
        label: 'Low',
        pdf: { border: '#b3d5e9', onSolid: '#ffffff', solid: '#0369a1', text: '#02537f', tint: '#e7f1f8' },
        rowClass: 'bg-[var(--sev-low-bg)]',
        textClass: 'text-[var(--sev-low)]',
        weight: 2,
    },
    medium: {
        badgeClass: 'bg-[var(--sev-med-bg)] text-[var(--sev-med)] border-[var(--sev-med)]/25',
        borderClass: 'border-l-[var(--sev-med)]',
        cvssRange: '4.0 – 6.9',
        dotClass: 'bg-[var(--sev-med)]',
        icon: AlertCircle,
        label: 'Medium',
        pdf: { border: '#e9d6a8', onSolid: '#ffffff', solid: '#a66300', text: '#824e00', tint: '#f8f1e0' },
        rowClass: 'bg-[var(--sev-med-bg)]',
        textClass: 'text-[var(--sev-med)]',
        weight: 3,
    },
};

const DEFAULT_SEVERITY = SEVERITY_STYLES.informational;

export const getSeverityStyle = (severity: Severity): SeverityStyle => SEVERITY_STYLES[severity] ?? DEFAULT_SEVERITY;

export interface StatusStyle {
    badgeClass: string;
    icon: LucideIcon;
    iconClass: string;
    label: string;
    pdf: {
        solid: string;
        text: string;
        tint: string;
    };
}

const STATUS_STYLES: Record<StatusType, StatusStyle> = {
    [StatusType.Created]: {
        badgeClass: 'bg-[var(--st-created)]/15 text-[var(--st-created)] border-[var(--st-created)]/30',
        icon: PlayCircle,
        iconClass: 'text-[var(--st-created)]',
        label: 'Created',
        pdf: { solid: '#6e747e', text: '#4c525b', tint: '#eef0f1' },
    },
    [StatusType.Failed]: {
        badgeClass: 'bg-[var(--st-failed)]/15 text-[var(--st-failed)] border-[var(--st-failed)]/30',
        icon: CircleX,
        iconClass: 'text-[var(--st-failed)]',
        label: 'Failed',
        pdf: { solid: '#d0102e', text: '#991b1b', tint: '#fdecee' },
    },
    [StatusType.Finished]: {
        badgeClass: 'bg-[var(--st-finished)]/15 text-[var(--st-finished)] border-[var(--st-finished)]/30',
        icon: CheckCircle2,
        iconClass: 'text-[var(--st-finished)]',
        label: 'Finished',
        pdf: { solid: '#2fbf71', text: '#1f7a46', tint: '#e8f6ee' },
    },
    [StatusType.Running]: {
        badgeClass: 'bg-[var(--st-running)]/15 text-[var(--st-running)] border-[var(--st-running)]/30',
        icon: Loader2,
        iconClass: 'animate-spin text-[var(--st-running)]',
        label: 'Running',
        pdf: { solid: '#f57214', text: '#b45309', tint: '#fff3e6' },
    },
    [StatusType.Waiting]: {
        badgeClass: 'bg-[var(--st-waiting)]/15 text-[var(--st-waiting)] border-[var(--st-waiting)]/30',
        icon: Clock,
        iconClass: 'text-[var(--st-waiting)]',
        label: 'Waiting',
        pdf: { solid: '#35b9e9', text: '#0b6f90', tint: '#e7f6fc' },
    },
};

const DEFAULT_STATUS: StatusStyle = {
    badgeClass: 'bg-muted text-muted-foreground border-border',
    icon: CircleDashed,
    iconClass: 'text-muted-foreground',
    label: 'Unknown',
    pdf: { solid: '#6e747e', text: '#4c525b', tint: '#eef0f1' },
};

export const getStatusStyle = (status?: StatusType): StatusStyle =>
    status ? (STATUS_STYLES[status] ?? DEFAULT_STATUS) : DEFAULT_STATUS;
