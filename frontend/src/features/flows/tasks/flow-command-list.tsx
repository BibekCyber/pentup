import { ArrowUpRight } from 'lucide-react';

import { stripAnsi } from '@/components/shared/terminal/terminal-highlight';
import { TerminalLogType } from '@/graphql/types';
import { cn } from '@/lib/utils';

export interface CommandGroup {
    commands: string[];
    subtaskId: string;
    title: string;
}

interface TermLogLite {
    subtaskId?: null | string;
    text: string;
    type: TerminalLogType;
}

// Turn one stdin log into a tidy one-line command preview: strip the ANSI + leading
// "cwd $ " shell prompt and collapse whitespace.
const cleanCommand = (text: string): string =>
    stripAnsi(text)
        .replace(/^.*?\$\s/, '')
        .replace(/\s+/g, ' ')
        .trim();

// Build a `subtaskId -> commands[]` map in a SINGLE pass over the flow's terminal
// logs. Computing this once (at the task-list level) and threading the per-subtask
// arrays down keeps live command extraction O(logs) instead of O(subtasks × logs)
// per subtask on every streamed log line — a subscription append fires many times a
// second during a running flow, so a per-subtask re-scan of the growing log array
// would be superlinear.
export const buildSubtaskCommandMap = (logs: readonly TermLogLite[]): Map<string, string[]> => {
    const map = new Map<string, string[]>();

    for (const log of logs) {
        if (log.type !== TerminalLogType.Stdin || !log.subtaskId) {
            continue;
        }

        const command = cleanCommand(log.text);

        if (!command) {
            continue;
        }

        const list = map.get(log.subtaskId);

        if (list) {
            list.push(command);
        } else {
            map.set(log.subtaskId, [command]);
        }
    }

    return map;
};

// One-line command preview: the command name in the terminal's teal, the rest
// neutral (or the whole line dim if it's a comment).
const renderCompactCommand = (cmd: string) => {
    if (cmd.startsWith('#')) {
        return <span className="term-comment">{cmd}</span>;
    }

    const space = cmd.indexOf(' ');
    const head = space === -1 ? cmd : cmd.slice(0, space);
    const rest = space === -1 ? '' : cmd.slice(space);

    return (
        <>
            <span className="term-cmd">{head}</span>
            {rest}
        </>
    );
};

interface CommandsPanelProps {
    // When true, each group is prefixed by a clickable subtask header (used at the
    // task level, where commands from several subtasks are shown together). When
    // false, the single group's commands are shown flat with an "Open in Terminal"
    // footer (used on an individual subtask).
    grouped?: boolean;
    groups: CommandGroup[];
    onOpen: (subtaskId: string) => void;
}

// A compact, colour-coded list of the `$` commands that ran — the whole list is
// scrollable, so every command is reachable (no hard cap). Headers / footer jump to
// the matching step in the live Terminal.
export const CommandsPanel = ({ grouped = false, groups, onOpen }: CommandsPanelProps) => {
    if (groups.length === 0) {
        return null;
    }

    return (
        <div className="terminal-scope mt-3 overflow-hidden rounded-lg border">
            <div className="max-h-72 overflow-auto p-3 text-xs leading-relaxed">
                {groups.map((group, groupIndex) => (
                    <div
                        className={cn(grouped && groupIndex > 0 && 'mt-3 border-t border-white/10 pt-3')}
                        key={group.subtaskId}
                    >
                        {grouped && (
                            <button
                                className="term-open mb-1.5 flex w-full cursor-pointer items-center gap-1.5 text-left font-medium hover:underline"
                                onClick={() => onOpen(group.subtaskId)}
                                type="button"
                            >
                                <span className="min-w-0 truncate">{group.title}</span>
                                <span className="term-muted font-normal">· {group.commands.length}</span>
                                <ArrowUpRight className="ml-auto size-3 shrink-0" />
                            </button>
                        )}
                        {group.commands.map((cmd, i) => (
                            <div
                                className="flex gap-2 py-0.5"
                                // commands are positional, no stable id
                                key={i}
                            >
                                <span className="term-prompt shrink-0 select-none">$</span>
                                <span
                                    className="min-w-0 flex-1 truncate"
                                    // full command on hover — the row is truncated to stay compact
                                    title={cmd}
                                >
                                    {renderCompactCommand(cmd)}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            {!grouped && (
                <div className="border-t border-white/10 p-3">
                    <button
                        className="term-open inline-flex cursor-pointer items-center gap-1 hover:underline"
                        onClick={() => onOpen(groups[0].subtaskId)}
                        type="button"
                    >
                        Open in Terminal
                        <ArrowUpRight className="size-3" />
                    </button>
                </div>
            )}
        </div>
    );
};
