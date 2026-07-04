import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { ReportModel } from '@/lib/report-model';

import Logo from '@/components/icons/logo';
import FlowReportView from '@/features/flows/report/flow-report-view';
import { useAssistantLogsQuery, useAssistantsQuery, useFlowReportQuery } from '@/graphql/types';
import { assistantSampleReportModel } from '@/lib/assistant-report-sample';
import { buildAssistantReportModel } from '@/lib/build-assistant-report-model';
import { buildReportMarkdown } from '@/lib/build-report-markdown';
import { buildReportModel, mapFindings } from '@/lib/build-report-model';
import { Log } from '@/lib/log';
import { copyToClipboard, downloadTextFile, generateFileName } from '@/lib/report';
import { generateReportPdf } from '@/lib/report-pdf';
import { sampleReportModel } from '@/lib/report-sample';

type ReportState = 'content' | 'error' | 'generating' | 'loading';

const FlowReport = () => {
    const { flowId } = useParams<{ flowId: string }>();
    const [searchParams] = useSearchParams();
    const download = searchParams.has('download');
    const silent = searchParams.has('silent');
    const sample = searchParams.has('sample');
    const assistantSample = searchParams.get('sample') === 'assistant';

    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [downloadState, setDownloadState] = useState<ReportState>(download ? 'generating' : 'content');

    const { data, error: queryError } = useFlowReportQuery({
        errorPolicy: 'all',
        skip: !flowId || sample,
        variables: { id: flowId! },
    });

    const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);
    const isAutomation = tasks.length > 0;

    const { data: assistantsData, loading: assistantsLoading } = useAssistantsQuery({
        errorPolicy: 'all',
        skip: !flowId || sample || isAutomation,
        variables: { flowId: flowId! },
    });

    const assistants = useMemo(() => assistantsData?.assistants ?? [], [assistantsData?.assistants]);
    const primaryAssistantId = assistants[0]?.id;

    const { data: logsData, loading: logsLoading } = useAssistantLogsQuery({
        errorPolicy: 'all',
        skip: !flowId || sample || isAutomation || !primaryAssistantId,
        variables: { assistantId: primaryAssistantId ?? '', flowId: flowId! },
    });

    const model: null | ReportModel = useMemo(() => {
        if (assistantSample) {
            return assistantSampleReportModel;
        }

        if (sample) {
            return sampleReportModel;
        }

        if (!data?.flow) {
            return null;
        }

        const findings = mapFindings(data.flow.findings);

        if (isAutomation) {
            return buildReportModel(data.flow, tasks, findings);
        }

        if (assistantsLoading) {
            return null;
        }

        if (assistants.length > 0) {
            return logsLoading ? null : buildAssistantReportModel(data.flow, assistants[0], logsData?.assistantLogs ?? [], { findings: mapFindings(assistants[0]?.findings) });
        }

        return buildReportModel(data.flow, [], findings);
    }, [assistantSample, sample, data, isAutomation, tasks, assistantsLoading, assistants, logsLoading, logsData]);

    const fileBaseName = useMemo(() => (sample ? `report_sample${assistantSample ? '_assistant' : ''}` : data?.flow ? generateFileName(data.flow) : 'report'), [sample, assistantSample, data]);

    useEffect(() => {
        if (!download || !model) {
            return;
        }

        setDownloadState('generating');

        generateReportPdf(model, fileBaseName)
            .then(() => {
                if (silent) {
                    setTimeout(() => window.close(), 1000);
                } else {
                    setDownloadState('content');
                }
            })
            .catch((err) => {
                Log.error('PDF generation failed:', err);
                setDownloadState('error');
            });
    }, [download, model, fileBaseName, silent]);

    const handleCopyMarkdown = async () => {
        if (!model) {
            return;
        }

        const ok = await copyToClipboard(buildReportMarkdown(model));
        toast[ok ? 'success' : 'error'](ok ? 'Report copied to clipboard' : 'Failed to copy report');
    };

    const handleDownloadMarkdown = () => {
        if (!model) {
            return;
        }

        downloadTextFile(buildReportMarkdown(model), `${fileBaseName}.md`, 'text/markdown; charset=UTF-8');
    };

    const handleDownloadPdf = async () => {
        if (!model || pdfGenerating) {
            return;
        }

        setPdfGenerating(true);

        try {
            await generateReportPdf(model, fileBaseName);
        } catch (err) {
            Log.error('PDF generation failed:', err);
            toast.error('Failed to generate PDF');
        } finally {
            setPdfGenerating(false);
        }
    };

    const isLoading = !sample && !model && !queryError;
    const isError = (!sample && queryError && !data?.flow) || downloadState === 'error';

    if (isLoading || downloadState === 'generating') {
        return (
            <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
                <Logo className="animate-logo-spin size-16" />
                <h1 className="text-foreground text-2xl font-semibold">{downloadState === 'generating' ? 'Generating PDF…' : 'Loading Report…'}</h1>
                <div className="size-8 animate-spin rounded-full border-b-2 border-blue-600" />
                <p className="text-muted-foreground max-w-md">
                    {downloadState === 'generating' ? 'Creating your PDF document. This may take a few moments.' : 'Please wait while we prepare your penetration testing report.'}
                </p>
            </div>
        );
    }

    if (isError || !model) {
        return (
            <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
                <Logo className="size-16" />
                <h1 className="text-2xl font-semibold text-red-600 dark:text-red-400">Error Loading Report</h1>
                <p className="text-muted-foreground max-w-md">We could not load this report. Please close this window and try again.</p>
                <button
                    className="mt-2 rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                    onClick={() => window.close()}
                    type="button"
                >
                    Close
                </button>
            </div>
        );
    }

    return (
        <FlowReportView
            model={model}
            onCopyMarkdown={handleCopyMarkdown}
            onDownloadMarkdown={handleDownloadMarkdown}
            onDownloadPdf={handleDownloadPdf}
            pdfGenerating={pdfGenerating}
        />
    );
};

export default FlowReport;
