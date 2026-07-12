import type { ColumnDef } from '@tanstack/react-table';

import { AlertCircle, KeyRound, Loader2, Lock, LockOpen, MoreHorizontal, Pencil, Plus, Trash, Users as UsersIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import UserDeleteDialog from '@/components/forms/user-delete-dialog';
import UserFormDialog from '@/components/forms/user-form-dialog';
import UserResetPasswordDialog from '@/components/forms/user-reset-password-dialog';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusCard } from '@/components/ui/status-card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getApiErrorMessage } from '@/lib/api/errors';
import { fetchRoles, fetchUsers, type RolePrivileges, updateUser, type UserRole } from '@/lib/api/users';
import { useUser } from '@/providers/user-provider';

const statusVariant: Record<UserRole['status'], 'default' | 'destructive' | 'secondary'> = {
    active: 'default',
    blocked: 'destructive',
    created: 'secondary',
};

const formatDate = (value: string) => {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const SettingsUsersHeader = ({ onCreate }: { onCreate: () => void }) => (
    <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
            <p className="text-muted-foreground">Manage user accounts, roles, and access.</p>
        </div>
        <Button
            onClick={onCreate}
            variant="default"
        >
            <Plus className="size-4" />
            Add User
        </Button>
    </div>
);

const SettingsUsers = () => {
    const { authInfo } = useUser();
    const currentUserId = authInfo?.user?.id;

    const [users, setUsers] = useState<UserRole[]>([]);
    const [roles, setRoles] = useState<RolePrivileges[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<null | string>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<undefined | UserRole>(undefined);
    const [resetUser, setResetUser] = useState<null | UserRole>(null);
    const [deleteUser, setDeleteUser] = useState<null | UserRole>(null);
    const [statusTarget, setStatusTarget] = useState<null | UserRole>(null);
    const [pendingStatusIds, setPendingStatusIds] = useState<Set<string>>(new Set());

    const roleNameById = useMemo(() => {
        const map = new Map<number, string>();
        roles.forEach((role) => map.set(role.id, role.name));

        return map;
    }, [roles]);

    const load = useCallback(async () => {
        setError(null);

        try {
            const [usersData, rolesData] = await Promise.all([fetchUsers(), fetchRoles()]);
            setUsers(usersData);
            setRoles(rolesData);
        } catch (err) {
            setError(getApiErrorMessage(err, 'Failed to load users'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleCreate = () => {
        setEditingUser(undefined);
        setFormOpen(true);
    };

    const handleEdit = (user: UserRole) => {
        setEditingUser(user);
        setFormOpen(true);
    };

    const handleToggleStatus = async (user: UserRole) => {
        const nextStatus = user.status === 'blocked' ? 'active' : 'blocked';

        setPendingStatusIds((prev) => new Set(prev).add(user.hash));

        try {
            await updateUser({
                hash: user.hash,
                mail: user.mail,
                name: user.name,
                role_id: user.role_id,
                status: nextStatus,
                type: user.type,
            });
            await load();
        } catch (err) {
            setError(getApiErrorMessage(err, 'Failed to update user status'));
        } finally {
            setPendingStatusIds((prev) => {
                const next = new Set(prev);
                next.delete(user.hash);

                return next;
            });
            setStatusTarget(null);
        }
    };

    const columns: ColumnDef<UserRole>[] = useMemo(
        () => [
            {
                accessorKey: 'mail',
                cell: ({ row }) => <div className="font-medium">{row.original.mail}</div>,
                header: 'Email',
            },
            {
                accessorKey: 'name',
                cell: ({ row }) => <div>{row.original.name || '—'}</div>,
                header: 'Name',
            },
            {
                cell: ({ row }) => row.original.role?.name ?? roleNameById.get(row.original.role_id) ?? '—',
                header: 'Role',
                id: 'role',
            },
            {
                accessorKey: 'status',
                cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>,
                header: 'Status',
            },
            {
                cell: ({ row }) => formatDate(row.original.created_at),
                header: 'Created',
                id: 'created_at',
            },
            {
                cell: ({ row }) => {
                    const user = row.original;
                    const isSelf = user.id === currentUserId;
                    const isStatusPending = pendingStatusIds.has(user.hash);

                    return (
                        <div className="flex items-center justify-end opacity-0 transition-opacity group-hover:opacity-100">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        className="size-8 p-0"
                                        variant="ghost"
                                    >
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="min-w-40"
                                >
                                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                                        <Pencil className="size-3" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setResetUser(user)}>
                                        <KeyRound className="size-3" />
                                        Reset password
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {isSelf ? (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div>
                                                    <DropdownMenuItem disabled>
                                                        {user.status === 'blocked' ? (
                                                            <LockOpen className="size-3" />
                                                        ) : (
                                                            <Lock className="size-3" />
                                                        )}
                                                        {user.status === 'blocked' ? 'Unblock' : 'Block'}
                                                    </DropdownMenuItem>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>Cannot perform on your own account</TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <DropdownMenuItem
                                            disabled={isStatusPending}
                                            onClick={() => setStatusTarget(user)}
                                        >
                                            {user.status === 'blocked' ? (
                                                <LockOpen className="size-3" />
                                            ) : (
                                                <Lock className="size-3" />
                                            )}
                                            {user.status === 'blocked' ? 'Unblock' : 'Block'}
                                        </DropdownMenuItem>
                                    )}
                                    {isSelf ? (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div>
                                                    <DropdownMenuItem disabled>
                                                        <Trash className="size-3" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>Cannot perform on your own account</TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <DropdownMenuItem onClick={() => setDeleteUser(user)}>
                                            <Trash className="size-3" />
                                            Delete
                                        </DropdownMenuItem>
                                    )}
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
        ],
        [currentUserId, pendingStatusIds, roleNameById],
    );

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                <SettingsUsersHeader onCreate={handleCreate} />
                <StatusCard
                    description="Please wait while we fetch the user list"
                    icon={<Loader2 className="text-muted-foreground size-16 animate-spin" />}
                    title="Loading users..."
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <SettingsUsersHeader onCreate={handleCreate} />

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {users.length === 0 ? (
                <StatusCard
                    action={
                        <Button
                            onClick={handleCreate}
                            variant="default"
                        >
                            <Plus className="size-4" />
                            Add User
                        </Button>
                    }
                    description="Create the first user to get started"
                    icon={<UsersIcon className="text-muted-foreground size-8" />}
                    title="No users yet"
                />
            ) : (
                <DataTable<UserRole>
                    columns={columns}
                    data={users}
                    filterColumn="mail"
                    filterPlaceholder="Filter by email..."
                />
            )}

            <UserFormDialog
                onOpenChange={setFormOpen}
                onSaved={load}
                open={formOpen}
                roles={roles}
                user={editingUser}
            />

            <UserResetPasswordDialog
                onOpenChange={(open) => !open && setResetUser(null)}
                open={Boolean(resetUser)}
                user={resetUser}
            />

            <UserDeleteDialog
                onDeleted={load}
                onOpenChange={(open) => !open && setDeleteUser(null)}
                open={Boolean(deleteUser)}
                user={deleteUser}
            />

            <ConfirmationDialog
                cancelText="Cancel"
                confirmText={statusTarget?.status === 'blocked' ? 'Unblock' : 'Block'}
                confirmVariant={statusTarget?.status === 'blocked' ? 'default' : 'destructive'}
                description={
                    statusTarget?.status === 'blocked'
                        ? `Unblock ${statusTarget?.mail}? They will be able to sign in again.`
                        : `Block ${statusTarget?.mail}? They will be signed out immediately.`
                }
                handleConfirm={() => statusTarget && handleToggleStatus(statusTarget)}
                handleOpenChange={(open) => !open && setStatusTarget(null)}
                isOpen={Boolean(statusTarget)}
                title={statusTarget?.status === 'blocked' ? 'Unblock user' : 'Block user'}
            />
        </div>
    );
};

export default SettingsUsers;
