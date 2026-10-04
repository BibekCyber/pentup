import { useApolloClient } from '@apollo/client';
import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
    type FlowTemplateFragmentFragment,
    type FlowTemplateRequestFragmentFragment,
    FlowTemplateRequestsDocument,
    type FlowTemplateRequestsQuery,
    type TargetType,
    TemplateRequestKind,
    TemplateRequestStatus,
    useApproveFlowTemplateRequestMutation,
    useCreateFlowTemplateMutation,
    useDeleteFlowTemplateMutation,
    useFlowTemplateCreatedSubscription,
    useFlowTemplateDeletedSubscription,
    useFlowTemplateRequestCreatedSubscription,
    useFlowTemplateRequestsQuery,
    useFlowTemplateRequestUpdatedSubscription,
    useFlowTemplatesQuery,
    useFlowTemplateUpdatedSubscription,
    useRejectFlowTemplateRequestMutation,
    useSubmitFlowTemplateRequestMutation,
    useUpdateFlowTemplateMutation,
    useUpdateFlowTemplateRequestMutation,
    useWithdrawFlowTemplateRequestMutation,
} from '@/graphql/types';
import { usePermission } from '@/hooks/use-permission';
import { Log } from '@/lib/log';
import { useUser } from '@/providers/user-provider';

export interface Template {
    createdAt: Date;
    id: string;
    systemOwned: boolean;
    targetTypes: TargetType[];
    text: string;
    title: string;
    updatedAt: Date;
    /** Author; null when the author's account was deleted. */
    userId: null | string;
    version: number;
}

/**
 * What the current user may do with a library template:
 * - `edit`: write directly (administrators)
 * - `propose`: submit changes for approval (the author, for their own template)
 * - `view`: read-only (someone else's or a built-in template)
 */
export type TemplateAccess = 'edit' | 'propose' | 'view';

export interface TemplateContentPayload {
    targetTypes?: TargetType[];
    text: string;
    title: string;
}

export interface TemplateRequest {
    baseVersion: null | number;
    createdAt: Date;
    id: string;
    kind: TemplateRequestKind;
    requesterId: string;
    requesterName: string;
    reviewedAt: Date | null;
    reviewedBy: null | string;
    reviewerName: null | string;
    reviewNote: null | string;
    revision: number;
    status: TemplateRequestStatus;
    targetTypes: TargetType[];
    templateId: null | string;
    text: string;
    title: string;
    updatedAt: Date;
}

interface TemplatesContextValue {
    approveRequest: (request: TemplateRequest, templateVersion: null | number, note?: string) => Promise<void>;
    /** Whether the user may author templates at all (directly or via approval). */
    canSubmitTemplates: boolean;
    createTemplate: (payload: TemplateContentPayload) => Promise<Template>;
    currentUserId: null | string;
    deleteTemplate: (id: string) => Promise<void>;
    getTemplate: (id: string) => Template | undefined;
    getTemplateAccess: (template: Template) => TemplateAccess;
    isLoading: boolean;
    /** True until the request list has been fetched for the first time. */
    isLoadingRequests: boolean;
    /** Administrators publish directly and review everyone's requests. */
    isTemplateAdmin: boolean;
    /** Pending edit request per template id (admins: everyone's, users: their own). */
    pendingRequestByTemplateId: Map<string, TemplateRequest>;
    /** Requests waiting for review (admins: everyone's, users: their own). */
    pendingRequestsCount: number;
    rejectRequest: (request: TemplateRequest, note: string) => Promise<void>;
    /** Admins: every request; users: their own. */
    requests: TemplateRequest[];
    submitRequest: (payload: TemplateContentPayload, templateId?: string) => Promise<TemplateRequest>;
    templates: Template[];
    updateRequest: (request: TemplateRequest, payload: TemplateContentPayload) => Promise<TemplateRequest>;
    /** Resolves with the template's new version. */
    updateTemplate: (id: string, payload: TemplateContentPayload, version?: number) => Promise<number>;
    withdrawRequest: (request: TemplateRequest) => Promise<void>;
}

interface TemplatesProviderProps {
    children: ReactNode;
}

// The ID scalar arrives as a JSON number at runtime although it is typed as a
// string; normalize so ownership checks compare like with like.
export const toId = (value: number | string): string => String(value);

const toOptionalId = (value: null | number | string | undefined): null | string => (value == null ? null : toId(value));

export const toTemplate = (t: FlowTemplateFragmentFragment): Template => ({
    createdAt: new Date(t.createdAt),
    id: toId(t.id),
    systemOwned: t.systemOwned,
    targetTypes: t.targetTypes,
    text: t.text,
    title: t.title,
    updatedAt: new Date(t.updatedAt),
    userId: toOptionalId(t.userId),
    version: t.version,
});

