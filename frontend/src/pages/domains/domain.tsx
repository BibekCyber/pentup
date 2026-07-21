import type { LucideIcon } from 'lucide-react';

import {
    ArrowLeft,
    Box,
    Braces,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Cloud,
    Cpu,
    Download,
    Globe,
    MoreVertical,
    Network,
    Pencil,
    Shield,
    Smartphone,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DomainStatusBadge } from '@/components/forms/domain-status-badge';
import { TargetTypeChip } from '@/components/forms/target-type-chip';
import CommandBar from '@/components/layouts/command-bar';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { StatusPill, type StatusTone } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import ScanInitializing from '@/features/flows/scan-initializing';
import {
    DomainStatusType,
    type FlowFragmentFragment,
    StatusType,
    TargetType,
    useDeleteFlowMutation,
    useFinishFlowMutation,
    useRenameFlowMutation,
} from '@/graphql/types';
import { useScanStage } from '@/hooks/use-scan-stage';
import { emptySeverityCounts, type Severity, SEVERITY_ORDER, type SeverityCounts } from '@/lib/report-model';
import { getSeverityStyle } from '@/lib/severity-palette';
import { getTargetTypeLabel } from '@/lib/target-type-colors';
import { cn } from '@/lib/utils';
import { useDomain } from '@/providers/domain-provider';
import { useDomains } from '@/providers/domains-provider';

// How many child-flow dossiers a page shows before the client-side pager kicks in.
const PAGE_SIZE = 12;

const formatDate = (value: string) => new Date(value).toLocaleString();

// The domain query augments every child flow with its findings (severity only).
// That field is present on the runtime object but is not part of the base
// FlowFragmentFragment type, so we read it through this local widening — same
// pattern the flows list page (src/pages/flows/flows.tsx) uses.
type FlowWithFindings = FlowFragmentFragment & { findings?: Array<{ severity: string }> };

// Status edge-bar color (left accent) keyed by the status enum's string value,
// which lines up 1:1 with the shared --st-* token ramp landed in P1/P3.
const STATUS_EDGE: Record<string, string> = {
    classifying: 'bg-[var(--st-classifying)]',
    created: 'bg-[var(--st-created)]',
    failed: 'bg-[var(--st-failed)]',
    finished: 'bg-[var(--st-finished)]',
    running: 'bg-[var(--st-running)]',
    waiting: 'bg-[var(--st-waiting)]',
};

// A leading glyph for the header dossier tile, chosen per target type.
const TARGET_GLYPH: Record<TargetType, LucideIcon> = {
    [TargetType.Api]: Braces,
    [TargetType.Aws]: Cloud,
    [TargetType.Azure]: Cloud,
    [TargetType.Cloud]: Cloud,
    [TargetType.Gcp]: Cloud,
    [TargetType.General]: Box,
    [TargetType.MobileBackend]: Smartphone,
    [TargetType.Network]: Network,
    [TargetType.WebApp]: Globe,
};

// Operational StatusType → EMBER status-ramp tone + prototype label + pulse
// (mirrors the flows list page so a flow reads identically in both places).
const STATUS_META: Record<StatusType, { label: string; pulse: boolean; tone: StatusTone }> = {
    [StatusType.Created]: { label: 'Queued', pulse: false, tone: 'created' },
    [StatusType.Failed]: { label: 'Failed', pulse: false, tone: 'failed' },
    [StatusType.Finished]: { label: 'Finished', pulse: false, tone: 'finished' },
    [StatusType.Running]: { label: 'Running', pulse: true, tone: 'running' },
    [StatusType.Waiting]: { label: 'Needs input', pulse: true, tone: 'waiting' },
};

// report-model severity → .sevbar segment class / .sev chip class.
const SEV_BAR_CLASS: Record<Severity, string> = {
    critical: 's-crit',
    high: 's-high',
    informational: 's-info',
    low: 's-low',
    medium: 's-med',
};
const SEV_CHIP_CLASS: Record<Severity, string> = {
    critical: 'sev-crit',
    high: 'sev-high',
    informational: 'sev-info',
    low: 'sev-low',
    medium: 'sev-med',
};

// Aggregate a flow's raw findings (severity-only) into per-severity counts.
const aggregateFindings = (findings: Array<{ severity: string }>): SeverityCounts => {
    const counts = emptySeverityCounts();

    for (const finding of findings) {
        if (finding.severity in counts) {
            counts[finding.severity as Severity] += 1;
        }
    }

    return counts;
};

