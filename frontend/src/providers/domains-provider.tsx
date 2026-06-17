import { NetworkStatus } from '@apollo/client';
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

import type { CreateDomainInput, DomainFragmentFragment, DomainsQuery } from '@/graphql/types';

import {
    useCreateDomainMutation,
    useDeleteDomainMutation,
    useDomainCreatedSubscription,
    useDomainDeletedSubscription,
    useDomainsQuery,
    useDomainUpdatedSubscription,
} from '@/graphql/types';
import { Log } from '@/lib/log';

export type Domain = DomainFragmentFragment;

interface DomainsContextValue {
    createDomain: (input: CreateDomainInput) => Promise<DomainFragmentFragment | null>;
    deleteDomain: (domain: Domain) => Promise<boolean>;
    domains: Array<Domain>;
    domainsData: DomainsQuery | undefined;
    domainsError: Error | undefined;
    isLoading: boolean;
}

const DomainsContext = createContext<DomainsContextValue | undefined>(undefined);

interface DomainsProviderProps {
    children: React.ReactNode;
}

export const DomainsProvider = ({ children }: DomainsProviderProps) => {
    const {
        data: domainsData,
        error: domainsError,
        loading,
        networkStatus,
    } = useDomainsQuery({
        notifyOnNetworkStatusChange: true,
    });

    const isLoading = loading && networkStatus === NetworkStatus.loading;
    const domains = useMemo(() => domainsData?.domains ?? [], [domainsData?.domains]);

    useDomainCreatedSubscription();
    useDomainUpdatedSubscription();
    useDomainDeletedSubscription();

    useEffect(() => {
        if (domainsError) {
            toast.error('Error loading domains', {
                description: domainsError.message,
            });
            Log.error('Error loading domains:', domainsError);
        }
    }, [domainsError]);

    const [createDomainMutation] = useCreateDomainMutation();
    const [deleteDomainMutation] = useDeleteDomainMutation();

    const createDomain = useCallback(
        async (input: CreateDomainInput) => {
            try {
                const { data } = await createDomainMutation({
                    variables: { input },
                });

                return data?.createDomain ?? null;
            } catch (error) {
                const description = error instanceof Error ? error.message : 'An error occurred while creating domain';
                toast.error('Failed to create domain', {
                    description,
                });
                Log.error('Error creating domain:', error);

                return null;
            }
        },
        [createDomainMutation],
    );

    const deleteDomain = useCallback(
        async (domain: Domain) => {
            const { id: domainId, name } = domain;

            if (!domainId) {
                return false;
            }

            const domainDescription = `${name || 'Unknown'} (ID: ${domainId})`;
            const loadingToastId = toast.loading('Deleting domain...', {
                description: domainDescription,
            });

            try {
                await deleteDomainMutation({
                    variables: { id: domainId },
                });

                toast.success('Domain deleted successfully', {
                    description: domainDescription,
                    id: loadingToastId,
                });

                return true;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'An error occurred while deleting domain';
                toast.error(errorMessage, {
                    description: domainDescription,
                    id: loadingToastId,
                });
                Log.error('Error deleting domain:', error);

                return false;
            }
        },
        [deleteDomainMutation],
    );

    const value = useMemo(
        () => ({
            createDomain,
            deleteDomain,
            domains,
            domainsData,
            domainsError,
            isLoading,
        }),
        [createDomain, deleteDomain, domains, domainsData, domainsError, isLoading],
    );

    return <DomainsContext.Provider value={value}>{children}</DomainsContext.Provider>;
};

export const useDomains = () => {
    const context = useContext(DomainsContext);

    if (context === undefined) {
        throw new Error('useDomains must be used within a DomainsProvider');
    }

    return context;
};
