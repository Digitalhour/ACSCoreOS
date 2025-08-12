import React, {useEffect, useMemo, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Head, router, useForm} from '@inertiajs/react';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
import {
    ChevronDown,
    ChevronRight,
    Download,
    Edit,
    MoreVertical,
    Plus,
    RotateCcw,
    Save,
    Search,
    Shield,
    ShieldOff,
    Trash2,
    User,
    Zap
} from 'lucide-react';
import {toast} from 'sonner';
import AppLayout from '@/layouts/app-layout';
import {InfoTooltip} from '@/components/InfoTooltip';

// Interface definitions
interface Permission {
    id: number | string;
    name: string;
    description?: string;
}

interface Role {
    id: number | string;
    name: string;
    description?: string;
    permissions?: Permission[];
}

interface User {
    id: number | string;
    name: string;
    email: string;
    department?: string;
    roles?: Role[];
    direct_permissions?: Permission[];
}

interface RoutePermission {
    id: number | string;
    route_name: string;
    route_uri: string;
    route_methods: string[];
    controller_class?: string;
    controller_method?: string;
    group_name: string;
    description?: string;
    is_protected: boolean;
    is_active: boolean;
    permissions?: Permission[];
    roles?: Role[];
}

interface RouteGroup {
    [groupName: string]: RoutePermission[];
}

interface RouteStats {
    total_routes: number;
    active_routes: number;
    protected_routes: number;
    routes_with_permissions: number;
    total_groups: number;
}

interface AccessControlPageProps {
    permissions: Permission[];
    roles: Role[];
    users: User[];
    departments: { id: number | string; name: string; }[];
    routeGroups: RouteGroup;
    routeStats: RouteStats;
    flash?: {
        success?: string;
        error?: string;
    };
}

interface PermissionCategory {
    name: string;
    permissions: Permission[];
    expanded: boolean;
}

interface UserGroup {
    name: string;
    users: User[];
    expanded: boolean;
}

interface RolePermissionMatrix {
    [roleId: string]: {
        [permissionId: string]: boolean;
    };
}

interface UserRoleMatrix {
    [userId: string]: {
        [roleId: string]: boolean;
    };
}

const breadcrumbs = [
    {
        title: 'Access Control Management',
        href: route('access-control.index'),
    },
];

