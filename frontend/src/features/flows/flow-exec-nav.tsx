import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Lets a subtask's "Open in Terminal" jump to the Terminal tab and pre-select that
 * subtask's step. `openStep` switches the right-panel tab (via `onOpenTerminal`) and
 * records the target; `FlowSplitTerminal` consumes `pendingStep` to select it, then
 * calls `clearPendingStep`.
 */
interface FlowExecNav {
    clearPendingStep: () => void;
    openStep: (stepId: string) => void;
    pendingStep: null | string;
}

const FlowExecNavContext = createContext<FlowExecNav | null>(null);

export const FlowExecNavProvider = ({
    children,
    onOpenTerminal,
}: {
    children: React.ReactNode;
    onOpenTerminal: () => void;
}) => {
    const [pendingStep, setPendingStep] = useState<null | string>(null);

    const openStep = useCallback(
        (stepId: string) => {
            setPendingStep(stepId);
            onOpenTerminal();
        },
        [onOpenTerminal],
    );

    const clearPendingStep = useCallback(() => setPendingStep(null), []);

    const value = useMemo(
        () => ({ clearPendingStep, openStep, pendingStep }),
        [clearPendingStep, openStep, pendingStep],
    );

    return <FlowExecNavContext.Provider value={value}>{children}</FlowExecNavContext.Provider>;
};

export const useFlowExecNav = () => useContext(FlowExecNavContext);
