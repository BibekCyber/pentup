import { ArrowRight, Check, ExternalLink, Pencil, RotateCcw, Undo2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import TargetTypeChip from '@/components/forms/target-type-chip';
import CommandBar from '@/components/layouts/command-bar';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { getRequestKindLabel, RequestStatusPill } from '@/components/templates/request-status-pill';
import TemplateNotice from '@/components/templates/template-notice';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
    type TargetType,
    TemplateRequestKind,
    TemplateRequestStatus,
    useFlowTemplateQuery,
    useFlowTemplateRequestQuery,
} from '@/graphql/types';
import { diffLines } from '@/lib/line-diff';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/format';
import { type TemplateRequest, toTemplateRequest, useTemplates } from '@/providers/templates-provider';

// Mirrors the server-side limit (pkg/graph/flow_template_requests_helpers.go).
const NOTE_MAX_LENGTH = 2000;

type ReviewDecision = 'approve' | 'reject';

/** What the reviewer was looking at when they opened the decision dialog. */
interface ReviewSnapshot {
    decision: ReviewDecision;
    request: TemplateRequest;
    templateVersion: null | number;
}

const Section = ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div className="flex flex-col gap-1.5">
        <div className="field-label">{label}</div>
        {children}
    </div>
);

const ProposedContent = ({ request }: { request: TemplateRequest }) => (
    <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
            <Section label="Title">
                <div className="text-sm font-semibold">{request.title}</div>
            </Section>
            <Section label="Target types">
                <div className="flex flex-wrap gap-1.5">
                    {request.targetTypes.map((type) => (
                        <TargetTypeChip
                            key={type}
                            type={type}
                        />
                    ))}
                </div>
            </Section>
            <Section label="Content">
                <div className="bg-muted/40 max-h-[60vh] overflow-y-auto rounded-md border p-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {request.text}
                </div>
            </Section>
        </CardContent>
    </Card>
);

interface ChangesProps {
    live: { targetTypes: TargetType[]; text: string; title: string };
    proposed: TemplateRequest;
}

// What approving would change on the live template.
const Changes = ({ live, proposed }: ChangesProps) => {
    const lines = useMemo(() => diffLines(live.text, proposed.text), [live.text, proposed.text]);
    const added = lines.filter((line) => line.type === 'added').length;
    const removed = lines.filter((line) => line.type === 'removed').length;
    const titleChanged = live.title !== proposed.title;
    const allTypes = [...new Set([...live.targetTypes, ...proposed.targetTypes])];

    return (
        <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
                <Section label="Title">
                    {titleChanged ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-destructive line-through decoration-1">{live.title}</span>
                            <ArrowRight className="text-muted-foreground size-3.5" />
                            <span className="text-st-finished font-semibold">{proposed.title}</span>
                        </div>
                    ) : (
                        <div className="text-sm font-semibold">
                            {proposed.title}{' '}
                            <span className="text-muted-foreground text-xs font-normal">(unchanged)</span>
                        </div>
                    )}
                </Section>
                <Section label="Target types">
                    <div className="flex flex-wrap gap-1.5">
                        {allTypes.map((type) => {
                            const wasLive = live.targetTypes.includes(type);
                            const isProposed = proposed.targetTypes.includes(type);

                            return (
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full',
                                        !wasLive && 'ring-st-finished/60 ring-2',
                                        !isProposed && 'ring-destructive/50 line-through opacity-50 ring-2',
                                    )}
                                    key={type}
                                    title={!wasLive ? 'Added' : !isProposed ? 'Removed' : 'Unchanged'}
                                >
                                    <TargetTypeChip type={type} />
                                </span>
                            );
                        })}
                    </div>
                </Section>
                <Section label="Content">
                    <div className="text-muted-foreground mb-1 font-mono text-[11px]">
                        {added || removed ? (
                            <>
                                <span className="text-st-finished">+{added}</span>{' '}
                                <span className="text-destructive">−{removed}</span> lines
                            </>
                        ) : (
                            'Unchanged'
                        )}
                    </div>
                    <div className="max-h-[60vh] overflow-auto rounded-md border font-mono text-xs leading-relaxed">
                        {lines.map((line, index) => (
                            <div
                                className={cn(
                                    'flex min-w-max',
                                    line.type === 'added' && 'bg-st-finished/10',
                                    line.type === 'removed' && 'bg-destructive/10',
                                )}
                                key={index}
                            >
                                <span
                                    className={cn(
                                        'text-muted-foreground w-6 shrink-0 text-center select-none',
                                        line.type === 'added' && 'text-st-finished',
                                        line.type === 'removed' && 'text-destructive',
                                    )}
                                >
                                    {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ''}
                                </span>
                                <span className="pr-3 whitespace-pre-wrap">{line.text || ' '}</span>
                            </div>
                        ))}
                    </div>
                </Section>
            </CardContent>
        </Card>
    );
};

