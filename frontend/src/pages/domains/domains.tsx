import type { LucideIcon } from 'lucide-react';

import { Box, Braces, Cloud, Globe, Network, Plus, Smartphone, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { DomainStatusBadge } from '@/components/forms/domain-status-badge';
import CommandBar from '@/components/layouts/command-bar';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { DomainStatusType, TargetType } from '@/graphql/types';
import { ALL_TARGET_TYPES, getTargetTypeLabel } from '@/lib/target-type-colors';
import { cn } from '@/lib/utils';
import { type Domain, useDomains } from '@/providers/domains-provider';

const ALL_FILTER = 'all';

const formatDate = (value: string) => new Date(value).toLocaleString();

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

const Kpi = ({
    hero,
    label,
    sub,
    value,
    valueClassName,
}: {
    hero?: boolean;
    label: string;
    sub?: string;
    value: number;
    valueClassName?: string;
}) => (
    <div
        className={cn(
            'bg-card relative overflow-hidden rounded-lg border p-4',
            hero && 'bg-[linear-gradient(160deg,var(--brand-tint),var(--card)_55%)]',
        )}
    >
        <div className="text-muted-foreground font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
            {label}
        </div>
        <div className={cn('mt-2 text-3xl font-bold tracking-tight tabular-nums', valueClassName)}>{value}</div>
        {sub ? <div className="text-muted-foreground mt-1.5 font-mono text-[11px]">{sub}</div> : null}
    </div>
);

const Domains = () => {
    const navigate = useNavigate();
    const { deleteDomain, domains, isLoading } = useDomains();
    const [targetTypeFilter, setTargetTypeFilter] = useState<string>(ALL_FILTER);
    const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);

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

    return (
        <>
            <CommandBar
                actions={
                    <>
                        <Select
                            onValueChange={setTargetTypeFilter}
                            value={targetTypeFilter}
                        >
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="All target types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_FILTER}>All target types</SelectItem>
                                {ALL_TARGET_TYPES.map((type) => (
                                    <SelectItem
                                        key={type}
                                        value={type}
                                    >
                                        {getTargetTypeLabel(type)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button asChild>
                            <Link to="/scans/new">
                                <Plus />
                                New Scan
                            </Link>
                        </Button>
                    </>
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
                ) : filteredDomains.length === 0 ? (
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
                        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <Kpi
                                label="Targets"
                                sub="engagements"
                                value={rollup.targets}
                            />
                            <Kpi
                                hero
                                label="Running now"
                                sub="real-time"
                                value={rollup.running}
                                valueClassName="text-[var(--st-running)]"
                            />
                            <Kpi
                                label="Needs input"
                                sub="awaiting you"
                                value={rollup.waiting}
                            />
                            <Kpi
                                label="Finished"
                                sub="reportable"
                                value={rollup.finished}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredDomains.map((domain) => {
                                const Glyph = TARGET_GLYPH[domain.targetType] ?? Box;

                                return (
                                    <Card
                                        className="hover:border-primary/50 relative cursor-pointer overflow-hidden transition-colors"
                                        key={domain.id}
                                        onClick={() => navigate(`/scans/${domain.id}`)}
                                    >
                                        <span
                                            aria-hidden
                                            className={cn(
                                                'absolute inset-y-0 left-0 w-[3px]',
                                                STATUS_EDGE[domain.status] ?? STATUS_EDGE.created,
                                            )}
                                        />
                                        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                                            <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border">
                                                <Glyph className="size-4" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-mono text-sm font-semibold">
                                                    {domain.name}
                                                </div>
                                                <div className="text-muted-foreground truncate font-mono text-[10.5px]">
                                                    #{domain.id} · {getTargetTypeLabel(domain.targetType)}
                                                    {domain.scope ? ` · ${domain.scope}` : ''}
                                                </div>
                                            </div>
                                            <DomainStatusBadge
                                                className="shrink-0"
                                                status={domain.status}
                                            />
                                            <Button
                                                className="text-muted-foreground hover:text-destructive -mt-1 -mr-2 size-7 shrink-0"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setDeletingDomain(domain);
                                                }}
                                                size="icon"
                                                variant="ghost"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </CardHeader>
                                        <CardFooter className="text-muted-foreground justify-between font-mono text-[11px]">
                                            <span>{formatDate(domain.createdAt)}</span>
                                            <span>
                                                {domain.flows.length} flow{domain.flows.length === 1 ? '' : 's'}
                                            </span>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
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
