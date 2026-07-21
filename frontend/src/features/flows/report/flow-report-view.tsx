import { ChevronDown, Clipboard, Download, FileText, Loader2 } from 'lucide-react';

import type { ReportModel } from '@/lib/report-model';

import { StatusBadge } from '@/components/shared/severity-badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import FlowReportExecutiveSummary from './flow-report-executive-summary';
import FlowReportFindingsDetail from './flow-report-findings-detail';
import FlowReportFindingsSummary from './flow-report-findings-summary';
import FlowReportSection from './flow-report-section';
import FlowReportToc from './flow-report-toc';

export interface FlowReportActions {
    onCopyMarkdown?: () => void;
    onDownloadMarkdown?: () => void;
    onDownloadPdf?: () => void;
    pdfGenerating?: boolean;
}

interface FlowReportViewProps extends FlowReportActions {
    model: ReportModel;
}

const FlowReportView = ({
    model,
    onCopyMarkdown,
    onDownloadMarkdown,
    onDownloadPdf,
    pdfGenerating,
}: FlowReportViewProps) => {
    const isEmpty = model.sections.length === 0 && model.findings.length === 0;

    return (
        <div className="bg-background min-h-screen">
            <header className="border-border bg-card border-b">
                <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-7 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-5">
                        <div className="flex items-center gap-3">
                            <span className="text-primary text-lg leading-none font-extrabold tracking-tight">
                                PentAGI
                            </span>
                            <span className="bg-border-strong h-4 w-px shrink-0" />
                            <span className="text-sev-crit font-mono text-[10px] font-semibold tracking-[0.16em] uppercase">
                                Confidential · Penetration Test Report
                            </span>
                        </div>

                        <div className="min-w-0">
                            <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
                                Target
                            </p>
                            <h1 className="text-foreground mt-1.5 truncate font-mono text-2xl leading-tight font-semibold tracking-tight">
                                {model.flow.target || model.flow.title}
                            </h1>
                            {model.flow.target && (
                                <p className="text-muted-foreground mt-1 truncate text-sm">{model.flow.title}</p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                            <div>
                                <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
                                    Status
                                </p>
                                <StatusBadge
                                    className="mt-1.5"
                                    status={model.flow.status}
                                />
                            </div>
                            <div>
                                <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
                                    Findings
                                </p>
                                <p className="text-foreground mt-1.5 font-mono text-sm font-semibold tabular-nums">
                                    {model.summary.findingsTotal}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
                                    Tasks
                                </p>
                                <p className="text-foreground mt-1.5 font-mono text-sm font-semibold tabular-nums">
                                    {model.summary.tasksDone}/{model.summary.tasksTotal}
                                </p>
                            </div>
                            {model.summary.duration && (
                                <div>
                                    <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
                                        Duration
                                    </p>
                                    <p className="text-foreground mt-1.5 font-mono text-sm font-semibold">
                                        {model.summary.duration}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                            >
                                Export
                                <ChevronDown className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {onCopyMarkdown && (
                                <DropdownMenuItem onClick={onCopyMarkdown}>
                                    <Clipboard className="size-4" />
                                    Copy Report
                                </DropdownMenuItem>
                            )}
                            {onDownloadMarkdown && (
                                <DropdownMenuItem onClick={onDownloadMarkdown}>
                                    <FileText className="size-4" />
                                    Download Markdown
                                </DropdownMenuItem>
                            )}
                            {onDownloadPdf && (
                                <DropdownMenuItem
                                    disabled={pdfGenerating}
                                    onClick={onDownloadPdf}
                                >
                                    {pdfGenerating ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Download className="size-4" />
                                    )}
                                    Download PDF
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {isEmpty ? (
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 px-6 py-32 text-center">
                    <FileText className="text-muted-foreground/50 size-10" />
                    <p className="text-foreground font-medium">No content to report yet</p>
                    <p className="text-muted-foreground text-sm">This flow has not produced any tasks or findings.</p>
                </div>
            ) : (
                <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[220px_1fr]">
                    <aside className="hidden self-start lg:sticky lg:top-20 lg:block">
                        <FlowReportToc entries={model.toc} />
                    </aside>
                    <main className="min-w-0 space-y-10">
                        <FlowReportExecutiveSummary model={model} />
                        <FlowReportFindingsSummary findings={model.findings} />
                        <FlowReportFindingsDetail findings={model.findings} />
                        {model.sectionsTitle && model.sections.length > 0 && (
                            <h2
                                className="text-foreground scroll-mt-24 border-b pb-2 text-xl font-semibold"
                                id="methodology"
                            >
                                {model.sectionsTitle}
                            </h2>
                        )}
                        {model.sections.map((section) => (
                            <FlowReportSection
                                key={section.id}
                                section={section}
                            />
                        ))}
                    </main>
                </div>
            )}
        </div>
    );
};

export default FlowReportView;
