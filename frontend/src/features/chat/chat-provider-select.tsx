import { Check, ChevronDown, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Provider } from '@/models/provider';

import { ProviderIcon } from '@/components/icons/provider-icon';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { getProviderDisplayName } from '@/models/provider';
import { useProviders } from '@/providers/providers-provider';

interface ChatProviderSelectProps {
    disabled?: boolean;
    onChange: (provider: Provider) => void;
    value: null | string | undefined;
}

/**
 * Searchable provider picker for the chat composer, styled like the flow form.
 */
export const ChatProviderSelect = ({ disabled, onChange, value }: ChatProviderSelectProps) => {
    const { providers } = useProviders();
    const [search, setSearch] = useState('');

    const currentProvider = providers.find((provider) => provider.name === value);

    const filteredProviders = useMemo(() => {
        if (!search.trim()) {
            return providers;
        }

        const searchLower = search.toLowerCase();

        return providers.filter((provider) => {
            const displayName = getProviderDisplayName(provider).toLowerCase();

            return displayName.includes(searchLower) || provider.name.toLowerCase().includes(searchLower);
        });
    }, [providers, search]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <InputGroupButton
                    className="border-border border"
                    disabled={disabled}
                    variant="ghost"
                >
                    {currentProvider && <ProviderIcon provider={currentProvider} />}
                    <span className="max-w-40 truncate">
                        {currentProvider ? getProviderDisplayName(currentProvider) : 'Select Provider'}
                    </span>
                    <ChevronDown />
                </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                side="top"
            >
                <DropdownMenuGroup className="-m-1 rounded-none p-0">
                    <InputGroup className="-mb-1 rounded-none border-0 shadow-none [&:has([data-slot=input-group-control]:focus-visible)]:border-0 [&:has([data-slot=input-group-control]:focus-visible)]:ring-0">
                        <InputGroupInput
                            onChange={(event) => setSearch(event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                            placeholder="Search..."
                            value={search}
                        />
                        {search && (
                            <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setSearch('');
                                    }}
                                >
                                    <X />
                                </InputGroupButton>
                            </InputGroupAddon>
                        )}
                    </InputGroup>
                    <DropdownMenuSeparator />
                </DropdownMenuGroup>
                <DropdownMenuGroup className="max-h-64 overflow-y-auto">
                    {!filteredProviders.length ? (
                        <DropdownMenuItem
                            className="min-h-16 justify-center"
                            disabled
                        >
                            {search ? 'No results found' : 'No available providers'}
                        </DropdownMenuItem>
                    ) : (
                        filteredProviders.map((provider) => (
                            <DropdownMenuItem
                                key={provider.name}
                                onSelect={() => {
                                    if (disabled) {
                                        return;
                                    }

                                    onChange(provider);
                                    setSearch('');
                                }}
                            >
                                <div className="flex w-full min-w-0 items-center gap-2">
                                    <ProviderIcon
                                        className="size-4 shrink-0"
                                        provider={provider}
                                    />

                                    <span className="flex-1 truncate">{getProviderDisplayName(provider)}</span>
                                    {value === provider.name && <Check className="ml-auto size-4 shrink-0" />}
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
