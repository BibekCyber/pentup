import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { Finding, ReportModel, Severity } from '@/lib/report-model';

import Logo from '@/components/icons/logo';
import FlowReportView from '@/features/flows/report/flow-report-view';
import {
    Severity as GqlSeverity,
    useAssistantLogsQuery,
    useAssistantsQuery,
    useDomainsQuery,
    useFlowReportQuery,
    useUpdateFindingCvssMutation,
    useUpdateFindingSeverityMutation,
} from '@/graphql/types';
import { assistantSampleReportModel } from '@/lib/assistant-report-sample';
import { buildAssistantReportModel } from '@/lib/build-assistant-report-model';
import { buildReportMarkdown } from '@/lib/build-report-markdown';
import { buildReportModel, mapFindings } from '@/lib/build-report-model';
import { Log } from '@/lib/log';
import { copyToClipboard, downloadTextFile, generateFileName } from '@/lib/report';
import { isSeverityChangeMeaningful } from '@/lib/report-model';
import { generateReportPdf } from '@/lib/report-pdf';
import { sampleReportModel } from '@/lib/report-sample';

type ReportState = 'content' | 'error' | 'generating' | 'loading';

// Report severities are the renderer's lowercase union; the API takes the GraphQL enum.
const GQL_SEVERITY: Record<Severity, GqlSeverity> = {
    critical: GqlSeverity.Critical,
    high: GqlSeverity.High,
    informational: GqlSeverity.Informational,
    low: GqlSeverity.Low,
    medium: GqlSeverity.Medium,
};

