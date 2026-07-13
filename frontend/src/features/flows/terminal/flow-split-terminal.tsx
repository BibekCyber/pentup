// Live tabbed terminal for a flow. Replaces the single merged terminal with one
// tab per step (subtask) plus a "Raw" tab:
//   • Each step tab stacks one pane per command run in that step. The command is
//     rendered INSIDE the pane (as a `$ command` prompt line) together with its
//     output — not in a title/window bar. These panes are lightweight (no xterm),
//     because a step can run many commands and one WebGL-backed <Terminal> per
//     command would exhaust the browser's WebGL context limit. (The panes + render
//     budget live in flow-command-panes, shared with the Tasks tab.)
//   • The "Raw" tab is the original experience: a single <Terminal> (xterm) with
//     every log merged, full ANSI fidelity. Only one xterm is ever mounted, and
//     only while the Raw tab is active (Radix unmounts inactive tab content).
// Live updates keep working as flowData.terminalLogs grows via the
// terminalLogAdded subscription.
import { SquareTerminal } from 'lucide-react';
import { useMemo, useState } from 'react';

import Terminal from '@/components/shared/terminal';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFlowExecNav } from '@/features/flows/flow-exec-nav';
import FlowTaskStatusIcon from '@/features/flows/tasks/flow-task-status-icon';
import { type StatusType } from '@/graphql/types';
import { useFlow } from '@/providers/flow-provider';

import { groupCommands, StepPanes, type TermLog } from './flow-command-panes';

const NONE_KEY = '__none__';
const RAW_KEY = '__raw__';

const FlowSplitTerminal = () => {
    const { flowData } = useFlow();
    const nav = useFlowExecNav();

    const terminalLogs = useMemo<TermLog[]>(() => flowData?.terminalLogs ?? [], [flowData?.terminalLogs]);

    // subtaskId -> {title, status} for tab labels.
    const subtaskMeta = useMemo(() => {
        const map = new Map<string, { status: StatusType; title: string }>();

        for (const task of flowData?.tasks ?? []) {
            for (const subtask of task.subtasks ?? []) {
                map.set(subtask.id, { status: subtask.status, title: subtask.title });
            }
        }

        return map;
    }, [flowData?.tasks]);

    // Group by subtask (first-seen order; logs arrive created_at ASC), then split each
    // step into per-command groups (see groupCommands).
    const steps = useMemo(() => {
        const order: string[] = [];
        const buckets = new Map<string, TermLog[]>();

        for (const log of terminalLogs) {
            const key = log.subtaskId ?? NONE_KEY;

            if (!buckets.has(key)) {
                buckets.set(key, []);
                order.push(key);
            }

            buckets.get(key)?.push(log);
        }

        return order.map((key) => {
            const meta = subtaskMeta.get(key);

            return {
                groups: groupCommands(buckets.get(key) ?? [], key),
                id: key,
                status: meta?.status,
                title: meta?.title ?? (key === NONE_KEY ? 'General' : `Subtask ${key}`),
            };
        });
    }, [terminalLogs, subtaskMeta]);

    // Controlled tab selection. A subtask's "Open in Terminal" sets a pending step in
    // the shared nav context; it wins until the user picks a tab (which clears it).
    // The value is derived (no setState-in-effect): pending → manual pick → first step.
    const [selectedStep, setSelectedStep] = useState<null | string>(null);

    const activeStep = useMemo(() => {
        const pending = nav?.pendingStep;

        if (pending && steps.some((s) => s.id === pending)) {
            return pending;
        }

        if (selectedStep && (selectedStep === RAW_KEY || steps.some((s) => s.id === selectedStep))) {
            return selectedStep;
        }

        return steps[0]?.id ?? RAW_KEY;
    }, [nav?.pendingStep, selectedStep, steps]);

    const handleStepChange = (value: string) => {
        setSelectedStep(value);

        if (nav?.pendingStep) {
            nav.clearPendingStep();
        }
    };

    if (terminalLogs.length === 0) {
        return (
            <Empty className="size-full">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <SquareTerminal />
                    </EmptyMedia>
                    <EmptyTitle>No terminal output yet</EmptyTitle>
                    <EmptyDescription>Commands will appear here, split per step, as the scan runs.</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <Tabs
            className="flex size-full flex-col"
            onValueChange={handleStepChange}
            value={activeStep}
        >
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                {steps.map((step) => (
                    <TabsTrigger
                        className="gap-1.5"
                        key={step.id}
                        value={step.id}
                    >
                        {step.status ? <FlowTaskStatusIcon status={step.status} /> : null}
                        <span className="max-w-40 truncate">{step.title}</span>
                    </TabsTrigger>
                ))}
                <TabsTrigger
                    className="gap-1.5"
                    value={RAW_KEY}
                >
                    <SquareTerminal className="size-4" />
                    Raw
                </TabsTrigger>
            </TabsList>

            {steps.map((step) => (
                <TabsContent
                    className="grow overflow-y-auto"
                    key={step.id}
                    value={step.id}
                >
                    <StepPanes groups={step.groups} />
                </TabsContent>
            ))}

            <TabsContent
                className="grow"
                value={RAW_KEY}
            >
                <Terminal
                    className="h-full min-h-80"
                    logs={terminalLogs.map((l) => l.text)}
                    title="Raw terminal"
                />
            </TabsContent>
        </Tabs>
    );
};

export default FlowSplitTerminal;
