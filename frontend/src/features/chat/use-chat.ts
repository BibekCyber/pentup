import { useEffect, useMemo } from 'react';

import {
    type ChatMessageFragmentFragment,
    ChatMessageStatus,
    useChatMessageAddedSubscription,
    useChatMessagesQuery,
    useChatMessageUpdatedSubscription,
    useChatSessionCreatedSubscription,
    useChatSessionDeletedSubscription,
    useChatSessionsQuery,
    useChatSessionUpdatedSubscription,
} from '@/graphql/types';

export type ChatMessage = ChatMessageFragmentFragment;

// A reply whose stream went quiet this long is re-read from the server, in
// case its final update was missed (e.g. it finished before the subscription
// was established).
const STALLED_REPLY_REFETCH_MS = 10_000;

/** Keeps the session list live. Mount once, in the chat layout. */
export const useChatSessionsSubscriptions = () => {
    useChatSessionCreatedSubscription();
    useChatSessionUpdatedSubscription();
    useChatSessionDeletedSubscription();
};

export const useChatSessions = () => {
    const { data, error, loading } = useChatSessionsQuery();

    return {
        error,
        isLoading: loading && !data,
        sessions: useMemo(() => data?.chatSessions ?? [], [data?.chatSessions]),
    };
};

export const useChatMessages = (sessionId: null | string) => {
    const skip = !sessionId;
    const variables = { sessionId: sessionId ?? '' };

    const { data, error, loading, refetch } = useChatMessagesQuery({ skip, variables });

    useChatMessageAddedSubscription({ skip, variables });
    useChatMessageUpdatedSubscription({ skip, variables });

    const messages = useMemo(() => data?.chatMessages ?? [], [data?.chatMessages]);
    const streaming = messages.find((message) => message.status === ChatMessageStatus.Streaming) ?? null;

    useEffect(() => {
        if (!streaming) {
            return;
        }

        const timer = window.setTimeout(() => {
            void refetch();
        }, STALLED_REPLY_REFETCH_MS);

        return () => window.clearTimeout(timer);
    }, [streaming, streaming?.content, refetch]);

    return {
        error,
        isLoading: loading && !data,
        messages,
        streaming,
    };
};
