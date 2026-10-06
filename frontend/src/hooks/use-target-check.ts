import { useEffect, useMemo, useRef, useState } from 'react';

import { type CheckTargetQuery, TargetOutcome, useCheckTargetLazyQuery } from '@/graphql/types';
import { getTargetFormatError } from '@/lib/target-validation';

export type TargetCheck = CheckTargetQuery['checkTarget'];

/** What the Target field should show right now. */
export type TargetCheckState =
    /** The backend answered. `ok` decides whether the wizard may advance. */
    | { kind: 'checked'; result: TargetCheck }
    /** Well formed, waiting on the backend. */
    | { kind: 'checking' }
    /** Malformed input, caught in the browser without a round trip. */
    | { kind: 'format-error'; message: string }
    /** Empty field. */
    | { kind: 'idle' }
    /** The check itself could not run (offline, rate limited). Never blocks. */
    | { kind: 'unavailable'; message: string };

/** How long the field must be quiet before the backend is asked. */
const DEBOUNCE_MS = 600;

/** Outcomes where the target is usable but something is worth saying. */
const WARNING_OUTCOMES = new Set<TargetOutcome>([
    TargetOutcome.DnsError,
    TargetOutcome.DnsOnly,
    TargetOutcome.NoResponse,
]);

/** True when the result is a pass that still carries a caveat. */
export const isTargetWarning = (result: TargetCheck): boolean => result.ok && WARNING_OUTCOMES.has(result.outcome);

/** The verdict reachable without the network, or null when one is needed. */
const localVerdict = (target: string): null | TargetCheckState => {
    const trimmed = target.trim();

    if (!trimmed) {
        return { kind: 'idle' };
    }

    const message = getTargetFormatError(trimmed);

    return message ? { kind: 'format-error', message } : null;
};

/**
 * Checks a scan target as the user types: format first, in the browser, then
 * the backend's checkTarget, which resolves and probes it.
 *
 * The wizard advances only on a confirmed pass, so a target still being
 * checked holds the Next button rather than letting a typo through. A check
 * that cannot run at all never blocks — the backend repeats the check when the
 * scan is created, so the gate is not lost, only deferred.
 */
export const useTargetCheck = (target: string): TargetCheckState => {
    const [runCheck] = useCheckTargetLazyQuery({ fetchPolicy: 'network-only' });

    // Format is derived, not stored, so typing never schedules a render just
    // to report something already known synchronously.
    const local = useMemo(() => localVerdict(target), [target]);

    // The backend's answer, tagged with the target it belongs to so a stale
    // response is never shown against newer input.
    const [remote, setRemote] = useState<null | { state: TargetCheckState; target: string }>(null);

    // Identifies the newest request, so a slow earlier response cannot
    // overwrite the verdict for what the user has since typed.
    const requestId = useRef(0);

    const trimmed = target.trim();

    useEffect(() => {
        if (local) {
            return;
        }

        const id = ++requestId.current;

        const timer = setTimeout(async () => {
            let next: TargetCheckState;

            try {
                const { data, error } = await runCheck({ variables: { target: trimmed } });

                next =
                    error || !data?.checkTarget
                        ? { kind: 'unavailable', message: error?.message ?? "The target couldn't be checked." }
                        : { kind: 'checked', result: data.checkTarget };
            } catch (err) {
                next = {
                    kind: 'unavailable',
                    message: err instanceof Error ? err.message : "The target couldn't be checked.",
                };
            }

            if (id === requestId.current) {
                setRemote({ state: next, target: trimmed });
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [trimmed, local, runCheck]);

    if (local) {
        return local;
    }

    return remote?.target === trimmed ? remote.state : { kind: 'checking' };
};

/** Whether the wizard may leave the Target step. */
export const canAdvanceTarget = (state: TargetCheckState): boolean => {
    switch (state.kind) {
        case 'checked':
            return state.result.ok;
        case 'unavailable':
            // The check could not run; the backend re-checks on create.
            return true;
        default:
            return false;
    }
};
