import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useFlow } from '@/providers/flow-provider';

/**
 * Resolves the active tab. The flow only ever exposes ONE of the two mode tabs
 * ('assistant' for assistant flows, 'automation' otherwise), so with no selection
 * we default to that mode tab, and a request for the opposite (hidden) mode tab is
 * coerced to it. Other values (dashboard, and the mobile-only terminal/agents) pass
 * through unchanged.
 */
export function useFlowTabDetection() {
    const { isAssistantMode } = useFlow();
    const [searchParams, setSearchParams] = useSearchParams();
    const [manualTab, setManualTab] = useState<null | string>(null);

    const resolvedTab = useMemo(() => {
        const modeTab = isAssistantMode ? 'assistant' : 'automation';
        const oppositeTab = isAssistantMode ? 'automation' : 'assistant';
        const requested = manualTab ?? searchParams.get('tab');

        if (!requested || requested === oppositeTab) {
            return modeTab;
        }

        return requested;
    }, [manualTab, searchParams, isAssistantMode]);

    const handleTabChange = useCallback(
        (tab: string) => {
            setManualTab(tab);
            setSearchParams({ tab });
        },
        [setSearchParams],
    );

    return { handleTabChange, resolvedTab };
}
