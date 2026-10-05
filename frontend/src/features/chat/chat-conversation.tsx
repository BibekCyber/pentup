import { ArrowDown, History, MessageSquareOff, MoreHorizontal, SquarePen, Trash } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import CommandBar from '@/components/layouts/command-bar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ChatMessageRole,
    ChatMessagesDocument,
    type ChatMessagesQuery,
    ChatMessageStatus,
    ChatSessionsDocument,
    type ChatSessionsQuery,
    useChatQuotaQuery,
    useChatSessionQuery,
    useSendChatMessageMutation,
    useStopChatMessageMutation,
} from '@/graphql/types';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { Log } from '@/lib/log';
import { cn } from '@/lib/utils';
import { useProviders } from '@/providers/providers-provider';

import { ChatComposer } from './chat-composer';
import { ChatEmptyState } from './chat-empty-state';
import { ChatHistory } from './chat-history';
import { ChatMessage } from './chat-message';
import { describeChatQuota } from './chat-utils';
import { useChatMessages } from './use-chat';
import { useChatSessionActions } from './use-chat-session-actions';

const DEFAULT_MAX_INPUT_CHARS = 8000;

interface ChatConversationProps {
    // null: a new chat that does not exist until the first message is sent.
    sessionId: null | string;
}

export const ChatConversation = ({ sessionId }: ChatConversationProps) => {
    const navigate = useNavigate();
    const composerRef = useRef<HTMLTextAreaElement>(null);
    const { canManageProviders, selectedProvider, setSelectedProvider } = useProviders();

    const [draft, setDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const { data: sessionData, loading: isSessionLoading } = useChatSessionQuery({
        skip: !sessionId,
        variables: { sessionId: sessionId ?? '' },
    });
    const session = sessionData?.chatSession ?? null;
    const isNotFound = !!sessionId && !isSessionLoading && sessionData !== undefined && !session;

    const { isLoading: isMessagesLoading, messages, streaming } = useChatMessages(isNotFound ? null : sessionId);
    const { data: quotaData, refetch: refetchQuota } = useChatQuotaQuery({ fetchPolicy: 'cache-and-network' });
    const quota = quotaData?.chatQuota;
    const quotaStatus = describeChatQuota(quota);

    const [sendMutation] = useSendChatMessageMutation();
    const [stopMutation] = useStopChatMessageMutation();
    const { confirmDialog, requestDelete } = useChatSessionActions();

    const scrollItems = useMemo(() => messages.map((message) => ({ id: String(message.id) })), [messages]);
    const { containerRef, endRef, isScrolledToBottom, scrollToEnd } = useAutoScroll(scrollItems, sessionId);

    // Usage changes when a reply finishes, so refresh the quota then.
    const streamingId = streaming?.id;
    const previousStreamingId = useRef(streamingId);

    useEffect(() => {
        if (previousStreamingId.current && previousStreamingId.current !== streamingId) {
            void refetchQuota();
        }

        previousStreamingId.current = streamingId;
    }, [streamingId, refetchQuota]);

    // A reached limit frees up on its own; re-check when it should.
    const resetAt = !quotaStatus.canSend ? (quota?.messagesResetAt ?? quota?.tokensResetAt) : null;

    useEffect(() => {
        if (!resetAt) {
            return;
        }

        const wait = Math.min(Math.max(new Date(resetAt).getTime() - Date.now() + 1000, 1000), 60 * 60 * 1000);
        const timer = window.setTimeout(() => void refetchQuota(), wait);

        return () => window.clearTimeout(timer);
    }, [resetAt, refetchQuota]);

    const send = useCallback(
        async (content: string) => {
            // Without a pick the backend answers with the shared default provider.
            const providerName = canManageProviders ? selectedProvider?.name : undefined;

            if ((canManageProviders && !providerName) || isSending) {
                return;
            }

            setIsSending(true);

            try {
                const { data } = await sendMutation({
                    update: (cache, { data: result }) => {
                        const sent = result?.sendChatMessage;

                        if (!sent) {
                            return;
                        }

                        cache.updateQuery<ChatMessagesQuery>(
                            { query: ChatMessagesDocument, variables: { sessionId: sent.session.id } },
                            (existing) => {
                                const list = existing?.chatMessages ?? [];
                                const known = new Set(list.map((message) => String(message.id)));
                                const added = [sent.userMessage, sent.assistantMessage].filter(
                                    (message) => !known.has(String(message.id)),
                                );

                                return { chatMessages: [...list, ...added] };
                            },
                        );

                        cache.updateQuery<ChatSessionsQuery>({ query: ChatSessionsDocument }, (existing) => {
                            if (
                                !existing ||
                                existing.chatSessions.some((item) => String(item.id) === String(sent.session.id))
                            ) {
                                return existing;
                            }

                            return { chatSessions: [sent.session, ...existing.chatSessions] };
                        });
                    },
                    variables: { content, providerName, sessionId },
                });

                setDraft('');
                void refetchQuota();

                const newSessionId = data?.sendChatMessage.session.id;

                if (!sessionId && newSessionId) {
                    navigate(`/chat/${newSessionId}`);
                } else {
                    scrollToEnd();
                }
            } catch (error) {
                toast.error('Message not sent', {
                    description: error instanceof Error ? error.message : 'Please try again',
                });
                Log.error('Error sending chat message:', error);
                void refetchQuota();
            } finally {
                setIsSending(false);
            }
        },
        [
            canManageProviders,
            isSending,
            navigate,
            refetchQuota,
            scrollToEnd,
            selectedProvider?.name,
            sendMutation,
            sessionId,
        ],
    );

    const stop = useCallback(async () => {
        if (!streaming || isStopping) {
            return;
        }

        setIsStopping(true);

        try {
            await stopMutation({ variables: { messageId: streaming.id } });
        } catch (error) {
            toast.error('Failed to stop the reply', {
                description: error instanceof Error ? error.message : 'Please try again',
            });
        } finally {
            setIsStopping(false);
        }
    }, [isStopping, stopMutation, streaming]);

    // Retry re-asks the question a failed reply was answering.
    const retryFor = useCallback(
        (index: number) => {
            const question = messages
                .slice(0, index)
                .reverse()
                .find((message) => message.role === ChatMessageRole.User);

            if (!question) {
                return undefined;
            }

            return () => void send(question.content);
        },
        [messages, send],
    );

    const pickSuggestion = (prompt: string) => {
        setDraft(prompt);
        composerRef.current?.focus();
    };

    const title = sessionId ? (session?.title ?? (isSessionLoading ? '' : 'Chat')) : 'New chat';
    const lastMessage = messages.at(-1);
    const showEmptyState = !sessionId && messages.length === 0;

    return (
        <div className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col">
            <CommandBar
                actions={
                    <>
                        <Button
                            aria-label="Chat history"
                            className="md:hidden"
                            onClick={() => setIsHistoryOpen(true)}
                            size="icon"
                            variant="ghost"
                        >
                            <History />
                        </Button>
                        {sessionId && (
                            <Button
                                onClick={() => navigate('/chat')}
                                size="sm"
                                variant="outline"
                            >
                                <SquarePen />
                                <span className="hidden sm:inline">New chat</span>
                            </Button>
                        )}
                        {session && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        aria-label="Chat actions"
                                        size="icon"
                                        variant="ghost"
                                    >
                                        <MoreHorizontal />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive [&_svg]:text-destructive"
                                        onSelect={() => requestDelete(session)}
                                    >
                                        <Trash />
                                        Delete chat
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </>
                }
                title={title || <Skeleton className="h-5 w-48" />}
            />

            {isNotFound ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                    <MessageSquareOff className="text-muted-foreground size-8" />
                    <h2 className="text-lg font-semibold">Chat not found</h2>
                    <p className="text-muted-foreground max-w-sm text-sm">
                        It may have been deleted. Your chats are private, so links to them only work for you.
                    </p>
                    <Button
                        className="mt-2"
                        onClick={() => navigate('/chat', { replace: true })}
                    >
                        <SquarePen />
                        Start a new chat
                    </Button>
                </div>
            ) : (
                <>
                    <div
                        className="relative min-h-0 flex-1 overflow-y-auto"
                        ref={containerRef}
                    >
                        {showEmptyState ? (
                            <ChatEmptyState onPick={pickSuggestion} />
                        ) : (
                            <div
                                aria-busy={!!streaming}
                                aria-live="polite"
                                className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6"
                            >
                                {isMessagesLoading && messages.length === 0
                                    ? Array.from({ length: 3 }, (_, index) => (
                                          <Skeleton
                                              className={cn('h-16', index % 2 ? 'w-full' : 'ml-auto w-2/3')}
                                              key={index}
                                          />
                                      ))
                                    : messages.map((message, index) => (
                                          <ChatMessage
                                              key={message.id}
                                              message={message}
                                              onRetry={
                                                  message.status === ChatMessageStatus.Error &&
                                                  message.id === lastMessage?.id
                                                      ? retryFor(index)
                                                      : undefined
                                              }
                                          />
                                      ))}
                                <div ref={endRef} />
                            </div>
                        )}
                    </div>

                    <div className="relative mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6">
                        {!isScrolledToBottom && !showEmptyState && (
                            <Button
                                aria-label="Scroll to latest"
                                className="bg-card absolute -top-12 left-1/2 size-8 -translate-x-1/2 rounded-full shadow-md"
                                onClick={() => scrollToEnd()}
                                size="icon"
                                variant="outline"
                            >
                                <ArrowDown className="size-4" />
                            </Button>
                        )}
                        <ChatComposer
                            canManageProviders={canManageProviders}
                            canSend={quotaStatus.canSend}
                            isSending={isSending}
                            isStopping={isStopping}
                            isStreaming={!!streaming}
                            maxLength={quota?.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS}
                            onChange={setDraft}
                            onProviderChange={setSelectedProvider}
                            onSend={() => void send(draft.trim())}
                            onStop={() => void stop()}
                            providerName={selectedProvider?.name}
                            ref={composerRef}
                            value={draft}
                        />
                        <div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-[11.5px]">
                            <span>AI answers can be wrong. Nothing is run against any target.</span>
                            {quotaStatus.message && (
                                <span
                                    className={cn('font-mono', quotaStatus.tone === 'warning' && 'text-sev-med')}
                                    role={quotaStatus.canSend ? undefined : 'alert'}
                                >
                                    {quotaStatus.message}
                                </span>
                            )}
                        </div>
                    </div>
                </>
            )}

            <Sheet
                onOpenChange={setIsHistoryOpen}
                open={isHistoryOpen}
            >
                <SheetContent
                    className="w-72 p-0"
                    side="left"
                >
                    <SheetHeader className="border-b px-4 py-3">
                        <SheetTitle className="text-sm">Chats</SheetTitle>
                    </SheetHeader>
                    <ChatHistory
                        className="flex-1"
                        onNavigate={() => setIsHistoryOpen(false)}
                    />
                </SheetContent>
            </Sheet>
            {confirmDialog}
        </div>
    );
};
