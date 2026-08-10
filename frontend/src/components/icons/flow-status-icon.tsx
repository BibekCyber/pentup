import type { LucideIcon } from 'lucide-react';

import { CircleCheck, CircleDashed, CircleOff, CircleX, Loader2 } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusType } from '@/graphql/types';
import { cn } from '@/lib/utils';

interface FlowStatusIconProps {
    className?: string;
    status?: null | StatusType | undefined;
    tooltip?: string;
}

const statusIcons: Record<StatusType, { className: string; icon: LucideIcon }> = {
    [StatusType.Created]: { className: 'text-[var(--st-created)]', icon: CircleDashed },
    [StatusType.Failed]: { className: 'text-[var(--st-failed)]', icon: CircleX },
    [StatusType.Finished]: { className: 'text-[var(--st-finished)]', icon: CircleCheck },
    [StatusType.Running]: { className: 'animate-spin text-[var(--st-running)]', icon: Loader2 },
    [StatusType.Waiting]: { className: 'text-[var(--st-waiting)]', icon: CircleDashed },
};
const defaultIcon = { className: 'text-muted-foreground', icon: CircleOff };

export const FlowStatusIcon = ({ className = 'size-4', status, tooltip }: FlowStatusIconProps) => {
    if (!status) {
        return null;
    }

    const { className: defaultClassName, icon: Icon } = statusIcons[status] || defaultIcon;
    const iconElement = <Icon className={cn('shrink-0', defaultClassName, className, tooltip && 'cursor-pointer')} />;

    if (!tooltip) {
        return iconElement;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{iconElement}</TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
};
