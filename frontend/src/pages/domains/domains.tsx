import type { LucideIcon } from 'lucide-react';

import {
    Box,
    Braces,
    ChevronLeft,
    ChevronRight,
    Cloud,
    Globe,
    ListFilter,
    MoreHorizontal,
    Network,
    Plus,
    Smartphone,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import CommandBar from '@/components/layouts/command-bar';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { DomainStatusType, TargetType } from '@/graphql/types';
import { getTargetTypeLabel } from '@/lib/target-type-colors';
import { cn } from '@/lib/utils';
import { type Domain, useDomains } from '@/providers/domains-provider';

const ALL_FILTER = 'all';
const PAGE_SIZE = 24;

const formatDay = (value: string) => new Date(value).toLocaleDateString();

// A leading glyph for the dossier tile, chosen per target type.
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

// Status → prototype `.status .st-*` label. Values line up 1:1 with the shared
// --st-* token ramp; labels mirror the EMBER prototype copy.
const STATUS_LABEL: Record<DomainStatusType, string> = {
    [DomainStatusType.Classifying]: 'Classifying',
    [DomainStatusType.Created]: 'Queued',
    [DomainStatusType.Failed]: 'Failed',
    [DomainStatusType.Finished]: 'Finished',
    [DomainStatusType.Running]: 'Running',
    [DomainStatusType.Waiting]: 'Needs input',
};

// Type-filter chips shown in the toolbar (matches scans.js: All / Web app / Cloud).
const TYPE_FILTERS: Array<{ label: string; value: string }> = [
    { label: 'All types', value: ALL_FILTER },
    { label: 'Web app', value: TargetType.WebApp },
    { label: 'Cloud', value: TargetType.Cloud },
];

/** Inline status pill matching the prototype `.status` helper (dot + colored label). */
const StatusInline = ({ status }: { status: DomainStatusType }) => (
    <span className={cn('status', `st-${status}`)}>
        <span className="dot" />
        {STATUS_LABEL[status]}
    </span>
);

/** KPI tile matching the prototype `.kpi` block (overline label, big value, mono delta). */
const Kpi = ({
    cap,
    delta,
    hero,
    label,
    up,
    value,
}: {
    cap?: string;
    delta: string;
    hero?: boolean;
    label: string;
    up?: boolean;
    value: number;
}) => (
    <div className={cn('kpi', hero && 'hero')}>
        <div className="k-label">
            <span className="overline">{label}</span>
        </div>
        <div className="k-val">{value}</div>
        <div className={cn('k-delta', up ? 'k-up' : 'k-flat')}>
            <span aria-hidden>{up ? '▲' : '•'}</span> {delta}
            {cap ? <span className="text-muted-foreground"> {cap}</span> : null}
        </div>
    </div>
);

const Domains = () => {
    const navigate = useNavigate();
    const { deleteDomain, domains, isLoading } = useDomains();
    const [targetTypeFilter, setTargetTypeFilter] = useState<string>(ALL_FILTER);
    const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [page, setPage] = useState(1);

    const filteredDomains = useMemo(() => {
        if (targetTypeFilter === ALL_FILTER) {
            return domains;
        }

        return domains.filter((domain) => domain.targetType === (targetTypeFilter as TargetType));
    }, [domains, targetTypeFilter]);

    // Cheap, derived-only status roll-up over the already-loaded domains list —
    // no extra query. Feeds both the command-bar context line and the KPI strip.
    const rollup = useMemo(() => {
        let running = 0;
        let waiting = 0;
        let finished = 0;

        for (const domain of domains) {
            if (domain.status === DomainStatusType.Running) {
                running += 1;
            } else if (domain.status === DomainStatusType.Waiting) {
                waiting += 1;
            } else if (domain.status === DomainStatusType.Finished) {
                finished += 1;
            }
        }

        return { finished, running, targets: domains.length, waiting };
    }, [domains]);

    // Client-side pagination — the provider loads the whole list, we render only
    // the current page so the DOM stays light as the list scales.
    const totalPages = Math.max(1, Math.ceil(filteredDomains.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageDomains = filteredDomains.slice(startIndex, startIndex + PAGE_SIZE);
    const rangeStart = filteredDomains.length === 0 ? 0 : startIndex + 1;
    const rangeEnd = Math.min(startIndex + PAGE_SIZE, filteredDomains.length);

    const selectFilter = (value: string) => {
        setTargetTypeFilter(value);
        setPage(1);
    };

    const renderPager = () => (
        <div className="pager mt-5">
            <span className="text-muted-foreground font-mono text-[11.5px]">
                Showing {rangeStart}–{rangeEnd} of {filteredDomains.length.toLocaleString()}
            </span>
            <span className="ml-auto" />
            <span className="text-muted-foreground mr-3 font-mono text-[11px]">Rows {PAGE_SIZE}</span>
            <div className="pg-group">
                <button
                    className="pg-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    title="Previous"
                    type="button"
                >
                    <ChevronLeft />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                        className={cn('pg-btn', n === currentPage && 'active')}
                        key={n}
                        onClick={() => setPage(n)}
                        type="button"
                    >
                        {n}
                    </button>
                ))}
                <button
                    className="pg-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    title="Next"
                    type="button"
                >
                    <ChevronRight />
                </button>
            </div>
        </div>
    );

    return (
        <>
            <CommandBar
                actions={
                    <Button asChild>
                        <Link to="/scans/new">
                            <Plus />
                            New Scan
                        </Link>
                    </Button>
                }
                ctx={
                    <>
                        <span className="text-foreground font-semibold">{rollup.targets}</span> targets
                        <span className="text-muted-foreground/50">·</span>
                        <span className="text-[var(--st-running)]">{rollup.running} running</span>
                    </>
                }
                title="Scans"
            />

            <div className="mx-auto w-full max-w-[1320px] p-6">
                {isLoading && domains.length === 0 ? (
                    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
                        <Spinner variant="circle" />
                    </div>
                ) : domains.length === 0 ? (
                    <Empty className="min-h-[calc(100dvh-8rem)]">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Globe />
                            </EmptyMedia>
                            <EmptyTitle>No scans yet</EmptyTitle>
                            <EmptyDescription>
                                Create a scan to auto-detect its target type and run the matching templates together.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button asChild>
                                <Link to="/scans/new">
                                    <Plus />
                                    Create your first scan
                                </Link>
                            </Button>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <>
                        {/* KPI strip — cheap counts derived from the loaded domains list. */}
                        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <Kpi
                                delta="engagements"
                                label="Targets"
                                value={rollup.targets}
                            />
                            <Kpi
                                cap="real-time"
                                delta="live"
                                hero={rollup.running > 0}
                                label="Running now"
                                value={rollup.running}
                            />
                            <Kpi
                                delta="awaiting you"
                                label="Needs input"
                                value={rollup.waiting}
                            />
                            <Kpi
                                delta="reportable"
                                label="Finished"
                                up
                                value={rollup.finished}
                            />
                        </div>

                        {/* Toolbar — view toggle + type chips (moved down here) + sort. */}
                        <div className="mb-4 flex flex-wrap items-center gap-2">
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
                            <div className="ml-1.5 flex flex-wrap gap-1.5">
                                {TYPE_FILTERS.map((filter) => (
                                    <button
                                        className={cn('chip', targetTypeFilter === filter.value && 'chip-on')}
                                        key={filter.value}
                                        onClick={() => selectFilter(filter.value)}
                                        type="button"
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                            <span className="ml-auto" />
                            <Button
                                className="text-muted-foreground"
                                size="sm"
                                variant="ghost"
                            >
                                <ListFilter />
                                Sort: Recent
                            </Button>
                        </div>

                        {view === 'grid' ? (
                            <>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {pageDomains.map((domain) => {
                                        const Glyph = TARGET_GLYPH[domain.targetType] ?? Box;
                                        const running = domain.status === DomainStatusType.Running;

                                        return (
                                            <div
                                                className={cn('dossier', running && 'is-running')}
                                                key={domain.id}
                                                onClick={() => navigate(`/scans/${domain.id}`)}
                                            >
                                                <div className="d-top">
                                                    <span className="tgt-glyph">
                                                        <Glyph />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="d-name">{domain.name}</div>
                                                        <div className="d-id">
                                                            #{domain.id} · {getTargetTypeLabel(domain.targetType)}
                                                            {domain.scope ? ` · ${domain.scope}` : ''}
                                                        </div>
                                                    </div>
                                                    <div className="ml-auto flex items-center gap-1">
                                                        <StatusInline status={domain.status} />
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    className="text-muted-foreground hover:text-foreground -mr-1 size-7 shrink-0"
                                                                    onClick={(event) => event.stopPropagation()}
                                                                    size="icon"
                                                                    variant="ghost"
                                                                >
                                                                    <MoreHorizontal className="size-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                align="end"
                                                                onClick={(event) => event.stopPropagation()}
                                                            >
                                                                <DropdownMenuItem
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        setDeletingDomain(domain);
                                                                    }}
                                                                    variant="destructive"
                                                                >
                                                                    <Trash2 />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                                <div className="d-foot">
                                                    <span className="phase">{formatDay(domain.createdAt)}</span>
                                                    <span className="ml-auto" />
                                                    <span className="phase">
                                                        {domain.flows.length} flow
                                                        {domain.flows.length === 1 ? '' : 's'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {renderPager()}
                            </>
                        ) : (
                            <div className="bg-card border-border overflow-hidden rounded-lg border">
                                <div className="overflow-x-auto">
                                    <table className="tbl">
                                        <thead>
                                            <tr>
                                                <th>Status</th>
                                                <th>Target</th>
                                                <th>Type</th>
                                                <th>Scope</th>
                                                <th className="text-right">Flows</th>
                                                <th>Created</th>
                                                <th />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pageDomains.map((domain) => {
                                                const Glyph = TARGET_GLYPH[domain.targetType] ?? Box;

                                                return (
                                                    <tr
                                                        key={domain.id}
                                                        onClick={() => navigate(`/scans/${domain.id}`)}
                                                    >
                                                        <td>
                                                            <StatusInline status={domain.status} />
                                                        </td>
                                                        <td className="m">{domain.name}</td>
                                                        <td>
                                                            <span className="chip">
                                                                <Glyph className="size-[13px]" />
                                                                {getTargetTypeLabel(domain.targetType)}
                                                            </span>
                                                        </td>
                                                        <td className="m text-muted-foreground">
                                                            {domain.scope ?? '—'}
                                                            {domain.box ? ` · ${domain.box}-box` : ''}
                                                        </td>
                                                        <td className="num">{domain.flows.length}</td>
                                                        <td className="m text-muted-foreground">
                                                            {formatDay(domain.createdAt)}
                                                        </td>
                                                        <td className="w-11 text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        className="text-muted-foreground hover:text-foreground ml-auto size-7"
                                                                        onClick={(event) => event.stopPropagation()}
                                                                        size="icon"
                                                                        variant="ghost"
                                                                    >
                                                                        <MoreHorizontal className="size-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent
                                                                    align="end"
                                                                    onClick={(event) => event.stopPropagation()}
                                                                >
                                                                    <DropdownMenuItem
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            setDeletingDomain(domain);
                                                                        }}
                                                                        variant="destructive"
                                                                    >
                                                                        <Trash2 />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {renderPager()}
                            </div>
                        )}
                    </>
                )}
            </div>

            <ConfirmationDialog
                confirmIcon={<Trash2 />}
                confirmText="Delete"
                confirmVariant="destructive"
                description="This will soft-delete the scan and abort any running child flows. This cannot be undone."
                handleConfirm={() => {
                    if (deletingDomain) {
                        void deleteDomain(deletingDomain);
                        setDeletingDomain(null);
                    }
                }}
                handleOpenChange={(open) => {
                    if (!open) {
                        setDeletingDomain(null);
                    }
                }}
                isOpen={deletingDomain !== null}
                itemName={deletingDomain?.name}
                itemType="scan"
                title="Delete scan?"
            />
        </>
    );
};

export default Domains;
