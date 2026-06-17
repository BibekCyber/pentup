import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { DomainStatusBadge } from '@/components/forms/domain-status-badge';
import { TargetTypeChip } from '@/components/forms/target-type-chip';
import { FlowStatusIcon } from '@/components/icons/flow-status-icon';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { useDomain } from '@/providers/domain-provider';
import { useDomains } from '@/providers/domains-provider';

const formatDate = (value: string) => new Date(value).toLocaleString();

const Domain = () => {
    const navigate = useNavigate();
    const { domain, isLoading } = useDomain();
    const { deleteDomain } = useDomains();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    if (isLoading && !domain) {
        return (
            <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center">
                <Spinner variant="circle" />
            </div>
        );
    }

    if (!domain) {
        return (
            <Empty className="min-h-[calc(100dvh-3rem)]">
                <EmptyHeader>
                    <EmptyTitle>Domain not found</EmptyTitle>
                    <EmptyDescription>This domain may have been deleted or you do not have access.</EmptyDescription>
                </EmptyHeader>
                <Button
                    onClick={() => navigate('/domains')}
                    variant="outline"
                >
                    <ArrowLeft />
                    Back to domains
                </Button>
            </Empty>
        );
    }

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
                            <Link to="/domains">Domains</Link>
                        </BreadcrumbItem>
                        <BreadcrumbItem>
                            <BreadcrumbPage>{domain.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </header>

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-semibold">{domain.name}</h1>
                    <TargetTypeChip type={domain.targetType} />
                    <DomainStatusBadge status={domain.status} />
                    <Button
                        className="ml-auto"
                        onClick={() => setIsDeleteOpen(true)}
                        variant="destructive"
                    >
                        <Trash2 />
                        Delete domain
                    </Button>
                </div>

                {domain.flows.length === 0 ? (
                    <Empty className="min-h-64">
                        <EmptyHeader>
                            <EmptyTitle>No flows</EmptyTitle>
                            <EmptyDescription>This domain has no child flows.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {domain.flows.map((flow) => (
                            <Card key={flow.id}>
                                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                                    <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                                        <FlowStatusIcon
                                            status={flow.status}
                                            tooltip={flow.status}
                                        />
                                        <span className="truncate">{flow.title}</span>
                                    </CardTitle>
                                    <Button
                                        asChild
                                        className="-mr-2 -mt-1 size-7 shrink-0"
                                        size="icon"
                                        variant="ghost"
                                    >
                                        <Link to={`/flows/${flow.id}`}>
                                            <ExternalLink className="size-4" />
                                        </Link>
                                    </Button>
                                </CardHeader>
                                <CardContent className="text-muted-foreground text-xs">
                                    Started {formatDate(flow.createdAt)}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmationDialog
                confirmIcon={<Trash2 />}
                confirmText="Delete"
                confirmVariant="destructive"
                description="This will soft-delete the domain and abort any running child flows. This cannot be undone."
                handleConfirm={() => {
                    setIsDeleteOpen(false);
                    void deleteDomain(domain).then((ok) => {
                        if (ok) {
                            navigate('/domains');
                        }
                    });
                }}
                handleOpenChange={setIsDeleteOpen}
                isOpen={isDeleteOpen}
                itemName={domain.name}
                itemType="domain"
                title="Delete domain?"
            />
        </>
    );
};

export default Domain;
