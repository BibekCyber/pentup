import { GitFork, Globe, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { DomainStatusBadge } from '@/components/forms/domain-status-badge';
import { TargetTypeChip } from '@/components/forms/target-type-chip';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { TargetType } from '@/graphql/types';
import { ALL_TARGET_TYPES, getTargetTypeLabel } from '@/lib/target-type-colors';
import { type Domain, useDomains } from '@/providers/domains-provider';

const ALL_FILTER = 'all';

const formatDate = (value: string) => new Date(value).toLocaleString();

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

    return (
        <>
            <header className="bg-background sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    className="mr-2 h-4"
                    orientation="vertical"
                />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbPage>Scans</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="ml-auto flex items-center gap-2">
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
                </div>
            </header>

            <div className="p-4">
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredDomains.map((domain) => (
                            <Card
                                className="hover:border-primary/50 cursor-pointer transition-colors"
                                key={domain.id}
                                onClick={() => navigate(`/scans/${domain.id}`)}
                            >
                                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                                    <CardTitle className="truncate text-base">{domain.name}</CardTitle>
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
                                <CardContent className="flex flex-wrap items-center gap-2">
                                    <TargetTypeChip type={domain.targetType} />
                                    <DomainStatusBadge status={domain.status} />
                                </CardContent>
                                <CardFooter className="text-muted-foreground justify-between text-xs">
                                    <span className="flex items-center gap-1">
                                        <GitFork className="size-3" />
                                        {domain.flows.length} flow{domain.flows.length === 1 ? '' : 's'}
                                    </span>
                                    <span>{formatDate(domain.createdAt)}</span>
                                </CardFooter>
                            </Card>
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
