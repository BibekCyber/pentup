import * as React from 'react';
import { Navigate } from 'react-router-dom';

import { usePermission } from '@/hooks/use-permission';
import { useUser } from '@/providers/user-provider';

interface ProtectedByPermissionProps {
    children: React.ReactNode;
    fallback?: string;
    permission: string;
}

const ProtectedByPermission = ({ children, fallback = '/scans', permission }: ProtectedByPermissionProps) => {
    const { isLoading } = useUser();
    const allowed = usePermission(permission);

    // Wait for the initial auth check so privileges are loaded before deciding.
    if (isLoading) {
        return null;
    }

    if (!allowed) {
        return (
            <Navigate
                replace
                to={fallback}
            />
        );
    }

    return children;
};

export default ProtectedByPermission;
