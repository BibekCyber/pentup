import type { LucideIcon } from 'lucide-react';

import { CircleCheck, CircleDashed, CircleX, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { DomainStatusType } from '@/graphql/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<DomainStatusType, { className: string; icon: LucideIcon; label: string }> = {
    [DomainStatusType.Classifying]: { className: 'animate-spin text-cyan-500', icon: Loader2, label: 'Classifying' },
    [DomainStatusType.Created]: { className: 'text-blue-500', icon: CircleDashed, label: 'Created' },
    [DomainStatusType.Failed]: { className: 'text-red-500', icon: CircleX, label: 'Failed' },
    [DomainStatusType.Finished]: { className: 'text-green-500', icon: CircleCheck, label: 'Finished' },
    [DomainStatusType.Running]: { className: 'animate-spin text-purple-500', icon: Loader2, label: 'Running' },
};

interface DomainStatusBadgeProps {
    className?: string;
    status: DomainStatusType;
}

/** A small status badge for a {@link DomainStatusType}, styled like the rest of the app. */
export const DomainStatusBadge = ({ className, status }: DomainStatusBadgeProps) => {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <Badge
            className={cn('gap-1', className)}
            variant="outline"
        >
            <Icon className={cn('size-3 shrink-0', config.className)} />
            {config.label}
        </Badge>
    );
};

export default DomainStatusBadge;
