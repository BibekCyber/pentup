import { Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    useFlowsStatsTotalQuery,
    useToolcallsStatsByFunctionQuery,
    useToolcallsStatsTotalQuery,
    useUsageStatsByModelQuery,
    useUsageStatsByProviderQuery,
    useUsageStatsTotalQuery,
} from '@/graphql/types';
import { cn } from '@/lib/utils';
import { formatCost, formatDuration, formatNumber, formatTokenCount } from '@/pages/dashboard/format-utils';

const SourceChip = ({ className, query }: { className?: string; query: string }) => (
    <span
        className={cn(
            'border-border-strong bg-well text-muted-foreground inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wide',
            className,
        )}
    >
        {query}
    </span>
);

/** `.card-head` strip: overline title on the left, source-query chip on the right. */
const TableCardHead = ({ query, title }: { query: string; title: string }) => (
    <div className="card-head">
        <span className="overline">{title}</span>
        <SourceChip
            className="ml-auto"
            query={query}
        />
    </div>
);

/** `.kpi` headline tile — overline label, big `.k-val`, small mono delta. */
const KpiTile = ({
    delta,
    hero,
    label,
    loading,
    value,
}: {
    delta: string;
    hero?: boolean;
    label: string;
    loading: boolean;
    value: string;
}) => (
    <div className={cn('kpi', hero && 'hero')}>
        <div className="k-label">
            <span className="overline">{label}</span>
        </div>
        {loading ? <Skeleton className="mt-2.5 h-8 w-24" /> : <div className="k-val">{value}</div>}
        <div className="text-muted-foreground mt-1.5 font-mono text-[11px]">{delta}</div>
    </div>
);

/** Sub-stat column inside the Usage-totals card. */
const SubStat = ({ label, sub, value }: { label: string; sub: string; value: string }) => (
    <div className="border-border border-l px-5">
        <div className="text-[10px] overline">{label}</div>
        <div className="text-foreground mt-1.5 font-mono text-[19px] font-semibold tabular-nums">{value}</div>
        <div className="text-muted-foreground mt-1 font-mono text-[10.5px]">{sub}</div>
    </div>
);

