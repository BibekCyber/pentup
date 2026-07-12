import type { SearchAddon } from '@xterm/addon-search';

import { useCallback, useEffect } from 'react';

import { Log } from '@/lib/log';

import { getSearchDecorations } from './terminal-config';

interface UseTerminalSearchResult {
    findNext: () => void;
    findPrevious: () => void;
}

export function useTerminalSearch(
    searchAddon: null | SearchAddon,
    isReady: boolean,
    searchValue: string | undefined,
): UseTerminalSearchResult {
    useEffect(() => {
        if (!searchAddon || !isReady) {
            return;
        }

        try {
            const trimmed = searchValue?.trim();

            if (trimmed) {
                searchAddon.findNext(trimmed, buildSearchOptions());
            } else {
                searchAddon.clearDecorations();
            }
        } catch (error: unknown) {
            Log.error('Terminal search failed:', error);
        }
    }, [searchAddon, isReady, searchValue]);

    const findNext = useCallback(() => {
        const trimmed = searchValue?.trim();

        if (!searchAddon || !trimmed) {
            return;
        }

        try {
            searchAddon.findNext(trimmed, buildSearchOptions());
        } catch (error: unknown) {
            Log.error('Terminal findNext failed:', error);
        }
    }, [searchAddon, searchValue]);

    const findPrevious = useCallback(() => {
        const trimmed = searchValue?.trim();

        if (!searchAddon || !trimmed) {
            return;
        }

        try {
            searchAddon.findPrevious(trimmed, buildSearchOptions());
        } catch (error: unknown) {
            Log.error('Terminal findPrevious failed:', error);
        }
    }, [searchAddon, searchValue]);

    return { findNext, findPrevious };
}

function buildSearchOptions() {
    return {
        caseSensitive: false,
        decorations: getSearchDecorations(),
        regex: false,
        wholeWord: false,
    } as const;
}
