import type { ReactNode } from 'react';

import { AlertTriangle, CircleCheck, Info, MessageSquareWarning } from 'lucide-react';

import { cn } from '@/lib/utils';

export type TemplateNoticeTone = 'danger' | 'info' | 'success' | 'warning';

const TONES: Record<TemplateNoticeTone, { className: string; icon: typeof Info }> = {
    danger: {
        className: 'border-destructive/30 bg-destructive/5 [&>svg]:text-destructive',
        icon: MessageSquareWarning,
    },
    info: { className: 'border-border bg-muted/40 [&>svg]:text-muted-foreground', icon: Info },
    success: { className: 'border-st-finished/30 bg-st-finished/5 [&>svg]:text-st-finished', icon: CircleCheck },
    warning: { className: 'border-st-running/30 bg-brand-tint-2 [&>svg]:text-primary', icon: AlertTriangle },
};

interface TemplateNoticeProps {
    action?: ReactNode;
    children?: ReactNode;
    className?: string;
    title: ReactNode;
    tone?: TemplateNoticeTone;
}

// Inline banner explaining where a template or request stands (review status,
// read-only access, stale comparisons).
const TemplateNotice = ({ action, children, className, title, tone = 'info' }: TemplateNoticeProps) => {
    const { className: toneClassName, icon: Icon } = TONES[tone];

    return (
        <div
            className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left', toneClassName, className)}
        >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
                <div className="text-foreground text-[13px] font-semibold">{title}</div>
                {children ? (
                    <div className="text-muted-foreground mt-0.5 text-xs leading-relaxed break-words whitespace-pre-wrap">
                        {children}
                    </div>
                ) : null}
            </div>
            {action ? <div className="shrink-0 self-center">{action}</div> : null}
        </div>
    );
};

export default TemplateNotice;
