import { Check, Copy, RotateCcw, ShieldAlert, TriangleAlert } from 'lucide-react';
import { memo, useState } from 'react';
import { toast } from 'sonner';

import Logo from '@/components/icons/logo';
import Markdown from '@/components/shared/markdown';
import { Button } from '@/components/ui/button';
import { ChatMessageRole, ChatMessageStatus } from '@/graphql/types';
import { cn } from '@/lib/utils';

import type { ChatMessage as ChatMessageType } from './use-chat';

interface ChatMessageProps {
    message: ChatMessageType;
    // Re-sends the question this reply answers; only offered on failed replies.
    onRetry?: () => void;
}

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error('Could not copy to clipboard');
        }
    };

    return (
        <Button
            aria-label="Copy reply"
            className="text-muted-foreground hover:text-foreground size-7"
            onClick={handleCopy}
            size="icon"
            title="Copy"
            variant="ghost"
        >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
    );
};

const ThinkingIndicator = () => (
    <div
        aria-label="Thinking"
        className="text-muted-foreground flex items-center gap-1.5 py-1.5 text-[13px]"
        role="status"
    >
        <span className="bg-primary size-1.5 animate-pulse rounded-full" />
        <span className="bg-primary size-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
        <span className="bg-primary size-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
        <span className="ml-1.5">Thinking…</span>
    </div>
);

const AssistantBody = ({ message, onRetry }: ChatMessageProps) => {
    switch (message.status) {
        case ChatMessageStatus.Error:
            return (
                <div className="flex flex-col gap-2">
                    {message.content && (
                        <Markdown
                            blockRemoteImages
                            className="prose-fixed wrap-break-word"
                        >
                            {message.content}
                        </Markdown>
                    )}
                    <div className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px]">
                        <TriangleAlert className="text-destructive size-4 shrink-0" />
                        <span className="text-foreground/90 flex-1">The reply could not be generated.</span>
                        {onRetry && (
                            <Button
                                className="h-7"
                                onClick={onRetry}
                                size="sm"
                                variant="outline"
                            >
                                <RotateCcw className="size-3.5" />
                                Retry
                            </Button>
                        )}
                    </div>
                </div>
            );

        case ChatMessageStatus.Refused:
            return (
                <div className="border-border bg-well text-muted-foreground flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed">
                    <ShieldAlert className="text-primary mt-0.5 size-4 shrink-0" />
                    <span>{message.content}</span>
                </div>
            );

        case ChatMessageStatus.Streaming:
            if (!message.content) {
                return <ThinkingIndicator />;
            }

            return (
                <Markdown
                    blockRemoteImages
                    className="prose-fixed wrap-break-word"
                >
                    {message.content}
                </Markdown>
            );

        default:
            return (
                <Markdown
                    blockRemoteImages
                    className="prose-fixed wrap-break-word"
                >
                    {message.content}
                </Markdown>
            );
    }
};

export const ChatMessage = memo(({ message, onRetry }: ChatMessageProps) => {
    if (message.role === ChatMessageRole.User) {
        return (
            <div className="flex justify-end">
                <div className="bg-well border-border max-w-[85%] rounded-2xl rounded-br-md border px-4 py-2.5 text-[14px] leading-relaxed break-words whitespace-pre-wrap">
                    {message.content}
                </div>
            </div>
        );
    }

    const canCopy =
        !!message.content &&
        (message.status === ChatMessageStatus.Done || message.status === ChatMessageStatus.Stopped);

    return (
        <div className="group/message flex gap-3">
            <div className="bg-brand-tint border-border flex size-7 shrink-0 items-center justify-center rounded-lg border">
                <Logo className="size-4" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
                <AssistantBody
                    message={message}
                    onRetry={onRetry}
                />
                {(canCopy || message.status === ChatMessageStatus.Stopped) && (
                    <div
                        className={cn(
                            'mt-1 flex h-7 items-center gap-2',
                            message.status !== ChatMessageStatus.Stopped &&
                                'opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100',
                        )}
                    >
                        {canCopy && <CopyButton text={message.content} />}
                        {message.status === ChatMessageStatus.Stopped && (
                            <span className="text-muted-foreground font-mono text-[11px]">Stopped</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

ChatMessage.displayName = 'ChatMessage';
