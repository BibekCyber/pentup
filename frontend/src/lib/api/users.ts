import type { User } from '@/models/user';

import { axios } from '@/lib/axios';

export interface CreateUserPayload {
    mail: string;
    name: string;
    password: string;
    role_id: number;
    status: User['status'];
    type: User['type'];
}

export interface Privilege {
    id: number;
    name: string;
    role_id: number;
}

export interface RolePrivileges {
    id: number;
    name: string;
    privileges: Privilege[];
}

export interface UpdateUserPayload {
    hash: string;
    mail: string;
    name: string;
    password?: string;
    role_id: number;
    status: User['status'];
    type: User['type'];
}

export interface UserRole extends User {
    role?: {
        id: number;
        name: string;
    };
}

interface RolesResponse {
    roles: RolePrivileges[];
    total: number;
}

interface UsersResponse {
    total: number;
    users: UserRole[];
}

// The list endpoints bind a TableQuery that requires `page` (>=1), `type`
// (one of sort/filter/init/page/size), and accepts `pageSize` (-1 = unlimited).
const tableQueryParams = { page: 1, pageSize: -1, type: 'init' };

// The axios response interceptor unwraps the envelope to `res.data`, so these
// helpers receive the already-parsed payload body.
export const fetchUsers = async (): Promise<UserRole[]> => {
    const data = await axios.get<unknown, { data?: UsersResponse }>('/users', { params: tableQueryParams });

    return data?.data?.users ?? [];
};

export const fetchRoles = async (): Promise<RolePrivileges[]> => {
    const data = await axios.get<unknown, { data?: RolesResponse }>('/roles', { params: tableQueryParams });

    return data?.data?.roles ?? [];
};

export const createUser = async (payload: CreateUserPayload): Promise<void> => {
    await axios.post('/users/', payload);
};

export const updateUser = async ({ hash, ...payload }: UpdateUserPayload): Promise<void> => {
    await axios.put(`/users/${hash}`, { hash, ...payload });
};

export const deleteUser = async (hash: string): Promise<void> => {
    await axios.delete(`/users/${hash}`);
};
