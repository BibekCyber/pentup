import { Bot, LayoutDashboard, ListChecks, Terminal, Users, Workflow } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FlowAgents from '@/features/flows/agents/flow-agents';
import FlowDashboard from '@/features/flows/dashboard/flow-dashboard';
import { FlowExecNavProvider } from '@/features/flows/flow-exec-nav';
import FlowAssistantMessages from '@/features/flows/messages/flow-assistant-messages';
import FlowAutomationMessages from '@/features/flows/messages/flow-automation-messages';
import FlowTasks from '@/features/flows/tasks/flow-tasks';
import FlowSplitTerminal from '@/features/flows/terminal/flow-split-terminal';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { usePermission } from '@/hooks/use-permission';
import { useFlow } from '@/providers/flow-provider';

interface FlowTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const FlowTabs = ({ activeTab, onTabChange }: FlowTabsProps) => {
    const { isDesktop } = useBreakpoint();
    const canSeeDashboard = usePermission('usage.view');
    const { isAssistantMode } = useFlow();

    const previousActiveTabRef = useRef<string>(activeTab);

    useEffect(() => {
        // Only handle actual tab changes
        if (activeTab === previousActiveTabRef.current) {
            return;
        }

        previousActiveTabRef.current = activeTab;
    }, [activeTab]);

    return (
        <FlowExecNavProvider onOpenTerminal={() => onTabChange('terminal')}>
            <Tabs
                className="flex size-full flex-col"
                onValueChange={onTabChange}
                value={activeTab}
            >
                <div className="max-w-full pr-4">
                    <ScrollArea className="w-full pb-3">
                        <TabsList className="flex w-fit">
                            {/* Mobile only: the flow's mode tab + dashboard live here too. */}
                            {!isDesktop && isAssistantMode && (
                                <TabsTrigger value="assistant">
                                    <Bot className="size-4" />
                                    Assistant
                                </TabsTrigger>
                            )}
                            {!isDesktop && !isAssistantMode && (
                                <TabsTrigger value="automation">
                                    <Workflow className="size-4" />
                                    Automation
                                </TabsTrigger>
                            )}
                            {!isDesktop && canSeeDashboard && (
                                <TabsTrigger value="dashboard">
                                    <LayoutDashboard className="size-4" />
                                    Dashboard
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="terminal">
                                <Terminal className="size-4" />
                                Terminal
                            </TabsTrigger>
                            <TabsTrigger value="tasks">
                                <ListChecks className="size-4" />
                                Tasks
                            </TabsTrigger>
                            <TabsTrigger value="agents">
                                <Users className="size-4" />
                                Agents
                            </TabsTrigger>
                        </TabsList>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>

                {/* Mobile Tabs only */}
                {!isDesktop && isAssistantMode && (
                    <TabsContent
                        className="mt-1 flex-1 overflow-auto"
                        value="assistant"
                    >
                        <FlowAssistantMessages className="pr-4" />
                    </TabsContent>
                )}
                {!isDesktop && !isAssistantMode && (
                    <TabsContent
                        className="mt-1 flex-1 overflow-auto"
                        value="automation"
                    >
                        <FlowAutomationMessages className="pr-4" />
                    </TabsContent>
                )}
                {!isDesktop && canSeeDashboard && (
                    <TabsContent
                        className="mt-1 flex-1 overflow-auto pr-4"
                        value="dashboard"
                    >
                        <FlowDashboard />
                    </TabsContent>
                )}

                {/* Desktop and Mobile Tabs */}
                {/* forceMount + hide-when-inactive keeps the terminal (xterm + processed logs)
                    alive across tab switches instead of destroying and rebuilding it every time.
                    Rebuilding is cheap with little data (local) but freezes on large log histories
                    (cloud). The xterm ResizeObserver re-fits automatically when the tab is shown. */}
                <TabsContent
                    className="mt-1 flex-1 overflow-hidden data-[state=inactive]:hidden"
                    forceMount
                    value="terminal"
                >
                    <FlowSplitTerminal />
                </TabsContent>

                <TabsContent
                    className="mt-1 flex-1 overflow-auto pr-4"
                    value="tasks"
                >
                    <FlowTasks />
                </TabsContent>

                <TabsContent
                    className="mt-1 flex-1 overflow-auto pr-4"
                    value="agents"
                >
                    <FlowAgents />
                </TabsContent>
            </Tabs>
        </FlowExecNavProvider>
    );
};

export default FlowTabs;