/** Footprint stat tile (compact `.kpi`). */
const StatTile = ({ label, sub, value }: { label: string; sub: string; value: string }) => (
    <div className="kpi p-[15px]">
        <span className="overline">{label}</span>
        <div className="k-val mt-[7px] text-[26px]">{value}</div>
        <div className="text-muted-foreground mt-[5px] font-mono text-[11px]">{sub}</div>
    </div>
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

    const toolcallsByFunction = [...(toolcallsByFunctionData?.toolcallsStatsByFunction ?? [])].sort(
        (a, b) => b.totalCount - a.totalCount,
    );

    // Presentation-only derives (no new query): cost share of the loaded provider
    // rows and the busiest function volume for the tool-call bars.
    const providerCostTotal =
        providerRows.reduce((sum, row) => sum + row.stats.totalUsageCostIn + row.stats.totalUsageCostOut, 0) || 1;
    const toolcallsMax = Math.max(1, ...toolcallsByFunction.map((item) => item.totalCount));

    const inTokens = usageTotal?.totalUsageIn ?? 0;
    const outTokens = usageTotal?.totalUsageOut ?? 0;
    const inPct = totalTokens ? (inTokens / totalTokens) * 100 : 0;
    const outPct = totalTokens ? (outTokens / totalTokens) * 100 : 0;

    return (
        <div className="flex flex-col gap-6">
            {/* ---- headline KPI strip (all real totals, no invented risk metric) ---- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiTile
                    delta={`${formatNumber(flowsTotal?.totalTasksCount ?? 0)} tasks · ${formatNumber(flowsTotal?.totalSubtasksCount ?? 0)} subtasks`}
                    hero
                    label="Flows"
                    loading={flowsTotalLoading}
                    value={flowsTotal ? formatNumber(flowsTotal.totalFlowsCount) : '0'}
                />
                <KpiTile
                    delta={`${formatNumber(totalTokens)} · in + out`}
                    label="Total tokens"
                    loading={usageTotalLoading}
                    value={formatTokenCount(totalTokens)}
                />
                <KpiTile
                    delta={`in ${formatCost(usageTotal?.totalUsageCostIn ?? 0)} · out ${formatCost(usageTotal?.totalUsageCostOut ?? 0)}`}
                    label="Agent spend"
                    loading={usageTotalLoading}
                    value={formatCost(totalCost)}
                />
                <KpiTile
                    delta={`total ${toolcallsTotal ? formatDuration(toolcallsTotal.totalDurationSeconds) : '—'}`}
                    label="Tool calls"
                    loading={toolcallsTotalLoading}
                    value={toolcallsTotal ? formatNumber(toolcallsTotal.totalCount) : '0'}
                />
            </div>

            {/* ---- usage totals (usageStatsTotal) ---- */}
            <Card className="p-4">
                <div className="flex items-center justify-between gap-2">
                    <span className="overline">Usage totals</span>
                    <SourceChip query="usageStatsTotal" />
                </div>
                {usageTotalLoading ? (
                    <LoadingTable />
                ) : (
                    <>
                        <div className="mt-4 flex flex-wrap items-stretch gap-y-4">
                            <div className="pr-6">
                                <div className="text-[10px] overline">Total tokens</div>
                                <div className="k-val mt-1.5 text-[38px]">{formatTokenCount(totalTokens)}</div>
                                <div className="text-muted-foreground mt-0.5 font-mono text-[10.5px]">
                                    {formatNumber(totalTokens)} · in + out
                                </div>
                            </div>
                            <SubStat
                                label="Tokens in"
                                sub={formatNumber(inTokens)}
                                value={formatTokenCount(inTokens)}
                            />
                            <SubStat
                                label="Tokens out"
                                sub={formatNumber(outTokens)}
                                value={formatTokenCount(outTokens)}
                            />
                            <SubStat
                                label="Cache read"
                                sub="cached input"
                                value={formatTokenCount(usageTotal?.totalUsageCacheIn ?? 0)}
                            />
                            <SubStat
                                label="Total cost"
                                sub={`in ${formatCost(usageTotal?.totalUsageCostIn ?? 0)} · out ${formatCost(usageTotal?.totalUsageCostOut ?? 0)}`}
                                value={formatCost(totalCost)}
                            />
                        </div>
                        <div className="mt-5">
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-muted-foreground font-mono text-[10.5px]">
                                    Token composition · in vs out
                                </span>
                                <span className="text-muted-foreground font-mono text-[10.5px]">
                                    {Math.round(inPct)}% in · {Math.round(outPct)}% out
                                </span>
                            </div>
                            <div className="bg-well flex h-2 overflow-hidden rounded-full">
                                <div
                                    style={{ backgroundColor: 'var(--color-chart-2)', width: `${inPct}%` }}
                                    title="tokens in"
                                />
                                <div
                                    style={{ backgroundColor: 'var(--color-chart-4)', width: `${outPct}%` }}
                                    title="tokens out"
                                />
                            </div>
                        </div>
                    </>
                )}
            </Card>

            {/* ---- flow footprint (flowsStatsTotal) ---- */}
            <div>
                <div className="mb-2.5 flex items-center justify-between">
                    <span className="overline">Flow footprint</span>
                    <SourceChip query="flowsStatsTotal" />
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatTile
                        label="Flows"
                        sub="engagements total"
                        value={formatNumber(flowsTotal?.totalFlowsCount ?? 0)}
                    />
                    <StatTile
                        label="Tasks"
                        sub="across all flows"
                        value={formatNumber(flowsTotal?.totalTasksCount ?? 0)}
                    />
                    <StatTile
                        label="Subtasks"
                        sub="executed steps"
                        value={formatNumber(flowsTotal?.totalSubtasksCount ?? 0)}
                    />
                    <StatTile
                        label="Assistants"
                        sub="guided sessions"
                        value={formatNumber(flowsTotal?.totalAssistantsCount ?? 0)}
                    />
                </div>
            </div>

            {/* ---- provider / model / tool-call tables (12-col grid) ---- */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <Card className="overflow-hidden lg:col-span-7">
                    <TableCardHead
                        query="usageStatsByProvider"
                        title="Usage by provider"
                    />
                    {usageByProviderLoading ? (
                        <LoadingTable />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="tbl">
                                <thead>
                                    <tr>
                                        <th>Provider</th>
                                        <th className="text-right">Tokens</th>
                                        <th>Cost share</th>
                                        <th className="text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {providerRows.map((row, index) => {
                                        const tokens = row.stats.totalUsageIn + row.stats.totalUsageOut;
                                        const cost = row.stats.totalUsageCostIn + row.stats.totalUsageCostOut;
                                        const pct = Math.round((cost / providerCostTotal) * 100);
                                        const ramp = `var(--color-chart-${Math.min(index + 1, 5)})`;

                                        return (
                                            <tr key={row.label}>
                                                <td className="m">
                                                    <span className="flex items-center gap-2">
                                                        <span
                                                            className="size-2 shrink-0 rounded-[2px]"
                                                            style={{ backgroundColor: ramp }}
                                                        />
                                                        {row.label}
                                                    </span>
                                                </td>
                                                <td className="num text-muted-foreground">
                                                    {formatTokenCount(tokens)}
                                                </td>
                                                <td className="min-w-[120px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-well h-1.5 flex-1 overflow-hidden rounded-full">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{ backgroundColor: ramp, width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-muted-foreground w-8 text-right font-mono text-[11px]">
                                                            {pct}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="num">{formatCost(cost)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <Card className="overflow-hidden lg:col-span-5">
                    <TableCardHead
                        query="usageStatsByModel"
                        title="Usage by model"
                    />
                    {usageByModelLoading ? (
                        <LoadingTable />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="tbl">
                                <thead>
                                    <tr>
                                        <th>Model</th>
                                        <th className="text-right">Tokens</th>
                                        <th className="text-right">Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modelRows.map((row, index) => {
                                        const tokens = row.stats.totalUsageIn + row.stats.totalUsageOut;
                                        const cost = row.stats.totalUsageCostIn + row.stats.totalUsageCostOut;
                                        const ramp = `var(--color-chart-${Math.min(index + 1, 5)})`;

                                        return (
                                            <tr key={row.label}>
                                                <td className="m">
                                                    <span className="flex items-center gap-2">
                                                        <span
                                                            className="size-2 shrink-0 rounded-[2px]"
                                                            style={{ backgroundColor: ramp }}
                                                        />
                                                        {row.label}
                                                    </span>
                                                </td>
                                                <td className="num text-muted-foreground">
                                                    {formatTokenCount(tokens)}
                                                </td>
                                                <td className="num">{formatCost(cost)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <Card className="overflow-hidden lg:col-span-12">
                    <TableCardHead
                        query="toolcallsStatsByFunction"
                        title="Tool calls by function"
                    />
                    {toolcallsByFunctionLoading ? (
                        <LoadingTable />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="tbl">
                                <thead>
                                    <tr>
                                        <th>Function</th>
                                        <th>Kind</th>
                                        <th>Volume</th>
                                        <th className="text-right">Count</th>
                                        <th className="text-right">Avg</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {toolcallsByFunction.map((item) => (
                                        <tr key={item.functionName}>
                                            <td className="m">{item.functionName}</td>
                                            <td>
                                                <span
                                                    className={cn(
                                                        'chip h-[19px] text-[10px]',
                                                        item.isAgent && 'chip-on',
                                                    )}
                                                >
                                                    {item.isAgent ? 'agent' : 'tool'}
                                                </span>
                                            </td>
                                            <td className="min-w-[140px]">
                                                <div className="bg-well h-1.5 overflow-hidden rounded-full">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            background:
                                                                'linear-gradient(90deg,var(--primary),var(--primary-hover))',
                                                            width: `${(item.totalCount / toolcallsMax) * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="num">{formatNumber(item.totalCount)}</td>
                                            <td className="num text-muted-foreground">
                                                {formatDuration(item.avgDurationSeconds)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
