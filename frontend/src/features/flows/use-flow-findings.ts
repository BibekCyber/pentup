import { useEffect, useMemo } from 'react';

import { useAssistantsQuery } from '@/graphql/types';
import { emptySeverityCounts, type Severity, type SeverityCounts } from '@/lib/report-model';

type FindingLike = { severity: string };

// Fold a batch of raw findings (severity-only) into an existing counts bucket.
const addFindings = (counts: SeverityCounts, findings: readonly FindingLike[] | undefined): void => {
    for (const finding of findings ?? []) {
        if (finding.severity in counts) {
            counts[finding.severity as Severity] += 1;
        }
    }
};

/**
 * Resolve a flow's severity counts from BOTH finding sources so a flow reads the
 * same regardless of run mode:
 *  - automation (per-task) findings live on `flow.findings`
 *  - assistant findings live on `assistant.findings` (one flow → many assistants)
 *
 * The assistants query runs LAZILY: it is skipped whenever the flow already has
 * automation findings, so automation-only flows issue no extra request. Apollo
 * caches the result per `flowId`. Tradeoff to be aware of: one `assistants(flowId)`
 * query per rendered card that has no automation findings — bounded to whatever
 * flows the calling page currently renders.
 */
export const useFlowFindings = (
    flowId: string,
    automationFindings: readonly FindingLike[] | undefined,
): SeverityCounts => {
    const hasAutomation = (automationFindings?.length ?? 0) > 0;

    // Only reach for assistant findings when there are no automation findings to show.
    const { data } = useAssistantsQuery({
        skip: hasAutomation,
        variables: { flowId },
    });

    return useMemo(() => {
        const counts = emptySeverityCounts();

        if (hasAutomation) {
            addFindings(counts, automationFindings);

            return counts;
        }

        for (const assistant of data?.assistants ?? []) {
            addFindings(counts, assistant.findings);
        }

        return counts;
    }, [hasAutomation, automationFindings, data]);
};

/**
 * Headless companion to {@link useFlowFindings}: it resolves one flow's counts and
 * reports them up via `onResolved`, rendering nothing. This lets a parent build a
 * scan-level roll-up (which spans automation + assistant findings) without calling
 * hooks in a loop. `onResolved` must be stable (wrap it in useCallback).
 */
export const FlowFindingsReporter = ({
    automationFindings,
    flowId,
    onResolved,
}: {
    automationFindings: readonly FindingLike[] | undefined;
    flowId: string;
    onResolved: (flowId: string, counts: SeverityCounts) => void;
}): null => {
    const counts = useFlowFindings(flowId, automationFindings);

    useEffect(() => {
        onResolved(flowId, counts);
    }, [flowId, counts, onResolved]);

    return null;
};
