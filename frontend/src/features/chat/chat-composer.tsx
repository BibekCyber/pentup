import { ArrowUp, Square } from 'lucide-react';
import { forwardRef, type KeyboardEvent } from 'react';

import type { Provider } from '@/models/provider';

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextareaAutosize } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import { ChatProviderSelect } from './chat-provider-select';

interface ChatComposerProps {
    canSend: boolean;
    isSending: boolean;
    isStopping: boolean;
    isStreaming: boolean;
    maxLength: number;
    onChange: (value: string) => void;
    onProviderChange: (provider: Provider) => void;
    onSend: () => void;
    onStop: () => void;
    providerName: null | string | undefined;
    value: string;
}

/**
 * Chat input styled like the flow form composer: autosizing textarea with the
 * provider picker and the send / stop button underneath.
 */
export const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(
    (
        {
            canSend,
            isSending,
            isStopping,
            isStreaming,
            maxLength,
            onChange,
            onProviderChange,
            onSend,
            onStop,
            providerName,
            value,
        },
        ref,
    ) => {
        const length = value.trim().length;
        const isTooLong = value.length > maxLength;
        const isSendable = canSend && !isSending && !isStreaming && length > 0 && !isTooLong && !!providerName;
        const showCounter = value.length > maxLength * 0.8;

        const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
                return;
            }

            event.preventDefault();

            if (isSendable) {
                onSend();
            }
        };

        return (
            <form
                onSubmit={(event) => {
                    event.preventDefault();

                    if (isSendable) {
                        onSend();
                    }
                }}
            >
                <InputGroup className="bg-well focus-within:border-primary/60 block rounded-xl shadow-sm transition-colors">
                    <InputGroupTextareaAutosize
                        aria-label="Message"
                        autoFocus
                        className="min-h-0 px-4 pt-3.5 text-[14px]"
                        disabled={isSending}
                        maxRows={10}
                        minRows={1}
                        onChange={(event) => onChange(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about a vulnerability, a technique, a tool or a finding…"
                        ref={ref}
                        value={value}
                    />
                    <InputGroupAddon align="block-end">
                        <ChatProviderSelect
                            disabled={isSending || isStreaming}
                            onChange={onProviderChange}
                            value={providerName}
                        />

                        {showCounter && (
                            <span
                                className={cn(
                                    'ml-auto font-mono text-[11px]',
                                    isTooLong ? 'text-destructive' : 'text-muted-foreground',
                                )}
                            >
                                {value.length.toLocaleString()} / {maxLength.toLocaleString()}
                            </span>
                        )}

                        {isStreaming ? (
                            <InputGroupButton
                                aria-label="Stop generating"
                                className={cn(!showCounter && 'ml-auto')}
                                disabled={isStopping}
                                onClick={onStop}
                                size="icon-xs"
                                title="Stop generating"
                                type="button"
                                variant="destructive"
                            >
                                {isStopping ? <Spinner variant="circle" /> : <Square />}
                            </InputGroupButton>
                        ) : (
                            <InputGroupButton
                                aria-label="Send message"
                                className={cn(!showCounter && 'ml-auto')}
                                disabled={!isSendable}
                                size="icon-xs"
                                title="Send (Enter)"
                                type="submit"
                                variant="default"
                            >
                                {isSending ? <Spinner variant="circle" /> : <ArrowUp />}
                            </InputGroupButton>
                        )}
                    </InputGroupAddon>
                </InputGroup>
            </form>
        );
    },
);

ChatComposer.displayName = 'ChatComposer';
