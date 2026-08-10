import type { StatusType } from '@/graphql/types';
import type { Severity } from '@/lib/report-model';

import { Badge } from '@/components/ui/badge';
import { getSeverityStyle, getStatusStyle } from '@/lib/severity-palette';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
    className?: string;
    severity: Severity;
}

export const SeverityBadge = ({ className, severity }: SeverityBadgeProps) => {
    const style = getSeverityStyle(severity);

    return (
        <Badge
            className={cn(
                'shrink-0 gap-1.5 border font-mono text-[10px] font-semibold tracking-wide whitespace-nowrap uppercase',
                style.badgeClass,
                className,
            )}
            variant="outline"
        >
            <span className={cn('size-2 shrink-0 rounded-[2px]', style.dotClass)} />
            {style.label}
        </Badge>
    );
};

interface StatusBadgeProps {
    className?: string;
    status?: StatusType;
}

export const StatusBadge = ({ className, status }: StatusBadgeProps) => {
    const style = getStatusStyle(status);
    const Icon = style.icon;
    const spinning = style.iconClass.includes('animate-spin');

    return (
        <Badge
            className={cn('shrink-0 gap-1 border font-medium whitespace-nowrap', style.badgeClass, className)}
            variant="outline"
        >
            <Icon className={cn('size-3.5 shrink-0', spinning && 'animate-spin')} />
            {style.label}
        </Badge>
    );
};
