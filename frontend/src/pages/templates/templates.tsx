import type { LucideIcon } from 'lucide-react';

import {
    Box,
    Braces,
    Cloud,
    FileText,
    Globe,
    ListFilter,
    Loader2,
    MoreHorizontal,
    Network,
    Pencil,
    Plus,
    Shield,
    Smartphone,
    Trash,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import TargetTypeChip from '@/components/forms/target-type-chip';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { StatusCard } from '@/components/ui/status-card';
import { TargetType } from '@/graphql/types';
import { ALL_TARGET_TYPES, getTargetTypeLabel } from '@/lib/target-type-colors';
import { cn } from '@/lib/utils';
import { type Template, useTemplates } from '@/providers/templates-provider';

const ALL_FILTER = 'all';

// A leading glyph for the template's dossier tile, chosen per target type.
const TARGET_GLYPH: Record<TargetType, LucideIcon> = {
    [TargetType.Api]: Braces,
    [TargetType.Aws]: Cloud,
    [TargetType.Azure]: Cloud,
    [TargetType.Cloud]: Cloud,
    [TargetType.Gcp]: Cloud,
    [TargetType.General]: Box,
    [TargetType.MobileBackend]: Smartphone,
    [TargetType.Network]: Network,
    [TargetType.WebApp]: Globe,
};

// Explicit chip labels (client-specified): the WebApp chip reads "Web app", not
// the shared "Web" label, and Cloud reads "Cloud".
const FILTER_LABELS: Partial<Record<TargetType, string>> = {
    [TargetType.Cloud]: 'Cloud',
    [TargetType.WebApp]: 'Web app',
};

// Target-type filter chips shown in the toolbar (All templates / Web app / Cloud).
const TYPE_FILTERS: Array<{ icon: LucideIcon | null; label: string; value: string }> = [
    { icon: null, label: 'All templates', value: ALL_FILTER },
    ...ALL_TARGET_TYPES.map((type) => ({
        icon: TARGET_GLYPH[type],
        label: FILTER_LABELS[type] ?? getTargetTypeLabel(type),
        value: type,
    })),
];

const Templates = () => {
    const navigate = useNavigate();
    const { deleteTemplate, templates } = useTemplates();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingTemplate, setDeletingTemplate] = useState<null | Template>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [targetTypeFilter, setTargetTypeFilter] = useState<string>(ALL_FILTER);

    // Header context line — total playbooks split into system / custom.
    const systemCount = templates.filter((t) => t.systemOwned).length;
    const customCount = templates.length - systemCount;

    const filteredTemplates = useMemo(() => {
        if (targetTypeFilter === ALL_FILTER) {
            return templates;
        }

        return templates.filter((template) => template.targetTypes.includes(targetTypeFilter as TargetType));
    }, [templates, targetTypeFilter]);

    const handleTemplateOpen = (templateId: string) => {
        navigate(`/templates/${templateId}`);
    };

    const handleDeleteDialogOpen = (template: Template) => {
        setDeletingTemplate(template);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingTemplate) {
            return;
        }

        setDeletingIds((prev) => new Set(prev).add(deletingTemplate.id));

        try {
            await deleteTemplate(deletingTemplate.id);
            setDeletingTemplate(null);
        } catch {
            // Error already handled in provider with toast
        } finally {
            setDeletingIds((prev) => {
                const next = new Set(prev);
                next.delete(deletingTemplate.id);

                return next;
            });
        }
    };

    const renderTemplateCard = (template: Template) => {
        const Glyph = TARGET_GLYPH[template.targetTypes[0]] ?? Box;
        const primaryLabel = getTargetTypeLabel(template.targetTypes[0] ?? TargetType.General);

        return (
            <Card
                className="group hover:border-primary/50 flex cursor-pointer flex-col transition-colors"
                onClick={() => handleTemplateOpen(template.id)}
            >
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                    <span className="tgt-glyph">
                        <Glyph className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold tracking-tight">{template.title}</div>
                        <div className="text-muted-foreground truncate font-mono text-[10.5px]">
                            #{template.id} · {primaryLabel}
                        </div>
                    </div>
                    {template.systemOwned ? (
                        <span className="badge badge-sys shrink-0 uppercase">
                            <Shield className="size-3" />
                            System
                        </span>
                    ) : (
                        <span className="badge badge-outline shrink-0 uppercase">Custom</span>
                    )}
                    <div onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    className="text-muted-foreground hover:text-primary -mt-1 -mr-2 size-7 shrink-0"
                                    size="icon"
                                    variant="ghost"
                                >
                                    <MoreHorizontal />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="min-w-24"
                            >
                                <DropdownMenuItem onClick={() => handleTemplateOpen(template.id)}>
                                    <Pencil />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={deletingIds.has(template.id)}
                                    onClick={() => handleDeleteDialogOpen(template)}
                                >
                                    {deletingIds.has(template.id) ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash className="size-4" />
                                            Delete
                                        </>
                                    )}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <p className="text-muted-foreground line-clamp-2 min-h-[2.6rem] px-4 text-xs leading-relaxed">
                    {template.text}
                </p>
                {template.targetTypes.length ? (
                    <CardFooter className="mt-auto flex-wrap gap-1.5 border-t pt-4">
                        {template.targetTypes.map((type) => (
                            <TargetTypeChip
                                key={type}
                                type={type}
                            />
                        ))}
                    </CardFooter>
                ) : null}
            </Card>
        );
    };

    const renderRowContextMenu = (template: Template) => (
        <>
            <ContextMenuItem onClick={() => handleTemplateOpen(template.id)}>
                <Pencil />
                Edit
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
                disabled={deletingIds.has(template.id)}
                onClick={() => handleDeleteDialogOpen(template)}
            >
                <Trash />
                {deletingIds.has(template.id) ? 'Deleting...' : 'Delete'}
            </ContextMenuItem>
        </>
    );

    const pageHeader = (
        <header className="bg-background sticky top-0 z-10 flex h-12 w-full shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    className="h-4"
                    orientation="vertical"
                />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <FileText className="size-4" />
                            <BreadcrumbPage>Templates</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                {templates.length ? (
                    <div className="text-muted-foreground hidden items-center gap-1.5 font-mono text-[11.5px] sm:flex">
                        <Separator
                            className="h-4"
                            orientation="vertical"
                        />
                        <span className="text-foreground font-semibold">{templates.length}</span> playbooks
                        <span className="text-muted-foreground/50">·</span>
                        {systemCount} system
                        <span className="text-muted-foreground/50">·</span>
                        {customCount} custom
                    </div>
                ) : null}
            </div>
            <div className="ml-auto flex items-center gap-2 px-4">
                <Button
                    onClick={() => navigate('/templates/new')}
                    size="sm"
                    variant="default"
                >
                    <Plus />
                    <span className="hidden sm:inline">New Template</span>
                </Button>
            </div>
        </header>
    );

    // Filter toolbar — target-type chips (client wants chips, not a dropdown) + Sort.
    const filterToolbar = (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
                {TYPE_FILTERS.map((filter) => {
                    const Icon = filter.icon;

                    return (
                        <button
                            className={cn('chip', targetTypeFilter === filter.value && 'chip-on')}
                            key={filter.value}
                            onClick={() => setTargetTypeFilter(filter.value)}
                            type="button"
                        >
                            {Icon ? <Icon /> : null}
                            {filter.label}
                        </button>
                    );
                })}
            </div>
            <span className="ml-auto" />
            <Button
                className="text-muted-foreground"
                size="sm"
                variant="ghost"
            >
                <ListFilter />
                Sort
            </Button>
        </div>
    );

    if (!templates.length) {
        return (
            <>
                {pageHeader}
                <div className="flex flex-col gap-4 p-4">
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
                        description="Create your first template to get started"
                        icon={<FileText className="text-muted-foreground size-8" />}
                        title="No templates yet"
                    />
                </div>
            </>
        );
    }

    return (
        <>
            {pageHeader}
            <div className="flex flex-col gap-4 p-4">
                {filterToolbar}
                {filteredTemplates.length === 0 ? (
                    <StatusCard
                        action={
                            <Button
                                onClick={() => setTargetTypeFilter(ALL_FILTER)}
                                variant="secondary"
                            >
                                Clear filter
                            </Button>
                        }
                        description={`No templates match the "${getTargetTypeLabel(targetTypeFilter as TargetType)}" target type`}
                        icon={<FileText className="text-muted-foreground size-8" />}
                        title="No matching templates"
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredTemplates.map((template) => (
                            <ContextMenu key={template.id}>
                                <ContextMenuTrigger asChild>{renderTemplateCard(template)}</ContextMenuTrigger>
                                <ContextMenuContent>{renderRowContextMenu(template)}</ContextMenuContent>
                            </ContextMenu>
                        ))}
                    </div>
                )}

                <ConfirmationDialog
                    cancelText="Cancel"
                    confirmText="Delete"
                    handleConfirm={handleDelete}
                    handleOpenChange={setIsDeleteDialogOpen}
                    isOpen={isDeleteDialogOpen}
                    itemName={deletingTemplate?.title}
                    itemType="template"
                />
            </div>
        </>
    );
};

export default Templates;
