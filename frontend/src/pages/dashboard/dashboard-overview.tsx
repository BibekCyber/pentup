import { Activity, CircleDollarSign, Cpu, GitFork, Loader2 } from 'lucide-react';

import type { UsageStatsFragmentFragment } from '@/graphql/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    useFlowsStatsTotalQuery,
    useToolcallsStatsByFunctionQuery,
    useToolcallsStatsTotalQuery,
    useUsageStatsByAgentTypeQuery,
    useUsageStatsByModelQuery,
    useUsageStatsByProviderQuery,
    useUsageStatsTotalQuery,
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

const UsageStatsTable = ({ rows }: { rows: Array<{ label: string; stats: UsageStatsFragmentFragment }> }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="whitespace-nowrap">Name</TableHead>
                <TableHead className="text-right whitespace-nowrap">Tokens In</TableHead>
                <TableHead className="text-right whitespace-nowrap">Tokens Out</TableHead>
                <TableHead className="text-right whitespace-nowrap">Cache In</TableHead>
                <TableHead className="text-right whitespace-nowrap">Cache Out</TableHead>
                <TableHead className="text-right whitespace-nowrap">Cost In</TableHead>
                <TableHead className="text-right whitespace-nowrap">Cost Out</TableHead>
                <TableHead className="text-right whitespace-nowrap">Total Cost</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {rows.map((row) => (
                <UsageStatsRow
                    key={row.label}
                    label={row.label}
                    stats={row.stats}
                />
            ))}
        </TableBody>
    </Table>
);

const LoadingTable = () => (
    <div className="flex items-center justify-center py-8">
        <Loader2 className="text-primary size-6 animate-spin" />
    </div>
);

export const DashboardOverview = () => {
    const { data: usageTotalData, loading: usageTotalLoading } = useUsageStatsTotalQuery();
    const { data: usageByProviderData, loading: usageByProviderLoading } = useUsageStatsByProviderQuery();
    const { data: usageByModelData, loading: usageByModelLoading } = useUsageStatsByModelQuery();
    const { data: usageByAgentTypeData, loading: usageByAgentTypeLoading } = useUsageStatsByAgentTypeQuery();
    const { data: toolcallsTotalData, loading: toolcallsTotalLoading } = useToolcallsStatsTotalQuery();
    const { data: toolcallsByFunctionData, loading: toolcallsByFunctionLoading } = useToolcallsStatsByFunctionQuery();
    const { data: flowsTotalData, loading: flowsTotalLoading } = useFlowsStatsTotalQuery();

    const usageTotal = usageTotalData?.usageStatsTotal;
    const toolcallsTotal = toolcallsTotalData?.toolcallsStatsTotal;
    const flowsTotal = flowsTotalData?.flowsStatsTotal;

    const totalCost = usageTotal ? usageTotal.totalUsageCostIn + usageTotal.totalUsageCostOut : 0;
    const totalTokens = usageTotal ? usageTotal.totalUsageIn + usageTotal.totalUsageOut : 0;

    const providerRows = (usageByProviderData?.usageStatsByProvider ?? []).map((item) => ({
        label: item.provider,
        stats: item.stats,
    }));
    const modelRows = (usageByModelData?.usageStatsByModel ?? []).map((item) => ({
        label: `${item.model} (${item.provider})`,
        stats: item.stats,
    }));
    const agentTypeRows = (usageByAgentTypeData?.usageStatsByAgentType ?? []).map((item) => ({
        label: item.agentType,
        stats: item.stats,
    }));

    const toolcallsByFunction = [...(toolcallsByFunctionData?.toolcallsStatsByFunction ?? [])].sort(
        (a, b) => b.totalCount - a.totalCount,
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    description="Total LLM spending across all providers"
                    icon={<CircleDollarSign className="text-primary size-4" />}
                    loading={usageTotalLoading}
                    title="Total Cost"
                    value={formatCost(totalCost)}
                />
                <StatCard
                    description="Input + Output tokens processed"
                    icon={<Cpu className="text-primary size-4" />}
                    loading={usageTotalLoading}
                    title="Total Tokens"
                    value={formatTokenCount(totalTokens)}
                />
                <StatCard
                    description={`Total duration: ${toolcallsTotal ? formatDuration(toolcallsTotal.totalDurationSeconds) : '—'}`}
                    icon={<Activity className="text-primary size-4" />}
                    loading={toolcallsTotalLoading}
                    title="Tool Calls"
                    value={toolcallsTotal ? formatNumber(toolcallsTotal.totalCount) : '0'}
                />
                <StatCard
                    description={`Tasks: ${flowsTotal?.totalTasksCount ?? 0} · Subtasks: ${flowsTotal?.totalSubtasksCount ?? 0} · Assistants: ${flowsTotal?.totalAssistantsCount ?? 0}`}
                    icon={<GitFork className="text-primary size-4" />}
                    loading={flowsTotalLoading}
                    title="Total Flows"
                    value={flowsTotal ? formatNumber(flowsTotal.totalFlowsCount) : '0'}
                />
            </div>

            <Card>
                <CardHead
                    description="LLM token usage and costs grouped by provider"
                    query="usageStatsByProvider"
                    title="Usage by Provider"
                />
                <CardContent>
                    {usageByProviderLoading ? <LoadingTable /> : <UsageStatsTable rows={providerRows} />}
                </CardContent>
            </Card>

            <Card>
                <CardHead
                    description="LLM token usage and costs grouped by model"
                    query="usageStatsByModel"
                    title="Usage by Model"
                />
                <CardContent>
                    {usageByModelLoading ? <LoadingTable /> : <UsageStatsTable rows={modelRows} />}
                </CardContent>
            </Card>

            <Card>
                <CardHead
                    description="LLM token usage and costs grouped by agent type"
                    query="usageStatsByAgentType"
                    title="Usage by Agent Type"
                />
                <CardContent>
                    {usageByAgentTypeLoading ? <LoadingTable /> : <UsageStatsTable rows={agentTypeRows} />}
                </CardContent>
            </Card>

            <Card>
                <CardHead
                    description="Execution statistics for each tool function"
                    query="toolcallsStatsByFunction"
                    title="Tool Calls by Function"
                />
                <CardContent>
                    {toolcallsByFunctionLoading ? (
                        <LoadingTable />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="whitespace-nowrap">Function</TableHead>
                                    <TableHead className="whitespace-nowrap">Type</TableHead>
                                    <TableHead className="text-right whitespace-nowrap">Count</TableHead>
                                    <TableHead className="text-right whitespace-nowrap">Total Duration</TableHead>
                                    <TableHead className="text-right whitespace-nowrap">Avg Duration</TableHead>
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
        </div>
    );
};
