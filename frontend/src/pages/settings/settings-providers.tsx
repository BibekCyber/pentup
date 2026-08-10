import {
    AlertCircle,
    Check,
    ChevronDown,
    Copy,
    Cpu,
    Loader2,
    MoreVertical,
    Pencil,
    Plus,
    Settings,
    Star,
    Trash,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { ProviderConfigFragmentFragment } from '@/graphql/types';

import Anthropic from '@/components/icons/anthropic';
import Bedrock from '@/components/icons/bedrock';
import Custom from '@/components/icons/custom';
import DeepSeek from '@/components/icons/deepseek';
import Gemini from '@/components/icons/gemini';
import GLM from '@/components/icons/glm';
import Kimi from '@/components/icons/kimi';
import Ollama from '@/components/icons/ollama';
import OpenAi from '@/components/icons/open-ai';
import Qwen from '@/components/icons/qwen';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusCard } from '@/components/ui/status-card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    ProviderType,
    useDeleteProviderMutation,
    useSetDefaultProviderMutation,
    useSettingsProvidersQuery,
} from '@/graphql/types';

type Provider = ProviderConfigFragmentFragment;

const providerIcons: Record<ProviderType, React.ComponentType<any>> = {
    [ProviderType.Anthropic]: Anthropic,
    [ProviderType.Bedrock]: Bedrock,
    [ProviderType.Custom]: Custom,
    [ProviderType.Deepseek]: DeepSeek,
    [ProviderType.Gemini]: Gemini,
    [ProviderType.Glm]: GLM,
    [ProviderType.Kimi]: Kimi,
    [ProviderType.Ollama]: Ollama,
    [ProviderType.Openai]: OpenAi,
    [ProviderType.Qwen]: Qwen,
};

const providerTypes = [
    { label: 'Anthropic', type: ProviderType.Anthropic },
    { label: 'Bedrock', type: ProviderType.Bedrock },
    { label: 'Custom', type: ProviderType.Custom },
    { label: 'DeepSeek', type: ProviderType.Deepseek },
    { label: 'Gemini', type: ProviderType.Gemini },
    { label: 'GLM', type: ProviderType.Glm },
    { label: 'Kimi', type: ProviderType.Kimi },
    { label: 'Ollama', type: ProviderType.Ollama },
    { label: 'OpenAI', type: ProviderType.Openai },
    { label: 'Qwen', type: ProviderType.Qwen },
];

const getTypeLabel = (type: ProviderType): string =>
    providerTypes.find((provider) => provider.type === type)?.label || type;

// Count configured agents on a provider (excluding the GraphQL __typename key).
const getAgentCount = (agents: Provider['agents']): number =>
    agents ? Object.keys(agents).filter((key) => key !== '__typename').length : 0;

