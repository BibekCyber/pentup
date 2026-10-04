import { describe, expect, it } from 'vitest';

import { type ChatSession, describeChatQuota, formatTokens, groupChatSessions } from './chat-utils';

const NOW = new Date('2026-10-04T12:00:00Z');

const session = (id: string, title: string, updatedAt: string): ChatSession => ({
    createdAt: updatedAt,
    id,
    providerName: 'kimi',
    title,
    updatedAt,
});

describe('groupChatSessions', () => {
    const sessions = [
        session('1', 'Old recon', '2026-08-01T10:00:00Z'),
        session('2', 'Kerberoasting', '2026-10-04T09:00:00Z'),
        session('3', 'SQLi in GraphQL', '2026-10-04T11:00:00Z'),
        session('4', 'Nmap timing', '2026-10-03T08:00:00Z'),
        session('5', 'CVSS for IDOR', '2026-09-30T08:00:00Z'),
        session('6', 'Report wording', '2026-09-10T08:00:00Z'),
    ];

    it('buckets by recency, newest first, skipping empty buckets', () => {
        const groups = groupChatSessions(sessions, '', NOW);

        expect(groups.map((group) => group.label)).toEqual([
            'Today',
            'Yesterday',
            'Previous 7 days',
            'Previous 30 days',
            'Older',
        ]);
        expect(groups[0]?.sessions.map((s) => s.id)).toEqual(['3', '2']);
        expect(groups[4]?.sessions.map((s) => s.id)).toEqual(['1']);
    });

    it('filters by title, case-insensitively', () => {
        const groups = groupChatSessions(sessions, '  nMaP ', NOW);

        expect(groups).toHaveLength(1);
        expect(groups[0]?.sessions.map((s) => s.title)).toEqual(['Nmap timing']);
        expect(groupChatSessions(sessions, 'nothing matches', NOW)).toEqual([]);
    });
});

describe('formatTokens', () => {
    it('abbreviates', () => {
        expect(formatTokens(950)).toBe('950');
        expect(formatTokens(142_500)).toBe('142k');
        expect(formatTokens(2_000_000)).toBe('2M');
        expect(formatTokens(1_250_000)).toBe('1.3M');
    });
});

describe('describeChatQuota', () => {
    const base = {
        maxInputChars: 8000,
        messagesLimit: 20,
        messagesResetAt: null,
        messagesUsed: 2,
        tokensLimit: 200_000,
        tokensResetAt: null,
        tokensUsed: 10_000,
    };

    it('stays quiet about tokens while the budget is healthy', () => {
        expect(describeChatQuota(base, NOW)).toEqual({
            canSend: true,
            message: '18 messages left this hour',
            tone: 'muted',
        });
    });

    it('warns when messages or tokens run low', () => {
        expect(describeChatQuota({ ...base, messagesUsed: 18 }, NOW)).toMatchObject({
            message: '2 messages left this hour',
            tone: 'warning',
        });
        expect(describeChatQuota({ ...base, tokensUsed: 185_000 }, NOW)).toMatchObject({
            message: '18 messages left this hour · 15k tokens left today',
            tone: 'warning',
        });
    });

    it('blocks sending once a limit is reached, with when it frees up', () => {
        expect(describeChatQuota({ ...base, messagesResetAt: '2026-10-04T12:14:00Z', messagesUsed: 20 }, NOW)).toEqual({
            canSend: false,
            message: 'Message limit reached. You can send more in 14 minutes.',
            tone: 'warning',
        });
        expect(describeChatQuota({ ...base, tokensResetAt: '2026-10-05T03:00:00Z', tokensUsed: 200_000 }, NOW)).toEqual(
            {
                canSend: false,
                message: 'Daily token budget used up. It frees up in 15 hours.',
                tone: 'warning',
            },
        );
    });

    it('treats a zero limit as unlimited', () => {
        expect(describeChatQuota({ ...base, messagesLimit: 0, tokensLimit: 0, tokensUsed: 9e9 }, NOW)).toEqual({
            canSend: true,
            message: null,
            tone: 'muted',
        });
        expect(describeChatQuota(undefined, NOW).canSend).toBe(true);
    });
});