const findingsTotal = (counts: SeverityCounts) => SEVERITY_ORDER.reduce((sum, key) => sum + counts[key], 0);

// Stacked severity mix bar (.sevbar with s-* spans, proportional widths).
const SevBar = ({ counts }: { counts: SeverityCounts }) => {
    const total = findingsTotal(counts);

    return (
        <div className="sevbar">
            {total > 0 &&
                SEVERITY_ORDER.filter((severity) => counts[severity] > 0).map((severity) => (
                    <span
                        className={SEV_BAR_CLASS[severity]}
                        key={severity}
                        style={{ width: `${(counts[severity] / total) * 100}%` }}
                    />
                ))}
        </div>
    );
};

// Row of severity count chips (.sev) using the shared severity palette for labels + colors.
// The bare `.counts` rule is scoped to `.dossier .d-sev`, so we add flex/gap utilities
// too — that keeps the chips laid out both inside a dossier and in the header roll-up.
const SevCounts = ({ counts }: { counts: SeverityCounts }) => (
    <div className="counts flex flex-wrap items-center gap-2.5">
        {SEVERITY_ORDER.filter((severity) => counts[severity] > 0).map((severity) => (
            <span
                className={cn('sev', SEV_CHIP_CLASS[severity])}
                key={severity}
            >
                <span className="sq" />
                {getSeverityStyle(severity).label} {counts[severity]}
            </span>
        ))}
    </div>
);

