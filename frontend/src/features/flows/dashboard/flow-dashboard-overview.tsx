import { Activity, CircleDollarSign, Cpu, GitFork, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import type { UsageStatsFragmentFragment } from '@/graphql/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    useFlowStatsByFlowQuery,
    useToolcallsStatsByFlowQuery,
    useToolcallsStatsByFunctionForFlowQuery,
    useUsageStatsByAgentTypeForFlowQuery,
    useUsageStatsByFlowQuery,
} from '@/graphql/types';
import { formatCost, formatDuration, formatNumber, formatTokenCount } from '@/pages/dashboard/format-utils';

const StatCard = ({
    description,
    icon,
    loading,
    title,
    value,
}: {
    description: string;
    icon: React.ReactNode;
    loading: boolean;
    title: string;
    value: string;
}) => (
    <Card className="first:border-primary/40 first:bg-[linear-gradient(160deg,var(--brand-tint),var(--card)_55%)]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
                {title}
            </CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {loading ? (
                <Skeleton className="h-8 w-24" />
            ) : (
                <div className="font-mono text-3xl font-bold tracking-tight tabular-nums">{value}</div>
            )}
            <p className="text-muted-foreground mt-1.5 font-mono text-[11px]">{description}</p>
        </CardContent>
    </Card>
);

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

const UsageStatsRow = ({ label, stats }: { label: string; stats: UsageStatsFragmentFragment }) => (
    <TableRow>
        <TableCell className="font-medium">{label}</TableCell>
        <TableCell className="text-right font-mono tabular-nums">{formatTokenCount(stats.totalUsageIn)}</TableCell>
        <TableCell className="text-right font-mono tabular-nums">{formatTokenCount(stats.totalUsageOut)}</TableCell>
        <TableCell className="text-right font-mono tabular-nums">{formatTokenCount(stats.totalUsageCacheIn)}</TableCell>
        <TableCell className="text-right font-mono tabular-nums">
            {formatTokenCount(stats.totalUsageCacheOut)}
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums">{formatCost(stats.totalUsageCostIn)}</TableCell>
        <TableCell className="text-right font-mono tabular-nums">{formatCost(stats.totalUsageCostOut)}</TableCell>
        <TableCell className="text-primary text-right font-mono font-semibold tabular-nums">
            {formatCost(stats.totalUsageCostIn + stats.totalUsageCostOut)}
        </TableCell>
    </TableRow>
);

const LoadingTable = () => (
    <div className="flex items-center justify-center py-8">
        <Loader2 className="text-primary size-6 animate-spin" />
    </div>
);

