// Shared terminal-pane rendering: one lightweight pane per command (the `$ command`
// prompt + its content-aware colour-coded output), plus a render budget so a step
// with a megabyte of output can't flood the DOM. Used both by the live Terminal tab
// (FlowSplitTerminal) and by the Tasks tab, where a subtask's "Show commands" expands
// the very same panes inline.
import { ArrowUpRight } from 'lucide-react';
import { useMemo } from 'react';

import {
    detectBlockType,
    stripAnsi,
    TermCommandLines,
    TermOutput,
} from '@/components/shared/terminal/terminal-highlight';
import { TermChromeBar } from '@/components/shared/terminal/terminal-output-card';
import { TerminalLogType } from '@/graphql/types';

export interface CommandGroup {
    command: string;
    id: string;
    output: TermLog[];
}

export interface CommandSection {
    groups: CommandGroup[];
    subtaskId: string;
    title?: string;
}

export interface TermLog {
    subtaskId?: null | string;
    text: string;
    type: TerminalLogType;
}

const cleanCommand = (text: string) =>
    stripAnsi(text)
        // strip a leading "cwd $ " shell prompt
        .replace(/^.*?\$\s/, '')
        .trim();

// Split a step's logs into per-command groups: a stdin line starts a group, the
// stdout/stderr that follows is its output. Output before the first command (banners,
// general logs) becomes a command-less group.
export const groupCommands = (logs: TermLog[], keyPrefix: string): CommandGroup[] => {
    const groups: CommandGroup[] = [];
    let current: CommandGroup | null = null;

    logs.forEach((log, index) => {
        if (log.type === TerminalLogType.Stdin) {
            current = { command: cleanCommand(log.text) || 'command', id: `${keyPrefix}-${index}`, output: [] };
            groups.push(current);
        } else if (current) {
            current.output.push(log);
        } else {
            current = { command: '', id: `${keyPrefix}-pre-${index}`, output: [log] };
            groups.push(current);
        }
    });

    return groups;
};

// One command run = one distinct terminal pane: a slim header (content-type badge +
// copy), then the `$ command` prompt (syntax-highlighted) followed by its output,
// colour-coded by content (JSON / HTML / key: value / plain text). `maxLines` bounds
// how much output is rendered (see StepPanes) — copy and the Raw tab carry it in full.
const CommandPane = ({ group, maxLines }: { group: CommandGroup; maxLines?: number }) => {
    // Derived from the output only, so it is recomputed when the output changes, not
    // on every parent re-render. detectBlockType samples up to 2000 lines; keeping it
    // out of the render-hot path matters while live logs stream in via subscription.
    const { blockType, copyText, lines } = useMemo(() => {
        const outputTexts = group.output.map((o) => o.text);

        return {
            blockType: group.output.length > 0 ? detectBlockType(outputTexts) : null,
            copyText: [group.command ? `$ ${group.command}` : '', ...outputTexts.map(stripAnsi)]
                .filter(Boolean)
                .join('\n'),
            lines: group.output.map((o) => ({ isErr: o.type === TerminalLogType.Stderr, text: o.text })),
        };
    }, [group.output, group.command]);

    return (
        <div className="terminal-scope overflow-hidden rounded-lg border">
            <TermChromeBar
                blockType={blockType}
                copyText={copyText}
            />
            <div className="max-h-[26rem] overflow-auto p-3 font-mono text-xs leading-relaxed">
                {group.command ? (
                    <div className="flex gap-2">
                        <span className="term-prompt shrink-0 select-none">$</span>
                        <div className="min-w-0 flex-1">
                            <TermCommandLines text={group.command} />
                        </div>
                    </div>
                ) : null}
                {group.output.length === 0 ? (
                    group.command ? (
                        <div className="term-muted mt-0.5 italic">(no output)</div>
                    ) : null
                ) : (
                    <TermOutput
                        lines={lines}
                        maxLines={maxLines}
                    />
                )}
            </div>
        </div>
    );
};

