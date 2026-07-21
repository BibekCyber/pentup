import type { LucideIcon } from 'lucide-react';

import {
    BotMessageSquare,
    Brain,
    CheckSquare,
    FileText,
    Globe,
    HelpCircle,
    MessageSquareReply,
    NotepadText,
    Search,
    Terminal,
    User as UserIcon,
} from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageLogType } from '@/graphql/types';
import { cn } from '@/lib/utils';
import { formatName } from '@/lib/utils/format';

interface MessageTypeIconProps {
    className?: string;
    tooltip?: string;
    type?: MessageLogType;
}

const messageTypeIcons: Record<MessageLogType, LucideIcon> = {
    [MessageLogType.Advice]: BotMessageSquare,
    [MessageLogType.Answer]: MessageSquareReply,
    [MessageLogType.Ask]: HelpCircle,
    [MessageLogType.Browser]: Globe,
    [MessageLogType.Done]: CheckSquare,
    [MessageLogType.File]: FileText,
    [MessageLogType.Input]: UserIcon,
    [MessageLogType.Report]: NotepadText,
    [MessageLogType.Search]: Search,
    [MessageLogType.Terminal]: Terminal,
    [MessageLogType.Thoughts]: Brain,
};
const defaultIcon = Brain;

/**
 * EMBER `.mtype` tile tint per message type — leading tile bg + icon colour keyed
 * off the shared `--ag-*` / `--st-*` / brand ramps (P1/P3). Purely presentational:
 * consumed by `FlowMessage` to colour the leading type tile. `Input` carries the
 * brand tint so user turns read distinctly from agent turns.
 */
export const messageTypeTint: Record<MessageLogType, string> = {
    [MessageLogType.Advice]: 'bg-brand-tint text-primary',
    [MessageLogType.Answer]: 'bg-brand-tint text-primary',
    [MessageLogType.Ask]: 'bg-[color-mix(in_srgb,var(--st-waiting)_14%,transparent)] text-st-waiting',
    [MessageLogType.Browser]: 'bg-[color-mix(in_srgb,var(--ag-researcher)_14%,transparent)] text-ag-researcher',
    [MessageLogType.Done]: 'bg-[color-mix(in_srgb,var(--st-finished)_14%,transparent)] text-st-finished',
    [MessageLogType.File]: 'bg-muted text-muted-foreground',
    [MessageLogType.Input]: 'bg-brand-tint text-primary',
    [MessageLogType.Report]: 'bg-[color-mix(in_srgb,var(--st-finished)_14%,transparent)] text-st-finished',
    [MessageLogType.Search]: 'bg-[color-mix(in_srgb,var(--ag-researcher)_14%,transparent)] text-ag-researcher',
    [MessageLogType.Terminal]: 'bg-[color-mix(in_srgb,var(--ag-executor)_14%,transparent)] text-ag-executor',
    [MessageLogType.Thoughts]: 'bg-[color-mix(in_srgb,var(--ag-developer)_14%,transparent)] text-ag-developer',
};
export const DEFAULT_MESSAGE_TYPE_TINT = 'bg-muted text-muted-foreground';

const FlowMessageTypeIcon = ({ className, type, tooltip = type }: MessageTypeIconProps) => {
    const Icon = type ? messageTypeIcons[type] || defaultIcon : defaultIcon;
    const iconElement = <Icon className={cn('size-3 shrink-0', className)} />;

    if (!tooltip) {
        return iconElement;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{iconElement}</TooltipTrigger>
            <TooltipContent>{formatName(tooltip)}</TooltipContent>
        </Tooltip>
    );
};

export default FlowMessageTypeIcon;
