import { stripAnsi } from '@/components/shared/terminal/terminal-highlight';
import { TerminalLogType } from '@/graphql/types';

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
// arrays down keeps the "Show commands · N" counts O(logs) instead of O(subtasks ×
// logs) per subtask on every streamed log line — a subscription append fires many
// times a second during a running flow, so a per-subtask re-scan of the growing log
// array would be superlinear.
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
