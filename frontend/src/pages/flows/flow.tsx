import { ChevronDown, Copy, Download, ExternalLink, GripVertical, Loader2, NotepadText, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { FlowStatusIcon } from '@/components/icons/flow-status-icon';
import { ProviderIcon } from '@/components/icons/provider-icon';
import CommandBar from '@/components/layouts/command-bar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import FlowCentralTabs from '@/features/flows/flow-central-tabs';
import FlowTabs from '@/features/flows/flow-tabs';
import ScanInitializing from '@/features/flows/scan-initializing';
import { StatusType } from '@/graphql/types';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useFlowTabDetection } from '@/hooks/use-flow-tab-detection';
import { useScanStage } from '@/hooks/use-scan-stage';
import { buildAssistantReportModel } from '@/lib/build-assistant-report-model';
import { buildReportMarkdown } from '@/lib/build-report-markdown';
import { mapFindings } from '@/lib/build-report-model';
import { Log } from '@/lib/log';
import { copyToClipboard, downloadTextFile, generateFileName, generateReport } from '@/lib/report';
import { formatName } from '@/lib/utils/format';
import { useFavorites } from '@/providers/favorites-provider';
import { useFlow } from '@/providers/flow-provider';

const FlowReportDropdown = () => {
    const { assistantLogs, assistants, flowData, flowId } = useFlow();
    const flow = flowData?.flow;
    const tasks = flowData?.tasks ?? [];
    const isAssistant = tasks.length === 0 && assistants.length > 0;

    // Check if flow is available for report generation
    const isReportDisabled = !flow || !flowId;

    const buildMarkdown = (): string =>
        isAssistant
            ? buildReportMarkdown(
                  buildAssistantReportModel(flow, assistants[0], assistantLogs, {
                      findings: mapFindings(assistants[0]?.findings),
                  }),
              )
            : generateReport(tasks, flow);

    // Report export handlers
    const handleCopyToClipboard = async () => {
        if (isReportDisabled) {
            return;
        }

        const success = await copyToClipboard(buildMarkdown());

        if (success) {
            toast.success('Report copied to clipboard');
        } else {
            Log.error('Failed to copy report to clipboard');
            toast.error('Failed to copy report to clipboard');
        }
    };

    const handleDownloadMD = () => {
        if (isReportDisabled || !flow) {
            return;
        }

        try {
            const fileName = `${generateFileName(flow)}.md`;
            downloadTextFile(buildMarkdown(), fileName, 'text/markdown; charset=UTF-8');
        } catch (error) {
            Log.error('Failed to download markdown report:', error);
        }
    };

    const handleDownloadPDF = () => {
        if (isReportDisabled || !flow || !flowId) {
            return;
        }

        // Open new tab (not popup) with report page and download flag
        const url = `/flows/${flowId}/report?download=true&silent=true`;
        window.open(url, '_blank');
    };

    const handleOpenWebView = () => {
        if (isReportDisabled || !flowId) {
            return;
        }

        // Open new tab with report page for web viewing
        const url = `/flows/${flowId}/report`;
        window.open(url, '_blank');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className="shrink-0"
                    disabled={isReportDisabled}
                    variant="outline"
                >
                    <NotepadText />
                    Report
                    <ChevronDown className="opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleOpenWebView}
                >
                    <ExternalLink className="size-4" />
                    Open web view
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleCopyToClipboard}
                >
                    <Copy className="size-4" />
                    Copy to clipboard
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleDownloadMD}
                >
                    <Download className="size-4" />
                    Download MD
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleDownloadPDF}
                >
                    <Download className="size-4" />
                    Download PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const Flow = () => {
    const { isDesktop } = useBreakpoint();
    const navigate = useNavigate();

    const { assistantLogs, flowData, flowError, flowId, flowStatus, isLoading: isFlowLoading } = useFlow();
    const { isFavoriteFlow, toggleFavoriteFlow } = useFavorites();

    // Redirect to flows list if there's an error loading flow data or flow not found
    useEffect(() => {
        if (flowError || (!isFlowLoading && !flowData?.flow)) {
            navigate('/flows', { replace: true });
        }
    }, [flowError, flowData, isFlowLoading, navigate]);

    // "Has real work started streaming?" — the moment any log/message/task/screenshot
    // arrives, the sandbox is alive and we reveal the real terminal/agents panels.
    const hasStreamedContent = useMemo(
        () =>
            Boolean(
                flowData?.terminalLogs?.length ||
                    flowData?.messageLogs?.length ||
                    flowData?.agentLogs?.length ||
                    flowData?.tasks?.length ||
                    flowData?.screenshots?.length ||
                    flowData?.searchLogs?.length ||
                    flowData?.vectorStoreLogs?.length ||
                    assistantLogs.length,
            ),
        [flowData, assistantLogs.length],
    );

    // Show the animated "your scan is starting" state only during the initial boot:
    // the flow exists, nothing has streamed yet, and it hasn't finished/failed.
    const isInitializing =
        !isFlowLoading &&
        !!flowData?.flow &&
        !hasStreamedContent &&
        (flowStatus === StatusType.Created || flowStatus === StatusType.Waiting || flowStatus === StatusType.Running);

    const scanStage = useScanStage(flowStatus, isInitializing);

    // Desktop: side panel defaults to 'terminal'
    const [desktopTabsTab, setDesktopTabsTab] = useState<string>('terminal');

    // Mobile: use the same auto-detection logic as FlowCentralTabs
    const { handleTabChange: handleMobileTabChange, resolvedTab: mobileAutoTab } = useFlowTabDetection();

    const activeTabsTab = isDesktop ? desktopTabsTab : mobileAutoTab;
    const handleTabsTabChange = isDesktop ? setDesktopTabsTab : handleMobileTabChange;

    const tabsCard = (
        <div className="flex h-[calc(100dvh-3.5rem)] max-w-full flex-col rounded-none border-0">
            <FlowTabs
                activeTab={activeTabsTab}
                onTabChange={handleTabsTabChange}
            />
        </div>
    );

    return (
        <>
            <CommandBar
                actions={
                    <>
                        {flowId && (
                            <Button
                                className="shrink-0"
                                onClick={() => toggleFavoriteFlow(flowId)}
                                size="icon"
                                variant="ghost"
                            >
                                <Star className={isFavoriteFlow(flowId) ? 'fill-yellow-500 stroke-yellow-500' : ''} />
                            </Button>
                        )}
                        {(!!(flowData?.tasks ?? []).length || assistantLogs.length > 0) && <FlowReportDropdown />}
                    </>
                }
                ctx={
                    flowData?.flow && (
                        <>
                            <FlowStatusIcon
                                status={flowData.flow.status}
                                tooltip={formatName(flowData.flow.status)}
                            />
                            <span>{formatName(flowData.flow.status)}</span>
                            <span className="text-muted-foreground/50">·</span>
                            <ProviderIcon
                                provider={flowData.flow.provider}
                                tooltip={formatName(flowData.flow.provider.name)}
                            />
                            <span>{formatName(flowData.flow.provider.name)}</span>
                        </>
                    )
                }
                title={
                    <span className="flex min-w-0 items-center gap-2">
                        {flowId && (
                            <span className="text-muted-foreground shrink-0 font-mono text-[13px]">#{flowId}</span>
                        )}
                        <span className="truncate">{flowData?.flow?.title || 'Select a flow'}</span>
                    </span>
                }
            />
            <div className="relative flex h-[calc(100dvh-3.5rem)] w-full max-w-full flex-1">
                {isFlowLoading && (
                    <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
                        <Loader2 className="text-primary size-16 animate-spin" />
                    </div>
                )}
                {isInitializing && (
                    <div className="bg-background animate-scan-fade absolute inset-0 z-40 flex items-center justify-center overflow-auto p-6">
                        <ScanInitializing stageIndex={scanStage} />
                    </div>
                )}
                {isDesktop ? (
                    <ResizablePanelGroup
                        className="w-full"
                        direction="horizontal"
                    >
                        <ResizablePanel
                            defaultSize={50}
                            minSize={30}
                        >
                            <div className="flex h-[calc(100dvh-3.5rem)] max-w-full flex-col rounded-none border-0">
                                <FlowCentralTabs />
                            </div>
                        </ResizablePanel>
                        <ResizableHandle withHandle>
                            <GripVertical className="size-4" />
                        </ResizableHandle>
                        <ResizablePanel
                            defaultSize={50}
                            minSize={30}
                        >
                            <div className="flex h-[calc(100dvh-3.5rem)] max-w-full flex-col rounded-none border-0">
                                <FlowTabs
                                    activeTab={activeTabsTab}
                                    onTabChange={handleTabsTabChange}
                                />
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                ) : (
                    tabsCard
                )}
            </div>
        </>
    );
};

export default Flow;