export default function AccessControlPage({
                                              permissions: initialPermissions,
                                              roles: initialRoles,
                                              users: initialUsers,
                                              routeGroups,
                                              routeStats,
                                              flash,
                                          }: AccessControlPageProps) {
    const [activeTab, setActiveTab] = useState('role-permissions');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
    const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
    const [expandedRouteGroups, setExpandedRouteGroups] = useState<{ [key: string]: boolean }>({});
    const [hasRolePermChanges, setHasRolePermChanges] = useState(false);
    const [hasUserRoleChanges, setHasUserRoleChanges] = useState(false);
    const [hasRoutePermChanges, setHasRoutePermChanges] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Modal states
    const [permissionModal, setPermissionModal] = useState({
        open: false,
        mode: 'create' as 'create' | 'edit',
        permission: null as Permission | null
    });
    const [roleModal, setRoleModal] = useState({
        open: false,
        mode: 'create' as 'create' | 'edit',
        role: null as Role | null
    });
    const [userPermissionModal, setUserPermissionModal] = useState({
        open: false,
        user: null as User | null
    });
    const [deleteDialog, setDeleteDialog] = useState({
        open: false,
        type: 'permission' as 'permission' | 'role',
        item: null as Permission | Role | null
    });
    const [bulkAssignModal, setBulkAssignModal] = useState({
        open: false,
        groupName: '',
        routes: [] as RoutePermission[]
    });

    // Matrix states
    const [rolePermissionMatrix, setRolePermissionMatrix] = useState<RolePermissionMatrix>(() => {
        const matrix: RolePermissionMatrix = {};
        initialRoles.forEach(role => {
            matrix[role.id] = {} as Record<string | number, boolean>;
            initialPermissions.forEach(permission => {
                matrix[role.id][permission.id] = role.permissions?.some(p => p.id === permission.id) || false;
            });
        });
        return matrix;
    });

    const [userRoleMatrix, setUserRoleMatrix] = useState<UserRoleMatrix>(() => {
        const matrix: UserRoleMatrix = {};
        initialUsers.forEach(user => {
            matrix[user.id] = {} as Record<string | number, boolean>;
            initialRoles.forEach(role => {
                matrix[user.id][role.id] = user.roles?.some(r => r.id === role.id) || false;
            });
        });
        return matrix;
    });

    // Route permission assignments state
    const [routePermissionAssignments, setRoutePermissionAssignments] = useState<{
        [routeId: string]: {
            permission_ids: string[];
            role_ids: string[];
            is_protected: boolean;
        };
    }>(() => {
        const assignments: { [routeId: string]: { permission_ids: string[]; role_ids: string[]; is_protected: boolean; } } = {};
        Object.values(routeGroups).flat().forEach(route => {
            assignments[route.id] = {
                permission_ids: route.permissions?.map(p => p.id.toString()) || [],
                role_ids: route.roles?.map(r => r.id.toString()) || [],
                is_protected: route.is_protected
            };
        });
        return assignments;
    });

    // Forms
    const { data: permissionData, setData: setPermissionData, post: postPermission, put: putPermission, delete: deletePermission, processing: permissionProcessing, reset: resetPermission, errors: permissionErrors } = useForm({
        name: '',
        description: ''
    });

    const { data: roleData, setData: setRoleData, post: postRole, put: putRole, delete: deleteRole, processing: roleProcessing, reset: resetRole, errors: roleErrors } = useForm({
        name: '',
        description: ''
    });

    const { data: userPermData, setData: setUserPermData, post: postUserPerm, processing: userPermProcessing, reset: resetUserPerm } = useForm({
        user_id: '',
        permissions: [] as string[]
    });

    const { data: bulkAssignData, setData: setBulkAssignData, post: postBulkAssign, processing: bulkAssignProcessing, reset: resetBulkAssign } = useForm({
        route_ids: [] as string[],
        permission_ids: [] as string[],
        role_ids: [] as string[],
        is_protected: true
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Permission categories
    const permissionCategories = useMemo<PermissionCategory[]>(() => {
        const categories: { [key: string]: Permission[] } = {};
        initialPermissions.forEach(permission => {
            const parts = permission.name.split('-');
            const categoryName = parts.length > 1 ? parts[0] : 'General';
            if (!categories[categoryName]) categories[categoryName] = [];
            categories[categoryName].push(permission);
        });

        return Object.entries(categories)
            .map(([name, perms]) => ({
                name,
                permissions: perms.sort((a, b) => a.name.localeCompare(b.name)),
                expanded: expandedCategories[name] === true
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [initialPermissions, expandedCategories]);

    // User groups
    const userGroups = useMemo<UserGroup[]>(() => {
        const groups: { [key: string]: User[] } = {};
        initialUsers.forEach(user => {
            const groupName = user.department || 'No Department';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(user);
        });

        return Object.entries(groups)
            .map(([name, users]) => ({
                name,
                users: users.sort((a, b) => a.name.localeCompare(b.name)),
                expanded: expandedGroups[name] === true
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [initialUsers, expandedGroups]);

    // Filtered data based on search
    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return permissionCategories;
        const query = searchQuery.toLowerCase();
        return permissionCategories
            .map(category => ({
                ...category,
                permissions: category.permissions.filter(permission =>
                    permission.name.toLowerCase().includes(query) ||
                    category.name.toLowerCase().includes(query) ||
                    (permission.description && permission.description.toLowerCase().includes(query))
                )
            }))
            .filter(category => category.permissions.length > 0);
    }, [permissionCategories, searchQuery]);

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return userGroups;
        const query = searchQuery.toLowerCase();
        return userGroups
            .map(group => ({
                ...group,
                users: group.users.filter(user =>
                    user.name.toLowerCase().includes(query) ||
                    user.email.toLowerCase().includes(query) ||
                    group.name.toLowerCase().includes(query)
                )
            }))
            .filter(group => group.users.length > 0);
    }, [userGroups, searchQuery]);

    const filteredRouteGroups = useMemo(() => {
        if (!searchQuery.trim()) return routeGroups;
        const query = searchQuery.toLowerCase();
        const filtered: RouteGroup = {};

        Object.entries(routeGroups).forEach(([groupName, routes]) => {
            const filteredRoutes = routes.filter(route =>
                route.route_name.toLowerCase().includes(query) ||
                route.route_uri.toLowerCase().includes(query) ||
                route.controller_class?.toLowerCase().includes(query) ||
                groupName.toLowerCase().includes(query)
            );

            if (filteredRoutes.length > 0) {
                filtered[groupName] = filteredRoutes;
            }
        });

        return filtered;
    }, [routeGroups, searchQuery]);

    // Stats
    const rolePermStats = useMemo(() => {
        const totalAssignments = Object.values(rolePermissionMatrix).reduce((sum, rolePerms) =>
            sum + Object.values(rolePerms).filter(Boolean).length, 0
        );
        return {
            totalPermissions: initialPermissions.length,
            totalRoles: initialRoles.length,
            totalCategories: permissionCategories.length,
            totalAssignments,
        };
    }, [initialPermissions, initialRoles, permissionCategories, rolePermissionMatrix]);

    const userRoleStats = useMemo(() => {
        const totalAssignments = Object.values(userRoleMatrix).reduce((sum, userRoles) =>
            sum + Object.values(userRoles).filter(Boolean).length, 0
        );
        const usersWithRoles = Object.values(userRoleMatrix).filter(userRoles =>
            Object.values(userRoles).some(Boolean)
        ).length;
        return {
            totalUsers: initialUsers.length,
            totalRoles: initialRoles.length,
            totalGroups: userGroups.length,
            totalAssignments,
            usersWithRoles
        };
    }, [initialUsers, initialRoles, userGroups, userRoleMatrix]);

    // Role-Permission Matrix handlers
    const togglePermission = (roleId: string | number, permissionId: string | number) => {
        setRolePermissionMatrix(prev => {
            const newMatrix = {
                ...prev,
                [roleId]: {
                    ...prev[roleId],
                    [permissionId]: !prev[roleId][permissionId]
                }
            };
            setHasRolePermChanges(true);
            return newMatrix;
        });
    };

    const toggleAllInCategory = (categoryName: string, roleId: string | number, checked: boolean) => {
        const category = permissionCategories.find(c => c.name === categoryName);
        if (!category) return;

        setRolePermissionMatrix(prev => {
            const newMatrix = { ...prev };
            category.permissions.forEach(permission => {
                newMatrix[roleId][permission.id] = checked;
            });
            setHasRolePermChanges(true);
            return newMatrix;
        });
    };

    const toggleAllForRole = (roleId: string | number, checked: boolean) => {
        setRolePermissionMatrix(prev => {
            const newRolePerms: Record<string | number, boolean> = {};
            initialPermissions.forEach(permission => {
                newRolePerms[permission.id] = checked;
            });
            const newMatrix = {
                ...prev,
                [roleId]: newRolePerms
            };
            setHasRolePermChanges(true);
            return newMatrix;
        });
    };

    // User-Role Matrix handlers
    const toggleUserRole = (userId: string | number, roleId: string | number) => {
        setUserRoleMatrix(prev => {
            const newMatrix = {
                ...prev,
                [userId]: {
                    ...prev[userId],
                    [roleId]: !prev[userId][roleId]
                }
            };
            setHasUserRoleChanges(true);
            return newMatrix;
        });
    };

    const toggleAllInGroup = (groupName: string, roleId: string | number, checked: boolean) => {
        const group = userGroups.find(g => g.name === groupName);
        if (!group) return;

        setUserRoleMatrix(prev => {
            const newMatrix = { ...prev };
            group.users.forEach(user => {
                newMatrix[user.id][roleId] = checked;
            });
            setHasUserRoleChanges(true);
            return newMatrix;
        });
    };

    const toggleAllForUserRole = (roleId: string | number, checked: boolean) => {
        setUserRoleMatrix(prev => {
            const newMatrix = { ...prev };
            initialUsers.forEach(user => {
                newMatrix[user.id][roleId] = checked;
            });
            setHasUserRoleChanges(true);
            return newMatrix;
        });
    };

    // Route permission handlers
    const toggleRouteGroup = (groupName: string) => {
        setExpandedRouteGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const openBulkAssignModal = (groupName: string, routes: RoutePermission[]) => {
        const routeIds = routes.map(r => r.id.toString());

        // Get current permissions that ALL routes in the group have
        const commonPermissions = initialPermissions.filter(permission =>
            routes.every(route =>
                routePermissionAssignments[route.id]?.permission_ids.includes(permission.id.toString())
            )
        ).map(p => p.id.toString());

        // Get current roles that ALL routes in the group have
        const commonRoles = initialRoles.filter(role =>
            routes.every(route =>
                routePermissionAssignments[route.id]?.role_ids.includes(role.id.toString())
            )
        ).map(r => r.id.toString());

        // Check if ALL routes are protected
        const allProtected = routes.every(route =>
            routePermissionAssignments[route.id]?.is_protected ?? route.is_protected
        );

        setBulkAssignData({
            route_ids: routeIds,
            permission_ids: commonPermissions,
            role_ids: commonRoles,
            is_protected: allProtected
        });

        setBulkAssignModal({
            open: true,
            groupName,
            routes
        });
    };

    const handleBulkAssign = (e: React.FormEvent) => {
        e.preventDefault();
        postBulkAssign('/access-control/bulk/update-route-permissions', {
            onSuccess: () => {
                toast.success(`Permissions and roles assigned to ${bulkAssignData.route_ids.length} routes in ${bulkAssignModal.groupName}!`);
                setBulkAssignModal({ open: false, groupName: '', routes: [] });
                resetBulkAssign();
                window.location.reload();
            },
            onError: () => toast.error('Failed to assign permissions and roles to routes')
        });
    };

    // Get status for bulk assignment checkboxes
    const getBulkPermissionStatus = (permissionId: string, routes: RoutePermission[]) => {
        const assignedCount = routes.filter(route =>
            routePermissionAssignments[route.id]?.permission_ids.includes(permissionId)
        ).length;

        return {
            checked: assignedCount === routes.length,
            indeterminate: assignedCount > 0 && assignedCount < routes.length
        };
    };

    const getBulkRoleStatus = (roleId: string, routes: RoutePermission[]) => {
        const assignedCount = routes.filter(route =>
            routePermissionAssignments[route.id]?.role_ids.includes(roleId)
        ).length;

        return {
            checked: assignedCount === routes.length,
            indeterminate: assignedCount > 0 && assignedCount < routes.length
        };
    };

    const toggleRoutePermission = (routeId: string, permissionId: string) => {
        setRoutePermissionAssignments(prev => {
            const current = prev[routeId]?.permission_ids || [];
            const newPermissions = current.includes(permissionId)
                ? current.filter(id => id !== permissionId)
                : [...current, permissionId];

            const newAssignments = {
                ...prev,
                [routeId]: {
                    ...prev[routeId],
                    permission_ids: newPermissions
                }
            };
            setHasRoutePermChanges(true);
            return newAssignments;
        });
    };

    const toggleRouteRole = (routeId: string, roleId: string) => {
        setRoutePermissionAssignments(prev => {
            const current = prev[routeId]?.role_ids || [];
            const newRoles = current.includes(roleId)
                ? current.filter(id => id !== roleId)
                : [...current, roleId];

            const newAssignments = {
                ...prev,
                [routeId]: {
                    ...prev[routeId],
                    role_ids: newRoles
                }
            };
            setHasRoutePermChanges(true);
            return newAssignments;
        });
    };

    const toggleRouteProtection = (routeId: string) => {
        setRoutePermissionAssignments(prev => {
            const newAssignments = {
                ...prev,
                [routeId]: {
                    ...prev[routeId],
                    is_protected: !prev[routeId]?.is_protected
                }
            };
            setHasRoutePermChanges(true);
            return newAssignments;
        });
    };

    // Save functions using router
    const saveRolePermissions = () => {
        setIsProcessing(true);
        router.post('/access-control/role-permissions',
            { matrix: rolePermissionMatrix },
            {
                onSuccess: () => {
                    toast.success('Role permissions updated successfully!');
                    setHasRolePermChanges(false);
                    setIsProcessing(false);
                },
                onError: () => {
                    toast.error('Failed to update permissions');
                    setIsProcessing(false);
                },
                preserveScroll: true,
            }
        );
    };

    const saveUserRoles = () => {
        setIsProcessing(true);
        router.post('/access-control/user-roles',
            { matrix: userRoleMatrix },
            {
                onSuccess: () => {
                    toast.success('User roles updated successfully!');
                    setHasUserRoleChanges(false);
                    setIsProcessing(false);
                },
                onError: () => {
                    toast.error('Failed to update user roles');
                    setIsProcessing(false);
                },
                preserveScroll: true,
            }
        );
    };

    const saveRoutePermissions = () => {
        setIsProcessing(true);
        const assignments = Object.entries(routePermissionAssignments).map(([routeId, data]) => ({
            route_id: routeId,
            permission_ids: data.permission_ids,
            role_ids: data.role_ids,
            is_protected: data.is_protected
        }));

        router.post('/access-control/route-permissions',
            { assignments },
            {
                onSuccess: () => {
                    toast.success('Route permissions and roles updated successfully!');
                    setHasRoutePermChanges(false);
                    setIsProcessing(false);
                },
                onError: () => {
                    toast.error('Failed to update route permissions');
                    setIsProcessing(false);
                },
                preserveScroll: true,
            }
        );
    };

    const syncRoutes = () => {
        setIsProcessing(true);
        router.post('/access-control/sync-routes', {}, {
            onSuccess: () => {
                toast.success('Routes synced successfully!');
                setIsProcessing(false);
                window.location.reload();
            },
            onError: () => {
                toast.error('Failed to sync routes');
                setIsProcessing(false);
            },
            preserveScroll: true,
        });
    };

    // Get permissions user has through roles
    const getUserRolePermissions = (user: User): Set<string> => {
        const rolePermissions = new Set<string>();
        user.roles?.forEach(role => {
            const roleData = initialRoles.find(r => r.id === role.id);
            roleData?.permissions?.forEach(permission => {
                rolePermissions.add(permission.id.toString());
            });
        });
        return rolePermissions;
    };

    // Modal handlers
    const openUserPermissionModal = (user: User) => {
        setUserPermData({
            user_id: user.id.toString(),
            permissions: user.direct_permissions?.map(p => p.id.toString()) || []
        });
        setUserPermissionModal({ open: true, user });
    };

    const handleUpdateUserPermissions = (e: React.FormEvent) => {
        e.preventDefault();
        postUserPerm('/access-control/user-permissions', {
            onSuccess: () => {
                toast.success('User permissions updated successfully!');
                setUserPermissionModal({ open: false, user: null });
                resetUserPerm();
            },
            onError: () => toast.error('Failed to update user permissions')
        });
    };

    // Permission management
    const openCreatePermissionModal = () => {
        resetPermission();
        setPermissionModal({ open: true, mode: 'create', permission: null });
    };

    const openEditPermissionModal = (permission: Permission) => {
        setPermissionData({
            name: permission.name,
            description: permission.description || ''
        });
        setPermissionModal({ open: true, mode: 'edit', permission });
    };

    const handleCreatePermission = (e: React.FormEvent) => {
        e.preventDefault();
        postPermission('/access-control/permissions', {
            onSuccess: () => {
                toast.success('Permission created successfully!');
                setPermissionModal({ open: false, mode: 'create', permission: null });
                window.location.reload();
            },
            onError: () => toast.error('Failed to create permission')
        });
    };

    const handleUpdatePermission = (e: React.FormEvent) => {
        e.preventDefault();
        if (!permissionModal.permission) return;
        putPermission(`/access-control/permissions/${permissionModal.permission.id}`, {
            onSuccess: () => {
                toast.success('Permission updated successfully!');
                setPermissionModal({ open: false, mode: 'create', permission: null });
                window.location.reload();
            },
            onError: () => toast.error('Failed to update permission')
        });
    };

    // Role management
    const openCreateRoleModal = () => {
        resetRole();
        setRoleModal({ open: true, mode: 'create', role: null });
    };

    const openEditRoleModal = (role: Role) => {
        setRoleData({
            name: role.name,
            description: role.description || ''
        });
        setRoleModal({ open: true, mode: 'edit', role });
    };

    const handleCreateRole = (e: React.FormEvent) => {
        e.preventDefault();
        postRole('/access-control/roles', {
            onSuccess: () => {
                toast.success('Role created successfully!');
                setRoleModal({ open: false, mode: 'create', role: null });
                window.location.reload();
            },
            onError: () => toast.error('Failed to create role')
        });
    };

    const handleUpdateRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleModal.role) return;
        putRole(`/access-control/roles/${roleModal.role.id}`, {
            onSuccess: () => {
                toast.success('Role updated successfully!');
                setRoleModal({ open: false, mode: 'create', role: null });
                window.location.reload();
            },
            onError: () => toast.error('Failed to update role')
        });
    };

    // Delete handlers
    const openDeleteDialog = (type: 'permission' | 'role', item: Permission | Role) => {
        setDeleteDialog({ open: true, type, item });
    };

    const handleDelete = () => {
        if (!deleteDialog.item) return;

        const endpoint = deleteDialog.type === 'permission'
            ? `/access-control/permissions/${deleteDialog.item.id}`
            : `/access-control/roles/${deleteDialog.item.id}`;

        if (deleteDialog.type === 'permission') {
            deletePermission(endpoint, {
                onSuccess: () => {
                    toast.success('Permission deleted successfully!');
                    setDeleteDialog({ open: false, type: 'permission', item: null });
                    window.location.reload();
                },
                onError: () => toast.error('Failed to delete permission')
            });
        } else {
            deleteRole(endpoint, {
                onSuccess: () => {
                    toast.success('Role deleted successfully!');
                    setDeleteDialog({ open: false, type: 'role', item: null });
                    window.location.reload();
                },
                onError: () => toast.error('Failed to delete role')
            });
        }
    };

    // Utility functions
    const getCategoryStatus = (categoryName: string, roleId: string | number) => {
        const category = permissionCategories.find(c => c.name === categoryName);
        if (!category) return { checked: false, indeterminate: false };

        const permissions = category.permissions;
        const checkedCount = permissions.filter(p => rolePermissionMatrix[roleId]?.[p.id]).length;

        return {
            checked: checkedCount === permissions.length,
            indeterminate: checkedCount > 0 && checkedCount < permissions.length
        };
    };

    const getGroupRoleStatus = (groupName: string, roleId: string | number) => {
        const group = userGroups.find(g => g.name === groupName);
        if (!group) return { checked: false, indeterminate: false };

        const users = group.users;
        const checkedCount = users.filter(u => userRoleMatrix[u.id]?.[roleId]).length;

        return {
            checked: checkedCount === users.length,
            indeterminate: checkedCount > 0 && checkedCount < users.length
        };
    };

    const toggleCategory = (categoryName: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryName]: !prev[categoryName]
        }));
    };

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Access Control Management" />
            <div className="flex flex-col gap-4 rounded-xl p-2 sm:p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="role-permissions">Role Permissions</TabsTrigger>
                        <TabsTrigger value="user-roles">User Roles</TabsTrigger>
                        <TabsTrigger value="route-permissions">Route Permissions</TabsTrigger>
                    </TabsList>

                    {/* Role-Permission Matrix Tab */}
                    <TabsContent value="role-permissions" className="space-y-2">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {/*<Button variant="outline" size="sm" onClick={() => setExpandedCategories({})}>*/}
                                {/*    Expand All*/}
                                {/*</Button>*/}
                                {/*<Button variant="outline" size="sm" onClick={() => {*/}
                                {/*    const collapsed: { [key: string]: boolean } = {};*/}
                                {/*    permissionCategories.forEach(cat => collapsed[cat.name] = false);*/}
                                {/*    setExpandedCategories(collapsed);*/}
                                {/*}}>*/}
                                {/*    Collapse All*/}
                                {/*</Button>*/}
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={openCreatePermissionModal}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Permission
                                </Button>
                                <Button variant="outline" size="sm" onClick={openCreateRoleModal}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Role
                                </Button>
                                {hasRolePermChanges && (
                                    <Button variant="outline" size="sm" onClick={() => {
                                        // Reset to original state
                                        const originalMatrix: RolePermissionMatrix = {};
                                        initialRoles.forEach(role => {
                                            originalMatrix[role.id] = {};
                                            initialPermissions.forEach(permission => {
                                                originalMatrix[role.id][permission.id] = role.permissions?.some(p => p.id === permission.id) || false;
                                            });
                                        });
                                        setRolePermissionMatrix(originalMatrix);
                                        setHasRolePermChanges(false);
                                    }}>
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Reset
                                    </Button>
                                )}
                                <Button onClick={saveRolePermissions} disabled={!hasRolePermChanges || isProcessing} variant="secondary">
                                    <Save className="h-4 w-4 mr-2" />
                                    {isProcessing ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <div className="text-center">
                                <p className="text-lg font-bold">{rolePermStats.totalCategories}</p>
                                <p className="text-xs text-muted-foreground">Categories</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold">{rolePermStats.totalPermissions}</p>
                                <p className="text-xs text-muted-foreground">Permissions</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold">{rolePermStats.totalRoles}</p>
                                <p className="text-xs text-muted-foreground">Roles</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold">{rolePermStats.totalAssignments}</p>
                                <p className="text-xs text-muted-foreground">Assignments</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search permissions, categories, and descriptions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                            </div>
                        </div>

                        {/* Role-Permission Matrix */}
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-auto max-h-[70vh]">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-slate-500 sticky top-0 z-50">
                                        <tr>
                                            <th className="sticky left-0 bg-gray-100 w-80 p-4 text-left text-xs font-medium text-gray-900 uppercase tracking-wider border border-r border-b z-20">
                                                Permissions
                                            </th>
                                            {initialRoles.map(role => (
                                                <th key={role.id} className="w-40 p-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider  border border-b border-r bg-gray-100">
                                                    <div className="flex items-center justify-center gap-1 mb-2">
                                                        <span className="font-medium text-xs truncate" title={role.name}>{role.name}</span>
                                                        <InfoTooltip title={role.name} description={role.description} />
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                    <MoreVertical className="h-3 w-3" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem onClick={() => openEditRoleModal(role)}>
                                                                    <Edit className="h-3 w-3 mr-2" />Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => openDeleteDialog('role', role)} className="text-red-600">
                                                                    <Trash2 className="h-3 w-3 mr-2" />Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                    <Checkbox checked={initialPermissions.every(p => rolePermissionMatrix[role.id]?.[p.id])} onCheckedChange={(checked) => toggleAllForRole(role.id, checked as boolean)} />
                                                </th>
                                            ))}
                                        </tr>
                                        </thead>
                                        <tbody className="bg-background divide-y divide-gray-200">
                                        {filteredCategories.map(category => (
                                            <React.Fragment key={category.name}>
                                                <tr className="bg-muted">
                                                    <td className="sticky left-0 bg-muted text-xs w-80 p-3 border-r cursor-pointer hover:bg-muted/80 flex items-center gap-2 z-20" onClick={() => toggleCategory(category.name)}>
                                                        {category.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                        <span className="text-xs font-medium">{category.name}</span>
                                                        <Badge variant="outline" className="ml-auto">{category.permissions.length}</Badge>
                                                    </td>
                                                    {initialRoles.map(role => {
                                                        const status = getCategoryStatus(category.name, role.id);
                                                        return (
                                                            <td key={role.id} className="w-40 p-3 text-xs text-center border-r bg-muted">
                                                                <Checkbox checked={status.indeterminate ? 'indeterminate' : status.checked} onCheckedChange={(checked) => toggleAllInCategory(category.name, role.id, Boolean(checked))} />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                                {category.expanded && category.permissions.map(permission => (
                                                    <tr key={permission.id} className="hover:bg-muted/30">
                                                        <td className="sticky left-0 bg-background w-80 text-xs p-2 border-r pl-8 flex items-center justify-between z-20">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs">{permission.name.split('-').slice(1).join('-') || permission.name}</span>
                                                                <InfoTooltip title={permission.name} description={permission.description} />
                                                            </div>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                        <MoreVertical className="h-3 w-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent>
                                                                    <DropdownMenuItem onClick={() => openEditPermissionModal(permission)}>
                                                                        <Edit className="h-3 w-3 mr-2" />Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => openDeleteDialog('permission', permission)} className="text-red-600">
                                                                        <Trash2 className="h-3 w-3 mr-2" />Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </td>
                                                        {initialRoles.map(role => (
                                                            <td key={role.id} className="w-40 p-3 text-xs text-center border-r">
                                                                <Checkbox checked={rolePermissionMatrix[role.id]?.[permission.id] || false} onCheckedChange={() => togglePermission(role.id, permission.id)} />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* User-Role Matrix Tab */}
                    <TabsContent value="user-roles" className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setExpandedGroups({})}>
                                    Expand All
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                    const collapsed: { [key: string]: boolean } = {};
                                    userGroups.forEach(group => collapsed[group.name] = false);
                                    setExpandedGroups(collapsed);
                                }}>
                                    Collapse All
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                {hasUserRoleChanges && (
                                    <Button variant="outline" size="sm" onClick={() => {
                                        const originalMatrix: UserRoleMatrix = {};
                                        initialUsers.forEach(user => {
                                            originalMatrix[user.id] = {};
                                            initialRoles.forEach(role => {
                                                originalMatrix[user.id][role.id] = user.roles?.some(r => r.id === role.id) || false;
                                            });
                                        });
                                        setUserRoleMatrix(originalMatrix);
                                        setHasUserRoleChanges(false);
                                    }}>
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Reset
                                    </Button>
                                )}
                                <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                                <Button onClick={saveUserRoles} disabled={!hasUserRoleChanges || isProcessing} variant="secondary">
                                    <Save className="h-4 w-4 mr-2" />
                                    {isProcessing ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div className="text-center">
                                <p className="text-lg font-bold">{userRoleStats.totalGroups}</p>
                                <p className="text-xs text-muted-foreground">Groups</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold">{userRoleStats.totalUsers}</p>
                                <p className="text-xs text-muted-foreground">Users</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold">{userRoleStats.totalRoles}</p>
                                <p className="text-xs text-muted-foreground">Roles</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold">{userRoleStats.totalAssignments}</p>
                                <p className="text-xs text-muted-foreground">Assignments</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold">{userRoleStats.usersWithRoles}</p>
                                <p className="text-xs text-muted-foreground">With Roles</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search users, emails, and departments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                            </div>
                        </div>

                        {/* User-Role Matrix */}
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-auto max-h-[70vh]">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-muted sticky top-0 z-30">
                                        <tr>
                                            <th className="sticky left-0 bg-background w-80 p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r z-40">
                                                Users
                                            </th>
                                            {initialRoles.map(role => (
                                                <th key={role.id} className="w-38 p-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r bg-muted">
                                                    <div className="flex items-center justify-center gap-1 mb-2">
                                                        <div className="font-medium text-sm truncate" title={role.name}>{role.name}</div>
                                                        <InfoTooltip title={role.name} description={role.description} />
                                                    </div>
                                                    <Checkbox checked={initialUsers.every(u => userRoleMatrix[u.id]?.[role.id])} onCheckedChange={(checked) => toggleAllForUserRole(role.id, checked as boolean)} />
                                                </th>
                                            ))}
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                        {filteredGroups.map(group => (
                                            <React.Fragment key={group.name}>
                                                <tr className="bg-muted">
                                                    <td className="sticky left-0 bg-muted w-80 p-3 border-r cursor-pointer hover:bg-muted/80 flex items-center gap-2 z-30" onClick={() => toggleGroup(group.name)}>
                                                        {group.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                        <span className="font-medium">{group.name}</span>
                                                        <Badge variant="outline" className="ml-auto">{group.users.length}</Badge>
                                                    </td>
                                                    {initialRoles.map(role => {
                                                        const status = getGroupRoleStatus(group.name, role.id);
                                                        return (
                                                            <td key={role.id} className="w-38 p-3 text-center border-r bg-muted">
                                                                <Checkbox checked={status.indeterminate ? 'indeterminate' : status.checked} onCheckedChange={(checked) => toggleAllInGroup(group.name, role.id, Boolean(checked))} />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                                {group.expanded && group.users.map(user => (
                                                    <tr key={user.id} className="hover:bg-muted/30">
                                                        <td className="sticky left-0 bg-background w-80 p-3 border-r pl-8 z-30">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1">
                                                                    <div className="font-medium text-sm flex items-center gap-2">
                                                                        {user.name}
                                                                        <div className="flex gap-1">
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {user.roles?.length || 0}R
                                                                            </Badge>
                                                                            <Badge variant="secondary" className="text-xs">
                                                                                {user.direct_permissions?.length || 0}P
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                                                </div>
                                                                <Button variant="ghost" size="sm" onClick={() => openUserPermissionModal(user)} className="h-6 w-6 p-0">
                                                                    <User className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                        {initialRoles.map(role => (
                                                            <td key={role.id} className="w-38 p-3 text-center border-r">
                                                                <Checkbox checked={userRoleMatrix[user.id]?.[role.id] || false} onCheckedChange={() => toggleUserRole(user.id, role.id)} />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Route Permissions Tab */}
                    <TabsContent value="route-permissions" className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setExpandedRouteGroups({})}>
                                    Expand All
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                    const collapsed: { [key: string]: boolean } = {};
                                    Object.keys(routeGroups).forEach(group => collapsed[group] = false);
                                    setExpandedRouteGroups(collapsed);
                                }}>
                                    Collapse All
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={syncRoutes} disabled={isProcessing}>
                                    <Zap className="h-4 w-4 mr-2" />
                                    {isProcessing ? 'Syncing...' : 'Sync Routes'}
                                </Button>
                                {hasRoutePermChanges && (
                                    <Button variant="outline" size="sm" onClick={() => {
                                        // Reset to original state
                                        const originalAssignments: { [routeId: string]: { permission_ids: string[]; role_ids: string[]; is_protected: boolean; } } = {};
                                        Object.values(routeGroups).flat().forEach(route => {
                                            originalAssignments[route.id] = {
                                                permission_ids: route.permissions?.map(p => p.id.toString()) || [],
                                                role_ids: route.roles?.map(r => r.id.toString()) || [],
                                                is_protected: route.is_protected
                                            };
                                        });
                                        setRoutePermissionAssignments(originalAssignments);
                                        setHasRoutePermChanges(false);
                                    }}>
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Reset
                                    </Button>
                                )}
                                <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                                <Button onClick={saveRoutePermissions} disabled={!hasRoutePermChanges || isProcessing} variant="secondary">
                                    <Save className="h-4 w-4 mr-2" />
                                    {isProcessing ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <div className="text-center">
                                <p className="text-lg font-bold">{routeStats.total_groups}</p>
                                <p className="text-xs text-muted-foreground">Groups</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold">{routeStats.total_routes}</p>
                                <p className="text-xs text-muted-foreground">Total Routes</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold">{routeStats.active_routes}</p>
                                <p className="text-xs text-muted-foreground">Active</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold">{routeStats.protected_routes}</p>
                                <p className="text-xs text-muted-foreground">Protected</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold">{routeStats.routes_with_permissions}</p>
                                <p className="text-xs text-muted-foreground">With Permissions</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search routes, URIs, and controllers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                            </div>
                        </div>

                        {/* Route Permissions List */}
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-auto max-h-[70vh]">
                                    <div className="space-y-2 p-4">
                                        {Object.entries(filteredRouteGroups).map(([groupName, routes]) => (
                                            <div key={groupName} className="border rounded-lg">
                                                {/* Group Header */}
                                                <div className="bg-muted p-3 hover:bg-muted/80 flex items-center gap-2 border-b">
                                                    <div
                                                        className="flex items-center gap-2 flex-1 cursor-pointer"
                                                        onClick={() => toggleRouteGroup(groupName)}
                                                    >
                                                        {expandedRouteGroups[groupName] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                        <span className="font-medium">{groupName}</span>
                                                        <Badge variant="outline">{routes.length}</Badge>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openBulkAssignModal(groupName, routes);
                                                        }}
                                                        className="h-7 px-2"
                                                    >
                                                        <Zap className="h-3 w-3 mr-1" />
                                                        Bulk Assign
                                                    </Button>
                                                </div>

                                                {/* Routes */}
                                                {expandedRouteGroups[groupName] && routes.map(route => (
                                                    <div key={route.id} className="p-4 border-b last:border-b-0">
                                                        <div className="flex items-start gap-4">
                                                            {/* Route Info */}
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="font-mono text-sm font-medium">{route.route_name}</span>
                                                                    <div className="flex gap-1">
                                                                        {route.route_methods.map(method => (
                                                                            <Badge key={method} variant="secondary" className="text-xs">
                                                                                {method}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        {routePermissionAssignments[route.id]?.is_protected ? (
                                                                            <Shield className="h-4 w-4 text-green-600" />
                                                                        ) : (
                                                                            <ShieldOff className="h-4 w-4 text-gray-400" />
                                                                        )}
                                                                        <Checkbox
                                                                            checked={routePermissionAssignments[route.id]?.is_protected ?? route.is_protected}
                                                                            onCheckedChange={() => toggleRouteProtection(route.id.toString())}
                                                                        />
                                                                        <Label className="text-xs text-muted-foreground">Protected</Label>
                                                                    </div>
                                                                </div>
                                                                <div className="text-sm text-muted-foreground mb-1">
                                                                    <span className="font-mono">{route.route_uri}</span>
                                                                </div>
                                                                {route.controller_class && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {route.controller_class.split('\\').pop()}@{route.controller_method}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Permissions and Roles */}
                                                            <div>
                                                                <div className="flex flex-row gap-5">

                                                                    {/* Permissions Section */}
                                                                    <div>
                                                                        <Label className="text-xs font-medium mb-2 block">Assigned Permissions</Label>
                                                                        <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto border rounded p-2">
                                                                            {initialPermissions.map(permission => {
                                                                                const isAssigned = routePermissionAssignments[route.id]?.permission_ids.includes(permission.id.toString()) ?? false;
                                                                                return (
                                                                                    <div key={permission.id} className="flex items-center space-x-2">
                                                                                        <Checkbox
                                                                                            id={`route-${route.id}-perm-${permission.id}`}
                                                                                            checked={isAssigned}
                                                                                            onCheckedChange={() => toggleRoutePermission(route.id.toString(), permission.id.toString())}
                                                                                        />
                                                                                        <Label
                                                                                            htmlFor={`route-${route.id}-perm-${permission.id}`}
                                                                                            className="text-xs flex items-center gap-1"
                                                                                        >
                                                                                            {permission.name}
                                                                                            <InfoTooltip title={permission.name} description={permission.description} />
                                                                                        </Label>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>

                                                                    {/* Roles Section */}
                                                                    <div>
                                                                        <Label className="text-xs font-medium mb-2 block">Assigned Roles</Label>
                                                                        <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto border rounded p-2">
                                                                            {initialRoles.map(role => {
                                                                                const isAssigned = routePermissionAssignments[route.id]?.role_ids.includes(role.id.toString()) ?? false;
                                                                                return (
                                                                                    <div key={role.id} className="flex items-center space-x-2">
                                                                                        <Checkbox
                                                                                            id={`route-${route.id}-role-${role.id}`}
                                                                                            checked={isAssigned}
                                                                                            onCheckedChange={() => toggleRouteRole(route.id.toString(), role.id.toString())}
                                                                                        />
                                                                                        <Label
                                                                                            htmlFor={`route-${route.id}-role-${role.id}`}
                                                                                            className="text-xs flex items-center gap-1"
                                                                                        >
                                                                                            {role.name}
                                                                                            <InfoTooltip title={role.name} description={role.description} />
                                                                                        </Label>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Save Reminders */}
                {(hasRolePermChanges || hasUserRoleChanges || hasRoutePermChanges) && (
                    <div className="fixed bottom-6 right-6 z-50">
                        <Card className="border-2 border-gray-300">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-orange-800 ">
                                        You have unsaved changes
                                    </div>
                                    <Button variation={"ghost"} size="sm" onClick={
                                        activeTab === 'role-permissions' ? saveRolePermissions :
                                            activeTab === 'user-roles' ? saveUserRoles :
                                                saveRoutePermissions
                                    } disabled={isProcessing} className="bg-orange-600 hover:bg-orange-700">
                                        <Save className="h-3 w-3 mr-1" />
                                        Save
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* User Permissions Modal */}
            <Dialog open={userPermissionModal.open} onOpenChange={(open) => setUserPermissionModal({ open, user: null })}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Direct Permissions for {userPermissionModal.user?.name}</DialogTitle>
                        <DialogDescription>
                            Assign permissions directly to this user. Grayed out permissions are already granted through roles.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateUserPermissions}>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {permissionCategories.map(category => {
                                const userRolePermissions = userPermissionModal.user ? getUserRolePermissions(userPermissionModal.user) : new Set<string>();

                                return (
                                    <div key={category.name}>
                                        <h4 className="font-medium mb-2">{category.name}</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {category.permissions.map(permission => {
                                                const hasFromRole = userRolePermissions.has(permission.id.toString());
                                                const isDirectlyAssigned = userPermData.permissions.includes(permission.id.toString());

                                                return (
                                                    <div key={permission.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`perm-${permission.id}`}
                                                            checked={hasFromRole || isDirectlyAssigned}
                                                            disabled={hasFromRole}
                                                            onCheckedChange={(checked) => {
                                                                if (hasFromRole) return;

                                                                const newPermissions = checked
                                                                    ? [...userPermData.permissions, permission.id.toString()]
                                                                    : userPermData.permissions.filter(p => p !== permission.id.toString());
                                                                setUserPermData('permissions', newPermissions);
                                                            }}
                                                        />
                                                        <Label
                                                            htmlFor={`perm-${permission.id}`}
                                                            className={`text-sm flex items-center gap-1 ${hasFromRole ? 'text-muted-foreground' : ''}`}
                                                        >
                                                            {permission.name.split('-').slice(1).join('-') || permission.name}
                                                            <InfoTooltip title={permission.name} description={permission.description} />
                                                            {hasFromRole && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    via role
                                                                </Badge>
                                                            )}
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setUserPermissionModal({ open: false, user: null })}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={userPermProcessing}>
                                {userPermProcessing ? 'Updating...' : 'Update Permissions'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Permission Management Modal */}
            <Dialog open={permissionModal.open} onOpenChange={() => setPermissionModal({ open: false, mode: 'create', permission: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{permissionModal.mode === 'create' ? 'Create Permission' : 'Edit Permission'}</DialogTitle>
                        <DialogDescription>
                            {permissionModal.mode === 'create'
                                ? 'Create a new permission. Use format "Category-Action" (e.g., "User-Create", "Report-Export").'
                                : 'Update the permission name and description.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={permissionModal.mode === 'create' ? handleCreatePermission : handleUpdatePermission}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="permission-name">Permission Name</Label>
                                <Input
                                    id="permission-name"
                                    placeholder="e.g., User-Create, Menu-Edit, Report-Export"
                                    value={permissionData.name}
                                    onChange={(e) => setPermissionData('name', e.target.value)}
                                    className={permissionErrors.name ? 'border-red-500' : ''}
                                />
                                {permissionErrors.name && <p className="text-sm text-red-500 mt-1">{permissionErrors.name}</p>}
                            </div>
                            <div>
                                <Label htmlFor="permission-description">Description (Optional)</Label>
                                <Textarea
                                    id="permission-description"
                                    placeholder="Describe what this permission allows users to do..."
                                    value={permissionData.description}
                                    onChange={(e) => setPermissionData('description', e.target.value)}
                                    className={permissionErrors.description ? 'border-red-500' : ''}
                                    rows={3}
                                />
                                {permissionErrors.description && <p className="text-sm text-red-500 mt-1">{permissionErrors.description}</p>}
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setPermissionModal({ open: false, mode: 'create', permission: null })}>Cancel</Button>
                            <Button type="submit" disabled={permissionProcessing}>
                                {permissionProcessing ? (permissionModal.mode === 'create' ? 'Creating...' : 'Updating...') : (permissionModal.mode === 'create' ? 'Create Permission' : 'Update Permission')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Role Management Modal */}
            <Dialog open={roleModal.open} onOpenChange={() => setRoleModal({ open: false, mode: 'create', role: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{roleModal.mode === 'create' ? 'Create Role' : 'Edit Role'}</DialogTitle>
                        <DialogDescription>
                            {roleModal.mode === 'create' ? 'Create a new role that can be assigned to users.' : 'Update the role name and description.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={roleModal.mode === 'create' ? handleCreateRole : handleUpdateRole}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="role-name">Role Name</Label>
                                <Input
                                    id="role-name"
                                    placeholder="e.g., Administrator, Manager, Editor"
                                    value={roleData.name}
                                    onChange={(e) => setRoleData('name', e.target.value)}
                                    className={roleErrors.name ? 'border-red-500' : ''}
                                />
                                {roleErrors.name && <p className="text-sm text-red-500 mt-1">{roleErrors.name}</p>}
                            </div>
                            <div>
                                <Label htmlFor="role-description">Description (Optional)</Label>
                                <Textarea
                                    id="role-description"
                                    placeholder="Describe what this role represents and its responsibilities..."
                                    value={roleData.description}
                                    onChange={(e) => setRoleData('description', e.target.value)}
                                    className={roleErrors.description ? 'border-red-500' : ''}
                                    rows={3}
                                />
                                {roleErrors.description && <p className="text-sm text-red-500 mt-1">{roleErrors.description}</p>}
                            </div>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setRoleModal({ open: false, mode: 'create', role: null })}>Cancel</Button>
                            <Button type="submit" disabled={roleProcessing}>
                                {roleProcessing ? (roleModal.mode === 'create' ? 'Creating...' : 'Updating...') : (roleModal.mode === 'create' ? 'Create Role' : 'Update Role')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialog.open} onOpenChange={() => setDeleteDialog({ open: false, type: 'permission', item: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteDialog.type === 'permission' ? 'Permission' : 'Role'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the {deleteDialog.type} "{deleteDialog.item?.name}"?
                            This action cannot be undone and will remove this {deleteDialog.type} from all {deleteDialog.type === 'permission' ? 'roles' : 'users'}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteDialog({ open: false, type: 'permission', item: null })}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={permissionProcessing || roleProcessing}>
                            {(permissionProcessing || roleProcessing) ? 'Deleting...' : `Delete ${deleteDialog.type === 'permission' ? 'Permission' : 'Role'}`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Assignment Dialog */}
            <Dialog open={bulkAssignModal.open} onOpenChange={(open) => setBulkAssignModal({ open, groupName: '', routes: [] })}>
                <DialogContent className="min-w-3xl max-w-4xl ">
                    <DialogHeader>
                        <DialogTitle>Bulk Assign Permissions & Roles to {bulkAssignModal.groupName}</DialogTitle>
                        <DialogDescription>
                            Assign permissions and roles to all {bulkAssignModal.routes.length} routes in the "{bulkAssignModal.groupName}" group.
                            Checked items are currently assigned to ALL routes. Indeterminate items are assigned to SOME routes.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleBulkAssign}>
                        <div className="space-y-6">
                            {/* Routes Preview */}
                            <div>
                                <Label className="text-sm font-medium mb-2 block">Routes to be updated ({bulkAssignModal.routes.length})</Label>
                                <div className="max-h-32 overflow-y-auto border rounded p-3 bg-muted/20">
                                    <div className="grid grid-cols-1 gap-1 text-xs">
                                        {bulkAssignModal.routes.map(route => (
                                            <div key={route.id} className="flex items-center gap-2">
                                                <span className="font-mono">{route.route_name}</span>
                                                <span className="text-muted-foreground">({route.route_methods.join(', ')})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Protection Status */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="bulk-protected"
                                    checked={bulkAssignData.is_protected}
                                    onCheckedChange={(checked) => setBulkAssignData('is_protected', Boolean(checked))}
                                />
                                <Label htmlFor="bulk-protected" className="text-sm font-medium">
                                    Mark all routes as protected
                                </Label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Permissions Section */}
                                <div>
                                    <Label className="text-sm font-medium mb-3 block">Permissions</Label>
                                    <div className="space-y-3 max-h-80 overflow-y-auto border rounded p-3">
                                        {permissionCategories.map(category => (
                                            <div key={category.name}>
                                                <h4 className="font-medium text-sm mb-2 text-muted-foreground">{category.name}</h4>
                                                <div className="space-y-2 pl-2">
                                                    {category.permissions.map(permission => {
                                                        const status = getBulkPermissionStatus(permission.id.toString(), bulkAssignModal.routes);
                                                        const isSelected = bulkAssignData.permission_ids.includes(permission.id.toString());

                                                        return (
                                                            <div key={permission.id} className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`bulk-perm-${permission.id}`}
                                                                    checked={isSelected}
                                                                    data-indeterminate={status.indeterminate}
                                                                    onCheckedChange={(checked) => {
                                                                        const newPermissions = checked
                                                                            ? [...bulkAssignData.permission_ids, permission.id.toString()]
                                                                            : bulkAssignData.permission_ids.filter(id => id !== permission.id.toString());
                                                                        setBulkAssignData('permission_ids', newPermissions);
                                                                    }}
                                                                />
                                                                <Label
                                                                    htmlFor={`bulk-perm-${permission.id}`}
                                                                    className="text-xs flex items-center gap-1"
                                                                >
                                                                    {permission.name}
                                                                    <InfoTooltip title={permission.name} description={permission.description} />
                                                                    {status.indeterminate && (
                                                                        <Badge variant="outline" className="text-xs">
                                                                            partial
                                                                        </Badge>
                                                                    )}
                                                                    {status.checked && !status.indeterminate && (
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            all
                                                                        </Badge>
                                                                    )}
                                                                </Label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Roles Section */}
                                <div>
                                    <Label className="text-sm font-medium mb-3 block">Roles</Label>
                                    <div className="space-y-2 max-h-80 overflow-y-auto border rounded p-3">
                                        {initialRoles.map(role => {
                                            const status = getBulkRoleStatus(role.id.toString(), bulkAssignModal.routes);
                                            const isSelected = bulkAssignData.role_ids.includes(role.id.toString());

                                            return (
                                                <div key={role.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`bulk-role-${role.id}`}
                                                        checked={isSelected}
                                                        data-indeterminate={status.indeterminate}
                                                        onCheckedChange={(checked) => {
                                                            const newRoles = checked
                                                                ? [...bulkAssignData.role_ids, role.id.toString()]
                                                                : bulkAssignData.role_ids.filter(id => id !== role.id.toString());
                                                            setBulkAssignData('role_ids', newRoles);
                                                        }}
                                                    />
                                                    <Label
                                                        htmlFor={`bulk-role-${role.id}`}
                                                        className="text-sm flex items-center gap-1"
                                                    >
                                                        {role.name}
                                                        <InfoTooltip title={role.name} description={role.description} />
                                                        {status.indeterminate && (
                                                            <Badge variant="outline" className="text-xs">
                                                                partial
                                                            </Badge>
                                                        )}
                                                        {status.checked && !status.indeterminate && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                all
                                                            </Badge>
                                                        )}
                                                    </Label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setBulkAssignModal({ open: false, groupName: '', routes: [] })}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={bulkAssignProcessing}>
                                {bulkAssignProcessing ? 'Assigning...' : `Apply to ${bulkAssignModal.routes.length} Routes`}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
