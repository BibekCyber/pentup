// Live tabbed terminal for a flow. Replaces the single merged terminal with one
// tab per step (subtask) plus a "Raw" tab:
//   • Each step tab stacks one pane per command run in that step. The command is
//     rendered INSIDE the pane (as a `$ command` prompt line) together with its
//     output — not in a title/window bar. These panes are lightweight (no xterm),
//     because a step can run many commands and one WebGL-backed <Terminal> per
//     command would exhaust the browser's WebGL context limit.
//   • The "Raw" tab is the original experience: a single <Terminal> (xterm) with
//     every log merged, full ANSI fidelity. Only one xterm is ever mounted, and
//     only while the Raw tab is active (Radix unmounts inactive tab content).
// Live updates keep working as flowData.terminalLogs grows via the
// terminalLogAdded subscription.
import { SquareTerminal } from 'lucide-react';
import { useMemo } from 'react';

import Terminal from '@/components/shared/terminal';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FlowTaskStatusIcon from '@/features/flows/tasks/flow-task-status-icon';
import { type StatusType, TerminalLogType } from '@/graphql/types';
import { useFlow } from '@/providers/flow-provider';

const NONE_KEY = '__none__';
const RAW_KEY = '__raw__';

interface TermLog {
    subtaskId?: null | string;
    text: string;
    type: TerminalLogType;
}

const stripAnsi = (text: string) =>
    // strip ANSI color codes (the ESC control char is intentional here)
    // eslint-disable-next-line no-control-regex
    text.replace(/\x1b\[[0-9;]*m/g, '');

const cleanCommand = (text: string) =>
    stripAnsi(text)
        // strip a leading "cwd $ " shell prompt
        .replace(/^.*?\$\s/, '')
        .trim();

// Lightweight, non-xterm pane for a single command. The command is shown inside
// the pane as a `$ ...` prompt line, followed by its output (ANSI stripped, since
// there's no terminal emulator to interpret it). See the file header for why this
// isn't an xterm instance.
const CommandPane = ({ command, output }: { command: string; output: string[] }) => (
    <div className="bg-background overflow-hidden rounded-md border">
        <div className="max-h-80 overflow-auto p-3 font-mono text-xs leading-relaxed">
            {command ? (
                <div className="text-emerald-600 dark:text-emerald-400">
                    <span className="text-muted-foreground select-none">$ </span>
                    {command}
                </div>
            ) : null}
            {output.length === 0 ? (
                command ? (
                    <div className="text-muted-foreground italic">(no output)</div>
                ) : null
            ) : (
                output.map((line, i) => (
                    <div
                        className="text-foreground/80 break-all whitespace-pre-wrap"
                        // output lines are positional and have no stable id
                        key={i}
                    >
                        {stripAnsi(line)}
                    </div>
                ))
            )}
        </div>
    </div>
);

const FlowSplitTerminal = () => {
    const { flowData } = useFlow();

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

    // Group by subtask (first-seen order; logs arrive created_at ASC) and, within
    // each step, split into per-command groups: a stdin line starts a group, the
    // stdout/stderr that follows is its output. Output before the first command
    // (banners, general logs) becomes a command-less group.
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
            const logs = buckets.get(key) ?? [];

            const groups: { command: string; id: string; output: TermLog[] }[] = [];
            let current: (typeof groups)[number] | null = null;

            logs.forEach((log, index) => {
                if (log.type === TerminalLogType.Stdin) {
                    current = { command: cleanCommand(log.text) || 'command', id: `${key}-${index}`, output: [] };
                    groups.push(current);
                } else if (current) {
                    current.output.push(log);
                } else {
                    current = { command: '', id: `${key}-pre-${index}`, output: [log] };
                    groups.push(current);
                }
            });

            return {
                groups,
                id: key,
                status: meta?.status,
                title: meta?.title ?? (key === NONE_KEY ? 'General' : `Subtask ${key}`),
            };
        });
    }, [terminalLogs, subtaskMeta]);

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
            defaultValue={steps[0]?.id ?? RAW_KEY}
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
                    <div className="flex flex-col gap-3 pb-3">
                        {step.groups.map((group) => (
                            <CommandPane
                                command={group.command}
                                key={group.id}
                                output={group.output.map((l) => l.text)}
                            />
                        ))}
                    </div>
                </TabsContent>
            ))}

            <TabsContent
                className="grow"
                value={RAW_KEY}
            >
                <div className="flex h-full min-h-80 flex-col overflow-hidden rounded-md border">
                    <Terminal
                        className="grow"
                        logs={terminalLogs.map((l) => l.text)}
                    />
                </div>
            </TabsContent>
        </Tabs>
    );
};

export default FlowSplitTerminal;