export const FlowDashboardOverview = ({ flowId }: { flowId: string }) => {
    const { data: usageData, loading: usageLoading } = useUsageStatsByFlowQuery({
        variables: { flowId },
    });
    const { data: usageByAgentData, loading: usageByAgentLoading } = useUsageStatsByAgentTypeForFlowQuery({
        variables: { flowId },
    });
    const { data: toolcallsData, loading: toolcallsLoading } = useToolcallsStatsByFlowQuery({
        variables: { flowId },
    });
    const { data: toolcallsByFunctionData, loading: toolcallsByFunctionLoading } =
        useToolcallsStatsByFunctionForFlowQuery({
            variables: { flowId },
        });
    const { data: flowStatsData, loading: flowStatsLoading } = useFlowStatsByFlowQuery({
        variables: { flowId },
    });

    const usage = usageData?.usageStatsByFlow;
    const toolcalls = toolcallsData?.toolcallsStatsByFlow;
    const flowStats = flowStatsData?.flowStatsByFlow;

    const totalCost = usage ? usage.totalUsageCostIn + usage.totalUsageCostOut : 0;
    const totalTokens = usage ? usage.totalUsageIn + usage.totalUsageOut : 0;

    const agentTypeRows = useMemo(() => {
        const seen = new Set<string>();

        return (usageByAgentData?.usageStatsByAgentTypeForFlow ?? [])
            .filter((item) => {
                if (seen.has(item.agentType)) {
                    return false;
                }

                seen.add(item.agentType);

                return true;
            })
            .map((item) => ({
                label: item.agentType,
                stats: item.stats,
            }));
    }, [usageByAgentData]);

    const toolcallsByFunction = useMemo(() => {
        const seen = new Set<string>();

        return [...(toolcallsByFunctionData?.toolcallsStatsByFunctionForFlow ?? [])]
            .filter((item) => {
                if (seen.has(item.functionName)) {
                    return false;
                }

                seen.add(item.functionName);

                return true;
            })
            .sort((a, b) => b.totalCount - a.totalCount);
    }, [toolcallsByFunctionData]);

    const anyLoading = usageLoading || toolcallsLoading || flowStatsLoading;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard
                    description="LLM spending for this flow"
                    icon={<CircleDollarSign className="text-primary size-4" />}
                    loading={anyLoading}
                    title="Cost"
                    value={formatCost(totalCost)}
                />
                <StatCard
                    description="Input + Output tokens"
                    icon={<Cpu className="text-primary size-4" />}
                    loading={anyLoading}
                    title="Tokens"
                    value={formatTokenCount(totalTokens)}
                />
                <StatCard
                    description={`Duration: ${toolcalls ? formatDuration(toolcalls.totalDurationSeconds) : '—'}`}
                    icon={<Activity className="text-primary size-4" />}
                    loading={anyLoading}
                    title="Tool Calls"
                    value={toolcalls ? formatNumber(toolcalls.totalCount) : '0'}
                />
                <StatCard
                    description={`Subtasks: ${flowStats?.totalSubtasksCount ?? 0} · Assistants: ${flowStats?.totalAssistantsCount ?? 0}`}
                    icon={<GitFork className="text-primary size-4" />}
                    loading={anyLoading}
                    title="Tasks"
                    value={flowStats ? formatNumber(flowStats.totalTasksCount) : '0'}
                />
            </div>

            {!!agentTypeRows.length && (
                <Card>
                    <CardHead
                        description="LLM token usage and costs per agent type in this flow"
                        query="usageStatsByAgentTypeForFlow"
                        title="Usage by Agent Type"
                    />
                    <CardContent>
                        {usageByAgentLoading ? (
                            <LoadingTable />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Agent Type</TableHead>
                                        <TableHead className="text-right">Tokens In</TableHead>
                                        <TableHead className="text-right">Tokens Out</TableHead>
                                        <TableHead className="text-right">Cache In</TableHead>
                                        <TableHead className="text-right">Cache Out</TableHead>
                                        <TableHead className="text-right">Cost In</TableHead>
                                        <TableHead className="text-right">Cost Out</TableHead>
                                        <TableHead className="text-right">Total Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agentTypeRows.map((row) => (
                                        <UsageStatsRow
                                            key={row.label}
                                            label={row.label}
                                            stats={row.stats}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {!!toolcallsByFunction.length && (
                <Card>
                    <CardHead
                        description="Execution statistics per tool function in this flow"
                        query="toolcallsStatsByFunctionForFlow"
                        title="Tool Calls by Function"
                    />
                    <CardContent>
                        {toolcallsByFunctionLoading ? (
                            <LoadingTable />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Function</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                        <TableHead className="text-right">Total Duration</TableHead>
                                        <TableHead className="text-right">Avg Duration</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {toolcallsByFunction.map((item) => (
                                        <TableRow key={item.functionName}>
                                            <TableCell className="font-mono font-medium">{item.functionName}</TableCell>
                                            <TableCell>
                                                <span
                                                    className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase ${
                                                        item.isAgent
                                                            ? 'border-primary/30 bg-brand-tint text-primary'
                                                            : 'border-border-strong bg-well text-muted-foreground'
                                                    }`}
                                                >
                                                    {item.isAgent ? 'Agent' : 'Tool'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono tabular-nums">
                                                {formatNumber(item.totalCount)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono tabular-nums">
                                                {formatDuration(item.totalDurationSeconds)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono tabular-nums">
                                                {formatDuration(item.avgDurationSeconds)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
