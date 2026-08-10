import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    useFlowStatsByFlowQuery,
    useToolcallsStatsByFlowQuery,
    useToolcallsStatsByFunctionForFlowQuery,
    useUsageStatsByAgentTypeForFlowQuery,
    useUsageStatsByFlowQuery,
} from '@/graphql/types';
import { cn } from '@/lib/utils';
import { formatCost, formatDuration, formatNumber, formatTokenCount } from '@/pages/dashboard/format-utils';

// The 15 real AgentType enum values, each with a distinct colour + monogram.
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

const TableCardHead = ({ query, title }: { query: string; title: string }) => (
    <div className="card-head">
        <span className="overline">{title}</span>
        <SourceChip
            className="ml-auto"
            query={query}
        />
    </div>
);

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

    // Presentation-only derives (no new query).
    const agentTokensTotal =
        agentTypeRows.reduce((sum, row) => sum + row.stats.totalUsageIn + row.stats.totalUsageOut, 0) || 1;
    const agentEffort = agentTypeRows
        .map((row) => ({
            color: agentMeta(row.label).color,
            label: row.label,
            mono: agentMeta(row.label).mono,
            pct: Math.round(((row.stats.totalUsageIn + row.stats.totalUsageOut) / agentTokensTotal) * 100),
        }))
        .slice(0, 15);
    const toolcallsMax = Math.max(1, ...toolcallsByFunction.map((item) => item.totalCount));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <KpiTile
                    delta="LLM spending for this flow"
                    hero
                    label="Cost"
                    loading={anyLoading}
                    value={formatCost(totalCost)}
                />
                <KpiTile
                    delta="input + output tokens"
                    label="Tokens"
                    loading={anyLoading}
                    value={formatTokenCount(totalTokens)}
                />
                <KpiTile
                    delta={`total ${toolcalls ? formatDuration(toolcalls.totalDurationSeconds) : '—'}`}
                    label="Tool calls"
                    loading={anyLoading}
                    value={toolcalls ? formatNumber(toolcalls.totalCount) : '0'}
                />
                <KpiTile
                    delta={`${flowStats?.totalSubtasksCount ?? 0} subtasks · ${flowStats?.totalAssistantsCount ?? 0} assistants`}
                    label="Tasks"
                    loading={anyLoading}
                    value={flowStats ? formatNumber(flowStats.totalTasksCount) : '0'}
                />
            </div>

            {!!agentTypeRows.length && (
                <Card className="p-4">
                    <div className="flex items-center justify-between gap-2">
                        <span className="overline">Agent effort · share of tokens</span>
                        <SourceChip query="usageStatsByAgentTypeForFlow" />
                    </div>
                    {usageByAgentLoading ? (
                        <LoadingTable />
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-x-8 md:grid-cols-2">
                            {agentEffort.map((agent) => (
                                <div
                                    className="mb-[15px]"
                                    key={agent.label}
                                >
                                    <div className="mb-2 flex items-center gap-2">
                                        <span
                                            className="agent"
                                            style={{ backgroundColor: agent.color }}
                                            title={agentLabel(agent.label)}
                                        >
                                            {agent.mono}
                                        </span>
                                        <span className="text-[12.5px] font-semibold">{agentLabel(agent.label)}</span>
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
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {!!toolcallsByFunction.length && (
                <Card className="overflow-hidden">
                    <TableCardHead
                        query="toolcallsStatsByFunctionForFlow"
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
            )}
        </div>
    );
};
