import type { ColumnDef } from '@tanstack/react-table';

import { ArrowDown, ArrowUp, FileText, Loader2, MoreHorizontal, Pencil, Plus, Trash } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import TargetTypeChip from '@/components/forms/target-type-chip';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { DataTable } from '@/components/ui/data-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { StatusCard } from '@/components/ui/status-card';
import { TargetType } from '@/graphql/types';
import { ALL_TARGET_TYPES, getTargetTypeLabel } from '@/lib/target-type-colors';
import { type Template, useTemplates } from '@/providers/templates-provider';

const ALL_FILTER = 'all';

const Templates = () => {
    const navigate = useNavigate();
    const { deleteTemplate, templates } = useTemplates();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingTemplate, setDeletingTemplate] = useState<null | Template>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [targetTypeFilter, setTargetTypeFilter] = useState<string>(ALL_FILTER);

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

    const columns: ColumnDef<Template>[] = [
        {
            accessorKey: 'title',
            cell: ({ row }) => {
                const template = row.original;

                return (
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{template.title}</span>
                        {template.systemOwned ? (
                            <Badge
                                className="shrink-0"
                                variant="secondary"
                            >
                                System
                            </Badge>
                        ) : null}
                    </div>
                );
            },
            header: ({ column }) => {
                const sorted = column.getIsSorted();

                return (
                    <Button
                        className="text-muted-foreground hover:text-primary flex items-center gap-2 p-0 no-underline hover:no-underline"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        variant="link"
                    >
                        Title
                        {sorted === 'asc' ? (
                            <ArrowDown className="size-4" />
                        ) : sorted === 'desc' ? (
                            <ArrowUp className="size-4" />
                        ) : null}
                    </Button>
                );
            },
        },
        {
            accessorKey: 'text',
            cell: ({ row }) => {
                const text = (row.getValue('text') as string) ?? '';

                return <div className="text-muted-foreground max-w-[380px] truncate text-sm">{text}</div>;
            },
            header: ({ column }) => {
                const sorted = column.getIsSorted();

                return (
                    <Button
                        className="text-muted-foreground hover:text-primary flex items-center gap-2 p-0 no-underline hover:no-underline"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        variant="link"
                    >
                        Text
                        {sorted === 'asc' ? (
                            <ArrowDown className="size-4" />
                        ) : sorted === 'desc' ? (
                            <ArrowUp className="size-4" />
                        ) : null}
                    </Button>
                );
            },
        },
        {
            accessorKey: 'targetTypes',
            cell: ({ row }) => {
                const targetTypes = row.original.targetTypes;

                if (!targetTypes.length) {
                    return null;
                }

                return (
                    <div className="flex max-w-[260px] flex-wrap gap-1">
                        {targetTypes.map((type) => (
                            <TargetTypeChip
                                key={type}
                                type={type}
                            />
                        ))}
                    </div>
                );
            },
            enableSorting: false,
            header: () => <span className="text-muted-foreground">Target types</span>,
        },
        {
            cell: ({ row }) => {
                const template = row.original;

                return (
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    className="size-8 p-0"
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
                );
            },
            enableHiding: false,
            header: () => null,
            id: 'actions',
            meta: { preventRowClick: true },
            size: 48,
        },
    ];

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
            </div>
            <div className="ml-auto flex items-center gap-2 px-4">
                <Select
                    onValueChange={setTargetTypeFilter}
                    value={targetTypeFilter}
                >
                    <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue placeholder="All target types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_FILTER}>All target types</SelectItem>
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
                <Button
                    onClick={() => navigate('/templates/new')}
                    size="sm"
                    variant="default"
                >
                    <Plus />
                    New Template
                </Button>
            </div>
        </header>
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
            <div className="flex flex-col gap-4 p-4 pt-0">
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
                    <DataTable
                        columns={columns}
                        data={filteredTemplates}
                        filterColumn="title"
                        filterPlaceholder="Filter templates..."
                        onRowClick={(template) => handleTemplateOpen(template.id)}
                        renderRowContextMenu={renderRowContextMenu}
                    />
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
