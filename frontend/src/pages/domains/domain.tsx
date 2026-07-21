import type { LucideIcon } from 'lucide-react';

import {
    ArrowLeft,
    Box,
    Braces,
    CheckCircle2,
    Clock,
    Cloud,
    Globe,
    MoreVertical,
    Network,
    Pencil,
    Shield,
    Smartphone,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DomainStatusBadge } from '@/components/forms/domain-status-badge';
import { TargetTypeChip } from '@/components/forms/target-type-chip';
import { FlowStatusIcon } from '@/components/icons/flow-status-icon';
import CommandBar from '@/components/layouts/command-bar';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { getTargetTypeLabel } from '@/lib/target-type-colors';
import { cn } from '@/lib/utils';
import { useDomain } from '@/providers/domain-provider';
import { useDomains } from '@/providers/domains-provider';

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

// A child-flow card on the scan detail page, with the same lifecycle actions a
// flow has — Open / Finish / Rename / Delete — reusing the existing flow
// mutations. onChanged refetches the parent scan so the list reflects the change.
const FlowCard = ({ flow, onChanged }: { flow: FlowFragmentFragment; onChanged: () => void }) => {
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
            <Card
                className="hover:border-primary/50 hover:bg-muted/30 relative cursor-pointer overflow-hidden transition-colors"
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
                <span
                    aria-hidden
                    className={cn('absolute inset-y-0 left-0 w-[3px]', STATUS_EDGE[flow.status] ?? STATUS_EDGE.created)}
                />
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                    <div className="min-w-0 flex-1">
                        <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
                            <FlowStatusIcon
                                status={flow.status}
                                tooltip={flow.status}
                            />
                            <span className="truncate">{flow.title}</span>
                        </CardTitle>
                        <div className="text-muted-foreground mt-1.5 truncate font-mono text-[10.5px]">
                            #{flow.id} · {flow.provider.name}
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                className="-mt-1 -mr-2 size-7 shrink-0"
                                // the card itself opens the flow; keep the menu button from triggering that
                                onClick={(e) => e.stopPropagation()}
                                size="icon"
                                variant="ghost"
                            >
                                <MoreVertical className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            // portaled menu content still bubbles through the React tree to the card's
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
                </CardHeader>
                <CardContent className="text-muted-foreground font-mono text-[11px]">
                    Started {formatDate(flow.createdAt)}
                </CardContent>
            </Card>

            {/* Dialogs are siblings of the Card (not descendants) so their button clicks don't
                bubble to the card's onClick and navigate to the flow. */}
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

    return (
        <>
            <CommandBar
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
                <Card className="relative overflow-hidden">
                    <span
                        aria-hidden
                        className={cn(
                            'absolute inset-y-0 left-0 w-[3px]',
                            STATUS_EDGE[domain.status] ?? STATUS_EDGE.created,
                        )}
                    />
                    <CardHeader className="flex flex-row items-start gap-3.5 space-y-0">
                        <span className="bg-muted text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-lg border">
                            <Glyph className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="truncate font-mono text-lg font-semibold tracking-tight">{domain.name}</div>
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                <TargetTypeChip type={domain.targetType} />
                                {domain.scope ? (
                                    <Badge
                                        className="border-border gap-1.5 font-medium"
                                        variant="outline"
                                    >
                                        <Shield className="size-3" />
                                        {domain.scope}
                                    </Badge>
                                ) : null}
                                {domain.box ? (
                                    <Badge
                                        className="border-border gap-1.5 font-medium"
                                        variant="outline"
                                    >
                                        <Box className="size-3" />
                                        {domain.box} box
                                    </Badge>
                                ) : null}
                                <Badge
                                    className="border-border gap-1.5 font-medium"
                                    variant="outline"
                                >
                                    <Clock className="size-3" />
                                    {formatDate(domain.createdAt)}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2.5">
                            <DomainStatusBadge status={domain.status} />
                            <span className="text-muted-foreground font-mono text-xs">
                                {domain.flows.length} child flow{domain.flows.length === 1 ? '' : 's'}
                            </span>
                            <Button
                                onClick={() => setIsDeleteOpen(true)}
                                size="sm"
                                variant="destructive"
                            >
                                <Trash2 />
                                Delete scan
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {isScanBooting ? (
                    <div className="flex min-h-80 items-center justify-center">
                        <ScanInitializing stageIndex={scanStage} />
                    </div>
                ) : domain.flows.length === 0 ? (
                    <Empty className="min-h-64">
                        <EmptyHeader>
                            <EmptyTitle>No flows</EmptyTitle>
                            <EmptyDescription>This scan has no child flows.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {domain.flows.map((flow) => (
                            <FlowCard
                                flow={flow}
                                key={flow.id}
                                onChanged={refetch}
                            />
                        ))}
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