const SettingsProvidersHeader = () => {
    const navigate = useNavigate();

    const handleProviderCreate = (providerType: string) => {
        navigate(`/settings/providers/new?type=${providerType}`);
    };

    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
                <span className="text-muted-foreground font-mono text-[11px] font-semibold tracking-[0.16em] uppercase">
                    LLM Providers
                </span>
                <p className="text-muted-foreground font-mono text-[12px]">Manage language model providers</p>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="default">
                        Create Provider
                        <ChevronDown className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    style={{
                        width: 'var(--radix-dropdown-menu-trigger-width)',
                    }}
                >
                    {providerTypes.map(({ label, type }) => {
                        const Icon = providerIcons[type];

                        return (
                            <DropdownMenuItem
                                key={type}
                                onClick={() => handleProviderCreate(type)}
                            >
                                {Icon && <Icon className="size-4" />}
                                {label}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

interface ProviderCardProps {
    isDeleting: boolean;
    modelCount: number;
    onClone: (providerId: string) => void;
    onDelete: (provider: Provider) => void;
    onEdit: (providerId: string) => void;
    onSetDefault: (provider: Provider) => void;
    provider: Provider;
}

// EMBER provider card — monogram tile, name + DEFAULT/CUSTOM badges, type line,
// Ready status, capabilities line, and an action footer.
const ProviderCard = ({
    isDeleting,
    modelCount,
    onClone,
    onDelete,
    onEdit,
    onSetDefault,
    provider,
}: ProviderCardProps) => {
    const isCustom = provider.type === ProviderType.Custom;
    const agentCount = getAgentCount(provider.agents);
    const monogram = provider.name ? provider.name[0].toUpperCase() : null;

    return (
        <div className="bg-card border-border flex flex-col rounded-lg border p-4 shadow-[var(--hi)]">
            {/* Header — monogram · name/type · readiness */}
            <div className="flex items-start gap-[11px]">
                <div className="bg-well border-border-strong text-primary grid size-[34px] shrink-0 place-items-center rounded-lg border font-mono text-[15px] font-bold">
                    {monogram ?? <Cpu className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-[7px]">
                        <span className="text-[15px] font-bold">{provider.name}</span>
                        {provider.isDefault ? <span className="badge badge-sys">DEFAULT</span> : null}
                        {isCustom ? <span className="badge badge-outline">CUSTOM</span> : null}
                    </div>
                    <div className="text-muted-foreground mt-[3px] font-mono text-[11.5px]">
                        type · {getTypeLabel(provider.type)}
                        {isCustom ? ' · user-defined endpoint' : ''}
                    </div>
                </div>
                <span
                    className="status st-finished"
                    title="Credentials valid"
                >
                    <span className="dot" />
                    Ready
                </span>
            </div>

            {/* Capabilities line */}
            <div className="text-muted-foreground mt-[15px] flex items-center gap-2">
                <Cpu className="size-[13px]" />
                <span className="font-mono text-[11.5px]">
                    {agentCount} agents configured
                    {modelCount > 0 ? (
                        <>
                            <span className="text-[var(--ink-4)]"> · </span>
                            {modelCount} models
                        </>
                    ) : null}
                </span>
            </div>

            {/* Footer — default marker + action buttons */}
            <div className="border-border mt-auto flex items-center gap-1 border-t pt-[15px]">
                {provider.isDefault ? (
                    <span
                        className="chip"
                        style={{ color: 'var(--st-finished)' }}
                    >
                        <Check className="size-[13px]" />
                        Default
                    </span>
                ) : null}
                <span className="flex-1" />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            aria-label="Configure provider"
                            className="text-muted-foreground hover:text-foreground size-8"
                            onClick={() => onEdit(provider.id)}
                            size="icon"
                            variant="ghost"
                        >
                            <Pencil className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Configure</TooltipContent>
                </Tooltip>
                {!provider.isDefault ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                aria-label="Set as default provider"
                                className="text-muted-foreground hover:text-primary size-8"
                                onClick={() => onSetDefault(provider)}
                                size="icon"
                                variant="ghost"
                            >
                                <Star className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Set as default</TooltipContent>
                    </Tooltip>
                ) : null}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            aria-label="Delete provider"
                            className="text-muted-foreground hover:text-destructive size-8"
                            disabled={isDeleting}
                            onClick={() => onDelete(provider)}
                            size="icon"
                            variant="ghost"
                        >
                            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash className="size-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete provider</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            aria-label="More actions"
                            className="text-muted-foreground hover:text-foreground size-8"
                            size="icon"
                            variant="ghost"
                        >
                            <MoreVertical className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onClone(provider.id)}>
                            <Copy className="size-4" />
                            Clone
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};

const SettingsProviders = () => {
    const { data, error, loading: isLoading } = useSettingsProvidersQuery();
    const [deleteProvider, { error: deleteError, loading: isDeleteLoading }] = useDeleteProviderMutation();
    const [setDefaultProvider] = useSetDefaultProviderMutation({ refetchQueries: ['settingsProviders'] });
    const [deleteErrorMessage, setDeleteErrorMessage] = useState<null | string>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingProvider, setDeletingProvider] = useState<null | Provider>(null);
    const navigate = useNavigate();

    const handleProviderDelete = useCallback(
        async (providerId: string | undefined) => {
            if (!providerId) {
                return;
            }

            try {
                setDeleteErrorMessage(null);

                await deleteProvider({
                    refetchQueries: ['settingsProviders'],
                    variables: { providerId: providerId.toString() },
                });

                setDeletingProvider(null);
                setDeleteErrorMessage(null);
            } catch (error) {
                setDeleteErrorMessage(error instanceof Error ? error.message : 'An error occurred while deleting');
            }
        },
        [deleteProvider],
    );

    const handleSetDefault = useCallback(
        async (provider: Provider) => {
            if (provider.isDefault) {
                return;
            }

            try {
                await setDefaultProvider({ variables: { providerId: provider.id } });
                toast.success(`${provider.name} is now the default provider`);
            } catch (error) {
                toast.error('Failed to set default provider', {
                    description:
                        error instanceof Error ? error.message : 'An error occurred while setting the default provider',
                });
            }
        },
        [setDefaultProvider],
    );

    const handleProviderEdit = useCallback(
        (providerId: string) => {
            navigate(`/settings/providers/${providerId}`);
        },
        [navigate],
    );

    const handleProviderClone = useCallback(
        (providerId: string) => {
            navigate(`/settings/providers/new?id=${providerId}`);
        },
        [navigate],
    );

    const handleProviderDeleteDialogOpen = useCallback((provider: Provider) => {
        setDeletingProvider(provider);
        setIsDeleteDialogOpen(true);
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                <SettingsProvidersHeader />
                <StatusCard
                    description="Please wait while we fetch your provider configurations"
                    icon={<Loader2 className="text-muted-foreground size-16 animate-spin" />}
                    title="Loading providers..."
                />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col gap-4">
                <SettingsProvidersHeader />
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Error loading providers</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    const providers = data?.settingsProviders?.userDefined || [];
    const models = data?.settingsProviders?.models;

    // Check if providers list is empty
    if (providers.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                <SettingsProvidersHeader />
                <StatusCard
                    action={
                        <Button
                            onClick={() => navigate('/settings/providers/new')}
                            variant="default"
                        >
                            <Plus className="size-4" />
                            Add Provider
                        </Button>
                    }
                    description="Get started by adding your first language model provider"
                    icon={<Settings className="text-muted-foreground size-8" />}
                    title="No providers configured"
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <SettingsProvidersHeader />

            {/* Delete Error Alert */}
            {(deleteError || deleteErrorMessage) && (
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Error deleting provider</AlertTitle>
                    <AlertDescription>{deleteError?.message || deleteErrorMessage}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-3">
                {providers.map((provider) => (
                    <ProviderCard
                        isDeleting={isDeleteLoading && deletingProvider?.id === provider.id}
                        key={provider.id}
                        modelCount={models?.[provider.type as keyof typeof models]?.length ?? 0}
                        onClone={handleProviderClone}
                        onDelete={handleProviderDeleteDialogOpen}
                        onEdit={handleProviderEdit}
                        onSetDefault={handleSetDefault}
                        provider={provider}
                    />
                ))}
            </div>

            <ConfirmationDialog
                cancelText="Cancel"
                confirmText="Delete"
                handleConfirm={() => handleProviderDelete(deletingProvider?.id)}
                handleOpenChange={setIsDeleteDialogOpen}
                isOpen={isDeleteDialogOpen}
                itemName={deletingProvider?.name}
                itemType="provider"
            />
        </div>
    );
};

export default SettingsProviders;
