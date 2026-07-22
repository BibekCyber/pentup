import type { LucideIcon } from 'lucide-react';

import {
    Box,
    Braces,
    ChevronLeft,
    ChevronRight,
    Cloud,
    FileText,
    Globe,
    Loader2,
    MoreHorizontal,
    Network,
    Pencil,
    Plus,
    Search,
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
const PAGE_SIZE = 24;

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
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [page, setPage] = useState(1);

    // Header context line — total playbooks split into system / custom.
    const systemCount = templates.filter((t) => t.systemOwned).length;
    const customCount = templates.length - systemCount;

    const filteredTemplates = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return templates.filter((template) => {
            if (targetTypeFilter !== ALL_FILTER && !template.targetTypes.includes(targetTypeFilter as TargetType)) {
                return false;
            }

            if (query && !template.title.toLowerCase().includes(query)) {
                return false;
            }

            return true;
        });
    }, [templates, targetTypeFilter, searchTerm]);

    // Client-side pagination — the provider loads the whole list, we render only
    // the current page so the DOM stays light as the library scales.
    const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageTemplates = filteredTemplates.slice(startIndex, startIndex + PAGE_SIZE);
    const rangeStart = filteredTemplates.length === 0 ? 0 : startIndex + 1;
    const rangeEnd = Math.min(startIndex + PAGE_SIZE, filteredTemplates.length);

    const selectFilter = (value: string) => {
        setTargetTypeFilter(value);
        setPage(1);
    };

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setPage(1);
    };

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

    // Filter toolbar — search + target-type chips (client wants chips, not a dropdown) + view toggle.
    const filterToolbar = (
        <div className="flex flex-wrap items-center gap-2">
            <div className="bg-well border-border focus-within:border-primary/50 flex h-[34px] items-center gap-2 rounded-md border px-2.5 transition-colors">
                <Search className="text-muted-foreground size-4 shrink-0" />
                <input
                    className="placeholder:text-muted-foreground w-44 bg-transparent text-sm outline-none"
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="Search templates"
                    type="text"
                    value={searchTerm}
                />
            </div>
            <div className="flex flex-wrap gap-1.5">
                {TYPE_FILTERS.map((filter) => {
                    const Icon = filter.icon;

                    return (
                        <button
                            className={cn('chip', targetTypeFilter === filter.value && 'chip-on')}
                            key={filter.value}
                            onClick={() => selectFilter(filter.value)}
                            type="button"
                        >
                            {Icon ? <Icon /> : null}
                            {filter.label}
                        </button>
                    );
                })}
            </div>
            <div className="seg">
                <button
                    className={cn(view === 'grid' && 'active')}
                    onClick={() => setView('grid')}
                    type="button"
                >
                    Grid
                </button>
                <button
                    className={cn(view === 'list' && 'active')}
                    onClick={() => setView('list')}
                    type="button"
                >
                    List
                </button>
            </div>
            <span className="ml-auto" />
        </div>
    );

    const renderPager = () => (
        <div className="pager mt-5">
            <span className="text-muted-foreground font-mono text-[11.5px]">
                Showing {rangeStart}–{rangeEnd} of {filteredTemplates.length.toLocaleString()}
            </span>
            <span className="ml-auto" />
            <span className="text-muted-foreground mr-3 font-mono text-[11px]">Rows {PAGE_SIZE}</span>
            <div className="pg-group">
                <button
                    className="pg-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    title="Previous"
                    type="button"
                >
                    <ChevronLeft />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                        className={cn('pg-btn', n === currentPage && 'active')}
                        key={n}
                        onClick={() => setPage(n)}
                        type="button"
                    >
                        {n}
                    </button>
                ))}
                <button
                    className="pg-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    title="Next"
                    type="button"
                >
                    <ChevronRight />
                </button>
            </div>
        </div>
    );

    const renderTemplateRow = (template: Template) => {
        const Glyph = TARGET_GLYPH[template.targetTypes[0]] ?? Box;
        const primaryLabel = getTargetTypeLabel(template.targetTypes[0] ?? TargetType.General);

        return (
            <tr
                key={template.id}
                onClick={() => handleTemplateOpen(template.id)}
            >
                <td className="m">
                    <div className="min-w-0">
                        <div className="truncate font-semibold">{template.title}</div>
                        <div className="text-muted-foreground truncate font-mono text-[10.5px]">#{template.id}</div>
                    </div>
                </td>
                <td>
                    <span className="chip">
                        <Glyph className="size-[13px]" />
                        {primaryLabel}
                    </span>
                </td>
                <td>
                    {template.systemOwned ? (
                        <span className="badge badge-sys uppercase">
                            <Shield className="size-3" />
                            System
                        </span>
                    ) : (
                        <span className="badge badge-outline uppercase">Custom</span>
                    )}
                </td>
                <td className="w-11 text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                className="text-muted-foreground hover:text-foreground ml-auto size-7"
                                onClick={(event) => event.stopPropagation()}
                                size="icon"
                                variant="ghost"
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            onClick={(event) => event.stopPropagation()}
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
                </td>
            </tr>
        );
    };

    if (!templates.length) {
        return (
            <>
                {pageHeader}
                <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 p-6">
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
            <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 p-6">
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
                ) : view === 'grid' ? (
                    <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {pageTemplates.map((template) => (
                                <ContextMenu key={template.id}>
                                    <ContextMenuTrigger asChild>{renderTemplateCard(template)}</ContextMenuTrigger>
                                    <ContextMenuContent>{renderRowContextMenu(template)}</ContextMenuContent>
                                </ContextMenu>
                            ))}
                        </div>
                        {renderPager()}
                    </>
                ) : (
                    <div className="bg-card border-border overflow-hidden rounded-lg border">
                        <div className="overflow-x-auto">
                            <table className="tbl">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Type</th>
                                        <th>System / Custom</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>{pageTemplates.map((template) => renderTemplateRow(template))}</tbody>
                            </table>
                        </div>
                        {renderPager()}
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