const TemplateRequestPage = () => {
    const navigate = useNavigate();
    const { requestId } = useParams<{ requestId: string }>();
    const { approveRequest, currentUserId, isTemplateAdmin, rejectRequest, withdrawRequest } = useTemplates();
    const [review, setReview] = useState<null | ReviewSnapshot>(null);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

    const { data: requestData, loading: isLoadingRequest } = useFlowTemplateRequestQuery({
        fetchPolicy: 'cache-and-network',
        skip: !requestId,
        variables: { requestId: requestId ?? '' },
    });
    const request = useMemo(
        () => (requestData?.flowTemplateRequest ? toTemplateRequest(requestData.flowTemplateRequest) : null),
        [requestData?.flowTemplateRequest],
    );

    const { data: templateData, loading: isLoadingTemplate } = useFlowTemplateQuery({
        skip: !request?.templateId,
        variables: { templateId: request?.templateId ?? '' },
    });
    const liveTemplate = templateData?.flowTemplate ?? null;

    const isPending = request?.status === TemplateRequestStatus.Pending;
    const isRequester = !!request && request.requesterId === currentUserId;
    const isUpdate = request?.kind === TemplateRequestKind.Update;
    const canReview = isTemplateAdmin && isPending && (!isUpdate || !!liveTemplate);
    const isStale =
        isPending &&
        isUpdate &&
        !!liveTemplate &&
        request.baseVersion != null &&
        liveTemplate.version !== request.baseVersion;

    const listPath = isTemplateAdmin ? '/templates/review' : '/templates/submissions';

    const openReview = (decision: ReviewDecision) => {
        if (!request) {
            return;
        }

        setNote('');
        setReview({ decision, request, templateVersion: liveTemplate?.version ?? null });
    };

    const handleReview = async () => {
        if (!review || isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            if (review.decision === 'approve') {
                await approveRequest(review.request, review.templateVersion, note);
            } else {
                await rejectRequest(review.request, note);
            }

            setReview(null);
            navigate(listPath);
        } catch {
            // Error already handled in provider with toast
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWithdraw = async () => {
        if (!request) {
            return;
        }

        try {
            await withdrawRequest(request);
        } catch {
            // Error already handled in provider with toast
        }
    };

    const pageHeader = (
        <CommandBar
            title={
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/templates">Templates</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to={listPath}>{isTemplateAdmin ? 'Review queue' : 'My submissions'}</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{request?.title ?? 'Request'}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            }
        />
    );

    if (!request) {
        return (
            <>
                {pageHeader}
                <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center p-4">
                    {isLoadingRequest ? (
                        <Spinner />
                    ) : (
                        <Card className="w-full max-w-2xl">
                            <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
                                <h2 className="text-xl font-semibold">Request not found</h2>
                                <p className="text-muted-foreground">The request you are looking for does not exist.</p>
                                <Button onClick={() => navigate(listPath)}>Back to requests</Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </>
        );
    }

    const reviewer = request.reviewerName ?? 'an administrator';
    const reviewedAt = request.reviewedAt ? ` · ${formatDate(request.reviewedAt)}` : '';

    const actions = (
        <div className="flex flex-wrap items-center gap-2">
            {canReview ? (
                <>
                    <Button
                        onClick={() => openReview('reject')}
                        variant="outline"
                    >
                        <X />
                        Request changes
                    </Button>
                    <Button onClick={() => openReview('approve')}>
                        <Check />
                        Approve & publish
                    </Button>
                </>
            ) : null}
            {isRequester && isPending ? (
                <>
                    <Button
                        onClick={() => setIsWithdrawOpen(true)}
                        variant="ghost"
                    >
                        <Undo2 />
                        Withdraw
                    </Button>
                    <Button
                        onClick={() => navigate(`/templates/requests/${request.id}/edit`)}
                        variant="outline"
                    >
                        <Pencil />
                        Edit
                    </Button>
                </>
            ) : null}
            {isRequester &&
            (request.status === TemplateRequestStatus.Rejected ||
                request.status === TemplateRequestStatus.Withdrawn ||
                request.status === TemplateRequestStatus.Closed) ? (
                <Button onClick={() => navigate(`/templates/requests/${request.id}/edit`)}>
                    <RotateCcw />
                    Edit & resubmit
                </Button>
            ) : null}
            {request.status === TemplateRequestStatus.Approved && liveTemplate ? (
                <Button
                    asChild
                    variant="outline"
                >
                    <Link to={`/templates/${liveTemplate.id}`}>
                        <ExternalLink />
                        Open template
                    </Link>
                </Button>
            ) : null}
        </div>
    );

    const renderDecision = () => {
        switch (request.status) {
            case TemplateRequestStatus.Approved:
                return (
                    <TemplateNotice
                        title={`Approved by ${reviewer}${reviewedAt}`}
                        tone="success"
                    >
                        {request.reviewNote}
                    </TemplateNotice>
                );
            case TemplateRequestStatus.Closed:
                return (
                    <TemplateNotice
                        title={`Closed${reviewedAt}`}
                        tone="warning"
                    >
                        {request.reviewNote}
                    </TemplateNotice>
                );
            case TemplateRequestStatus.Pending:
                return isUpdate && !liveTemplate && !isLoadingTemplate ? (
                    <TemplateNotice
                        title="The template this change is for no longer exists"
                        tone="warning"
                    />
                ) : null;
            case TemplateRequestStatus.Rejected:
                return (
                    <TemplateNotice
                        title={`Changes requested by ${reviewer}${reviewedAt}`}
                        tone="danger"
                    >
                        {request.reviewNote}
                    </TemplateNotice>
                );
            case TemplateRequestStatus.Withdrawn:
                return <TemplateNotice title={`Withdrawn by ${request.requesterName}`} />;
        }
    };

    const reviewTitle =
        review?.decision === 'approve'
            ? isUpdate
                ? 'Approve and publish these changes?'
                : 'Approve and publish this template?'
            : 'Request changes';
    const reviewDescription =
        review?.decision === 'approve'
            ? isUpdate
                ? `The live version of "${liveTemplate?.title ?? request.title}" will be replaced for everyone.`
                : `"${request.title}" will be added to the library for everyone.`
            : `${request.requesterName} will see your note and can edit and resubmit.`;
    const isNoteRequired = review?.decision === 'reject';

    return (
        <>
            {pageHeader}
            <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="truncate text-2xl font-semibold tracking-tight">{request.title}</h1>
                            <RequestStatusPill status={request.status} />
                        </div>
                        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            <span className="chip">{getRequestKindLabel(request.kind)}</span>
                            <span>
                                by <span className="text-foreground font-medium">{request.requesterName}</span>
                            </span>
                            <span className="text-muted-foreground/50">·</span>
                            <span>submitted {formatDate(request.createdAt)}</span>
                            {request.revision > 1 ? (
                                <>
                                    <span className="text-muted-foreground/50">·</span>
                                    <span>edited {formatDate(request.updatedAt)}</span>
                                </>
                            ) : null}
                            {isUpdate && liveTemplate ? (
                                <>
                                    <span className="text-muted-foreground/50">·</span>
                                    <Link
                                        className="hover:text-foreground underline-offset-2 hover:underline"
                                        to={`/templates/${liveTemplate.id}`}
                                    >
                                        template #{liveTemplate.id}
                                    </Link>
                                </>
                            ) : null}
                        </div>
                    </div>
                    {actions}
                </div>

                {renderDecision()}

                {isStale ? (
                    <TemplateNotice
                        title="The live template changed after this was proposed"
                        tone="warning"
                    >
                        The comparison below is against the current live version. Approving replaces it with the
                        proposed content, so changes made since this was submitted would be undone unless they are part
                        of this proposal.
                    </TemplateNotice>
                ) : null}

                {isPending && isUpdate && liveTemplate ? (
                    <Changes
                        live={liveTemplate}
                        proposed={request}
                    />
                ) : isPending && isUpdate && isLoadingTemplate ? (
                    <div className="flex justify-center py-10">
                        <Spinner />
                    </div>
                ) : (
                    <ProposedContent request={request} />
                )}
            </div>

            <Dialog
                onOpenChange={(open) => {
                    if (!open && !isSubmitting) {
                        setReview(null);
                    }
                }}
                open={!!review}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{reviewTitle}</DialogTitle>
                        <DialogDescription>{reviewDescription}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-1.5">
                        <label
                            className="field-label"
                            htmlFor="review-note"
                        >
                            {isNoteRequired ? 'What should change?' : 'Note (optional)'}
                        </label>
                        <Textarea
                            autoFocus
                            disabled={isSubmitting}
                            id="review-note"
                            maxLength={NOTE_MAX_LENGTH}
                            minHeight={96}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder={
                                isNoteRequired
                                    ? 'Explain what needs to change before this can be approved'
                                    : 'Visible to the requester'
                            }
                            value={note}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            disabled={isSubmitting}
                            onClick={() => setReview(null)}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={isSubmitting || (isNoteRequired && !note.trim())}
                            onClick={handleReview}
                        >
                            {isSubmitting ? (
                                <Spinner variant="circle" />
                            ) : review?.decision === 'approve' ? (
                                <Check />
                            ) : (
                                <X />
                            )}
                            {review?.decision === 'approve' ? 'Approve & publish' : 'Request changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                confirmIcon={<Undo2 />}
                confirmText="Withdraw"
                description="The request is removed from the review queue. You can edit and resubmit it later."
                handleConfirm={handleWithdraw}
                handleOpenChange={setIsWithdrawOpen}
                isOpen={isWithdrawOpen}
                title="Withdraw this request?"
            />
        </>
    );
};

export default TemplateRequestPage;
