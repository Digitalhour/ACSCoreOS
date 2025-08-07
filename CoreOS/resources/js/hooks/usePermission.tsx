import {usePage} from '@inertiajs/react';
import {SharedData} from '@/types';

export const usePermission = () => {
    const { auth } = usePage().props as unknown as SharedData;

    const hasPermission = (permission: string): boolean => {
        return auth?.user?.permissions?.includes(permission) ?? false;
    };

    const hasRole = (role: string): boolean => {
        return auth?.user?.roles?.includes(role) ?? false;
    };

    // Optional: Check for any of the given roles
    const hasAnyRole = (roles: string[]): boolean => {
        return roles.some(role => hasRole(role));
    };

    // Optional: Check for all roles (rarely needed, but useful in some cases)
    const hasAllRoles = (roles: string[]): boolean => {
        return roles.every(role => hasRole(role));
    };

    return {
        hasPermission,
        hasRole,
        hasAnyRole,
        hasAllRoles,
        userPermissions: auth?.user?.permissions?.slice() ?? [],
        userRoles: auth?.user?.roles?.slice() ?? [],
    };
};
