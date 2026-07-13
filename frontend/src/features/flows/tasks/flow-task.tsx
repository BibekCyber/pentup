import { memo, useEffect, useMemo, useState } from 'react';

import type { TaskFragmentFragment } from '@/graphql/types';

import Markdown from '@/components/shared/markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFlowExecNav } from '@/features/flows/flow-exec-nav';
import { StatusType } from '@/graphql/types';

import { type CommandGroup, CommandsPanel } from './flow-command-list';
import FlowSubtask from './flow-subtask';
import FlowTaskStatusIcon from './flow-task-status-icon';

interface FlowTaskProps {
    // subtaskId → commands[], built once at the list level and shared, so this task
    // does O(its subtasks) map lookups instead of re-scanning the whole log array.
    commandsBySubtask: Map<string, string[]>;
    searchValue?: string;
    task: TaskFragmentFragment;
}

// Stable empty-array reference so subtasks with no commands keep the same `commands`
// prop across renders and stay insulated by FlowSubtask's memo().
const EMPTY_COMMANDS: string[] = [];

// Helper function to check if text contains search value (case-insensitive)
const containsSearchValue = (text: null | string | undefined, searchValue: string): boolean => {
    if (!text || !searchValue.trim()) {
        return false;
    }

    return text.toLowerCase().includes(searchValue.toLowerCase().trim());
};

const FlowTask = ({ commandsBySubtask, searchValue = '', task }: FlowTaskProps) => {
    const { id, result, status, subtasks, title } = task;
    const nav = useFlowExecNav();
    const [isDetailsVisible, setIsDetailsVisible] = useState(false);
    const [isCommandsVisible, setIsCommandsVisible] = useState(false);

    // Memoize search checks to avoid recalculating on every render
    const searchChecks = useMemo(() => {
        const trimmedSearch = searchValue.trim();

        if (!trimmedSearch) {
            return { hasResultMatch: false };
        }

        return {
            hasResultMatch: containsSearchValue(result, trimmedSearch),
        };
    }, [searchValue, result]);

    // Auto-expand details if they contain search matches
    useEffect(() => {
        const trimmedSearch = searchValue.trim();

        if (trimmedSearch) {
            // Expand result block only if it contains the search term
            if (searchChecks.hasResultMatch) {
                setIsDetailsVisible(true);
            }
        } else {
            // Reset to default state when search is cleared
            setIsDetailsVisible(false);
        }
    }, [searchValue, searchChecks.hasResultMatch]);

    const sortedSubtasks = [...(subtasks || [])].sort((a, b) => +a.id - +b.id);
    const hasSubtasks = subtasks && subtasks.length > 0;

    // Calculate completed subtasks count
    const completedSubtasksCount = useMemo(() => {
        if (!subtasks?.length) {
            return 0;
        }

        return subtasks.filter((subtask) => [StatusType.Failed, StatusType.Finished].includes(subtask.status)).length;
    }, [subtasks]);

    // Calculate progress based on completed subtasks
    const progress = useMemo(() => {
        if (!subtasks?.length) {
            return 0;
        }

        return Math.round((completedSubtasksCount / subtasks.length) * 100);
    }, [subtasks, completedSubtasksCount]);

    // Every `$` command run across this task's subtasks, grouped by subtask (in id
    // order) so the whole task's command history is viewable in one place. Commands
    // come from the shared map (O(subtasks) lookups); empty subtasks are dropped and
    // each group's header jumps to that step in the Terminal.
    const commandGroups = useMemo<CommandGroup[]>(
        () =>
            [...(subtasks ?? [])]
                .sort((a, b) => +a.id - +b.id)
                .map((subtask) => ({
                    commands: commandsBySubtask.get(subtask.id) ?? [],
                    subtaskId: subtask.id,
                    title: subtask.title,
                }))
                .filter((group) => group.commands.length > 0),
        [subtasks, commandsBySubtask],
    );

    const totalCommands = useMemo(
        () => commandGroups.reduce((sum, group) => sum + group.commands.length, 0),
        [commandGroups],
    );

    const hasCommands = totalCommands > 0;

    return (
        <div className="flex flex-col">
            <div className="relative flex gap-2 pb-4">
                <FlowTaskStatusIcon
                    className="bg-background ring-border ring-background relative z-1 -mt-px size-5 rounded-full ring-3"
                    status={status}
                    tooltip={`Task ID: ${id}`}
                />
                <div className="flex flex-1 flex-col gap-2">
                    <div className="font-semibold">
                        <Markdown
                            className="prose-fixed prose-sm wrap-break-word *:m-0 [&>p]:leading-tight"
                            searchValue={searchValue}
                        >
                            {title}
                        </Markdown>
                    </div>

                    {hasSubtasks && (
                        <div className="flex items-center gap-2">
                            <Progress
                                className="h-1.5 flex-1"
                                value={progress}
                            />
                            <div className="text-muted-foreground shrink-0 text-xs text-nowrap">
                                {progress}% completed ({completedSubtasksCount} of {subtasks?.length})
                            </div>
                        </div>
                    )}

                    {(result || hasCommands) && (
                        <div className="text-muted-foreground text-xs">
                            <div className="flex items-center">
                                {result && (
                                    <button
                                        className="cursor-pointer hover:underline"
                                        onClick={() => setIsDetailsVisible((v) => !v)}
                                        type="button"
                                    >
                                        {isDetailsVisible ? 'Hide details' : 'Show details'}
                                    </button>
                                )}
                                {result && hasCommands && <span className="bg-border mx-2.5 h-3 w-px" />}
                                {hasCommands && (
                                    <button
                                        className="text-primary flex cursor-pointer items-center gap-1 font-medium hover:underline"
                                        onClick={() => setIsCommandsVisible((v) => !v)}
                                        type="button"
                                    >
                                        {isCommandsVisible ? 'Hide commands' : 'Show commands'}
                                        <span className="text-muted-foreground font-normal">· {totalCommands}</span>
                                    </button>
                                )}
                            </div>

                            {isCommandsVisible && (
                                <CommandsPanel
                                    grouped
                                    groups={commandGroups}
                                    onOpen={(subtaskId) => nav?.openStep(subtaskId)}
                                />
                            )}

                            {isDetailsVisible && result && (
                                <Card className="mt-4">
                                    <CardContent className="p-3">
                                        <Markdown
                                            className="prose-xs prose-fixed wrap-break-word"
                                            searchValue={searchValue}
                                        >
                                            {result}
                                        </Markdown>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
                <div className="border-red absolute top-0 left-[calc((--spacing(2.5))-0.5px)] h-full border-l"></div>
            </div>

            {hasSubtasks ? (
                <div className="flex flex-col">
                    {sortedSubtasks.map((subtask) => (
                        <FlowSubtask
                            commands={commandsBySubtask.get(subtask.id) ?? EMPTY_COMMANDS}
                            key={subtask.id}
                            searchValue={searchValue}
                            subtask={subtask}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-muted-foreground mt-2 ml-6 text-xs">Waiting for subtasks to be created...</div>
            )}
        </div>
    );
};

export default memo(FlowTask);
