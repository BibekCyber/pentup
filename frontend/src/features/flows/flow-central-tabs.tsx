import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FlowDashboard from '@/features/flows/dashboard/flow-dashboard';
import FlowAssistantMessages from '@/features/flows/messages/flow-assistant-messages';
import FlowAutomationMessages from '@/features/flows/messages/flow-automation-messages';
import { useFlowTabDetection } from '@/hooks/use-flow-tab-detection';
import { usePermission } from '@/hooks/use-permission';
import { useFlow } from '@/providers/flow-provider';

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
            <div className="max-w-full">
                <ScrollArea className="w-full pb-3">
                    {/* Only the tab matching how the flow was created is shown. */}
                    <TabsList className="flex w-fit">
                        {isAssistantMode ? (
                            <TabsTrigger value="assistant">Assistant</TabsTrigger>
                        ) : (
                            <TabsTrigger value="automation">Automation</TabsTrigger>
                        )}
                        {canSeeDashboard && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            {isAssistantMode ? (
                <TabsContent
                    className="mt-1 flex-1 overflow-auto pr-4"
                    value="assistant"
                >
                    <FlowAssistantMessages />
                </TabsContent>
            ) : (
                <TabsContent
                    className="mt-1 flex-1 overflow-auto pr-4"
                    value="automation"
                >
                    <FlowAutomationMessages />
                </TabsContent>
            )}
            {canSeeDashboard && (
                <TabsContent
                    className="mt-1 flex-1 overflow-auto pr-4"
                    value="dashboard"
                >
                    <FlowDashboard />
                </TabsContent>
            )}
        </Tabs>
    );
};

export default FlowCentralTabs;
