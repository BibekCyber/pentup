import { useUser } from '@/providers/user-provider';

export const usePermission = (name: string): boolean => {
    const { authInfo } = useUser();

    return !!authInfo?.privileges?.includes(name);
};
