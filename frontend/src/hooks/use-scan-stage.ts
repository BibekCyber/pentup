import { useEffect, useState } from 'react';

import { StatusType } from '@/graphql/types';

// The four user-facing boot stages, in order. Kept here so the copy lives next to
// the logic that advances it; the illustration component renders these labels.
export const SCAN_STAGES = [
    'Provisioning your secure sandbox…',
    'Starting the Docker container…',
    'Waking up the AI agents…',
    'Planning your test…',
] as const;

export const LAST_SCAN_STAGE = SCAN_STAGES.length - 1;

// Cadence at which the stepper creeps forward when the backend status hasn't moved,
// so the animation never looks frozen during a long boot.
const STAGE_ADVANCE_MS = 2600;

// Coarse, reliable mapping from real flow status to the *minimum* stage we should be
// showing. We never render a stage below this floor (no going backwards), and the
// timer only creeps us forward from it — so stages track reality when a signal
// exists and fall back to a timed loop when it doesn't.
const statusFloor = (status?: StatusType): number => {
    switch (status) {
        case StatusType.Running:
            return 2;
        case StatusType.Waiting:
            return 1;
        case StatusType.Created:
        default:
            return 0;
    }
};

/**
 * Derives the active boot-stage index (0..3) for the scan-initializing animation.
 *
 * It follows the real backend `status` when one is available (via a floor that only
 * ever rises) and gently creeps forward on a timer otherwise, so the copy always
 * feels like it is making progress and never freezes. It caps at the final
 * "Planning your test…" stage, where it dwells until real content streams in and the
 * caller stops rendering the animation.
 *
 * @param status  latest flow status, if known (Phase B). Omit for Phase A.
 * @param active  whether the animation is currently on screen; the timer is paused
 *                when inactive so we don't advance in the background.
 */
export const useScanStage = (status?: StatusType, active = true): number => {
    const floor = statusFloor(status);
    // Tracks how far the timed fallback has crept. The returned stage is always floored
    // by the live status, so this only ever needs to move the animation *forward* on a
    // timer — the status floor is applied at read time and inside the tick, so no effect
    // is needed to reconcile the two when status advances.
    const [creep, setCreep] = useState(floor);

    useEffect(() => {
        if (!active) {
            return;
        }

        const id = window.setInterval(() => {
            setCreep((current) => Math.min(LAST_SCAN_STAGE, Math.max(current, floor) + 1));
        }, STAGE_ADVANCE_MS);

        return () => window.clearInterval(id);
    }, [active, floor]);

    return Math.min(LAST_SCAN_STAGE, Math.max(creep, floor));
};
