import type { LucideIcon } from 'lucide-react';

import { AlertCircle, AlertOctagon, AlertTriangle, CheckCircle2, CircleDashed, CircleX, Clock, Info, Loader2, PlayCircle } from 'lucide-react';

import { StatusType } from '@/graphql/types';

import type { Severity } from './report-model';

// Single brand accent. Used consistently for structural chrome (cover, section rules,
// key-fact panels, remediation accent) so the report has ONE coordinated accent —
// severity colours are the only other colour axis, reserved for finding severity.
export const BRAND = {
    border: '#99f6e4',
    solid: '#0f766e',
    subtle: '#ccfbf1',
    text: '#0f766e',
    tint: '#f0fdfa',
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
        badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900',
        borderClass: 'border-l-red-600',
        cvssRange: '9.0 – 10.0',
        dotClass: 'bg-red-600',
        icon: AlertOctagon,
        label: 'Critical',
        pdf: { border: '#fecaca', onSolid: '#ffffff', solid: '#b91c1c', text: '#991b1b', tint: '#fef2f2' },
        rowClass: 'bg-red-50 dark:bg-red-950/30',
        textClass: 'text-red-700 dark:text-red-400',
        weight: 5,
    },
    high: {
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900',
        borderClass: 'border-l-orange-500',
        cvssRange: '7.0 – 8.9',
        dotClass: 'bg-orange-500',
        icon: AlertTriangle,
        label: 'High',
        pdf: { border: '#fed7aa', onSolid: '#ffffff', solid: '#ea580c', text: '#c2410c', tint: '#fff7ed' },
        rowClass: 'bg-orange-50 dark:bg-orange-950/30',
        textClass: 'text-orange-600 dark:text-orange-400',
        weight: 4,
    },
    informational: {
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        borderClass: 'border-l-slate-400',
        cvssRange: '0.0',
        dotClass: 'bg-slate-400',
        icon: Info,
        label: 'Informational',
        pdf: { border: '#e2e8f0', onSolid: '#ffffff', solid: '#475569', text: '#334155', tint: '#f8fafc' },
        rowClass: 'bg-slate-50 dark:bg-slate-900/40',
        textClass: 'text-slate-600 dark:text-slate-400',
        weight: 1,
    },
    low: {
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900',
        borderClass: 'border-l-blue-500',
        cvssRange: '0.1 – 3.9',
        dotClass: 'bg-blue-500',
        icon: Info,
        label: 'Low',
        pdf: { border: '#bfdbfe', onSolid: '#ffffff', solid: '#2563eb', text: '#1d4ed8', tint: '#eff6ff' },
        rowClass: 'bg-blue-50 dark:bg-blue-950/30',
        textClass: 'text-blue-600 dark:text-blue-400',
        weight: 2,
    },
    medium: {
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
        borderClass: 'border-l-amber-500',
        cvssRange: '4.0 – 6.9',
        dotClass: 'bg-amber-500',
        icon: AlertCircle,
        label: 'Medium',
        pdf: { border: '#fde68a', onSolid: '#ffffff', solid: '#d97706', text: '#b45309', tint: '#fffbeb' },
        rowClass: 'bg-amber-50 dark:bg-amber-950/30',
        textClass: 'text-amber-600 dark:text-amber-400',
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
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900',
        icon: PlayCircle,
        iconClass: 'text-blue-500',
        label: 'Created',
        pdf: { solid: '#3b82f6', text: '#1d4ed8', tint: '#eff6ff' },
    },
    [StatusType.Failed]: {
        badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900',
        icon: CircleX,
        iconClass: 'text-red-500',
        label: 'Failed',
        pdf: { solid: '#ef4444', text: '#b91c1c', tint: '#fef2f2' },
    },
    [StatusType.Finished]: {
        badgeClass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900',
        icon: CheckCircle2,
        iconClass: 'text-green-600',
        label: 'Finished',
        pdf: { solid: '#16a34a', text: '#15803d', tint: '#f0fdf4' },
    },
    [StatusType.Running]: {
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900',
        icon: Loader2,
        iconClass: 'animate-spin text-purple-500',
        label: 'Running',
        pdf: { solid: '#a855f7', text: '#7e22ce', tint: '#faf5ff' },
    },
    [StatusType.Waiting]: {
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
        icon: Clock,
        iconClass: 'text-amber-500',
        label: 'Waiting',
        pdf: { solid: '#f59e0b', text: '#b45309', tint: '#fffbeb' },
    },
};

const DEFAULT_STATUS: StatusStyle = {
    badgeClass: 'bg-muted text-muted-foreground border-border',
    icon: CircleDashed,
    iconClass: 'text-muted-foreground',
    label: 'Unknown',
    pdf: { solid: '#94a3b8', text: '#475569', tint: '#f8fafc' },
};

export const getStatusStyle = (status?: StatusType): StatusStyle => (status ? STATUS_STYLES[status] ?? DEFAULT_STATUS : DEFAULT_STATUS);
