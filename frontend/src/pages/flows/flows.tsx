import { format, isToday } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
    Box,
    Check,
    ChevronLeft,
    ChevronRight,
    Cpu,
    Eye,
    GitFork,
    Loader2,
    MoreHorizontal,
    Pause,
    Pencil,
    Plus,
    Star,
    Trash,
    X,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import CommandBar from '@/components/layouts/command-bar';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { StatusPill, type StatusTone } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { StatusCard } from '@/components/ui/status-card';
import { Toggle } from '@/components/ui/toggle';
import { FlowFindingsReporter } from '@/features/flows/use-flow-findings';
import { ResultType, StatusType, useRenameFlowMutation } from '@/graphql/types';
import { emptySeverityCounts, type Severity, SEVERITY_ORDER, type SeverityCounts } from '@/lib/report-model';
import { getSeverityStyle } from '@/lib/severity-palette';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/providers/favorites-provider';
import { type Flow, useFlows } from '@/providers/flows-provider';
import { useProviders } from '@/providers/providers-provider';

const PAGE_SIZE = 24;

// Proper-case provider names for chips. Known providers get a curated label;
// anything else falls back to a capitalize of the raw name.
const PROVIDER_LABELS: Record<string, string> = {
    anthropic: 'Anthropic',
    gemini: 'Gemini',
    kimi: 'Kimi',
    openai: 'OpenAI',
};

const providerLabel = (name?: null | string): string => {
    if (!name) {
        return 'N/A';
    }

    return PROVIDER_LABELS[name.toLowerCase()] ?? name.charAt(0).toUpperCase() + name.slice(1);
};

// The flows list query augments every flow with its findings (severity only).
// That field lives on the runtime object but is not part of the base
// FlowFragmentFragment type, so we read it through this local widening.
type FlowWithFindings = Flow & { findings?: Array<{ severity: string }> };

// Operational status → EMBER status-ramp tone + prototype label + pulse.
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

// Status filter chips (parity with the scans toolbar). value → matched StatusType.
const STATUS_FILTERS: Array<{ label: string; status?: StatusType; value: string }> = [
    { label: 'All', value: 'all' },
    { label: 'Running', status: StatusType.Running, value: 'running' },
    { label: 'Needs input', status: StatusType.Waiting, value: 'waiting' },
    { label: 'Finished', status: StatusType.Finished, value: 'finished' },
    { label: 'Failed', status: StatusType.Failed, value: 'failed' },
];

