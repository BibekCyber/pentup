import { format } from 'date-fns';
import { ChevronRight, Clock, Loader2, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { UsageStatsPeriod } from '@/graphql/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    useFlowsExecutionStatsByPeriodQuery,
    useFlowsStatsByPeriodQuery,
    useToolcallsStatsByPeriodQuery,
    useUsageStatsByAgentTypeQuery,
    useUsageStatsByPeriodQuery,
} from '@/graphql/types';
import { formatCost, formatDuration, formatNumber, formatTokenCount } from '@/pages/dashboard/format-utils';

// The 15 real AgentType enum values, each with a distinct colour + monogram —
// mirrors the prototype's owned-orange agent identity system.
const AGENT_META: Record<string, { color: string; mono: string }> = {
    adviser: { color: '#2FBF71', mono: 'AD' },
    assistant: { color: '#818CF8', mono: 'AS' },
    coder: { color: '#A78BFA', mono: 'CD' },
    enricher: { color: '#34D399', mono: 'EN' },
    generator: { color: '#FBBF24', mono: 'GN' },
    installer: { color: '#94A3B8', mono: 'IN' },
    memorist: { color: '#C084FC', mono: 'MM' },
    pentester: { color: '#FB3B4E', mono: 'PT' },
    primary_agent: { color: '#F5A524', mono: 'PA' },
    refiner: { color: '#60A5FA', mono: 'RN' },
    reflector: { color: '#F472B6', mono: 'RF' },
    reporter: { color: '#FF6B2C', mono: 'RP' },
    searcher: { color: '#38BDF8', mono: 'SR' },
    summarizer: { color: '#22D3EE', mono: 'SM' },
    tool_call_fixer: { color: '#F87171', mono: 'TF' },
};

const agentMeta = (type: string) =>
    AGENT_META[type] ?? { color: '#8B93A0', mono: (type || '?').slice(0, 2).toUpperCase() };

const agentLabel = (type: string) =>
    (type || '')
        .split('_')
        .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
        .join(' ');

const CHART_COLORS = {
    area1: 'var(--color-chart-1)',
    area2: 'var(--color-chart-2)',
    area3: 'var(--color-chart-3)',
    bar1: 'var(--color-chart-4)',
    bar2: 'var(--color-chart-5)',
};

const overlineClass = 'text-foreground font-mono text-[11px] font-semibold tracking-[0.14em] uppercase';

const SourceChip = ({ query }: { query: string }) => (
    <span className="border-border-strong bg-well text-muted-foreground inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wide">
        {query}
    </span>
);

const CardHead = ({ description, query, title }: { description: string; query: string; title: string }) => (
    <CardHeader>
        <div className="flex items-center justify-between gap-2">
            <CardTitle className={overlineClass}>{title}</CardTitle>
            <SourceChip query={query} />
        </div>
        <CardDescription>{description}</CardDescription>
    </CardHeader>
);

const formatDateLabel = (dateString: string): string => {
    try {
        return format(new Date(dateString), 'MMM d');
    } catch {
        return dateString;
    }
};

const ChartLoading = () => (
    <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="text-primary size-6 animate-spin" />
    </div>
);

