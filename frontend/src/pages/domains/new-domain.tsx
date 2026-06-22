import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { TargetTypeChip } from '@/components/forms/target-type-chip';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { TargetType } from '@/graphql/types';
import { useQuotaUsageQuery } from '@/graphql/types';
import { usePermission } from '@/hooks/use-permission';
import { ALL_TARGET_TYPES, getTargetTypeLabel } from '@/lib/target-type-colors';
import { cn } from '@/lib/utils';
import { useDomains } from '@/providers/domains-provider';
import { useTemplates } from '@/providers/templates-provider';

// Rough, clearly-labeled per-flow cost band used only for the admin cost
// preview. Not a billing figure — quotas, not cost, gate what users may run.
const PER_FLOW_COST_LOW = 0.5;
const PER_FLOW_COST_HIGH = 2.0;

// The model provider is hardcoded for now (provider selection was removed from
// the scan-creation form). Change here if a different default is needed.
const DEFAULT_MODEL_PROVIDER = 'kimi';

const formSchema = z
    .object({
        autoDetect: z.boolean(),
        name: z.string().trim().min(1, { message: 'Target is required' }),
        targetType: z.nativeEnum(TargetType).optional(),
        templateIds: z.array(z.string()),
    })
    .refine((data) => data.autoDetect || !!data.targetType, {
        message: 'Select a target type',
        path: ['targetType'],
    })
    .refine((data) => data.autoDetect || data.templateIds.length > 0, {
        message: 'Select at least one template',
        path: ['templateIds'],
    });

type DomainFormValues = z.infer<typeof formSchema>;