export const toTemplateRequest = (r: FlowTemplateRequestFragmentFragment): TemplateRequest => ({
    baseVersion: r.baseVersion ?? null,
    createdAt: new Date(r.createdAt),
    id: toId(r.id),
    kind: r.kind,
    requesterId: toId(r.requesterId),
    requesterName: r.requesterName,
    reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : null,
    reviewedBy: toOptionalId(r.reviewedBy),
    reviewerName: r.reviewerName ?? null,
    reviewNote: r.reviewNote ?? null,
    revision: r.revision,
    status: r.status,
    targetTypes: r.targetTypes,
    templateId: toOptionalId(r.templateId),
    text: r.text,
    title: r.title,
    updatedAt: new Date(r.updatedAt),
});

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const TemplatesContext = createContext<TemplatesContextValue | undefined>(undefined);

export const TemplatesProvider = ({ children }: TemplatesProviderProps) => {
    const { authInfo, isAuthenticated } = useUser();
    const navigate = useNavigate();
    const client = useApolloClient();

    const isTemplateAdmin = usePermission('templates.admin');
    const hasCreatePermission = usePermission('templates.create');
    const canSubmitTemplates = isTemplateAdmin || hasCreatePermission;
    // Guests carry user id 0.
    const currentUserId = authInfo?.user?.id ? toId(authInfo.user.id) : null;

    const shouldFetchTemplates = Boolean(authInfo && authInfo.type !== 'guest' && isAuthenticated());

    // GraphQL query for templates
    const { data: templatesData, loading: isLoadingTemplates } = useFlowTemplatesQuery({
        fetchPolicy: 'cache-and-network',
        skip: !shouldFetchTemplates,
    });

    const { data: requestsData, error: requestsError } = useFlowTemplateRequestsQuery({
        fetchPolicy: 'cache-and-network',
        skip: !shouldFetchTemplates,
    });

    // True until the first response: decisions that depend on "is there a
    // pending request?" must not be made from an empty, not-yet-fetched list.
    const isLoadingRequests = !requestsData && !requestsError;

    // GraphQL mutations
    const [createTemplateMutation] = useCreateFlowTemplateMutation();
    const [updateTemplateMutation] = useUpdateFlowTemplateMutation();
    const [deleteTemplateMutation] = useDeleteFlowTemplateMutation();
    const [submitRequestMutation] = useSubmitFlowTemplateRequestMutation();
    const [updateRequestMutation] = useUpdateFlowTemplateRequestMutation();
    const [withdrawRequestMutation] = useWithdrawFlowTemplateRequestMutation();
    const [approveRequestMutation] = useApproveFlowTemplateRequestMutation();
    const [rejectRequestMutation] = useRejectFlowTemplateRequestMutation();

    // GraphQL subscriptions (only for authenticated users). Cache updates are
    // applied by the Apollo subscription link; the callbacks only notify.
    useFlowTemplateCreatedSubscription({
        skip: !shouldFetchTemplates,
    });

    useFlowTemplateUpdatedSubscription({
        skip: !shouldFetchTemplates,
    });

    useFlowTemplateDeletedSubscription({
        skip: !shouldFetchTemplates,
    });

    useFlowTemplateRequestCreatedSubscription({
        onData: ({ data }) => {
            const raw = data.data?.flowTemplateRequestCreated;
            const request = raw ? toTemplateRequest(raw) : null;

            // Reviewers hear about new submissions from other people.
            if (!request || !isTemplateAdmin || request.requesterId === currentUserId) {
                return;
            }

            toast.info(`New template submission from ${request.requesterName}`, {
                action: { label: 'Review', onClick: () => navigate(`/templates/requests/${request.id}`) },
                description: request.title,
            });
        },
        skip: !shouldFetchTemplates,
    });

    useFlowTemplateRequestUpdatedSubscription({
        onData: ({ data }) => {
            const raw = data.data?.flowTemplateRequestUpdated;
            const request = raw ? toTemplateRequest(raw) : null;

            // Requesters hear about decisions someone else made on their request.
            if (
                !request ||
                request.requesterId !== currentUserId ||
                !request.reviewedBy ||
                request.reviewedBy === currentUserId
            ) {
                return;
            }

            const view = { label: 'View', onClick: () => navigate(`/templates/requests/${request.id}`) };

            if (request.status === TemplateRequestStatus.Approved) {
                toast.success(
                    request.kind === TemplateRequestKind.Create
                        ? `Your template "${request.title}" was approved and published`
                        : `Your changes to "${request.title}" were approved`,
                    { action: view },
                );
            } else if (request.status === TemplateRequestStatus.Rejected) {
                toast.warning(`Changes requested on "${request.title}"`, {
                    action: view,
                    description: request.reviewNote ?? undefined,
                });
            } else if (request.status === TemplateRequestStatus.Closed) {
                toast.info(`Your request for "${request.title}" was closed`, {
                    action: view,
                    description: request.reviewNote ?? undefined,
                });
            }
        },
        skip: !shouldFetchTemplates,
    });

    // Convert GraphQL templates to Template interface
    const templates = useMemo(() => {
        const rawTemplates = templatesData?.flowTemplates ?? [];

        return rawTemplates.map(toTemplate);
    }, [templatesData?.flowTemplates]);

    const requests = useMemo(
        () => (requestsData?.flowTemplateRequests ?? []).map(toTemplateRequest),
        [requestsData?.flowTemplateRequests],
    );

    const pendingRequestByTemplateId = useMemo(() => {
        const map = new Map<string, TemplateRequest>();

        requests.forEach((request) => {
            if (request.status === TemplateRequestStatus.Pending && request.templateId) {
                map.set(request.templateId, request);
            }
        });

        return map;
    }, [requests]);

    const pendingRequestsCount = useMemo(
        () => requests.filter((request) => request.status === TemplateRequestStatus.Pending).length,
        [requests],
    );

    const getTemplate = useCallback(
        (id: string): Template | undefined => {
            return templates.find((t) => t.id === id);
        },
        [templates],
    );

    const getTemplateAccess = useCallback(
        (template: Template): TemplateAccess => {
            if (isTemplateAdmin) {
                return 'edit';
            }

            if (canSubmitTemplates && !template.systemOwned && template.userId === currentUserId) {
                return 'propose';
            }

            return 'view';
        },
        [canSubmitTemplates, currentUserId, isTemplateAdmin],
    );

    // A new request must show up in the lists right away, without waiting for
    // its subscription event (which may also arrive first — both are idempotent).
    const addRequestToCache = useCallback(
        (request: FlowTemplateRequestFragmentFragment) => {
            client.cache.updateQuery<FlowTemplateRequestsQuery>({ query: FlowTemplateRequestsDocument }, (existing) => {
                if (!existing || existing.flowTemplateRequests.some((r) => r.id === request.id)) {
                    return existing;
                }

                return { flowTemplateRequests: [request, ...existing.flowTemplateRequests] };
            });
        },
        [client],
    );

    const createTemplate = useCallback(
        async (payload: TemplateContentPayload) => {
            try {
                const { data } = await createTemplateMutation({
                    variables: {
                        input: {
                            targetTypes: payload.targetTypes,
                            text: payload.text,
                            title: payload.title,
                        },
                    },
                });

                const created = data?.createFlowTemplate;

                if (!created) {
                    throw new Error('No template returned');
                }

                return toTemplate(created);
            } catch (error) {
                toast.error('Failed to create template', {
                    description: errorMessage(error, 'Failed to create template'),
                });
                Log.error('Error creating template:', error);
                throw error;
            }
        },
        [createTemplateMutation],
    );

    const updateTemplate = useCallback(
        async (id: string, payload: TemplateContentPayload, version?: number) => {
            try {
                // One atomic write; `version` makes the server refuse to
                // overwrite a change someone else saved in the meantime.
                const { data } = await updateTemplateMutation({
                    variables: {
                        input: {
                            targetTypes: payload.targetTypes,
                            text: payload.text,
                            title: payload.title,
                            version,
                        },
                        templateId: id,
                    },
                });

                if (!data?.updateFlowTemplate) {
                    throw new Error('No template returned');
                }

                return data.updateFlowTemplate.version;
            } catch (error) {
                toast.error('Failed to update template', {
                    description: errorMessage(error, 'Failed to update template'),
                });
                Log.error('Error updating template:', error);
                throw error;
            }
        },
        [updateTemplateMutation],
    );

    const deleteTemplate = useCallback(
        async (id: string) => {
            try {
                await deleteTemplateMutation({
                    variables: {
                        templateId: id,
                    },
                });
            } catch (error) {
                toast.error('Failed to delete template', {
                    description: errorMessage(error, 'Failed to delete template'),
                });
                Log.error('Error deleting template:', error);
                throw error;
            }
        },
        [deleteTemplateMutation],
    );

    const submitRequest = useCallback(
        async (payload: TemplateContentPayload, templateId?: string) => {
            try {
                const { data } = await submitRequestMutation({
                    variables: {
                        input: { targetTypes: payload.targetTypes, text: payload.text, title: payload.title },
                        templateId: templateId ?? null,
                    },
                });

                const submitted = data?.submitFlowTemplateRequest;

                if (!submitted) {
                    throw new Error('No request returned');
                }

                addRequestToCache(submitted);
                toast.success('Submitted for review', {
                    description: 'An administrator will review it before it is published.',
                });

                return toTemplateRequest(submitted);
            } catch (error) {
                toast.error('Failed to submit for review', {
                    description: errorMessage(error, 'Failed to submit for review'),
                });
                Log.error('Error submitting template request:', error);
                throw error;
            }
        },
        [addRequestToCache, submitRequestMutation],
    );

    const updateRequest = useCallback(
        async (request: TemplateRequest, payload: TemplateContentPayload) => {
            try {
                const { data } = await updateRequestMutation({
                    variables: {
                        input: { targetTypes: payload.targetTypes, text: payload.text, title: payload.title },
                        requestId: request.id,
                        revision: request.revision,
                    },
                });

                const updated = data?.updateFlowTemplateRequest;

                if (!updated) {
                    throw new Error('No request returned');
                }

                toast.success('Request updated', { description: 'Your changes are waiting for review.' });

                return toTemplateRequest(updated);
            } catch (error) {
                toast.error('Failed to update request', {
                    description: errorMessage(error, 'Failed to update request'),
                });
                Log.error('Error updating template request:', error);
                throw error;
            }
        },
        [updateRequestMutation],
    );

    const withdrawRequest = useCallback(
        async (request: TemplateRequest) => {
            try {
                await withdrawRequestMutation({ variables: { requestId: request.id } });
                toast.success('Request withdrawn');
            } catch (error) {
                toast.error('Failed to withdraw request', {
                    description: errorMessage(error, 'Failed to withdraw request'),
                });
                Log.error('Error withdrawing template request:', error);
                throw error;
            }
        },
        [withdrawRequestMutation],
    );

    const approveRequest = useCallback(
        async (request: TemplateRequest, templateVersion: null | number, note?: string) => {
            try {
                await approveRequestMutation({
                    variables: {
                        note: note?.trim() ? note.trim() : null,
                        requestId: request.id,
                        revision: request.revision,
                        templateVersion,
                    },
                });
                toast.success(
                    request.kind === TemplateRequestKind.Create ? 'Template published' : 'Changes published',
                    { description: request.title },
                );
            } catch (error) {
                toast.error('Failed to approve request', {
                    description: errorMessage(error, 'Failed to approve request'),
                });
                Log.error('Error approving template request:', error);
                throw error;
            }
        },
        [approveRequestMutation],
    );

    const rejectRequest = useCallback(
        async (request: TemplateRequest, note: string) => {
            try {
                await rejectRequestMutation({
                    variables: { note: note.trim(), requestId: request.id, revision: request.revision },
                });
                toast.success('Changes requested', { description: `${request.requesterName} has been notified.` });
            } catch (error) {
                toast.error('Failed to reject request', {
                    description: errorMessage(error, 'Failed to reject request'),
                });
                Log.error('Error rejecting template request:', error);
                throw error;
            }
        },
        [rejectRequestMutation],
    );

    const value = useMemo(
        () => ({
            approveRequest,
            canSubmitTemplates,
            createTemplate,
            currentUserId,
            deleteTemplate,
            getTemplate,
            getTemplateAccess,
            isLoading: isLoadingTemplates,
            isLoadingRequests,
            isTemplateAdmin,
            pendingRequestByTemplateId,
            pendingRequestsCount,
            rejectRequest,
            requests,
            submitRequest,
            templates,
            updateRequest,
            updateTemplate,
            withdrawRequest,
        }),
        [
            approveRequest,
            canSubmitTemplates,
            createTemplate,
            currentUserId,
            deleteTemplate,
            getTemplate,
            getTemplateAccess,
            isLoadingTemplates,
            isLoadingRequests,
            isTemplateAdmin,
            pendingRequestByTemplateId,
            pendingRequestsCount,
            rejectRequest,
            requests,
            submitRequest,
            templates,
            updateRequest,
            updateTemplate,
            withdrawRequest,
        ],
    );

    return <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>;
};

export const useTemplates = () => {
    const context = useContext(TemplatesContext);

    if (context === undefined) {
        throw new Error('useTemplates must be used within TemplatesProvider');
    }

    return context;
};
