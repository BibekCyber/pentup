import { ChevronRight, ClipboardCheck, FileText, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import CommandBar from '@/components/layouts/command-bar';
import { getRequestKindLabel, RequestStatusPill } from '@/components/templates/request-status-pill';
import TemplatesTabs from '@/components/templates/templates-tabs';
import { Button } from '@/components/ui/button';
import { StatusCard } from '@/components/ui/status-card';
import { TemplateRequestStatus } from '@/graphql/types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/format';
import { type TemplateRequest, useTemplates } from '@/providers/templates-provider';

type StatusFilter = 'all' | 'pending' | 'reviewed';

const STATUS_FILTERS: Array<{ label: string; value: StatusFilter }> = [
    { label: 'Pending', value: 'pending' },
    { label: 'Reviewed', value: 'reviewed' },
    { label: 'All', value: 'all' },
];

interface TemplateRequestsProps {
    /** `review`: every request, for administrators. `submissions`: the user's own. */
    scope: 'review' | 'submissions';
}

const isPending = (request: TemplateRequest) => request.status === TemplateRequestStatus.Pending;

// Pending first, then most recently updated.
const byQueueOrder = (a: TemplateRequest, b: TemplateRequest) =>
    Number(isPending(b)) - Number(isPending(a)) || b.updatedAt.getTime() - a.updatedAt.getTime();

const TemplateRequests = ({ scope }: TemplateRequestsProps) => {
    const navigate = useNavigate();
    const { isLoadingRequests, isTemplateAdmin, pendingRequestsCount, requests } = useTemplates();
    const isReview = scope === 'review';
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(isReview ? 'pending' : 'all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRequests = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return requests
            .filter((request) => {
                if (statusFilter === 'pending' && !isPending(request)) {
                    return false;
                }

                if (statusFilter === 'reviewed' && isPending(request)) {
                    return false;
                }

                if (
                    query &&
                    !request.title.toLowerCase().includes(query) &&
                    !request.requesterName.toLowerCase().includes(query)
                ) {
                    return false;
                }

                return true;
            })
            .sort(byQueueOrder);
    }, [requests, searchTerm, statusFilter]);

    // Administrators publish directly and have no submissions of their own.
    if (!isReview && isTemplateAdmin) {
        return (
            <Navigate
                replace
                to="/templates/review"
            />
        );
    }

    const pageHeader = (
        <CommandBar
            actions={
                !isReview ? (
                    <Button
                        onClick={() => navigate('/templates/new')}
                        size="sm"
                        variant="default"
                    >
                        <Plus />
                        <span className="hidden sm:inline">New Template</span>
                    </Button>
                ) : undefined
            }
            ctx={
                requests.length ? (
                    <>
                        <span className="text-foreground font-semibold">{pendingRequestsCount}</span> pending
                        <span className="text-muted-foreground/50">·</span>
                        {requests.length} total
                    </>
                ) : undefined
            }
            search={{
                onChange: setSearchTerm,
                placeholder: isReview ? 'Search requests' : 'Search submissions',
                value: searchTerm,
            }}
            title="Templates"
        />
    );

    const renderEmptyState = () => {
        if (!requests.length) {
            return isReview ? (
                <StatusCard
                    description="When users submit templates or changes, they appear here for review."
                    icon={<ClipboardCheck className="text-muted-foreground size-8" />}
                    title="No requests yet"
                />
            ) : (
                <StatusCard
                    action={
                        <Button
                            onClick={() => navigate('/templates/new')}
                            variant="default"
                        >
                            <Plus className="size-4" />
                            New Template
                        </Button>
                    }
                    description="Templates you submit are reviewed by an administrator before they are added to the library."
                    icon={<FileText className="text-muted-foreground size-8" />}
                    title="No submissions yet"
                />
            );
        }

        if (statusFilter === 'pending' && !searchTerm.trim()) {
            return (
                <StatusCard
                    description={
                        isReview ? 'Nothing is waiting for review.' : 'None of your submissions are waiting for review.'
                    }
                    icon={<ClipboardCheck className="text-muted-foreground size-8" />}
                    title="All caught up"
                />
            );
        }

        return (
            <StatusCard
                action={
                    <Button
                        onClick={() => {
                            setStatusFilter('all');
                            setSearchTerm('');
                        }}
                        variant="secondary"
                    >
                        Clear filters
                    </Button>
                }
                description="No requests match the current filters."
                icon={<FileText className="text-muted-foreground size-8" />}
                title="No matching requests"
            />
        );
    };

    return (
        <>
            {pageHeader}
            <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 p-6">
                <TemplatesTabs />
                <div className="flex flex-wrap items-center gap-2">
                    <div className="seg">
                        {STATUS_FILTERS.map((filter) => (
                            <button
                                className={cn(statusFilter === filter.value && 'active')}
                                key={filter.value}
                                onClick={() => setStatusFilter(filter.value)}
                                type="button"
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
                {isLoadingRequests && !requests.length ? null : filteredRequests.length === 0 ? (
                    renderEmptyState()
                ) : (
                    <div className="bg-card border-border overflow-hidden rounded-lg border">
                        <div className="overflow-x-auto">
                            <table className="tbl">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Type</th>
                                        {isReview ? <th>Submitted by</th> : null}
                                        <th>Status</th>
                                        <th>Updated</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.map((request) => (
                                        <tr
                                            key={request.id}
                                            onClick={() => navigate(`/templates/requests/${request.id}`)}
                                        >
                                            <td className="m">
                                                <div className="min-w-0">
                                                    <div className="truncate font-semibold">{request.title}</div>
                                                    <div className="text-muted-foreground truncate font-mono text-[10.5px]">
                                                        #{request.id}
                                                        {request.templateId ? ` · template #${request.templateId}` : ''}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="chip">{getRequestKindLabel(request.kind)}</span>
                                            </td>
                                            {isReview ? <td>{request.requesterName}</td> : null}
                                            <td>
                                                <RequestStatusPill status={request.status} />
                                            </td>
                                            <td className="text-muted-foreground font-mono text-[11.5px] whitespace-nowrap">
                                                {formatDate(request.updatedAt)}
                                            </td>
                                            <td className="w-11 text-right">
                                                <ChevronRight className="text-muted-foreground ml-auto size-4" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default TemplateRequests;
