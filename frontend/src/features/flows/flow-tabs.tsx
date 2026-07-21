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

// Box/segmented (.seg) tab look: a well-toned pill container with a border; the
// active tab is a filled box (card bg + subtle shadow), inactive tabs are muted.
const SEG_LIST = 'h-auto w-fit gap-[3px] rounded-[var(--r-md)] border border-border bg-well p-[3px]';
const SEG_TRIGGER =
    'mb-0 rounded-[5px] border-b-0 px-[11px] py-[5px] text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-[var(--hi)]';

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
                        <TabsList className={SEG_LIST}>
                            {/* Mobile only: the flow's mode tab + dashboard live here too. */}
                            {!isDesktop && isAssistantMode && (
                                <TabsTrigger
                                    className={SEG_TRIGGER}
                                    value="assistant"
                                >
                                    <Bot className="size-4" />
                                    Assistant
                                </TabsTrigger>
                            )}
                            {!isDesktop && !isAssistantMode && (
                                <TabsTrigger
                                    className={SEG_TRIGGER}
                                    value="automation"
                                >
                                    <Workflow className="size-4" />
                                    Automation
                                </TabsTrigger>
                            )}
                            {!isDesktop && canSeeDashboard && (
                                <TabsTrigger
                                    className={SEG_TRIGGER}
                                    value="dashboard"
                                >
                                    <LayoutDashboard className="size-4" />
                                    Dashboard
                                </TabsTrigger>
                            )}
                            <TabsTrigger
                                className={SEG_TRIGGER}
                                value="terminal"
                            >
                                <Terminal className="size-4" />
                                Terminal
                            </TabsTrigger>
                            <TabsTrigger
                                className={SEG_TRIGGER}
                                value="tasks"
                            >
                                <ListChecks className="size-4" />
                                Tasks
                            </TabsTrigger>
                            <TabsTrigger
                                className={SEG_TRIGGER}
                                value="agents"
                            >
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