// A child-flow dossier on the scan detail page, with the same lifecycle actions a
// flow has — Open / Finish / Rename / Delete — reusing the existing flow mutations.
// It surfaces the flow's rolled-up findings as a .sev counts row + .sevbar mix bar
// (or a muted "No findings yet"). onChanged refetches the parent scan.
const FlowCard = ({
    counts,
    flow,
    onChanged,
    targetType,
}: {
    counts: SeverityCounts;
    flow: FlowFragmentFragment;
    onChanged: () => void;
    targetType: TargetType;
}) => {
    const [finishFlow] = useFinishFlowMutation();
    const [deleteFlow] = useDeleteFlowMutation();
    const [renameFlow] = useRenameFlowMutation();
    const navigate = useNavigate();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [title, setTitle] = useState(flow.title);
    const [isBusy, setIsBusy] = useState(false);

    const isActive =
        flow.status === StatusType.Created || flow.status === StatusType.Running || flow.status === StatusType.Waiting;
    const isRunning = flow.status === StatusType.Running;
    const meta = STATUS_META[flow.status];
    const findingCount = findingsTotal(counts);
    const Glyph = TARGET_GLYPH[targetType] ?? Box;

    const handleFinish = async () => {
        try {
            await finishFlow({ variables: { flowId: flow.id } });
            toast.success('Flow finished');
            onChanged();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to finish flow');
        }
    };

    const handleRename = async () => {
        if (!title.trim()) {
            return;
        }

        setIsBusy(true);

        try {
            await renameFlow({ variables: { flowId: flow.id, title: title.trim() } });
            toast.success('Flow renamed');
            setIsRenameOpen(false);
            onChanged();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to rename flow');
        } finally {
            setIsBusy(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleteOpen(false);

        try {
            await deleteFlow({ variables: { flowId: flow.id } });
            toast.success('Flow deleted');
            onChanged();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete flow');
        }
    };

    return (
        <>
            <div className="flex flex-col">
                {/* Mode/cockpit header row above the dossier (matches scandetail.js).
                    NOTE: the prototype's leading MODE chip (Automation/Assistant) is
                    omitted — a flow's run mode (ScanRunMode) is a scan-creation input and
                    is not queryable per-Flow (FlowFragmentFragment has no mode field), so
                    there is no data to drive it here without adding a query. */}
                <div className="mb-2 flex items-center gap-2">
                    <span className="flex-1" />
                    <button
                        className="phase hover:text-foreground inline-flex items-center gap-1 transition-colors"
                        onClick={() => navigate(`/flows/${flow.id}`)}
                        type="button"
                    >
                        Open cockpit
                        <ChevronRight className="size-3" />
                    </button>
                </div>
                <div
                    className={cn('dossier', isRunning && 'is-running')}
                    onClick={() => navigate(`/flows/${flow.id}`)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/flows/${flow.id}`);
                        }
                    }}
                    role="button"
                    tabIndex={0}
                >
                    <div className="d-top">
                        <span className="tgt-glyph">
                            <Glyph className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="d-name">{flow.title}</div>
                            <div className="d-id">
                                #{flow.id} · {getTargetTypeLabel(targetType)}
                                {flow.provider?.name ? ` · ${flow.provider.name}` : ''}
                            </div>
                        </div>
                        {meta ? (
                            <StatusPill
                                className="shrink-0"
                                label={meta.label}
                                pulse={meta.pulse}
                                tone={meta.tone}
                            />
                        ) : null}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    className="-mr-1.5 size-7 shrink-0"
                                    // the dossier itself opens the flow; keep the menu button from triggering that
                                    onClick={(e) => e.stopPropagation()}
                                    size="icon"
                                    variant="ghost"
                                >
                                    <MoreVertical className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                // portaled menu content still bubbles through the React tree to the dossier's
                                // onClick — stop it so item clicks don't navigate to the flow
                                onClick={(e) => e.stopPropagation()}
                            >
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        // keep focus on the trigger so the dialog can grab it cleanly
                                        e.preventDefault();
                                        setTitle(flow.title);
                                        setIsRenameOpen(true);
                                    }}
                                >
                                    <Pencil className="size-4" />
                                    Rename
                                </DropdownMenuItem>
                                {isActive ? (
                                    <DropdownMenuItem onSelect={() => void handleFinish()}>
                                        <CheckCircle2 className="size-4" />
                                        Finish
                                    </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setIsDeleteOpen(true);
                                    }}
                                >
                                    <Trash2 className="size-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div
                        className="d-sev"
                        style={{ margin: '12px 0 2px' }}
                    >
                        {findingCount > 0 ? (
                            <>
                                <SevCounts counts={counts} />
                                <SevBar counts={counts} />
                            </>
                        ) : (
                            <span className="text-muted-foreground font-mono text-[11px]">No findings yet</span>
                        )}
                    </div>

                    <div className="d-foot">
                        <span className="chip">
                            <Cpu className="size-[13px]" />
                            {flow.provider?.name || 'N/A'}
                        </span>
                        <span className="flex-1" />
                        <span className="phase">{formatDate(flow.createdAt)}</span>
                    </div>
                </div>
            </div>

            {/* Dialogs are siblings of the dossier (not descendants) so their button clicks don't
                bubble to the dossier's onClick and navigate to the flow. */}
            <Dialog
                onOpenChange={setIsRenameOpen}
                open={isRenameOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename flow</DialogTitle>
                    </DialogHeader>
                    <Input
                        autoFocus
                        onChange={(event) => setTitle(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && void handleRename()}
                        value={title}
                    />
                    <DialogFooter>
                        <Button
                            onClick={() => setIsRenameOpen(false)}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={isBusy || !title.trim()}
                            onClick={() => void handleRename()}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                confirmIcon={<Trash2 />}
                confirmText="Delete"
                confirmVariant="destructive"
                description="This will delete this flow. This cannot be undone."
                handleConfirm={() => void handleDelete()}
                handleOpenChange={setIsDeleteOpen}
                isOpen={isDeleteOpen}
                itemName={flow.title}
                itemType="flow"
                title="Delete flow?"
            />
        </>
    );
};

const Domain = () => {
    const navigate = useNavigate();
    const { domain, isLoading, refetch } = useDomain();
    const { deleteDomain } = useDomains();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [page, setPage] = useState(0);

    // Per-flow severity aggregates (id → counts), computed once from each child
    // flow's findings; the scan-level roll-up is the sum across all child flows.
    const findingsByFlow = useMemo(() => {
        const map = new Map<string, SeverityCounts>();

        for (const flow of domain?.flows ?? []) {
            map.set(flow.id, aggregateFindings((flow as FlowWithFindings).findings ?? []));
        }

        return map;
    }, [domain?.flows]);

    const scanCounts = useMemo(() => {
        const counts = emptySeverityCounts();

        for (const flow of domain?.flows ?? []) {
            for (const finding of (flow as FlowWithFindings).findings ?? []) {
                if (finding.severity in counts) {
                    counts[finding.severity as Severity] += 1;
                }
            }
        }

        return counts;
    }, [domain?.flows]);

    // A freshly-created scan has no child flows yet while the backend classifies the
    // target and spins them up — show the animated boot state instead of an empty page.
    const isScanBooting =
        !!domain &&
        domain.flows.length === 0 &&
        (domain.status === DomainStatusType.Created ||
            domain.status === DomainStatusType.Classifying ||
            domain.status === DomainStatusType.Running);
    const scanStage = useScanStage(undefined, isScanBooting || (isLoading && !domain));

    if (isLoading && !domain) {
        return (
            <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center p-4">
                <ScanInitializing stageIndex={scanStage} />
            </div>
        );
    }

    if (!domain) {
        return (
            <Empty className="min-h-[calc(100dvh-3rem)]">
                <EmptyHeader>
                    <EmptyTitle>Scan not found</EmptyTitle>
                    <EmptyDescription>This scan may have been deleted or you do not have access.</EmptyDescription>
                </EmptyHeader>
                <Button
                    onClick={() => navigate('/scans')}
                    variant="outline"
                >
                    <ArrowLeft />
                    Back to scans
                </Button>
            </Empty>
        );
    }

    const Glyph = TARGET_GLYPH[domain.targetType] ?? Box;
    const totalFindings = findingsTotal(scanCounts);
    const flowCount = domain.flows.length;

    // The scan's report is the report of its primary (first) child flow — same target
    // the prototype's Report action points at. Undefined until a child flow exists.
    const reportFlowId = domain.flows[0]?.id;

    // Client-side pagination over the scan's child flows.
    const pageCount = Math.max(1, Math.ceil(flowCount / PAGE_SIZE));
    const safePage = Math.min(page, pageCount - 1);
    const pageFlows = domain.flows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
    const rangeStart = flowCount === 0 ? 0 : safePage * PAGE_SIZE + 1;
    const rangeEnd = Math.min(flowCount, safePage * PAGE_SIZE + PAGE_SIZE);

    return (
        <>
            <CommandBar
                actions={
                    <>
                        <Button
                            disabled={!reportFlowId}
                            onClick={() => reportFlowId && navigate(`/flows/${reportFlowId}/report`)}
                            size="sm"
                            variant="outline"
                        >
                            <Download />
                            Report
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    className="size-8"
                                    size="icon"
                                    variant="outline"
                                >
                                    <MoreVertical />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setIsDeleteOpen(true);
                                    }}
                                >
                                    <Trash2 className="size-4" />
                                    Delete scan
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
                ctx={
                    <>
                        {getTargetTypeLabel(domain.targetType)}
                        {domain.scope ? (
                            <>
                                <span className="text-muted-foreground/50">·</span>
                                {domain.scope}
                            </>
                        ) : null}
                    </>
                }
                title={<span className="font-mono">{domain.name}</span>}
            />

            <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 p-6">
                {/* (1) Scan header dossier — identity + scan-level findings roll-up. */}
                <Card className="relative overflow-hidden">
                    {domain.status === DomainStatusType.Running ? (
                        <span
                            aria-hidden
                            className="scanline"
                        />
                    ) : (
                        <span
                            aria-hidden
                            className={cn(
                                'absolute inset-y-0 left-0 w-[3px]',
                                STATUS_EDGE[domain.status] ?? STATUS_EDGE.created,
                            )}
                        />
                    )}
                    <div className="flex flex-col p-5">
                        {/* identity row */}
                        <div className="flex flex-row items-start gap-3.5">
                            <span className="bg-muted text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-lg border">
                                <Glyph className="size-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-mono text-lg font-semibold tracking-tight">
                                    {domain.name}
                                </div>
                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                    <TargetTypeChip type={domain.targetType} />
                                    {domain.scope ? (
                                        <span className="chip">
                                            <Shield className="size-[13px]" />
                                            {domain.scope}
                                        </span>
                                    ) : null}
                                    {domain.box ? (
                                        <span className="chip">
                                            <Box className="size-[13px]" />
                                            {domain.box} box
                                        </span>
                                    ) : null}
                                    <span className="chip">
                                        <Clock className="size-[13px]" />
                                        {formatDate(domain.createdAt)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2.5">
                                <DomainStatusBadge status={domain.status} />
                                <span className="text-muted-foreground font-mono text-xs">
                                    {flowCount} child flow{flowCount === 1 ? '' : 's'}
                                </span>
                            </div>
                        </div>

                        {/* divider */}
                        <div className="bg-border my-[18px] h-px" />

                        {/* scan-level severity roll-up */}
                        <div className="flex flex-wrap items-end gap-x-7 gap-y-4">
                            <div className="min-w-[220px] flex-1">
                                <div className="mb-[11px] overline">Scan severity · rolled up from child flows</div>
                                <SevBar counts={scanCounts} />
                                <div className="mt-3">
                                    {totalFindings > 0 ? (
                                        <SevCounts counts={scanCounts} />
                                    ) : (
                                        <span className="text-muted-foreground font-mono text-[11px]">
                                            No findings yet
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <div className="overline">Findings</div>
                                <div className="mt-1 font-mono text-3xl font-bold tracking-tight tabular-nums">
                                    {totalFindings}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* (2) Related child flows. */}
                {isScanBooting ? (
                    <div className="flex min-h-80 items-center justify-center">
                        <ScanInitializing stageIndex={scanStage} />
                    </div>
                ) : flowCount === 0 ? (
                    <Empty className="min-h-64">
                        <EmptyHeader>
                            <EmptyTitle>No flows</EmptyTitle>
                            <EmptyDescription>This scan has no child flows.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="overline">Related flows · {flowCount}</span>
                            <span className="flex-1" />
                            <span className="text-muted-foreground text-xs">
                                This scan groups {flowCount} flow{flowCount === 1 ? '' : 's'} run against the target
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {pageFlows.map((flow) => (
                                <FlowCard
                                    counts={findingsByFlow.get(flow.id) ?? emptySeverityCounts()}
                                    flow={flow}
                                    key={flow.id}
                                    onChanged={refetch}
                                    targetType={domain.targetType}
                                />
                            ))}
                        </div>

                        {pageCount > 1 ? (
                            <div className="pager">
                                <span className="text-muted-foreground font-mono text-[11.5px]">
                                    Showing {rangeStart}–{rangeEnd} of {flowCount.toLocaleString()}
                                </span>
                                <span className="flex-1" />
                                <span className="text-muted-foreground mr-3 font-mono text-[11px]">
                                    Rows {PAGE_SIZE}
                                </span>
                                <div className="pg-group">
                                    <button
                                        className="pg-btn"
                                        disabled={safePage === 0}
                                        onClick={() => setPage(safePage - 1)}
                                        title="Previous"
                                        type="button"
                                    >
                                        <ChevronLeft />
                                    </button>
                                    {Array.from({ length: Math.min(pageCount, 5) }, (_, index) => index + 1).map(
                                        (pageNumber) => (
                                            <button
                                                className={cn('pg-btn', pageNumber - 1 === safePage && 'active')}
                                                key={pageNumber}
                                                onClick={() => setPage(pageNumber - 1)}
                                                type="button"
                                            >
                                                {pageNumber}
                                            </button>
                                        ),
                                    )}
                                    {pageCount > 5 && (
                                        <>
                                            <span className="text-muted-foreground px-1 font-mono">…</span>
                                            <button
                                                className={cn('pg-btn', pageCount - 1 === safePage && 'active')}
                                                onClick={() => setPage(pageCount - 1)}
                                                type="button"
                                            >
                                                {pageCount}
                                            </button>
                                        </>
                                    )}
                                    <button
                                        className="pg-btn"
                                        disabled={safePage >= pageCount - 1}
                                        onClick={() => setPage(safePage + 1)}
                                        title="Next"
                                        type="button"
                                    >
                                        <ChevronRight />
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            <ConfirmationDialog
                confirmIcon={<Trash2 />}
                confirmText="Delete"
                confirmVariant="destructive"
                description="This will soft-delete the scan and abort any running child flows. This cannot be undone."
                handleConfirm={() => {
                    setIsDeleteOpen(false);
                    void deleteDomain(domain).then((ok) => {
                        if (ok) {
                            navigate('/scans');
                        }
                    });
                }}
                handleOpenChange={setIsDeleteOpen}
                isOpen={isDeleteOpen}
                itemName={domain.name}
                itemType="scan"
                title="Delete scan?"
            />
        </>
    );
};

export default Domain;
