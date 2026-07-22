import { Brain, Copy, Terminal } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import type { AssistantLogFragmentFragment, MessageLogFragmentFragment } from '@/graphql/types';

import Markdown from '@/components/shared/markdown';
import { TermOutputCard } from '@/components/shared/terminal/terminal-output-card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageLogType, ResultFormat } from '@/graphql/types';
import { cn } from '@/lib/utils';
import { formatDate, formatName } from '@/lib/utils/format';
import { copyMessageToClipboard } from '@/lib/сlipboard';

import FlowMessageTypeIcon, { DEFAULT_MESSAGE_TYPE_TINT, messageTypeTint } from './flow-message-type-icon';

interface FlowMessageProps {
    log: AssistantLogFragmentFragment | MessageLogFragmentFragment;
    searchValue?: string;
}

// Helper function to check if text contains search value (case-insensitive)
const containsSearchValue = (text: null | string | undefined, searchValue: string): boolean => {
    if (!text || !searchValue.trim()) {
        return false;
    }

    return text.toLowerCase().includes(searchValue.toLowerCase().trim());
};

const FlowMessage = ({ log, searchValue = '' }: FlowMessageProps) => {
    const { createdAt, message, result, resultFormat = ResultFormat.Plain, thinking, type } = log;
    const isReportMessage = type === MessageLogType.Report;

    // Memoize search checks to avoid recalculating on every render
    const searchChecks = useMemo(() => {
        const trimmedSearch = searchValue.trim();

        if (!trimmedSearch) {
            return { hasResultMatch: false, hasThinkingMatch: false };
        }

        return {
            hasResultMatch: containsSearchValue(result, trimmedSearch),
            hasThinkingMatch: containsSearchValue(thinking, trimmedSearch),
        };
    }, [searchValue, thinking, result]);

    const [isDetailsVisible, setIsDetailsVisible] = useState(isReportMessage);
    const [isThinkingVisible, setIsThinkingVisible] = useState(false);

    // Auto-expand blocks if they contain search matches
    useEffect(() => {
        const trimmedSearch = searchValue.trim();

        if (trimmedSearch) {
            // Expand thinking block only if it contains the search term
            if (searchChecks.hasThinkingMatch) {
                setIsThinkingVisible(true);
            }

            // Expand result block only if it contains the search term
            if (searchChecks.hasResultMatch) {
                setIsDetailsVisible(true);
            }
        } else {
            // Reset to default state when search is cleared
            setIsDetailsVisible(isReportMessage);
            setIsThinkingVisible(false);
        }
    }, [searchValue, searchChecks.hasThinkingMatch, searchChecks.hasResultMatch, isReportMessage]);

    // Use useCallback to memoize the toggle functions
    const toggleDetails = useCallback(() => {
        setIsDetailsVisible((prev) => !prev);
    }, []);

    const toggleThinking = useCallback(() => {
        setIsThinkingVisible((prev) => !prev);
    }, []);

    const handleCopy = useCallback(async () => {
        await copyMessageToClipboard({
            message,
            result,
            resultFormat,
            thinking,
        });
    }, [thinking, message, result, resultFormat]);

    // Determine if thinking should be shown
    // Show thinking if: thinking exists AND (message is empty OR thinking is manually toggled visible)
    const shouldShowThinking = thinking && (!message || isThinkingVisible);

    // Determine if thinking toggle button should be shown
    // Show button only if thinking exists AND message is not empty
    const shouldShowThinkingToggle = thinking && message;

    // Only render details content when it's visible to reduce DOM nodes
    const renderDetailsContent = () => {
        if (!isDetailsVisible) {
            return null;
        }

        return (
            <>
                <div className="my-3 border-t" />
                {resultFormat === ResultFormat.Markdown ? (
                    <Markdown
                        className="prose-xs prose-fixed wrap-break-word"
                        searchValue={searchValue}
                    >
                        {result}
                    </Markdown>
                ) : (
                    // Plain and Terminal results are raw command / tool output — render them
                    // with the terminal's content-aware colour-coding (commands, URLs, JSON,
                    // HTML, errors…) on the dark surface so they read like the live terminal.
                    <TermOutputCard text={(result as string) ?? ''} />
                )}
            </>
        );
    };

    const renderThinkingContent = () => {
        if (!shouldShowThinking) {
            return null;
        }

        return (
            <>
                <div className="border-muted mb-3 border-l-2 pl-3">
                    <Markdown
                        className="prose-xs prose-fixed text-muted-foreground/80 wrap-break-word"
                        searchValue={searchValue}
                    >
                        {thinking}
                    </Markdown>
                </div>
            </>
        );
    };

    return (
        // EMBER `.msg` row: leading colour-tinted type tile (.mtype) + body column.
        <div className="flex gap-3 py-3">
            <span
                className={cn(
                    'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border',
                    (type && messageTypeTint[type]) || DEFAULT_MESSAGE_TYPE_TINT,
                )}
            >
                <FlowMessageTypeIcon
                    className="size-4"
                    type={type}
                />
            </span>
            <div
                className={cn(
                    'min-w-0 flex-1',
                    // Input turns read distinctly: brand left-accent + well tint (className-only).
                    type === MessageLogType.Input && 'border-primary bg-brand-tint rounded-lg border-l-2 px-3 py-2',
                )}
            >
                <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-[12.5px] font-bold">{formatName(type ?? '')}</span>
                    <span className="text-muted-foreground/60 font-mono text-[10px]">
                        {formatDate(new Date(createdAt))}
                    </span>
                </div>

                {/* Thinking toggle button */}
                {shouldShowThinkingToggle && (
                    <div
                        className="text-muted-foreground bg-well hover:text-foreground mb-2 flex w-fit cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors"
                        onClick={toggleThinking}
                    >
                        <Brain className="size-3.5" />
                        {isThinkingVisible ? 'Hide thinking' : 'Show thinking'}
                    </div>
                )}

                {/* Thinking content */}
                {renderThinkingContent()}

                {/* Main message content */}
                {message && (
                    <Markdown
                        className="prose-xs prose-fixed wrap-break-word"
                        searchValue={searchValue}
                    >
                        {message}
                    </Markdown>
                )}

                {/* Result details */}
                {result && (
                    <div className="text-muted-foreground mt-2 text-xs">
                        <div
                            className="bg-well text-ag-executor hover:text-foreground flex w-fit cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors"
                            onClick={toggleDetails}
                        >
                            <Terminal className="size-3.5" />
                            {isDetailsVisible ? 'Hide details' : 'Show details'}
                        </div>
                        {renderDetailsContent()}
                    </div>
                )}

                {/* Footer: copy + id */}
                <div className="text-muted-foreground/60 mt-2 flex items-center gap-2 text-xs">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Copy
                                className="hover:text-foreground size-3 shrink-0 cursor-pointer transition-colors"
                                onClick={handleCopy}
                            />
                        </TooltipTrigger>
                        <TooltipContent>Copy</TooltipContent>
                    </Tooltip>
                    <span className="font-mono text-[10px]">{log.id}</span>
                </div>
            </div>
        </div>
    );
};

export default memo(FlowMessage);
