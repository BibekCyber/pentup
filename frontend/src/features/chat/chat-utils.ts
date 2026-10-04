import { differenceInCalendarDays, formatDistanceStrict } from 'date-fns';

import type { ChatQuotaFragmentFragment, ChatSessionFragmentFragment } from '@/graphql/types';

export type ChatSession = ChatSessionFragmentFragment;

export interface ChatSessionGroup {
    label: string;
    sessions: ChatSession[];
}

const GROUP_LABELS = ['Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Older'] as const;

const groupIndex = (date: Date, now: Date): number => {
    const days = differenceInCalendarDays(now, date);

    if (days <= 0) {
        return 0;
    }

    if (days === 1) {
        return 1;
    }

    if (days <= 7) {
        return 2;
    }

    if (days <= 30) {
        return 3;
    }

    return 4;
};

/**
 * Sorts sessions by last activity and buckets them by how long ago that was,
 * dropping empty buckets. Matches on the title when a search term is given.
 */
export const groupChatSessions = (sessions: ChatSession[], search = '', now = new Date()): ChatSessionGroup[] => {
    const term = search.trim().toLowerCase();
    const buckets: ChatSession[][] = GROUP_LABELS.map(() => []);

    [...sessions]
        .filter((session) => !term || session.title.toLowerCase().includes(term))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .forEach((session) => {
            buckets[groupIndex(new Date(session.updatedAt), now)]?.push(session);
        });

    return GROUP_LABELS.map((label, index) => ({ label, sessions: buckets[index] ?? [] })).filter(
        (group) => group.sessions.length > 0,
    );
};

export const formatTokens = (tokens: number): string => {
    if (tokens >= 1_000_000) {
        return `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }

    if (tokens >= 1000) {
        return `${Math.floor(tokens / 1000)}k`;
    }

    return String(tokens);
};

export interface ChatQuotaStatus {
    // Composer can send.
    canSend: boolean;
    // Short line shown under the composer; null when there is nothing worth saying.
    message: null | string;
    tone: 'muted' | 'warning';
}

const resetIn = (resetAt: null | string | undefined, now: Date): string =>
    resetAt ? `in ${formatDistanceStrict(new Date(resetAt), now)}` : 'later';

/**
 * Turns the server quota into what the composer shows. Token usage is only
 * mentioned once most of the budget is gone, to keep the footer quiet.
 */
export const describeChatQuota = (
    quota: ChatQuotaFragmentFragment | null | undefined,
    now = new Date(),
): ChatQuotaStatus => {
    if (!quota) {
        return { canSend: true, message: null, tone: 'muted' };
    }

    const messagesLeft = quota.messagesLimit > 0 ? Math.max(quota.messagesLimit - quota.messagesUsed, 0) : null;
    const tokensLeft = quota.tokensLimit > 0 ? Math.max(quota.tokensLimit - quota.tokensUsed, 0) : null;

    if (messagesLeft === 0) {
        return {
            canSend: false,
            message: `Message limit reached. You can send more ${resetIn(quota.messagesResetAt, now)}.`,
            tone: 'warning',
        };
    }

    if (tokensLeft === 0) {
        return {
            canSend: false,
            message: `Daily token budget used up. It frees up ${resetIn(quota.tokensResetAt, now)}.`,
            tone: 'warning',
        };
    }

    const parts: string[] = [];

    if (messagesLeft !== null) {
        parts.push(`${messagesLeft} ${messagesLeft === 1 ? 'message' : 'messages'} left this hour`);
    }

    const tokensRunningLow = tokensLeft !== null && tokensLeft < quota.tokensLimit * 0.2;

    if (tokensRunningLow) {
        parts.push(`${formatTokens(tokensLeft)} tokens left today`);
    }

    const messagesRunningLow = messagesLeft !== null && messagesLeft <= Math.max(3, quota.messagesLimit * 0.15);

    return {
        canSend: true,
        message: parts.length ? parts.join(' · ') : null,
        tone: tokensRunningLow || messagesRunningLow ? 'warning' : 'muted',
    };
};
