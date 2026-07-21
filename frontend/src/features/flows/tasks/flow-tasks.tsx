import { zodResolver } from '@hookform/resolvers/zod';
import debounce from 'lodash/debounce';
import { ChevronDown, ChevronLeft, ListTodo, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Form, FormControl, FormField } from '@/components/ui/form';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { useFlowExecNav } from '@/features/flows/flow-exec-nav';
import { type CommandSection, CommandTerminals, groupCommands } from '@/features/flows/terminal/flow-command-panes';
import { type StatusType } from '@/graphql/types';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { useFlow } from '@/providers/flow-provider';

import { buildSubtaskCommandMap } from './flow-command-list';
import FlowTask from './flow-task';
import FlowTaskStatusIcon from './flow-task-status-icon';

// The single open "Show commands" selection. A subtask key is its id; a task key is
// `task:<id>` (which shows every subtask of the task). While something is open the
// task list is replaced by a focused view of just this item's terminal.
export interface OpenCommands {
    isTask: boolean;
    key: string;
    sections: CommandSection[];
    status?: StatusType;
    title: string;
}

// Focused command view: the open item's terminal fills the panel with a single
// scrollbar, so the rest of the task list is out of reach until you go back.
const FocusedCommands = ({
    onClose,
    onOpenTerminal,
    open,
}: {
    onClose: () => void;
    onOpenTerminal: (subtaskId: string) => void;
    open: OpenCommands;
}) => (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 flex h-full flex-col duration-200">
        <div className="flex items-center gap-2 pb-3">
            <Button
                aria-label="Back to tasks"
                onClick={onClose}
                size="icon-sm"
                type="button"
                variant="ghost"
            >
                <ChevronLeft />
            </Button>
            {open.status ? <FlowTaskStatusIcon status={open.status} /> : null}
            <span className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold">{open.title}</span>
            <button
                className="text-primary shrink-0 cursor-pointer text-xs font-medium hover:underline"
                onClick={onClose}
                type="button"
            >
                Hide commands
            </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <CommandTerminals
                onOpen={onOpenTerminal}
                sections={open.sections}
                showHeaders={open.isTask}
            />
        </div>
    </div>
);

const searchFormSchema = z.object({
    search: z.string(),
});

// Helper function to check if text contains search value (case-insensitive)
const containsSearchValue = (text: null | string | undefined, searchValue: string): boolean => {
    if (!text || !searchValue.trim()) {
        return false;
    }

    return text.toLowerCase().includes(searchValue.toLowerCase().trim());
};