const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);

    if (isToday(date)) {
        return format(date, 'HH:mm:ss', { locale: enUS });
    }

    return format(date, 'd MMM yyyy', { locale: enUS });
};

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
const SevCounts = ({ counts }: { counts: SeverityCounts }) => (
    <div className="counts">
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

const Flows = () => {
    const navigate = useNavigate();
    const { deleteFlow, finishFlow, flows, isLoading } = useFlows();
    const { isFavoriteFlow, toggleFavoriteFlow } = useFavorites();
    const { canManageProviders } = useProviders();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingFlow, setDeletingFlow] = useState<Flow | null>(null);
    const [finishingFlowIds, setFinishingFlowIds] = useState<Set<string>>(new Set());
    const [deletingFlowIds, setDeletingFlowIds] = useState<Set<string>>(new Set());
    const [editingFlowId, setEditingFlowId] = useState<null | string>(null);
    const editingInputRef = useRef<HTMLInputElement>(null);
    const [renameFlowMutation, { loading: isRenameLoading }] = useRenameFlowMutation();

    // Local presentation state: view mode, status filter, current page.
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);

    // Assistant-mode findings resolved lazily per rendered card (see
    // FlowFindingsReporter): flow.findings only carries automation findings, so
    // assistant-mode flows fall back to a per-flow assistants() query.
    const [assistantCountsByFlow, setAssistantCountsByFlow] = useState<Record<string, SeverityCounts>>({});
    const handleFlowCountsResolved = useCallback((flowId: string, counts: SeverityCounts) => {
        setAssistantCountsByFlow((previous) =>
            previous[flowId] === counts ? previous : { ...previous, [flowId]: counts },
        );
    }, []);

    const handleFlowOpen = useCallback(
        (flowId: string) => {
            navigate(`/flows/${flowId}`);
        },
        [navigate],
    );

    const handleFlowDeleteDialogOpen = useCallback((flow: Flow) => {
        setDeletingFlow(flow);
        setIsDeleteDialogOpen(true);
    }, []);

    const handleFlowRenameStart = useCallback((flow: Flow) => {
        setEditingFlowId(flow.id);
    }, []);

    const handleFlowDelete = async () => {
        if (!deletingFlow) {
            return;
        }

        setDeletingFlowIds((previousIds) => new Set(previousIds).add(deletingFlow.id));

        try {
            const success = await deleteFlow(deletingFlow);

            if (success) {
                setDeletingFlow(null);
            }
        } finally {
            setDeletingFlowIds((previousIds) => {
                const newIds = new Set(previousIds);
                newIds.delete(deletingFlow.id);

                return newIds;
            });
        }
    };

    const handleFlowRenameSave = useCallback(async () => {
        const newTitle = editingInputRef.current?.value.trim();

        if (!editingFlowId || !newTitle) {
            return;
        }

        try {
            const { data } = await renameFlowMutation({
                variables: {
                    flowId: editingFlowId,
                    title: newTitle,
                },
            });

            if (data?.renameFlow === ResultType.Success) {
                toast.success('Flow renamed successfully');
                setEditingFlowId(null);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to rename flow';
            toast.error(errorMessage);
        }
    }, [editingFlowId, renameFlowMutation]);

    const handleFlowRenameCancel = useCallback(() => {
        setEditingFlowId(null);
    }, []);

    const handleFlowFinish = useCallback(
        async (flow: Flow) => {
            setFinishingFlowIds((previousIds) => new Set(previousIds).add(flow.id));

            try {
                await finishFlow(flow);
            } finally {
                setFinishingFlowIds((previousIds) => {
                    const newIds = new Set(previousIds);
                    newIds.delete(flow.id);

                    return newIds;
                });
            }
        },
        [finishFlow],
    );

    const handleRowClick = useCallback(
        (flow: Flow) => {
            if (editingFlowId !== flow.id) {
                handleFlowOpen(flow.id);
            }
        },
        [editingFlowId, handleFlowOpen],
    );

    const renderRowContextMenu = useCallback(
        (flow: Flow) => {
            const isRunning = ![StatusType.Failed, StatusType.Finished].includes(flow.status);

            return (
                <>
                    <ContextMenuItem onClick={async () => toggleFavoriteFlow(flow.id)}>
                        <Star />
                        {isFavoriteFlow(flow.id) ? 'Remove from favorites' : 'Add to favorites'}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => handleFlowOpen(flow.id)}>
                        <Eye />
                        View
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleFlowRenameStart(flow)}>
                        <Pencil />
                        Rename
                    </ContextMenuItem>

                    {isRunning && (
                        <ContextMenuItem
                            disabled={finishingFlowIds.has(flow.id)}
                            onClick={() => handleFlowFinish(flow)}
                        >
                            <Pause />
                            {finishingFlowIds.has(flow.id) ? 'Finishing...' : 'Finish'}
                        </ContextMenuItem>
                    )}
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        disabled={deletingFlowIds.has(flow.id)}
                        onClick={() => handleFlowDeleteDialogOpen(flow)}
                    >
                        <Trash />
                        {deletingFlowIds.has(flow.id) ? 'Deleting...' : 'Delete'}
                    </ContextMenuItem>
                </>
            );
        },
        [
            deletingFlowIds,
            finishingFlowIds,
            handleFlowDeleteDialogOpen,
            handleFlowFinish,
            handleFlowOpen,
            handleFlowRenameStart,
            isFavoriteFlow,
            toggleFavoriteFlow,
        ],
    );

    // Inline rename field, shared by grid dossiers and list rows.
    const renderRenameInput = useCallback(
        (title: string) => (
            <InputGroup
                className="h-8"
                onClick={(e) => e.stopPropagation()}
            >
                <InputGroupInput
                    autoFocus
                    defaultValue={title}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleFlowRenameSave();

                            return;
                        }

                        if (e.key === 'Escape') {
                            handleFlowRenameCancel();
                        }
                    }}
                    placeholder="Flow title"
                    ref={editingInputRef}
                />
                <InputGroupAddon
                    align="inline-end"
                    className="gap-0 pr-2"
                >
                    <InputGroupButton
                        disabled={isRenameLoading}
                        onClick={() => handleFlowRenameSave()}
                    >
                        {isRenameLoading ? <Loader2 className="animate-spin" /> : <Check />}
                    </InputGroupButton>
                    <InputGroupButton onClick={() => handleFlowRenameCancel()}>
                        <X />
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        ),
        [handleFlowRenameCancel, handleFlowRenameSave, isRenameLoading],
    );

    // Shared "more" actions menu (View/Rename/Finish/Delete) — used by both the
    // list rows and the grid dossier cards so they expose the same affordances.
    const renderMoreMenu = useCallback(
        (flow: Flow) => {
            const isRunning = ![StatusType.Failed, StatusType.Finished].includes(flow.status);

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            className="size-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                            variant="ghost"
                        >
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="min-w-24"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <DropdownMenuItem onClick={() => handleFlowOpen(flow.id)}>
                            <Eye />
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleFlowRenameStart(flow)}>
                            <Pencil className="size-3" />
                            Rename
                        </DropdownMenuItem>
                        {isRunning && (
                            <DropdownMenuItem
                                disabled={finishingFlowIds.has(flow.id)}
                                onClick={() => handleFlowFinish(flow)}
                            >
                                {finishingFlowIds.has(flow.id) ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        Finishing...
                                    </>
                                ) : (
                                    <>
                                        <Pause />
                                        Finish
                                    </>
                                )}
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            disabled={deletingFlowIds.has(flow.id)}
                            onClick={() => handleFlowDeleteDialogOpen(flow)}
                        >
                            {deletingFlowIds.has(flow.id) ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash className="size-4" />
                                    Delete
                                </>
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
        [
            deletingFlowIds,
            finishingFlowIds,
            handleFlowDeleteDialogOpen,
            handleFlowFinish,
            handleFlowOpen,
            handleFlowRenameStart,
        ],
    );

    // Per-row visible action affordances (favorite star + more menu).
    const renderRowActions = useCallback(
        (flow: Flow) => (
            <div className="flex items-center justify-end gap-1">
                <Toggle
                    aria-label="Toggle favorite"
                    className="border-none data-[state=on]:bg-transparent data-[state=on]:*:[svg]:fill-yellow-500 data-[state=on]:*:[svg]:stroke-yellow-500"
                    onClick={async (event) => {
                        event.stopPropagation();
                        await toggleFavoriteFlow(flow.id);
                    }}
                    pressed={isFavoriteFlow(flow.id)}
                    size="sm"
                    variant="outline"
                >
                    <Star className="size-4" />
                </Toggle>
                {renderMoreMenu(flow)}
            </div>
        ),
        [isFavoriteFlow, renderMoreMenu, toggleFavoriteFlow],
    );

    // Client-side filter → the full list is already loaded by the provider.
    const filteredFlows = useMemo(() => {
        const active = STATUS_FILTERS.find((filter) => filter.value === statusFilter);
        const query = searchTerm.trim().toLowerCase();

        return flows.filter((flow) => {
            if (active?.status && flow.status !== active.status) {
                return false;
            }

            if (query && !flow.title.toLowerCase().includes(query)) {
                return false;
            }

            return true;
        });
    }, [flows, statusFilter, searchTerm]);

    // Pre-compute severity aggregates once per flow.
    const findingsByFlow = useMemo(() => {
        const map = new Map<string, SeverityCounts>();

        for (const flow of filteredFlows) {
            map.set(flow.id, aggregateFindings((flow as FlowWithFindings).findings ?? []));
        }

        return map;
    }, [filteredFlows]);

    // Prefer lazily-resolved counts (automation OR assistant); fall back to the
    // automation-only aggregate until the reporter for that flow resolves.
    const getFlowCounts = useCallback(
        (flowId: string): SeverityCounts =>
            assistantCountsByFlow[flowId] ?? findingsByFlow.get(flowId) ?? emptySeverityCounts(),
        [assistantCountsByFlow, findingsByFlow],
    );

    const total = filteredFlows.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, pageCount - 1);
    const pageFlows = useMemo(
        () => filteredFlows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
        [filteredFlows, safePage],
    );
    const rangeStart = total === 0 ? 0 : safePage * PAGE_SIZE + 1;
    const rangeEnd = Math.min(total, safePage * PAGE_SIZE + PAGE_SIZE);

    const handleFilterChange = useCallback((value: string) => {
        setStatusFilter(value);
        setPage(0);
    }, []);

    const handleSearchChange = useCallback((value: string) => {
        setSearchTerm(value);
        setPage(0);
    }, []);

    const pager = (
        <div className="pager mt-5">
            <span className="text-muted-foreground font-mono text-[11.5px]">
                Showing {rangeStart}–{rangeEnd} of {total.toLocaleString()}
            </span>
            <span className="flex-1" />
            <span className="text-muted-foreground mr-3 font-mono text-[11px]">Rows {PAGE_SIZE}</span>
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
                {Array.from({ length: Math.min(pageCount, 5) }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                        className={cn('pg-btn', pageNumber - 1 === safePage && 'active')}
                        key={pageNumber}
                        onClick={() => setPage(pageNumber - 1)}
                        type="button"
                    >
                        {pageNumber}
                    </button>
                ))}
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
    );

    const pageHeader = (
        <CommandBar
            actions={
                <Button
                    onClick={() => navigate('/flows/new')}
                    size="sm"
                    variant="default"
                >
                    <Plus />
                    New Flow
                </Button>
            }
            ctx={
                <>
                    <span className="text-foreground font-semibold">{flows.length}</span> flows
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-[var(--st-running)]">
                        {flows.filter((flow) => flow.status === StatusType.Running).length} running
                    </span>
                </>
            }
            search={{ onChange: handleSearchChange, placeholder: 'Search flows', value: searchTerm }}
            title="Flows"
        />
    );

    if (isLoading) {
        return (
            <>
                {pageHeader}
                <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 p-6">
                    <StatusCard
                        description="Please wait while we fetch your conversation flows"
                        icon={<Loader2 className="text-muted-foreground size-16 animate-spin" />}
                        title="Loading flows..."
                    />
                </div>
            </>
        );
    }

    // Check if flows list is empty
    if (flows.length === 0) {
        return (
            <>
                {pageHeader}
                <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 p-6">
                    <StatusCard
                        action={
                            <Button
                                onClick={() => navigate('/flows/new')}
                                variant="default"
                            >
                                <Plus />
                                New Flow
                            </Button>
                        }
                        description="Get started by creating your first conversation flow"
                        icon={<GitFork className="text-muted-foreground size-8" />}
                        title="No flows found"
                    />
                </div>
            </>
        );
    }

    return (
        <>
            {pageHeader}
            <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 p-6">
                {/* Toolbar — status filters + Grid/List segmented toggle (search lives in the top nav). */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="seg">
                        <button
                            className={cn(view === 'grid' && 'active')}
                            onClick={() => setView('grid')}
                            type="button"
                        >
                            Grid
                        </button>
                        <button
                            className={cn(view === 'list' && 'active')}
                            onClick={() => setView('list')}
                            type="button"
                        >
                            List
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {STATUS_FILTERS.map((filter) => (
                            <button
                                className={cn('chip cursor-pointer', statusFilter === filter.value && 'chip-on')}
                                key={filter.value}
                                onClick={() => handleFilterChange(filter.value)}
                                type="button"
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <span className="flex-1" />
                </div>

                {/* Lazily resolve each rendered flow's findings (automation OR assistant). */}
                {pageFlows.map((flow) => (
                    <FlowFindingsReporter
                        automationFindings={(flow as FlowWithFindings).findings}
                        flowId={flow.id}
                        key={flow.id}
                        onResolved={handleFlowCountsResolved}
                    />
                ))}

                {total === 0 ? (
                    <div className="text-muted-foreground border-border rounded-lg border border-dashed px-6 py-16 text-center font-mono text-sm">
                        No flows match this filter.
                    </div>
                ) : view === 'grid' ? (
                    <div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {pageFlows.map((flow) => {
                                const counts = getFlowCounts(flow.id);
                                const findingCount = findingsTotal(counts);
                                const meta = STATUS_META[flow.status];
                                const isRunning = flow.status === StatusType.Running;
                                const isEditing = editingFlowId === flow.id;

                                return (
                                    <ContextMenu key={flow.id}>
                                        <ContextMenuTrigger asChild>
                                            <div
                                                className={cn('dossier', isRunning && 'is-running')}
                                                onClick={() => handleRowClick(flow)}
                                            >
                                                <div className="d-top">
                                                    <span className="tgt-glyph">
                                                        <Box className="size-4" />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        {isEditing ? (
                                                            renderRenameInput(flow.title)
                                                        ) : (
                                                            <>
                                                                <div className="d-name">{flow.title}</div>
                                                                <div className="d-id">#{flow.id}</div>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="ml-auto flex shrink-0 items-center gap-1">
                                                        {meta ? (
                                                            <StatusPill
                                                                label={meta.label}
                                                                pulse={meta.pulse}
                                                                tone={meta.tone}
                                                            />
                                                        ) : null}
                                                        {renderMoreMenu(flow)}
                                                    </div>
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
                                                        <span className="text-muted-foreground font-mono text-[11px]">
                                                            No findings yet
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="d-foot">
                                                    {canManageProviders && (
                                                        <span
                                                            className="chip"
                                                            title={`Provider: ${providerLabel(flow.provider?.name)}`}
                                                        >
                                                            <Cpu className="size-[13px]" />
                                                            {providerLabel(flow.provider?.name)}
                                                        </span>
                                                    )}
                                                    <span className="phase">{formatDateTime(flow.createdAt)}</span>
                                                    <span className="flex-1" />
                                                </div>
                                            </div>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent className="min-w-40">
                                            {renderRowContextMenu(flow)}
                                        </ContextMenuContent>
                                    </ContextMenu>
                                );
                            })}
                        </div>
                        {pager}
                    </div>
                ) : (
                    <div className="border-border bg-card overflow-hidden rounded-lg border">
                        <div className="overflow-x-auto">
                            <table className="tbl">
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>ID</th>
                                        <th>Title</th>
                                        {canManageProviders && <th>Provider</th>}
                                        <th>Findings</th>
                                        <th>Created</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageFlows.map((flow) => {
                                        const counts = getFlowCounts(flow.id);
                                        const findingCount = findingsTotal(counts);
                                        const meta = STATUS_META[flow.status];
                                        const isEditing = editingFlowId === flow.id;

                                        return (
                                            <ContextMenu key={flow.id}>
                                                <ContextMenuTrigger asChild>
                                                    <tr onClick={() => handleRowClick(flow)}>
                                                        <td>
                                                            {meta ? (
                                                                <StatusPill
                                                                    label={meta.label}
                                                                    pulse={meta.pulse}
                                                                    tone={meta.tone}
                                                                />
                                                            ) : null}
                                                        </td>
                                                        <td className="m text-muted-foreground">#{flow.id}</td>
                                                        <td
                                                            className="font-medium"
                                                            style={{ maxWidth: 280 }}
                                                        >
                                                            {isEditing ? (
                                                                renderRenameInput(flow.title)
                                                            ) : (
                                                                <span className="block truncate">{flow.title}</span>
                                                            )}
                                                        </td>
                                                        {canManageProviders && (
                                                            <td>
                                                                <span
                                                                    className="chip"
                                                                    title={`Provider: ${providerLabel(flow.provider?.name)}`}
                                                                >
                                                                    <Cpu className="size-[13px]" />
                                                                    {providerLabel(flow.provider?.name)}
                                                                </span>
                                                            </td>
                                                        )}
                                                        <td style={{ minWidth: 150 }}>
                                                            <div className="flex items-center gap-2.5">
                                                                <span className="min-w-[80px] flex-1">
                                                                    <SevBar counts={counts} />
                                                                </span>
                                                                <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                                                                    {findingCount}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="m text-muted-foreground">
                                                            {formatDateTime(flow.createdAt)}
                                                        </td>
                                                        <td
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ textAlign: 'right', width: 96 }}
                                                        >
                                                            {renderRowActions(flow)}
                                                        </td>
                                                    </tr>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent className="min-w-40">
                                                    {renderRowContextMenu(flow)}
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {pager}
                    </div>
                )}

                <ConfirmationDialog
                    cancelText="Cancel"
                    confirmText="Delete"
                    handleConfirm={handleFlowDelete}
                    handleOpenChange={setIsDeleteDialogOpen}
                    isOpen={isDeleteDialogOpen}
                    itemName={deletingFlow?.title}
                    itemType="flow"
                />
            </div>
        </>
    );
};

export default Flows;
