import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { Provider } from '@/models/provider';

import { useProvidersQuery } from '@/graphql/types';
import { usePermission } from '@/hooks/use-permission';
import { findProviderByName, sortProviders } from '@/models/provider';
import { useUser } from '@/providers/user-provider';

const SELECTED_PROVIDER_KEY = 'selectedProvider';

// Providers are shared and managed by admins. Everyone else never sees them:
// the backend runs their scans, chats and assistants on the shared default.
export const PROVIDERS_ADMIN_PERMISSION = 'settings.providers.admin';

interface ProvidersContextValue {
    // Whether the user may see, pick and manage providers; when false,
    // `providers` is empty, provider names stay hidden and callers omit the
    // provider so the backend uses the shared default.
    canManageProviders: boolean;
    providers: Provider[];
    selectedProvider: null | Provider;
    setSelectedProvider: (provider: Provider) => void;
}

const ProvidersContext = createContext<ProvidersContextValue | undefined>(undefined);

interface ProvidersProviderProps {
    children: React.ReactNode;
}

export const ProvidersProvider = ({ children }: ProvidersProviderProps) => {
    const { isAuthenticated } = useUser();
    const canManageProviders = usePermission(PROVIDERS_ADMIN_PERMISSION);

    const { data: providersData } = useProvidersQuery({
        skip: !isAuthenticated() || !canManageProviders,
    });

    // Create sorted providers list to ensure consistent order
    const providers = useMemo(
        () => (canManageProviders ? sortProviders(providersData?.providers || []) : []),
        [canManageProviders, providersData?.providers],
    );

    // Store selected provider name instead of the provider object
    const [selectedProviderName, setSelectedProviderName] = useState<null | string>(() => {
        return localStorage.getItem(SELECTED_PROVIDER_KEY);
    });

    // Compute selected provider from providers list and selected name
    const selectedProvider = useMemo(() => {
        if (providers.length === 0) {
            return null;
        }

        // Try to find saved provider
        if (selectedProviderName) {
            const savedProvider = findProviderByName(selectedProviderName, providers);

            if (savedProvider) {
                return savedProvider;
            }
        }

        // If no saved provider or not found, prefer the user's default provider,
        // then fall back to the first provider in the list.
        return providers.find((provider) => provider.isDefault) ?? providers[0] ?? null;
    }, [providers, selectedProviderName]);

    // Save to localStorage when selected provider changes
    useEffect(() => {
        if (selectedProvider) {
            localStorage.setItem(SELECTED_PROVIDER_KEY, selectedProvider.name);
        }
    }, [selectedProvider]);

    const setSelectedProvider = (provider: Provider) => {
        setSelectedProviderName(provider.name);
    };

    const value = {
        canManageProviders,
        providers,
        selectedProvider,
        setSelectedProvider,
    };

    return <ProvidersContext.Provider value={value}>{children}</ProvidersContext.Provider>;
};

export const useProviders = () => {
    const context = useContext(ProvidersContext);

    if (context === undefined) {
        throw new Error('useProviders must be used within a ProvidersProvider');
    }

    return context;
};
