import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';

import { TargetCheckStatus, TargetOutcome } from '@/graphql/types';
import { isTargetWarning, type TargetCheckState } from '@/hooks/use-target-check';
import { cn } from '@/lib/utils';

const STEP_ICON: Record<TargetCheckStatus, React.ComponentType<{ className?: string }>> = {
    [TargetCheckStatus.Fail]: XCircle,
    [TargetCheckStatus.Ok]: CheckCircle2,
    [TargetCheckStatus.Skip]: Info,
    [TargetCheckStatus.Warn]: AlertTriangle,
};

const STEP_COLOR: Record<TargetCheckStatus, string> = {
    [TargetCheckStatus.Fail]: 'text-destructive',
    [TargetCheckStatus.Ok]: 'text-st-finished',
    [TargetCheckStatus.Skip]: 'text-muted-foreground',
    [TargetCheckStatus.Warn]: 'text-st-running',
};

/** Human label for each stage of the check. */
const STEP_LABEL: Record<string, string> = {
    dns: 'DNS',
    http: 'HTTP',
    input: 'Format',
    tcp: 'Connection',
    tls: 'TLS',
};

const Line = ({
    children,
    icon: Icon,
    spin,
    tone,
}: {
    children: React.ReactNode;
    icon: React.ComponentType<{ className?: string }>;
    spin?: boolean;
    tone: string;
}) => (
    <p
        className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed"
        role="status"
    >
        <Icon className={cn('mt-px size-3.5 shrink-0', tone, spin && 'animate-spin')} />
        <span className={tone}>{children}</span>
    </p>
);

/**
 * Shows the verdict for the Target field: a format error, the live check, or
 * the backend's result with its per-stage observations.
 *
 * The stage list is the honest part — a target can resolve and connect while
 * its certificate is wrong, or answer 403 because it exists and is locked
 * down. Collapsing that into one up/down light would hide what was learned.
 */
const TargetStatus = ({ state }: { state: TargetCheckState }) => {
    if (state.kind === 'idle') {
        return null;
    }

    if (state.kind === 'format-error') {
        return (
            <Line
                icon={XCircle}
                tone="text-destructive"
            >
                {state.message}
            </Line>
        );
    }

    if (state.kind === 'checking') {
        return (
            <Line
                icon={Loader2}
                spin
                tone="text-muted-foreground"
            >
                Checking the target…
            </Line>
        );
    }

    if (state.kind === 'unavailable') {
        return (
            <Line
                icon={Info}
                tone="text-muted-foreground"
            >
                {state.message} You can continue — the target is checked again when the scan starts.
            </Line>
        );
    }

    const { result } = state;
    const warning = isTargetWarning(result);
    const tone = !result.ok ? 'text-destructive' : warning ? 'text-st-running' : 'text-st-finished';
    const Icon = !result.ok ? XCircle : warning ? AlertTriangle : CheckCircle2;

    // Account identifiers are not probed, so there are no stages worth listing.
    const showSteps = result.outcome !== TargetOutcome.AccountIdentifier && result.steps.length > 1;

    // A stage that went wrong carries the most useful text of the whole check
    // ("TLS works but the certificate is for *.other.com"). Hiding that behind
    // a tooltip puts it out of reach on touch, so those read out in full while
    // the stages that simply passed stay as compact chips.
    const notable = result.steps.filter(
        (step) => step.status === TargetCheckStatus.Warn || step.status === TargetCheckStatus.Fail,
    );

    return (
        <div>
            <Line
                icon={Icon}
                tone={tone}
            >
                {result.message}
            </Line>

            {showSteps ? (
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {result.steps.map((step) => {
                        const StepIcon = STEP_ICON[step.status] ?? Info;

                        return (
                            <li
                                className="text-muted-foreground flex items-center gap-1.5 font-mono text-[10.5px]"
                                key={step.name}
                            >
                                <StepIcon className={cn('size-3', STEP_COLOR[step.status])} />
                                {STEP_LABEL[step.name] ?? step.name}
                            </li>
                        );
                    })}
                </ul>
            ) : null}

            {showSteps && notable.length > 0 ? (
                <ul className="mt-1.5 flex flex-col gap-0.5">
                    {notable.map((step) => (
                        <li
                            className="text-muted-foreground text-[11px] leading-relaxed"
                            key={step.name}
                        >
                            <span className="font-mono">{STEP_LABEL[step.name] ?? step.name}:</span> {step.detail}
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
};

export default TargetStatus;