const CustomTooltip = ({
    active,
    formatter,
    label,
    payload,
}: {
    active?: boolean;
    formatter?: (value: number, name: string) => string;
    label?: string;
    payload?: Array<{ color: string; name: string; value: number }>;
}) => {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 shadow-md">
            <p className="text-muted-foreground mb-1 text-xs">{label ? formatDateLabel(label) : ''}</p>
            {payload.map((entry) => (
                <div
                    className="flex items-center gap-2 text-sm"
                    key={entry.name}
                >
                    <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">{entry.name}:</span>
                    <span className="font-medium">
                        {formatter ? formatter(entry.value, entry.name) : formatNumber(entry.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

export const DashboardAnalytics = ({ period }: { period: UsageStatsPeriod }) => {
    const { data: usageByPeriodData, loading: usageByPeriodLoading } = useUsageStatsByPeriodQuery({
        variables: { period },
    });
    const { data: toolcallsByPeriodData, loading: toolcallsByPeriodLoading } = useToolcallsStatsByPeriodQuery({
        variables: { period },
    });
    const { data: flowsByPeriodData, loading: flowsByPeriodLoading } = useFlowsStatsByPeriodQuery({
        variables: { period },
    });
    const { data: executionStatsData, loading: executionStatsLoading } = useFlowsExecutionStatsByPeriodQuery({
        variables: { period },
    });
    const { data: usageByAgentTypeData, loading: usageByAgentTypeLoading } = useUsageStatsByAgentTypeQuery();

    const usageChartData = [...(usageByPeriodData?.usageStatsByPeriod ?? [])].reverse().map((item) => ({
        cacheIn: item.stats.totalUsageCacheIn,
        costIn: item.stats.totalUsageCostIn,
        costOut: item.stats.totalUsageCostOut,
        date: formatDateLabel(item.date),
        tokensIn: item.stats.totalUsageIn,
        tokensOut: item.stats.totalUsageOut,
        totalCost: item.stats.totalUsageCostIn + item.stats.totalUsageCostOut,
    }));

    const toolcallsChartData = [...(toolcallsByPeriodData?.toolcallsStatsByPeriod ?? [])].reverse().map((item) => ({
        count: item.stats.totalCount,
        date: formatDateLabel(item.date),
        duration: item.stats.totalDurationSeconds,
    }));

    const flowsChartData = [...(flowsByPeriodData?.flowsStatsByPeriod ?? [])].reverse().map((item) => ({
        assistants: item.stats.totalAssistantsCount,
        date: formatDateLabel(item.date),
        flows: item.stats.totalFlowsCount,
        subtasks: item.stats.totalSubtasksCount,
        tasks: item.stats.totalTasksCount,
    }));

    const executionStats = executionStatsData?.flowsExecutionStatsByPeriod ?? [];

    const agentTypeRows = (usageByAgentTypeData?.usageStatsByAgentType ?? []).map((item) => ({
        label: item.agentType,
        stats: item.stats,
    }));

    // Client-side share-of-tokens over the loaded agent-type rows (no new query).
    const agentTokensTotal =
        agentTypeRows.reduce((sum, row) => sum + row.stats.totalUsageIn + row.stats.totalUsageOut, 0) || 1;
    const agentEffort = agentTypeRows
        .map((row) => ({
            label: row.label,
            pct: Math.round(((row.stats.totalUsageIn + row.stats.totalUsageOut) / agentTokensTotal) * 100),
        }))
        .slice(0, 15);

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHead
                        description="Input and output tokens processed daily"
                        query="usageStatsByPeriod"
                        title="Token Usage Over Time"
                    />
                    <CardContent>
                        {usageByPeriodLoading ? (
                            <ChartLoading />
                        ) : (
                            <ResponsiveContainer
                                height={300}
                                width="100%"
                            >
                                <AreaChart data={usageChartData}>
                                    <CartesianGrid
                                        className="stroke-border"
                                        strokeDasharray="3 3"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                                        tickMargin={8}
                                    />
                                    <YAxis
                                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                                        tickFormatter={formatTokenCount}
                                        tickMargin={8}
                                    />
                                    <Tooltip
                                        content={<CustomTooltip formatter={(value) => formatTokenCount(value)} />}
                                    />
                                    <Area
                                        dataKey="tokensIn"
                                        fill={CHART_COLORS.area1}
                                        fillOpacity={0.3}
                                        name="Tokens In"
                                        stroke={CHART_COLORS.area1}
                                        type="monotone"
                                    />
                                    <Area
                                        dataKey="tokensOut"
                                        fill={CHART_COLORS.area2}
                                        fillOpacity={0.3}
                                        name="Tokens Out"
                                        stroke={CHART_COLORS.area2}
                                        type="monotone"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHead
                        description="LLM spending per day"
                        query="usageStatsByPeriod"
                        title="Cost Over Time"
                    />
                    <CardContent>
                        {usageByPeriodLoading ? (
                            <ChartLoading />
                        ) : (
                            <ResponsiveContainer
                                height={300}
                                width="100%"
                            >
                                <AreaChart data={usageChartData}>
                                    <CartesianGrid
                                        className="stroke-border"
                                        strokeDasharray="3 3"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                                        tickMargin={8}
                                    />
                                    <YAxis
                                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                                        tickFormatter={(value) => formatCost(value)}
                                        tickMargin={8}
                                    />
                                    <Tooltip content={<CustomTooltip formatter={(value) => formatCost(value)} />} />
                                    <Area
                                        dataKey="costIn"
                                        fill={CHART_COLORS.area1}
                                        fillOpacity={0.3}
                                        name="Cost In"
                                        stroke={CHART_COLORS.area1}
                                        type="monotone"
                                    />
                                    <Area
                                        dataKey="costOut"
                                        fill={CHART_COLORS.area3}
                                        fillOpacity={0.3}
                                        name="Cost Out"
                                        stroke={CHART_COLORS.area3}
                                        type="monotone"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHead
                        description="Number of tool executions per day"
                        query="toolcallsStatsByPeriod"
                        title="Tool Calls Over Time"
                    />
                    <CardContent>
                        {toolcallsByPeriodLoading ? (
                            <ChartLoading />
                        ) : (
                            <ResponsiveContainer
                                height={300}
                                width="100%"
                            >
                                <BarChart data={toolcallsChartData}>
                                    <CartesianGrid
                                        className="stroke-border"
                                        strokeDasharray="3 3"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                                        tickMargin={8}
                                    />
                                    <YAxis
                                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                                        tickMargin={8}
                                    />
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ fill: 'var(--color-muted-foreground)', fillOpacity: 0.1 }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill={CHART_COLORS.bar1}
                                        name="Tool Calls"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHead
                        description="Flows, tasks, and subtasks created per day"
                        query="flowsStatsByPeriod"
                        title="Flows Activity Over Time"
                    />
                    <CardContent>
                        {flowsByPeriodLoading ? (
                            <ChartLoading />
                        ) : (
                            <ResponsiveContainer
                                height={300}
                                width="100%"
                            >
                                <BarChart data={flowsChartData}>
                                    <CartesianGrid
                                        className="stroke-border"
                                        strokeDasharray="3 3"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                                        tickMargin={8}
                                    />
                                    <YAxis
                                        tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                                        tickMargin={8}
                                    />
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ fill: 'var(--color-muted-foreground)', fillOpacity: 0.1 }}
                                    />
                                    <Bar
                                        dataKey="flows"
                                        fill={CHART_COLORS.area1}
                                        name="Flows"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="tasks"
                                        fill={CHART_COLORS.area2}
                                        name="Tasks"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="subtasks"
                                        fill={CHART_COLORS.area3}
                                        name="Subtasks"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className={overlineClass}>Agent effort · share of tokens</CardTitle>
                        <span className="text-muted-foreground font-mono text-[11px]">
                            {agentEffort.length} agent types with usage
                        </span>
                    </div>
                    <CardDescription>usageStatsByAgentType · up to 15 agent types</CardDescription>
                </CardHeader>
                <CardContent>
                    {usageByAgentTypeLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="text-primary size-6 animate-spin" />
                        </div>
                    ) : !agentEffort.length ? (
                        <p className="text-muted-foreground py-8 text-center text-sm">No agent usage in this range</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                            {agentEffort.map((agent) => {
                                const meta = agentMeta(agent.label);

                                return (
                                    <div
                                        className="mb-[15px]"
                                        key={agent.label}
                                    >
                                        <div className="mb-2 flex items-center gap-2">
                                            <span
                                                className="agent"
                                                style={{ backgroundColor: meta.color }}
                                                title={agentLabel(agent.label)}
                                            >
                                                {meta.mono}
                                            </span>
                                            <span className="text-[12.5px] font-semibold">
                                                {agentLabel(agent.label)}
                                            </span>
                                            <span className="text-foreground ml-auto font-mono text-[12.5px] tabular-nums">
                                                {agent.pct}%
                                            </span>
                                        </div>
                                        <div className="bg-well h-2 overflow-hidden rounded-full">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    background:
                                                        'linear-gradient(90deg,var(--primary),var(--primary-hover))',
                                                    width: `${agent.pct}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHead
                    description="Execution time and tool calls breakdown per flow"
                    query="flowsExecutionStatsByPeriod"
                    title="Flow Execution Details"
                />
                <CardContent>
                    {executionStatsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="text-primary size-6 animate-spin" />
                        </div>
                    ) : !executionStats.length ? (
                        <p className="text-muted-foreground py-8 text-center text-sm">
                            No flow executions in this period
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {executionStats.map((flow) => (
                                <FlowExecutionItem
                                    flow={flow}
                                    key={flow.flowId}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

type FlowExecution = {
    flowId: string;
    flowTitle: string;
    tasks: Array<{
        subtasks: Array<{
            subtaskId: string;
            subtaskTitle: string;
            totalDurationSeconds: number;
            totalToolcallsCount: number;
        }>;
        taskId: string;
        taskTitle: string;
        totalDurationSeconds: number;
        totalToolcallsCount: number;
    }>;
    totalAssistantsCount: number;
    totalDurationSeconds: number;
    totalToolcallsCount: number;
};

const FlowExecutionItem = ({ flow }: { flow: FlowExecution }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible
            onOpenChange={setIsOpen}
            open={isOpen}
        >
            <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors">
                <ChevronRight className={`size-4 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                <div className="min-w-0 flex-1 truncate font-medium">{flow.flowTitle || `Flow #${flow.flowId}`}</div>
                <div className="text-muted-foreground flex items-center gap-4 font-mono text-sm tabular-nums">
                    <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDuration(flow.totalDurationSeconds)}
                    </span>
                    <span className="flex items-center gap-1">
                        <Wrench className="size-3" />
                        {flow.totalToolcallsCount}
                    </span>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="ml-7 space-y-1 border-l pl-3">
                    {flow.tasks.map((task) => (
                        <TaskExecutionItem
                            key={task.taskId}
                            task={task}
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};

const TaskExecutionItem = ({ task }: { task: FlowExecution['tasks'][number] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasSubtasks = task.subtasks.length > 0;

    return (
        <Collapsible
            onOpenChange={setIsOpen}
            open={isOpen}
        >
            <CollapsibleTrigger
                className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm transition-colors"
                disabled={!hasSubtasks}
            >
                {hasSubtasks ? (
                    <ChevronRight className={`size-3 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                ) : (
                    <span className="size-3 shrink-0" />
                )}
                <div className="text-muted-foreground min-w-0 flex-1 truncate">
                    {task.taskTitle || `Task #${task.taskId}`}
                </div>
                <div className="text-muted-foreground flex items-center gap-4 font-mono text-xs tabular-nums">
                    <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDuration(task.totalDurationSeconds)}
                    </span>
                    <span className="flex items-center gap-1">
                        <Wrench className="size-3" />
                        {task.totalToolcallsCount}
                    </span>
                </div>
            </CollapsibleTrigger>
            {hasSubtasks && (
                <CollapsibleContent>
                    <div className="ml-6 space-y-0.5 border-l pl-3">
                        {task.subtasks.map((subtask) => (
                            <div
                                className="text-muted-foreground flex items-center gap-3 px-3 py-1 text-xs"
                                key={subtask.subtaskId}
                            >
                                <div className="min-w-0 flex-1 truncate">
                                    {subtask.subtaskTitle || `Subtask #${subtask.subtaskId}`}
                                </div>
                                <div className="flex items-center gap-4 font-mono tabular-nums">
                                    <span className="flex items-center gap-1">
                                        <Clock className="size-3" />
                                        {formatDuration(subtask.totalDurationSeconds)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Wrench className="size-3" />
                                        {subtask.totalToolcallsCount}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CollapsibleContent>
            )}
        </Collapsible>
    );
};
