import { ChevronDown, Clipboard, Download, FileText, Loader2 } from 'lucide-react';

import type { ReportModel } from '@/lib/report-model';

import { StatusBadge } from '@/components/shared/severity-badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import FlowReportExecutiveSummary from './flow-report-executive-summary';
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

const FlowReportView = ({ model, onCopyMarkdown, onDownloadMarkdown, onDownloadPdf, pdfGenerating }: FlowReportViewProps) => {
    const isEmpty = model.sections.length === 0 && model.findings.length === 0;

    return (
        <div className="bg-background min-h-screen">
            <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 border-b backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="text-primary shrink-0 text-sm font-bold tracking-tight">PentAGI</span>
                        <span className="bg-border h-5 w-px shrink-0" />
                        <div className="min-w-0">
                            <h1 className="text-foreground truncate text-sm font-semibold">{model.flow.title}</h1>
                            {model.flow.target && <p className="text-muted-foreground truncate text-xs">{model.flow.target}</p>}
                        </div>
                        <StatusBadge
                            className="ml-1 shrink-0"
                            status={model.flow.status}
                        />
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
                                    {pdfGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
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