const FlowReport = () => {
    const { flowId } = useParams<{ flowId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const download = searchParams.has('download');
    const silent = searchParams.has('silent');
    const sample = searchParams.has('sample');
    const assistantSample = searchParams.get('sample') === 'assistant';

    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [downloadState, setDownloadState] = useState<ReportState>(download ? 'generating' : 'content');

    // Client the report is prepared for — typed in the report view, flows into the
    // header, confidentiality copy and cover of the exported PDF/markdown. Stored
    // strictly PER FLOW in localStorage so each flow keeps its own client name and
    // one flow never pre-fills another's.
    const clientStorageKey = flowId ? `report:clientName:${flowId}` : null;
    const [clientName, setClientName] = useState<string>(() => {
        if (typeof localStorage === 'undefined' || !clientStorageKey) {
            return '';
        }

        return localStorage.getItem(clientStorageKey) ?? '';
    });

    useEffect(() => {
        if (typeof localStorage === 'undefined' || !clientStorageKey) {
            return;
        }

        const value = clientName.trim();

        if (value) {
            localStorage.setItem(clientStorageKey, value);
        } else {
            localStorage.removeItem(clientStorageKey);
        }
    }, [clientName, clientStorageKey]);

    const { data, error: queryError } = useFlowReportQuery({
        errorPolicy: 'all',
        skip: !flowId || sample,
        variables: { id: flowId! },
    });

    const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);
    const isAutomation = tasks.length > 0;

    // A flow does not carry its own target type — it lives on the parent scan
    // (domain). Resolve it client-side from the cached domains list so the report
    // can state the engagement class (Web / Cloud); undefined is a safe fallback.
    const { data: domainsData } = useDomainsQuery({ errorPolicy: 'all', skip: !flowId || sample });
    const targetType = useMemo(
        () => domainsData?.domains.find((domain) => domain.flows.some((flow) => flow.id === flowId))?.targetType,
        [domainsData?.domains, flowId],
    );

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

    const baseModel: null | ReportModel = useMemo(() => {
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
            return buildReportModel(data.flow, tasks, findings, { targetType });
        }

        // Gate on the FIRST load only. A severity edit refetches these queries, and treating
        // any in-flight request as "no model yet" would replace the whole report with the
        // loading splash on every re-rate.
        if (assistantsLoading && !assistantsData) {
            return null;
        }

        if (assistants.length > 0) {
            return logsLoading && !logsData
                ? null
                : buildAssistantReportModel(data.flow, assistants[0], logsData?.assistantLogs ?? [], {
                      findings: mapFindings(assistants[0]?.findings),
                      targetType,
                  });
        }

        return buildReportModel(data.flow, [], findings, { targetType });
    }, [
        assistantSample,
        sample,
        data,
        isAutomation,
        tasks,
        assistantsData,
        assistantsLoading,
        assistants,
        logsData,
        logsLoading,
        targetType,
    ]);

    // The typed client name is authoritative everywhere (view + exports); fall back
    // to any name already baked into the model (e.g. the sample report).
    const model = useMemo(
        () => (baseModel ? { ...baseModel, clientName: clientName.trim() || baseModel.clientName } : null),
        [baseModel, clientName],
    );

    // ── Finding triage ────────────────────────────────────────────────────────
    // Severity is the only stored value; counts, colours, ordering, the executive
    // summary and the PDF all recompute from it, so refetching the report after a
    // change is enough to keep every part consistent.
    const [updateFindingSeverity, { loading: severityUpdating }] = useUpdateFindingSeverityMutation();
    const [updateFindingCvss, { loading: cvssUpdating }] = useUpdateFindingCvssMutation();
    const canTriage = !sample && !assistantSample && Boolean(flowId);

    // Automation findings are addressed by their task; assistant-mode findings have no task
    // and are addressed by the assistant that produced them.
    const addressOf = (finding: Finding) => {
        const taskId = finding.taskId && finding.taskId !== '0' ? finding.taskId : undefined;

        return { assistantId: taskId ? undefined : primaryAssistantId, taskId };
    };

    const reportEditError = (error: unknown, fallback: string) => {
        Log.error(fallback, error);

        // The server refuses an edit when the finding at that position is no longer the one
        // on screen, so say what to do rather than only that it failed.
        const changed = error instanceof Error && error.message.includes('reload');
        toast.error(changed ? 'This report changed — reload and try again' : fallback);
    };

    const handleCvssOutOfRange = (severity: string, min: number, max: number) => {
        toast.error(`A ${severity} finding scores between ${min.toFixed(1)} and ${max.toFixed(1)}`, {
            description: 'Change the severity first to use a score outside this range.',
        });
    };

    const handleCvssChange = async (finding: Finding, cvss: number) => {
        const { assistantId, taskId } = addressOf(finding);
        const { index } = finding;

        if (index === undefined || (!taskId && !assistantId)) {
            return;
        }

        try {
            await updateFindingCvss({
                awaitRefetchQueries: true,
                refetchQueries: taskId ? ['flowReport'] : ['assistants'],
                variables: { assistantId, cvss, expectedTitle: finding.title, index, taskId },
            });
            toast.success(`CVSS set to ${cvss.toFixed(1)}`);
        } catch (error) {
            reportEditError(error, 'Could not update the CVSS score');
        }
    };

    const handleSeverityChange = async (finding: Finding, severity: Severity) => {
        const { index } = finding;

        if (index === undefined || !isSeverityChangeMeaningful(finding, severity)) {
            return;
        }

        const { assistantId, taskId } = addressOf(finding);

        if (!taskId && !assistantId) {
            return;
        }

        try {
            await updateFindingSeverity({
                awaitRefetchQueries: true,
                // Refetch only the query that actually sourced these findings; naming an
                // inactive query makes Apollo warn on every edit.
                refetchQueries: taskId ? ['flowReport'] : ['assistants'],
                variables: {
                    assistantId,
                    // Pins the edit to the finding on screen: findings are regenerated
                    // wholesale, so an index alone could address a different one.
                    expectedTitle: finding.title,
                    index,
                    severity: GQL_SEVERITY[severity],
                    taskId,
                },
            });
            toast.success(`Severity updated to ${severity}`);
        } catch (error) {
            reportEditError(error, 'Could not update the severity');
        }
    };

    const fileBaseName = useMemo(
        () =>
            sample
                ? `report_sample${assistantSample ? '_assistant' : ''}`
                : data?.flow
                  ? generateFileName(data.flow)
                  : 'report',
        [sample, assistantSample, data],
    );

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
                <p className="text-primary font-mono text-[10px] font-semibold tracking-[0.2em] uppercase">
                    CyberFortify · Penetration Test Report
                </p>
                <h1 className="text-foreground text-2xl font-semibold">
                    {downloadState === 'generating' ? 'Generating PDF…' : 'Loading Report…'}
                </h1>
                <div className="border-b-primary size-8 animate-spin rounded-full border-b-2" />
                <p className="text-muted-foreground max-w-md">
                    {downloadState === 'generating'
                        ? 'Creating your PDF document. This may take a few moments.'
                        : 'Please wait while we prepare your penetration testing report.'}
                </p>
            </div>
        );
    }

    if (isError || !model) {
        return (
            <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
                <Logo className="size-16" />
                <p className="text-sev-crit font-mono text-[10px] font-semibold tracking-[0.2em] uppercase">
                    CyberFortify · Penetration Test Report
                </p>
                <h1 className="text-destructive text-2xl font-semibold">Error Loading Report</h1>
                <p className="text-muted-foreground max-w-md">
                    We could not load this report. Please close this window and try again.
                </p>
                <button
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 mt-2 rounded-md px-4 py-2 transition-colors"
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
            clientName={clientName}
            model={model}
            onBackToFlow={!sample && flowId ? () => navigate(`/flows/${flowId}`) : undefined}
            onClientNameChange={setClientName}
            onCopyMarkdown={handleCopyMarkdown}
            onCvssChange={canTriage ? handleCvssChange : undefined}
            onCvssOutOfRange={canTriage ? handleCvssOutOfRange : undefined}
            onDownloadMarkdown={handleDownloadMarkdown}
            onDownloadPdf={handleDownloadPdf}
            onSeverityChange={canTriage ? handleSeverityChange : undefined}
            pdfGenerating={pdfGenerating}
            severityPending={severityUpdating || cvssUpdating}
        />
    );
};

export default FlowReport;
