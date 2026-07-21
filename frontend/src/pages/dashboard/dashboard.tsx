import { Activity, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    UsageStatsPeriod,
    useFlowsStatsTotalQuery,
    useToolcallsStatsTotalQuery,
    useUsageStatsByPeriodQuery,
    useUsageStatsTotalQuery,
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

    const { data: usageTotalData, loading: usageTotalLoading } = useUsageStatsTotalQuery();
    const { data: toolcallsTotalData, loading: toolcallsTotalLoading } = useToolcallsStatsTotalQuery();
    const { data: flowsTotalData, loading: flowsTotalLoading } = useFlowsStatsTotalQuery();
    const { data: usageByPeriodData } = useUsageStatsByPeriodQuery({
        variables: { period },
    });

    const usageTotal = usageTotalData?.usageStatsTotal;
    const toolcallsTotal = toolcallsTotalData?.toolcallsStatsTotal;
    const flowsTotal = flowsTotalData?.flowsStatsTotal;

    const totalCost = usageTotal ? usageTotal.totalUsageCostIn + usageTotal.totalUsageCostOut : 0;
    const totalTokens = usageTotal ? usageTotal.totalUsageIn + usageTotal.totalUsageOut : 0;

    // Real 14-pt daily cost trend (oldest → newest) powering the Tool-calls sparkline.
    const costTrend = [...(usageByPeriodData?.usageStatsByPeriod ?? [])]
        .reverse()
        .map((item) => item.stats.totalUsageCostIn + item.stats.totalUsageCostOut);

    const periodLabel = periodOptions.find((option) => option.value === period)?.label ?? '';

    return (
        <>
            <header className="bg-background sticky top-0 z-10 flex h-12 w-full shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        className="h-4"
                        orientation="vertical"
                    />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <LayoutDashboard className="size-4" />
                                <BreadcrumbPage>Dashboard</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-6 pt-8">
                {/* muted context subtitle near the header */}
                <div className="-mb-2 flex items-center gap-2 overline">
                    <span className="text-foreground">{periodLabel}</span>
                    <span className="sep text-muted-foreground/60">·</span>
                    <span>all engagements</span>
                </div>

                {/* ---- headline KPI strip — visible on BOTH tabs (all real totals) ---- */}
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
                        spark={costTrend}
                        value={toolcallsTotal ? formatNumber(toolcallsTotal.totalCount) : '0'}
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
                            {activeTab === 'analytics' && (
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
                            )}

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