const FlowTasks = () => {
    const { flowData, flowId } = useFlow();
    const nav = useFlowExecNav();

    const tasks = useMemo(() => flowData?.tasks ?? [], [flowData?.tasks]);

    // One pass over the whole flow's terminal logs → subtaskId → commands[]. Shared
    // with every FlowTask/FlowSubtask so live command extraction stays O(logs), not
    // O(subtasks × logs), as terminalLogs grows on each streamed line.
    const commandsBySubtask = useMemo(
        () => buildSubtaskCommandMap(flowData?.terminalLogs ?? []),
        [flowData?.terminalLogs],
    );

    // The one open "Show commands" row (only one at a time). Opening replaces the list
    // with a focused view of just this item.
    const [openKey, setOpenKey] = useState<null | string>(null);
    const toggleCommands = useCallback((key: string) => setOpenKey((prev) => (prev === key ? null : key)), []);
    const closeCommands = useCallback(() => setOpenKey(null), []);

    // Command panes (with output) for the open row — a single filter + group over the
    // logs for that item, computed here so no subtask does log work until opened. A
    // subtask opens one section; a task opens one per subtask (with a header).
    const openCommands = useMemo<null | OpenCommands>(() => {
        if (!openKey) {
            return null;
        }

        const logs = flowData?.terminalLogs ?? [];
        const sectionFor = (subtaskId: string, title?: string): CommandSection => ({
            groups: groupCommands(
                logs.filter((log) => log.subtaskId === subtaskId),
                `${subtaskId}`,
            ),
            subtaskId,
            title,
        });

        // Subtask ids can be numeric at runtime (GraphQL ids), so coerce before any
        // string ops. Task rows use a `task:<id>` key; a bare id is a subtask.
        const keyString = `${openKey}`;

        if (keyString.startsWith('task:')) {
            const taskId = keyString.slice(5);
            const task = tasks.find((candidate) => `${candidate.id}` === taskId);
            const sections = [...(task?.subtasks ?? [])]
                .sort((a, b) => +a.id - +b.id)
                .map((subtask) => sectionFor(subtask.id, subtask.title))
                .filter((section) => section.groups.length > 0);

            return { isTask: true, key: openKey, sections, status: task?.status, title: task?.title ?? 'Task commands' };
        }

        const subtask = tasks.flatMap((task) => task.subtasks ?? []).find((candidate) => `${candidate.id}` === keyString);

        return {
            isTask: false,
            key: openKey,
            sections: [sectionFor(openKey)],
            status: subtask?.status,
            title: subtask?.title ?? 'Commands',
        };
    }, [openKey, flowData?.terminalLogs, tasks]);

    const [debouncedSearchValue, setDebouncedSearchValue] = useState('');

    const { containerRef, endRef, hasNewMessages, isScrolledToBottom, scrollToEnd } = useAutoScroll(tasks, flowId);

    const form = useForm<z.infer<typeof searchFormSchema>>({
        defaultValues: {
            search: '',
        },
        resolver: zodResolver(searchFormSchema),
    });

    const searchValue = form.watch('search');

    // Create debounced function to update search value
    const debouncedUpdateSearch = useMemo(
        () =>
            debounce((value: string) => {
                setDebouncedSearchValue(value);
            }, 500),
        [],
    );

    // Update debounced search value when input value changes
    useEffect(() => {
        debouncedUpdateSearch(searchValue);

        return () => {
            debouncedUpdateSearch.cancel();
        };
    }, [searchValue, debouncedUpdateSearch]);

    // Cleanup debounced function on unmount
    useEffect(() => {
        return () => {
            debouncedUpdateSearch.cancel();
        };
    }, [debouncedUpdateSearch]);

    // Clear search when flow changes to prevent stale search state
    useEffect(() => {
        form.reset({ search: '' });
        setDebouncedSearchValue('');
        setOpenKey(null);
        debouncedUpdateSearch.cancel();
    }, [flowId, form, debouncedUpdateSearch]);

    // Memoize filtered tasks to avoid recomputing on every render
    // Use debouncedSearchValue for filtering to improve performance
    const filteredTasks = useMemo(() => {
        const search = debouncedSearchValue.toLowerCase().trim();

        if (!search || !tasks) {
            return tasks || [];
        }

        return tasks.filter((task) => {
            const taskMatches = containsSearchValue(task.title, search) || containsSearchValue(task.result, search);

            const subtaskMatches =
                task.subtasks?.some(
                    (subtask) =>
                        containsSearchValue(subtask.title, search) ||
                        containsSearchValue(subtask.description, search) ||
                        containsSearchValue(subtask.result, search),
                ) || false;

            return taskMatches || subtaskMatches;
        });
    }, [tasks, debouncedSearchValue]);

    const sortedTasks = [...(filteredTasks || [])].sort((a, b) => +a.id - +b.id);
    const hasTasks = filteredTasks && filteredTasks.length > 0;

    // Focused view: opening a "Show commands" row takes over the whole panel so only
    // that item's terminal is scrollable (no reaching the rest of the list).
    if (openCommands) {
        return (
            <div className="flex h-full flex-col">
                <FocusedCommands
                    onClose={closeCommands}
                    onOpenTerminal={(subtaskId) => nav?.openStep(subtaskId)}
                    open={openCommands}
                />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="bg-background sticky top-0 z-10 pb-4">
                {/* Search Input */}
                <Form {...form}>
                    <div className="p-px">
                        <FormField
                            control={form.control}
                            name="search"
                            render={({ field }) => (
                                <FormControl>
                                    <InputGroup className="bg-well">
                                        <InputGroupAddon>
                                            <Search />
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            {...field}
                                            autoComplete="off"
                                            className="font-mono"
                                            placeholder="Search tasks and subtasks..."
                                            type="text"
                                        />
                                        {field.value && (
                                            <InputGroupAddon align="inline-end">
                                                <InputGroupButton
                                                    onClick={() => {
                                                        form.reset({ search: '' });
                                                        setDebouncedSearchValue('');
                                                        debouncedUpdateSearch.cancel();
                                                    }}
                                                    type="button"
                                                >
                                                    <X />
                                                </InputGroupButton>
                                            </InputGroupAddon>
                                        )}
                                    </InputGroup>
                                </FormControl>
                            )}
                        />
                    </div>
                </Form>
            </div>

            {hasTasks ? (
                <div className="relative flex-1 overflow-y-hidden">
                    <div
                        className="flex h-full flex-col gap-4 overflow-y-auto"
                        ref={containerRef}
                    >
                        {sortedTasks.map((task) => (
                            <FlowTask
                                commandsBySubtask={commandsBySubtask}
                                key={task.id}
                                onToggleCommands={toggleCommands}
                                searchValue={debouncedSearchValue}
                                task={task}
                            />
                        ))}
                        <div ref={endRef} />
                    </div>

                    {!isScrolledToBottom && (
                        <Button
                            className="absolute right-4 bottom-4 z-10 shadow-md hover:shadow-lg"
                            onClick={() => scrollToEnd()}
                            size="icon-sm"
                            type="button"
                            variant="outline"
                        >
                            <ChevronDown />
                            {hasNewMessages && (
                                <span className="bg-primary absolute -top-1 -right-1 size-3 rounded-full" />
                            )}
                        </Button>
                    )}
                </div>
            ) : (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ListTodo />
                        </EmptyMedia>
                        <EmptyTitle>No tasks found for this flow</EmptyTitle>
                        <EmptyDescription>Tasks will appear here once the agent starts working</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>
    );
};

export default FlowTasks;
