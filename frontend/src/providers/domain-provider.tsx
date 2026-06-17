import { createContext, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import type { DomainFragmentFragment, DomainQuery } from '@/graphql/types';

import { useDomainQuery } from '@/graphql/types';

interface DomainContextValue {
    domain: DomainFragmentFragment | undefined;
    domainData: DomainQuery | undefined;
    domainError: Error | undefined;
    domainId: null | string;
    isLoading: boolean;
}

const DomainContext = createContext<DomainContextValue | undefined>(undefined);

interface DomainProviderProps {
    children: React.ReactNode;
}

export const DomainProvider = ({ children }: DomainProviderProps) => {
    const { domainId } = useParams();

    const {
        data: domainData,
        error: domainError,
        loading: isLoading,
    } = useDomainQuery({
        errorPolicy: 'all',
        fetchPolicy: 'cache-and-network',
        skip: !domainId,
        variables: { id: domainId ?? '' },
    });

    const value = useMemo(
        () => ({
            domain: domainData?.domain ?? undefined,
            domainData,
            domainError,
            domainId: domainId ?? null,
            isLoading,
        }),
        [domainData, domainError, domainId, isLoading],
    );

    return <DomainContext.Provider value={value}>{children}</DomainContext.Provider>;
};

export const useDomain = () => {
    const context = useContext(DomainContext);

    if (context === undefined) {
        throw new Error('useDomain must be used within a DomainProvider');
    }

    return context;
};
