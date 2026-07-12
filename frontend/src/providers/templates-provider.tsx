import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { toast } from 'sonner';

import {
    type TargetType,
    useCreateFlowTemplateMutation,
    useDeleteFlowTemplateMutation,
    useFlowTemplateCreatedSubscription,
    useFlowTemplateDeletedSubscription,
    useFlowTemplatesQuery,
    useFlowTemplateUpdatedSubscription,
    useUpdateFlowTemplateMutation,
    useUpdateFlowTemplateTargetTypesMutation,
} from '@/graphql/types';
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
    userId: string;
}

interface CreateTemplatePayload {
    targetTypes?: TargetType[];
    text: string;
    title: string;
}

interface TemplatesContextValue {
    createTemplate: (payload: CreateTemplatePayload) => Promise<void>;
    deleteTemplate: (id: string) => Promise<void>;
    getTemplate: (id: string) => Template | undefined;
    isLoading: boolean;
    templates: Template[];
    updateTemplate: (id: string, payload: UpdateTemplatePayload) => Promise<void>;
}

interface TemplatesProviderProps {
    children: ReactNode;
}

interface UpdateTemplatePayload {
    targetTypes?: TargetType[];
    text: string;
    title: string;
}

const TemplatesContext = createContext<TemplatesContextValue | undefined>(undefined);

export const TemplatesProvider = ({ children }: TemplatesProviderProps) => {
    const { authInfo, isAuthenticated } = useUser();

    const shouldFetchTemplates = Boolean(authInfo && authInfo.type !== 'guest' && isAuthenticated());

    // GraphQL query for templates
    const { data: templatesData, loading: isLoadingTemplates } = useFlowTemplatesQuery({
        fetchPolicy: 'cache-and-network',
        skip: !shouldFetchTemplates,
    });

    // GraphQL mutations
    const [createTemplateMutation] = useCreateFlowTemplateMutation();
    const [updateTemplateMutation] = useUpdateFlowTemplateMutation();
    const [updateTemplateTargetTypesMutation] = useUpdateFlowTemplateTargetTypesMutation();
    const [deleteTemplateMutation] = useDeleteFlowTemplateMutation();

    // GraphQL subscriptions (only for authenticated users)
    useFlowTemplateCreatedSubscription({
        skip: !shouldFetchTemplates,
    });

    useFlowTemplateUpdatedSubscription({
        skip: !shouldFetchTemplates,
    });

    useFlowTemplateDeletedSubscription({
        skip: !shouldFetchTemplates,
    });

    // Convert GraphQL templates to Template interface
    const templates = useMemo(() => {
        const rawTemplates = templatesData?.flowTemplates ?? [];

        return rawTemplates.map((t) => ({
            createdAt: new Date(t.createdAt),
            id: t.id,
            systemOwned: t.systemOwned,
            targetTypes: t.targetTypes,
            text: t.text,
            title: t.title,
            updatedAt: new Date(t.updatedAt),
            userId: t.userId,
        }));
    }, [templatesData?.flowTemplates]);

    const getTemplate = useCallback(
        (id: string): Template | undefined => {
            return templates.find((t) => t.id === id);
        },
        [templates],
    );

    const createTemplate = useCallback(
        async (payload: CreateTemplatePayload) => {
            try {
                await createTemplateMutation({
                    variables: {
                        input: {
                            targetTypes: payload.targetTypes,
                            text: payload.text,
                            title: payload.title,
                        },
                    },
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to create template';
                toast.error('Failed to create template', {
                    description: errorMessage,
                });
                Log.error('Error creating template:', error);
                throw error;
            }
        },
        [createTemplateMutation],
    );

    const updateTemplate = useCallback(
        async (id: string, payload: UpdateTemplatePayload) => {
            try {
                await updateTemplateMutation({
                    variables: {
                        input: {
                            text: payload.text,
                            title: payload.title,
                        },
                        templateId: id,
                    },
                });

                // Target types live on a separate mutation so they can be
                // updated independently and gated by ownership/admin on the
                // backend. Only call it when the caller actually provided them.
                if (payload.targetTypes !== undefined) {
                    await updateTemplateTargetTypesMutation({
                        variables: {
                            targetTypes: payload.targetTypes,
                            templateId: id,
                        },
                    });
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to update template';
                toast.error('Failed to update template', {
                    description: errorMessage,
                });
                Log.error('Error updating template:', error);
                throw error;
            }
        },
        [updateTemplateMutation, updateTemplateTargetTypesMutation],
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
                const errorMessage = error instanceof Error ? error.message : 'Failed to delete template';
                toast.error('Failed to delete template', {
                    description: errorMessage,
                });
                Log.error('Error deleting template:', error);
                throw error;
            }
        },
        [deleteTemplateMutation],
    );

    const value = useMemo(
        () => ({
            createTemplate,
            deleteTemplate,
            getTemplate,
            isLoading: isLoadingTemplates,
            templates,
            updateTemplate,
        }),
        [createTemplate, deleteTemplate, getTemplate, isLoadingTemplates, templates, updateTemplate],
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