const NewDomain = () => {
    const navigate = useNavigate();
    const { createDomain } = useDomains();
    const { templates } = useTemplates();
    const canViewCost = usePermission('usage.view');

    const { data: quotaData } = useQuotaUsageQuery({ fetchPolicy: 'cache-and-network' });
    const quota = quotaData?.quotaUsage;

    const [isLoading, setIsLoading] = useState(false);

    const {
        control,
        formState: { errors },
        handleSubmit,
        register,
        setValue,
        watch,
    } = useForm<DomainFormValues>({
        defaultValues: {
            autoDetect: false,
            name: '',
            targetType: undefined,
            templateIds: [],
        },
        mode: 'onChange',
        resolver: zodResolver(formSchema),
    });

    const autoDetect = watch('autoDetect');
    const name = watch('name');
    const targetType = watch('targetType');
    const templateIds = watch('templateIds');

    // Deterministic submit-gating that mirrors the zod schema. We derive it from
    // the watched values rather than RHF's formState.isValid, which is unreliable
    // for ZodEffects (.refine) schemas and can leave the button disabled on valid
    // input.
    const canSubmit = useMemo(() => {
        if (!name?.trim()) {
            return false;
        }

        if (autoDetect) {
            return true;
        }

        return !!targetType && templateIds.length > 0;
    }, [name, autoDetect, targetType, templateIds]);

    // Templates available for the chosen target type.
    const availableTemplates = useMemo(() => {
        if (!targetType) {
            return [];
        }

        return templates.filter((template) => template.targetTypes.includes(targetType));
    }, [templates, targetType]);

    // When the target type changes (manual path), pre-select its default templates.
    useEffect(() => {
        if (autoDetect || !targetType) {
            return;
        }

        const defaults = templates
            .filter((template) => template.targetTypes.includes(targetType) && template.defaultTemplate)
            .map((template) => template.id);
        setValue('templateIds', defaults, { shouldValidate: true });
    }, [autoDetect, targetType, templates, setValue]);

    const flowsPerDomainMax = quota?.flowsPerDomainMax ?? 5;
    const selectedCount = autoDetect ? Math.min(flowsPerDomainMax, 3) : templateIds.length;
    const cappedCount = Math.min(selectedCount, flowsPerDomainMax);
    const willTruncate = selectedCount > flowsPerDomainMax;

    const flowsAfter = (quota?.flowsCurrent ?? 0) + cappedCount;
    const flowsMax = quota?.flowsMax ?? 10;

    const onSubmit = async (values: DomainFormValues) => {
        if (isLoading) {
            return;
        }

        setIsLoading(true);

        try {
            const domain = await createDomain({
                autoDetect: values.autoDetect,
                modelProvider: DEFAULT_MODEL_PROVIDER,
                name: values.name.trim(),
                targetType: values.autoDetect ? undefined : values.targetType,
                templateIds: values.autoDetect ? [] : values.templateIds,
            });

            if (domain) {
                if (!values.autoDetect && domain.flows.length < values.templateIds.length) {
                    toast.warning('Some flows were not started', {
                        description: `Requested ${values.templateIds.length}, ran ${domain.flows.length} (quota limit reached).`,
                    });
                }

                navigate(`/scans/${domain.id}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTemplate = (id: string, current: string[]) =>
        current.includes(id) ? current.filter((templateId) => templateId !== id) : [...current, id];

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
                            <BreadcrumbPage>New scan</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </header>

            <div className="flex min-h-[calc(100dvh-3rem)] items-start justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardContent className="flex flex-col gap-6 pt-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-semibold">Start a scan</h1>
                            <p className="text-muted-foreground mt-2">
                                Enter a target and run matching scan templates together.
                            </p>
                        </div>

                        <form
                            className="flex flex-col gap-5"
                            onSubmit={handleSubmit(onSubmit)}
                        >
                            {/* Target */}
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="domain-name">Target</Label>
                                <Input
                                    autoFocus
                                    disabled={isLoading}
                                    id="domain-name"
                                    placeholder="acme.com"
                                    {...register('name')}
                                />
                                {errors.name ? <p className="text-destructive text-xs">{errors.name.message}</p> : null}
                            </div>

                            {/* Auto-detect toggle — light row, switch on the right */}
                            <Controller
                                control={control}
                                name="autoDetect"
                                render={({ field }) => (
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex flex-col gap-0.5">
                                            <Label
                                                className="flex items-center gap-2"
                                                htmlFor="auto-detect"
                                            >
                                                <Sparkles className="text-muted-foreground size-4" />
                                                Auto-detect target type
                                            </Label>
                                            <p className="text-muted-foreground text-xs">
                                                Probe the target and pick templates for you.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={field.value}
                                            disabled={isLoading}
                                            id="auto-detect"
                                            onCheckedChange={field.onChange}
                                        />
                                    </div>
                                )}
                            />

                            {/* Target type (manual path only) */}
                            {!autoDetect ? (
                                <div className="flex flex-col gap-2">
                                    <Label>Target type</Label>
                                    <Controller
                                        control={control}
                                        name="targetType"
                                        render={({ field }) => (
                                            <Select
                                                disabled={isLoading}
                                                onValueChange={field.onChange}
                                                value={field.value ?? ''}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a target type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ALL_TARGET_TYPES.map((type) => (
                                                        <SelectItem
                                                            key={type}
                                                            value={type}
                                                        >
                                                            {getTargetTypeLabel(type)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.targetType ? (
                                        <p className="text-destructive text-xs">{errors.targetType.message}</p>
                                    ) : null}
                                </div>
                            ) : null}

                            {/* Template multi-select (manual path only) */}
                            {!autoDetect && targetType ? (
                                <div className="flex flex-col gap-2">
                                    <Label>Templates to run</Label>
                                    <Controller
                                        control={control}
                                        name="templateIds"
                                        render={({ field }) => (
                                            <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto rounded-md border p-2">
                                                {availableTemplates.length === 0 ? (
                                                    <p className="text-muted-foreground p-3 text-center text-sm">
                                                        No templates tagged for {getTargetTypeLabel(targetType)}.
                                                    </p>
                                                ) : (
                                                    availableTemplates.map((template) => {
                                                        const selected = field.value.includes(template.id);

                                                        return (
                                                            <button
                                                                className={cn(
                                                                    'flex items-start gap-2 rounded-md border p-2 text-left transition-colors',
                                                                    selected
                                                                        ? 'border-primary bg-primary/5'
                                                                        : 'hover:bg-muted border-transparent',
                                                                )}
                                                                disabled={isLoading}
                                                                key={template.id}
                                                                onClick={() =>
                                                                    field.onChange(
                                                                        toggleTemplate(template.id, field.value),
                                                                    )
                                                                }
                                                                type="button"
                                                            >
                                                                <span
                                                                    className={cn(
                                                                        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                                                                        selected
                                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                                            : 'border-input',
                                                                    )}
                                                                >
                                                                    {selected ? <Check className="size-3" /> : null}
                                                                </span>
                                                                <span className="flex min-w-0 flex-1 flex-col">
                                                                    <span className="truncate text-sm font-medium">
                                                                        {template.title}
                                                                        {template.defaultTemplate ? (
                                                                            <span className="text-muted-foreground ml-1 text-xs font-normal">
                                                                                (default)
                                                                            </span>
                                                                        ) : null}
                                                                    </span>
                                                                    <span className="text-muted-foreground line-clamp-1 text-xs">
                                                                        {template.text}
                                                                    </span>
                                                                </span>
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    />
                                    {errors.templateIds ? (
                                        <p className="text-destructive text-xs">{errors.templateIds.message}</p>
                                    ) : null}
                                </div>
                            ) : null}

                            {/* Confirmation panel */}
                            <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-4 text-sm">
                                <p>
                                    About to start{' '}
                                    <span className="font-semibold">
                                        {autoDetect ? 'up to ' : ''}
                                        {cappedCount} flow{cappedCount === 1 ? '' : 's'}
                                    </span>{' '}
                                    targeting <span className="font-semibold">{name?.trim() || 'your target'}</span>
                                    {!autoDetect && targetType ? (
                                        <>
                                            {' '}
                                            (<TargetTypeChip type={targetType} /> scan)
                                        </>
                                    ) : null}
                                    .
                                </p>
                                <p className="text-muted-foreground">Estimated total runtime: 25–40 minutes.</p>
                                <p className="text-muted-foreground">
                                    You will have{' '}
                                    <span className="text-foreground font-medium">
                                        {flowsAfter}/{flowsMax}
                                    </span>{' '}
                                    concurrent flows running after this.
                                </p>
                                {willTruncate ? (
                                    <p className="text-yellow-600 dark:text-yellow-500">
                                        This selection exceeds the per-scan limit; only the first {flowsPerDomainMax}{' '}
                                        will run.
                                    </p>
                                ) : null}
                                {canViewCost ? (
                                    <p className="text-muted-foreground border-t pt-2">
                                        Estimated cost:{' '}
                                        <span className="text-foreground font-medium">
                                            ${(cappedCount * PER_FLOW_COST_LOW).toFixed(2)}–$
                                            {(cappedCount * PER_FLOW_COST_HIGH).toFixed(2)}
                                        </span>{' '}
                                        (${PER_FLOW_COST_LOW.toFixed(2)}–${PER_FLOW_COST_HIGH.toFixed(2)} per flow,
                                        estimated)
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    disabled={isLoading}
                                    onClick={() => navigate('/scans')}
                                    type="button"
                                    variant="outline"
                                >
                                    <ArrowLeft />
                                    Cancel
                                </Button>
                                <Button
                                    disabled={isLoading || !canSubmit}
                                    type="submit"
                                >
                                    {isLoading ? <Spinner variant="circle" /> : null}
                                    Confirm and Run
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default NewDomain;