// Rendering budget for a single step's panes. Each pane renders one <div> per output
// line (no virtualization), so a step with a megabyte of output would otherwise mount
// tens of thousands of nodes and freeze the tab. We cap the output — at most
// PANE_MAX_LINES per pane and STEP_LINE_BUDGET lines across the step, front-loaded —
// and the number of panes (STEP_PANE_CAP) as a backstop against steps with thousands
// of commands. The Raw tab (a virtualized xterm) always holds the complete log.
const STEP_LINE_BUDGET = 1500;
const PANE_MAX_LINES = 200;
const STEP_PANE_CAP = 100;

const countOutputLines = (output: TermLog[]): number =>
    // Count newlines directly — ANSI SGR codes never contain '\n', so stripping first
    // is unnecessary and would re-scan tens of MB (a large dumped output) on every render.
    output.reduce((total, log) => total + log.text.split('\n').length, 0);

const budgetStep = (
    groups: CommandGroup[],
): { hiddenCommands: number; panes: { group: CommandGroup; maxLines: number }[]; truncatedLines: boolean } => {
    let remaining = STEP_LINE_BUDGET;
    let truncatedLines = false;
    const panes: { group: CommandGroup; maxLines: number }[] = [];

    for (let i = 0; i < groups.length; i++) {
        if (panes.length >= STEP_PANE_CAP) {
            return { hiddenCommands: groups.length - i, panes, truncatedLines };
        }

        const group = groups[i];
        const cap = Math.max(0, Math.min(PANE_MAX_LINES, remaining));
        const outputLines = countOutputLines(group.output);

        if (outputLines > cap) {
            truncatedLines = true;
        }

        remaining -= Math.min(outputLines, cap);
        panes.push({ group, maxLines: cap });
    }

    return { hiddenCommands: 0, panes, truncatedLines };
};

// A step's command panes, budgeted. Render this only for content that is actually
// visible (a mounted terminal tab, or the single open "Show commands" accordion row).
export const StepPanes = ({ groups }: { groups: CommandGroup[] }) => {
    const { hiddenCommands, panes, truncatedLines } = useMemo(() => budgetStep(groups), [groups]);

    return (
        <div className="flex flex-col gap-3 pb-2">
            {panes.map(({ group, maxLines }) => (
                <CommandPane
                    group={group}
                    key={group.id}
                    maxLines={maxLines}
                />
            ))}
            {hiddenCommands > 0 || truncatedLines ? (
                <div className="text-muted-foreground px-1 text-xs">
                    {hiddenCommands > 0
                        ? `${hiddenCommands} more command${hiddenCommands === 1 ? '' : 's'} and some output are`
                        : 'Some output is'}{' '}
                    hidden for performance — open the <span className="font-medium">Raw</span> tab for the full log.
                </div>
            ) : null}
        </div>
    );
};

// The expanded "Show commands" terminal: one or more step sections (a subtask shows a
// single section; a whole task shows one per subtask, with a header). `onOpen` jumps
// to that step in the full Terminal tab.
export const CommandTerminals = ({
    onOpen,
    sections,
    showHeaders = false,
}: {
    onOpen?: (subtaskId: string) => void;
    sections: CommandSection[];
    showHeaders?: boolean;
}) => {
    if (sections.length === 0) {
        return <div className="text-muted-foreground px-1 py-3 text-xs">No commands were recorded for this step.</div>;
    }

    return (
        <div className="flex flex-col gap-5">
            {sections.map((section) => (
                <div
                    className="flex flex-col gap-2"
                    key={section.subtaskId}
                >
                    <div className="flex items-center gap-2">
                        {showHeaders && section.title != null ? (
                            <span className="min-w-0 truncate text-xs font-semibold">{section.title}</span>
                        ) : null}
                        {onOpen ? (
                            <button
                                className="text-primary ml-auto inline-flex cursor-pointer items-center gap-1 text-xs font-medium hover:underline"
                                onClick={() => onOpen(section.subtaskId)}
                                type="button"
                            >
                                Open in Terminal
                                <ArrowUpRight className="size-3" />
                            </button>
                        ) : null}
                    </div>
                    <StepPanes groups={section.groups} />
                </div>
            ))}
        </div>
    );
};
