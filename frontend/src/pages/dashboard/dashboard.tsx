import { LayoutDashboard } from 'lucide-react';
import { useState } from 'react';

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsageStatsPeriod } from '@/graphql/types';
import { DashboardAnalytics } from '@/pages/dashboard/dashboard-analytics';
import { DashboardOverview } from '@/pages/dashboard/dashboard-overview';

const periodOptions: { label: string; value: UsageStatsPeriod }[] = [
    { label: 'Week', value: UsageStatsPeriod.Week },
    { label: 'Month', value: UsageStatsPeriod.Month },
    { label: 'Quarter', value: UsageStatsPeriod.Quarter },
];

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('analytics');
    const [period, setPeriod] = useState<UsageStatsPeriod>(UsageStatsPeriod.Week);

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

            <div className="flex flex-col gap-6 p-4">
                <Tabs
                    className="w-full"
                    onValueChange={setActiveTab}
                    value={activeTab}
                >
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="analytics">Analytics</TabsTrigger>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                        </TabsList>

                        {activeTab === 'analytics' && (
                            <Tabs
                                onValueChange={(value) => setPeriod(value as UsageStatsPeriod)}
                                value={period}
                            >
                                <TabsList className="border-border-strong bg-well h-8 gap-0.5 rounded-md border border-b p-0.5">
                                    {periodOptions.map(({ label, value }) => (
                                        <TabsTrigger
                                            className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary mb-0 rounded-[6px] border-b-0 px-3 py-1 font-mono text-xs tracking-wide data-[state=active]:border-transparent"
                                            key={value}
                                            value={value}
                                        >
                                            {label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        )}
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
