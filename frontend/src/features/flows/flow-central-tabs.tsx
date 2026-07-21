import { Bot, LayoutDashboard, Workflow } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FlowDashboard from '@/features/flows/dashboard/flow-dashboard';
import FlowAssistantMessages from '@/features/flows/messages/flow-assistant-messages';
import FlowAutomationMessages from '@/features/flows/messages/flow-automation-messages';
import { useFlowTabDetection } from '@/hooks/use-flow-tab-detection';
import { usePermission } from '@/hooks/use-permission';
import { useFlow } from '@/providers/flow-provider';

// Box/segmented (.seg) tab look: a well-toned pill container with a border; the
// active tab is a filled box (card bg + subtle shadow), inactive tabs are muted.
const SEG_LIST = 'h-auto w-fit gap-[3px] rounded-[var(--r-md)] border border-border bg-well p-[3px]';
const SEG_TRIGGER =
    'mb-0 rounded-[5px] border-b-0 px-[11px] py-[5px] text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-[var(--hi)]';

const FlowCentralTabs = () => {
    const { handleTabChange, resolvedTab } = useFlowTabDetection();
    const canSeeDashboard = usePermission('usage.view');
    const { isAssistantMode } = useFlow();

    return (
        <Tabs
            className="flex size-full flex-col"
            onValueChange={handleTabChange}
            value={resolvedTab}
        >
            {/* Single ~46px pane head: mode overline on the left, the .seg tab
                control inline on the right. This bordered row is the only divider. */}
            <div className="border-border flex h-[46px] flex-none items-center gap-2.5 border-b px-4">
                <span className="overline">{isAssistantMode ? 'Assistant' : 'Automation'}</span>
                {/* Only the tab matching how the flow was created is shown. */}
                <TabsList className={`${SEG_LIST} ml-auto`}>
                    {isAssistantMode ? (
                        <TabsTrigger
                            className={SEG_TRIGGER}
                            value="assistant"
                        >
                            <Bot className="size-4" />
                            Assistant
                        </TabsTrigger>
                    ) : (
                        <TabsTrigger
                            className={SEG_TRIGGER}
                            value="automation"
                        >
                            <Workflow className="size-4" />
                            Automation
                        </TabsTrigger>
                    )}
                    {canSeeDashboard && (
                        <TabsTrigger
                            className={SEG_TRIGGER}
                            value="dashboard"
                        >
                            <LayoutDashboard className="size-4" />
                            Dashboard
                        </TabsTrigger>
                    )}
                </TabsList>
            </div>

            {isAssistantMode ? (
                <TabsContent
                    className="mt-0 min-h-0 flex-1 overflow-auto py-4 pr-4 pl-4"
                    value="assistant"
                >
                    <FlowAssistantMessages />
                </TabsContent>
            ) : (
                <TabsContent
                    className="mt-0 min-h-0 flex-1 overflow-auto py-4 pr-4 pl-4"
                    value="automation"
                >
                    <FlowAutomationMessages />
                </TabsContent>
            )}
            {canSeeDashboard && (
                <TabsContent
                    className="mt-0 min-h-0 flex-1 overflow-auto py-4 pr-4 pl-4"
                    value="dashboard"
                >
                    <FlowDashboard />
                </TabsContent>
            )}
        </Tabs>
    );
};

export default FlowCentralTabs;
