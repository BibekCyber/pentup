import { Activity, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';

import CommandBar from '@/components/layouts/command-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    UsageStatsPeriod,
    useFlowsStatsByPeriodQuery,
    useToolcallsStatsByPeriodQuery,
    useUsageStatsByPeriodQuery,
} from '@/graphql/types';
import { cn } from '@/lib/utils';
import { DashboardAnalytics } from '@/pages/dashboard/dashboard-analytics';
import { DashboardOverview } from '@/pages/dashboard/dashboard-overview';
import { formatCost, formatDuration, formatNumber, formatTokenCount } from '@/pages/dashboard/format-utils';

const periodOptions: { label: string; value: UsageStatsPeriod }[] = [
    { label: 'Week', value: UsageStatsPeriod.Week },
    { label: 'Month', value: UsageStatsPeriod.Month },
    { label: 'Quarter', value: UsageStatsPeriod.Quarter },
];

/** `.kpi` headline tile — overline label, big `.k-val`, small mono delta, optional `.spark`. */
const KpiTile = ({
    delta,
    hero,
    label,
    loading,
    spark,
    value,
}: {
    delta: string;
    hero?: boolean;
    label: string;
    loading: boolean;
    spark?: number[];
    value: string;
}) => {
    const sparkMax = spark && spark.length ? Math.max(...spark) : 0;

    return (
        <div className={cn('kpi', hero && 'hero')}>
            <div className="k-label">
                <span className="overline">{label}</span>
            </div>
            {loading ? <Skeleton className="mt-2.5 h-8 w-24" /> : <div className="k-val">{value}</div>}
            <div className="text-muted-foreground mt-1.5 font-mono text-[11px]">{delta}</div>
            {spark && spark.length > 0 && (
                <div className="spark">
                    {spark.map((v, index) => (
                        <i
                            key={index}
                            style={{ height: `${sparkMax ? (v / sparkMax) * 100 : 0}%` }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('analytics');
    const [period, setPeriod] = useState<UsageStatsPeriod>(UsageStatsPeriod.Week);

    const { data: usageByPeriodData, loading: usageByPeriodLoading } = useUsageStatsByPeriodQuery({
        variables: { period },
    });
    const { data: toolcallsByPeriodData, loading: toolcallsByPeriodLoading } = useToolcallsStatsByPeriodQuery({
        variables: { period },
    });
    const { data: flowsByPeriodData, loading: flowsByPeriodLoading } = useFlowsStatsByPeriodQuery({
        variables: { period },
    });

    const usageSeries = usageByPeriodData?.usageStatsByPeriod ?? [];
    const toolcallsSeries = toolcallsByPeriodData?.toolcallsStatsByPeriod ?? [];
    const flowsSeries = flowsByPeriodData?.flowsStatsByPeriod ?? [];

    // Period totals derived by summing the per-day series so the KPI strip tracks the selected period.
    const periodTokens = usageSeries.reduce((sum, item) => sum + item.stats.totalUsageIn + item.stats.totalUsageOut, 0);
    const periodCostIn = usageSeries.reduce((sum, item) => sum + item.stats.totalUsageCostIn, 0);
    const periodCostOut = usageSeries.reduce((sum, item) => sum + item.stats.totalUsageCostOut, 0);
    const periodCost = periodCostIn + periodCostOut;
    const periodToolcalls = toolcallsSeries.reduce((sum, item) => sum + item.stats.totalCount, 0);
    const periodToolcallsDuration = toolcallsSeries.reduce((sum, item) => sum + item.stats.totalDurationSeconds, 0);
    const periodFlows = flowsSeries.reduce((sum, item) => sum + item.stats.totalFlowsCount, 0);
    const periodTasks = flowsSeries.reduce((sum, item) => sum + item.stats.totalTasksCount, 0);
    const periodSubtasks = flowsSeries.reduce((sum, item) => sum + item.stats.totalSubtasksCount, 0);

    // Real daily cost trend (oldest → newest) powering the Tool-calls sparkline.
    const costTrend = [...usageSeries]
        .reverse()
        .map((item) => item.stats.totalUsageCostIn + item.stats.totalUsageCostOut);

    const periodLabel = periodOptions.find((option) => option.value === period)?.label ?? '';

    return (
        <>
            <CommandBar title="Dashboard" />

            <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-6 pt-8">
                {/* muted context subtitle near the header — reflects the selected period */}
                <div className="-mb-2 flex items-center gap-2 overline">
                    <span className="text-foreground">Past {periodLabel}</span>
                    <span className="sep text-muted-foreground/60">·</span>
                    <span>all engagements</span>
                </div>

                {/* ---- headline KPI strip — scoped to the selected period, visible on BOTH tabs ---- */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiTile
                        delta={`${formatNumber(periodTasks)} tasks · ${formatNumber(periodSubtasks)} subtasks`}
                        hero
                        label="Flows"
                        loading={flowsByPeriodLoading}
                        value={formatNumber(periodFlows)}
                    />
                    <KpiTile
                        delta={`${formatNumber(periodTokens)} · in + out`}
                        label="Total tokens"
                        loading={usageByPeriodLoading}
                        value={formatTokenCount(periodTokens)}
                    />
                    <KpiTile
                        delta={`in ${formatCost(periodCostIn)} · out ${formatCost(periodCostOut)}`}
                        label="Agent spend"
                        loading={usageByPeriodLoading}
                        value={formatCost(periodCost)}
                    />
                    <KpiTile
                        delta={`total ${periodToolcallsDuration ? formatDuration(periodToolcallsDuration) : '—'}`}
                        label="Tool calls"
                        loading={toolcallsByPeriodLoading}
                        spark={costTrend}
                        value={formatNumber(periodToolcalls)}
                    />
                </div>

                <Tabs
                    className="w-full"
                    onValueChange={setActiveTab}
                    value={activeTab}
                >
                    <div className="border-border mb-4 flex flex-wrap items-end justify-between gap-2 border-b">
                        <TabsList>
                            <TabsTrigger value="analytics">
                                <Activity className="size-[15px]" />
                                Analytics
                            </TabsTrigger>
                            <TabsTrigger value="overview">
                                <LayoutDashboard className="size-[15px]" />
                                Overview
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-3 pb-2">
                            {/* period control drives the KPI strip too, so keep it visible on every tab */}
                            <div className="seg">
                                {periodOptions.map(({ label, value }) => (
                                    <button
                                        className={cn('font-mono tracking-wide', period === value && 'active')}
                                        key={value}
                                        onClick={() => setPeriod(value)}
                                        type="button"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <span className="fresh live">
                                <span className="dot" />
                                Live · updated just now
                            </span>
                        </div>
                    </div>

                    <TabsContent value="analytics">
                        <DashboardAnalytics period={period} />
                    </TabsContent>

                    <TabsContent value="overview">
                        <DashboardOverview />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
};

export default Dashboard;
