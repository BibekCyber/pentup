import { Badge } from '@/components/ui/badge';
import { DomainStatusType } from '@/graphql/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<DomainStatusType, { className: string; label: string; pulse?: boolean }> = {
    [DomainStatusType.Classifying]: { className: 'text-[var(--st-classifying)]', label: 'Classifying', pulse: true },
    [DomainStatusType.Created]: { className: 'text-[var(--st-created)]', label: 'Created' },
    [DomainStatusType.Failed]: { className: 'text-[var(--st-failed)]', label: 'Failed' },
    [DomainStatusType.Finished]: { className: 'text-[var(--st-finished)]', label: 'Finished' },
    [DomainStatusType.Running]: { className: 'text-[var(--st-running)]', label: 'Running', pulse: true },
    [DomainStatusType.Waiting]: { className: 'text-[var(--st-waiting)]', label: 'Waiting', pulse: true },
};

interface DomainStatusBadgeProps {
    className?: string;
    status: DomainStatusType;
}

/** A small status badge for a {@link DomainStatusType}, styled like the rest of the app. */
export const DomainStatusBadge = ({ className, status }: DomainStatusBadgeProps) => {
    const config = statusConfig[status];

    return (
        <Badge
            className={cn('gap-1.5 font-medium', config.className, className)}
            variant="outline"
        >
            <span
                className={cn(
                    'size-2 shrink-0 rounded-full bg-current',
                    config.pulse && 'animate-[pulse_1.6s_ease-in-out_infinite]',
                )}
            />
            {config.label}
        </Badge>
    );
};

export default DomainStatusBadge;
