import React, {useEffect, useMemo, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Head, Link, router, useForm} from '@inertiajs/react';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';

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
import {ChevronDown, ChevronRight, Edit, MoreVertical, Plus, RotateCcw, Save, Search, Trash2} from 'lucide-react';
import {toast} from 'sonner';
import AppLayout from '@/layouts/app-layout';

interface Permission {
    id: number | string;
    name: string;
}

interface Role {
    id: number | string;
    name: string;
    permissions?: Permission[];
}

interface RoleMatrixPageProps {
    permissions: Permission[];
    roles: Role[];
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

interface RolePermissionMatrix {
    [roleId: string]: {
        [permissionId: string]: boolean;
    };
}

const breadcrumbs = [
    {
        title: 'Roles and Permissions Matrix',
        href: route('roles-permissions.index'),
    },
];

export default function RoleMatrixPage({
                                           permissions: initialPermissions,
                                           roles: initialRoles,
                                           flash,
                                       }: RoleMatrixPageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Permission modal state
    const [permissionModal, setPermissionModal] = useState({
        open: false,
        mode: 'create' as 'create' | 'edit',
        permission: null as Permission | null
    });
    const [deleteDialog, setDeleteDialog] = useState({
        open: false,
        permission: null as Permission | null
    });

    // Role modal state
    const [roleModal, setRoleModal] = useState({
        open: false,
        mode: 'create' as 'create' | 'edit',
        role: null as Role | null
    });
    const [deleteRoleDialog, setDeleteRoleDialog] = useState({
        open: false,
        role: null as Role | null
    });

    // Initialize matrix state
    const [matrix, setMatrix] = useState<RolePermissionMatrix>(() => {
        const initialMatrix: RolePermissionMatrix = {};

        initialRoles.forEach(role => {
            initialMatrix[role.id] = {};
            initialPermissions.forEach(permission => {
                initialMatrix[role.id][permission.id] =
                    role.permissions?.some(p => p.id === permission.id) || false;
            });
        });

        return initialMatrix;
    });

    const { data, setData, post, processing } = useForm({
        matrix: matrix
    });

    // Permission management forms
    const {
        data: permissionData,
        setData: setPermissionData,
        post: postPermission,
        put: putPermission,
        delete: deletePermission,
        processing: permissionProcessing,
        reset: resetPermission,
        errors: permissionErrors
    } = useForm({
        name: ''
    });

    // Role management forms
    const {
        data: roleData,
        setData: setRoleData,
        post: postRole,
        put: putRole,
        delete: deleteRole,
        processing: roleProcessing,
        reset: resetRole,
        errors: roleErrors
    } = useForm({
        name: ''
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Group permissions by category (prefix before "-")
    const permissionCategories = useMemo<PermissionCategory[]>(() => {
        const categories: { [key: string]: Permission[] } = {};

        initialPermissions.forEach(permission => {
            const parts = permission.name.split('-');
            const categoryName = parts.length > 1 ? parts[0] : 'General';

            if (!categories[categoryName]) {
                categories[categoryName] = [];
            }
            categories[categoryName].push(permission);
        });

        return Object.entries(categories)
            .map(([name, perms]) => ({
                name,
                permissions: perms.sort((a, b) => a.name.localeCompare(b.name)),
                expanded: expandedCategories[name] !== false // Default to expanded
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [initialPermissions, expandedCategories]);

    // Filter categories based on search
    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return permissionCategories;

        const query = searchQuery.toLowerCase();
        return permissionCategories
            .map(category => ({
                ...category,
                permissions: category.permissions.filter(permission =>
                    permission.name.toLowerCase().includes(query) ||
                    category.name.toLowerCase().includes(query)
                )
            }))
            .filter(category => category.permissions.length > 0);
    }, [permissionCategories, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const totalPermissions = initialPermissions.length;
        const totalRoles = initialRoles.length;
        const totalAssignments = Object.values(matrix).reduce((sum, rolePerms) =>
            sum + Object.values(rolePerms).filter(Boolean).length, 0
        );
        const avgPermissionsPerRole = totalRoles > 0 ? (totalAssignments / totalRoles).toFixed(1) : '0';

        return {
            totalPermissions,
            totalRoles,
            totalCategories: permissionCategories.length,
            totalAssignments,
            avgPermissionsPerRole
        };
    }, [initialPermissions, initialRoles, permissionCategories, matrix]);

    // Role modal handlers
    const openCreateRoleModal = () => {
        resetRole();
        setRoleModal({
            open: true,
            mode: 'create',
            role: null
        });
    };

    const openEditRoleModal = (role: Role) => {
        setRoleData('name', role.name);
        setRoleModal({
            open: true,
            mode: 'edit',
            role
        });
    };

    const closeRoleModal = () => {
        setRoleModal({
            open: false,
            mode: 'create',
            role: null
        });
        resetRole();
    };

    const openDeleteRoleDialog = (role: Role) => {
        setDeleteRoleDialog({
            open: true,
            role
        });
    };

    const closeDeleteRoleDialog = () => {
        setDeleteRoleDialog({
            open: false,
            role: null
        });
    };

    // Role action handlers
    const handleCreateRole = (e: React.FormEvent) => {
        e.preventDefault();
        postRole('/roles', {
            onSuccess: () => {
                toast.success('Role created successfully!');
                closeRoleModal();
                router.reload();
            },
            onError: () => {
                toast.error('Failed to create role');
            }
        });
    };

    const handleUpdateRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleModal.role) return;

        putRole(`/roles/${roleModal.role.id}`, {
            onSuccess: () => {
                toast.success('Role updated successfully!');
                closeRoleModal();
                router.reload();
            },
            onError: () => {
                toast.error('Failed to update role');
            }
        });
    };

    const handleDeleteRole = () => {
        if (!deleteRoleDialog.role) return;

        deleteRole(`/roles/${deleteRoleDialog.role.id}`, {
            onSuccess: () => {
                toast.success('Role deleted successfully!');
                closeDeleteRoleDialog();
                router.reload();
            },
            onError: () => {
                toast.error('Failed to delete role');
            }
        });
    };

    // Modal handlers
    const openCreatePermissionModal = () => {
        resetPermission();
        setPermissionModal({
            open: true,
            mode: 'create',
            permission: null
        });
    };

    const openEditPermissionModal = (permission: Permission) => {
        setPermissionData('name', permission.name);
        setPermissionModal({
            open: true,
            mode: 'edit',
            permission
        });
    };

    const closePermissionModal = () => {
        setPermissionModal({
            open: false,
            mode: 'create',
            permission: null
        });
        resetPermission();
    };

    const openDeleteDialog = (permission: Permission) => {
        setDeleteDialog({
            open: true,
            permission
        });
    };

    const closeDeleteDialog = () => {
        setDeleteDialog({
            open: false,
            permission: null
        });
    };

    // Permission action handlers
    const handleCreatePermission = (e: React.FormEvent) => {
        e.preventDefault();
        postPermission('/permissions', {
            onSuccess: () => {
                toast.success('Permission created successfully!');
                closePermissionModal();
                router.reload();
            },
            onError: () => {
                toast.error('Failed to create permission');
            }
        });
    };

    const handleUpdatePermission = (e: React.FormEvent) => {
        e.preventDefault();
        if (!permissionModal.permission) return;

        putPermission(`/permissions/${permissionModal.permission.id}`, {
            onSuccess: () => {
                toast.success('Permission updated successfully!');
                closePermissionModal();
                router.reload();
            },
            onError: () => {
                toast.error('Failed to update permission');
            }
        });
    };

    const handleDeletePermission = () => {
        if (!deleteDialog.permission) return;

        deletePermission(`/permissions/${deleteDialog.permission.id}`, {
            onSuccess: () => {
                toast.success('Permission deleted successfully!');
                closeDeleteDialog();
                router.reload();
            },
            onError: () => {
                toast.error('Failed to delete permission');
            }
        });
    };
    const toggleCategory = (categoryName: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryName]: !prev[categoryName]
        }));
    };

    const togglePermission = (roleId: string | number, permissionId: string | number) => {
        setMatrix(prev => {
            const newMatrix = {
                ...prev,
                [roleId]: {
                    ...prev[roleId],
                    [permissionId]: !prev[roleId][permissionId]
                }
            };
            setHasChanges(true);
            return newMatrix;
        });
    };

    const toggleAllInCategory = (categoryName: string, roleId: string | number, checked: boolean) => {
        const category = permissionCategories.find(c => c.name === categoryName);
        if (!category) return;

        setMatrix(prev => {
            const newMatrix = { ...prev };
            category.permissions.forEach(permission => {
                newMatrix[roleId][permission.id] = checked;
            });
            setHasChanges(true);
            return newMatrix;
        });
    };

    const toggleAllForRole = (roleId: string | number, checked: boolean) => {
        setMatrix(prev => {
            const newMatrix = {
                ...prev,
                [roleId]: {}
            };
            initialPermissions.forEach(permission => {
                newMatrix[roleId][permission.id] = checked;
            });
            setHasChanges(true);
            return newMatrix;
        });
    };

    const saveChanges = () => {
        setData('matrix', matrix);
        post('/roles-permissions/matrix', {
            onSuccess: () => {
                toast.success('Role permissions updated successfully!');
                setHasChanges(false);
            },
            onError: () => {
                toast.error('Failed to update permissions');
            },
            preserveScroll: true,
        });
    };

    const resetChanges = () => {
        // Reset to original state
        const originalMatrix: RolePermissionMatrix = {};
        initialRoles.forEach(role => {
            originalMatrix[role.id] = {};
            initialPermissions.forEach(permission => {
                originalMatrix[role.id][permission.id] =
                    role.permissions?.some(p => p.id === permission.id) || false;
            });
        });
        setMatrix(originalMatrix);
        setHasChanges(false);
        toast.info('Changes reset');
    };

    const expandAllCategories = () => {
        const allExpanded: { [key: string]: boolean } = {};
        permissionCategories.forEach(category => {
            allExpanded[category.name] = true;
        });
        setExpandedCategories(allExpanded);
    };

    const collapseAllCategories = () => {
        const allCollapsed: { [key: string]: boolean } = {};
        permissionCategories.forEach(category => {
            allCollapsed[category.name] = false;
        });
        setExpandedCategories(allCollapsed);
    };

    // Get permission status for category header
    const getCategoryStatus = (categoryName: string, roleId: string | number) => {
        const category = permissionCategories.find(c => c.name === categoryName);
        if (!category) return { checked: false, indeterminate: false };

        const permissions = category.permissions;
        const checkedCount = permissions.filter(p => matrix[roleId]?.[p.id]).length;

        return {
            checked: checkedCount === permissions.length,
            indeterminate: checkedCount > 0 && checkedCount < permissions.length
        };
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Role Permission Matrix" />
            <>
                <div className="flex h-full max-h-screen flex-col gap-4 rounded-xl p-2 sm:p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">



                                <Link href={`/user-roles-matrix`}>
                                    <Button variant={"outline"} className="w-full">

                                        User Assignment
                                    </Button>
                                </Link>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={expandAllCategories}
                                >
                                    Expand All
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={collapseAllCategories}
                                >
                                    Collapse All
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={openCreatePermissionModal}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Permission
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={openCreateRoleModal}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Role
                            </Button>
                            {hasChanges && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={resetChanges}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset
                                </Button>
                            )}
                            <Button
                                onClick={saveChanges}
                                disabled={!hasChanges || processing}
                                variant={"secondary"}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {processing ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <Card className="border-sidebar-border/70">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">{stats.totalCategories}</p>
                                    <p className="text-sm text-muted-foreground">Categories</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/70">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">{stats.totalPermissions}</p>
                                    <p className="text-sm text-muted-foreground">Permissions</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/70">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-purple-600">{stats.totalRoles}</p>
                                    <p className="text-sm text-muted-foreground">Roles</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/70">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-orange-600">{stats.totalAssignments}</p>
                                    <p className="text-sm text-muted-foreground">Assignments</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/70">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-red-600">{stats.avgPermissionsPerRole}</p>
                                    <p className="text-sm text-muted-foreground">Avg/Role</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search */}
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search permissions and categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Matrix Table */}
                    <Card className="border-sidebar-border/70">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <div className="min-w-full">
                                    {/* Header Row */}
                                    <div className="flex border-b bg-muted/30">
                                        <div className="w-80 p-4 font-medium border-r bg-background">
                                            Permissions
                                        </div>
                                        {initialRoles.map(role => (
                                            <div key={role.id} className="w-40 shrink p-4 text-center border-r bg-background">
                                                <div className="flex items-center justify-center gap-1 mb-2">
                                                    <span className="font-medium text-sm">{role.name}</span>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                <MoreVertical className="h-3 w-3" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => openEditRoleModal(role)}>
                                                                <Edit className="h-3 w-3 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => openDeleteRoleDialog(role)}
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 className="h-3 w-3 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                <Checkbox
                                                    checked={initialPermissions.every(p => matrix[role.id]?.[p.id])}
                                                    onCheckedChange={(checked) =>
                                                        toggleAllForRole(role.id, checked as boolean)
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Permission Categories */}
                                    {filteredCategories.map(category => (
                                        <div key={category.name}>
                                            {/* Category Header */}
                                            <div className="flex border-b bg-muted/20">
                                                <div
                                                    className="w-80 p-3 border-r cursor-pointer hover:bg-muted/40 flex items-center gap-2"
                                                    onClick={() => toggleCategory(category.name)}
                                                >
                                                    {category.expanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                    <span className="font-medium">{category.name}</span>
                                                    <Badge variant="outline" className="ml-auto">
                                                        {category.permissions.length}
                                                    </Badge>
                                                </div>
                                                {initialRoles.map(role => {
                                                    const status = getCategoryStatus(category.name, role.id);
                                                    return (
                                                        <div key={role.id} className="min-w-40 shrink p-3 text-center border-r">
                                                            <Checkbox
                                                                checked={status.checked}
                                                                ref={(el) => {
                                                                    if (el) {
                                                                        el.indeterminate = status.indeterminate;
                                                                    }
                                                                }}
                                                                onCheckedChange={(checked) =>
                                                                    toggleAllInCategory(category.name, role.id, checked as boolean)
                                                                }
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Category Permissions */}
                                            {category.expanded && category.permissions.map(permission => (
                                                <div key={permission.id} className="flex border-b hover:bg-muted/30">
                                                    <div className="w-80 shrink p-3 border-r pl-8 flex items-center justify-between">
                                                        <span className="text-sm">
                                                            {permission.name.split('-').slice(1).join('-') || permission.name}
                                                        </span>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                    <MoreVertical className="h-3 w-3" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem onClick={() => openEditPermissionModal(permission)}>
                                                                    <Edit className="h-3 w-3 mr-2" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => openDeleteDialog(permission)}
                                                                    className="text-red-600"
                                                                >
                                                                    <Trash2 className="h-3 w-3 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                    {initialRoles.map(role => (
                                                        <div key={role.id} className="min-w-40 shrink p-3 text-center border-r">
                                                            <Checkbox
                                                                checked={matrix[role.id]?.[permission.id] || false}
                                                                onCheckedChange={() =>
                                                                    togglePermission(role.id, permission.id)
                                                                }
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Reminder */}
                    {hasChanges && (
                        <div className="fixed bottom-6 right-6 z-50">
                            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm text-orange-800 dark:text-orange-200">
                                            You have unsaved changes
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={saveChanges}
                                            disabled={processing}
                                            className="bg-orange-600 hover:bg-orange-700"
                                        >
                                            <Save className="h-3 w-3 mr-1" />
                                            Save
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Role Management Modal */}
                <Dialog open={roleModal.open} onOpenChange={closeRoleModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {roleModal.mode === 'create' ? 'Create Role' : 'Edit Role'}
                            </DialogTitle>
                            <DialogDescription>
                                {roleModal.mode === 'create'
                                    ? 'Create a new role that can be assigned to users.'
                                    : 'Update the role name.'
                                }
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
                                    {roleErrors.name && (
                                        <p className="text-sm text-red-500 mt-1">{roleErrors.name}</p>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeRoleModal}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={roleProcessing}
                                >
                                    {roleProcessing ? (
                                        roleModal.mode === 'create' ? 'Creating...' : 'Updating...'
                                    ) : (
                                        roleModal.mode === 'create' ? 'Create Role' : 'Update Role'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Role Dialog */}
                <AlertDialog open={deleteRoleDialog.open} onOpenChange={closeDeleteRoleDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Role</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete the role "{deleteRoleDialog.role?.name}"?
                                This action cannot be undone and will remove this role from all users and unassign all permissions.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={closeDeleteRoleDialog}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteRole}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={roleProcessing}
                            >
                                {roleProcessing ? 'Deleting...' : 'Delete Role'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Permission Management Modal */}
                <Dialog open={permissionModal.open} onOpenChange={closePermissionModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {permissionModal.mode === 'create' ? 'Create Permission' : 'Edit Permission'}
                            </DialogTitle>
                            <DialogDescription>
                                {permissionModal.mode === 'create'
                                    ? 'Create a new permission. Use format "Category-Action" (e.g., "User-Create", "Report-Export").'
                                    : 'Update the permission name.'
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
                                    {permissionErrors.name && (
                                        <p className="text-sm text-red-500 mt-1">{permissionErrors.name}</p>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closePermissionModal}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={permissionProcessing}
                                >
                                    {permissionProcessing ? (
                                        permissionModal.mode === 'create' ? 'Creating...' : 'Updating...'
                                    ) : (
                                        permissionModal.mode === 'create' ? 'Create Permission' : 'Update Permission'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Permission Dialog */}
                <AlertDialog open={deleteDialog.open} onOpenChange={closeDeleteDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Permission</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete the permission "{deleteDialog.permission?.name}"?
                                This action cannot be undone and will remove this permission from all roles.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeletePermission}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={permissionProcessing}
                            >
                                {permissionProcessing ? 'Deleting...' : 'Delete Permission'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        </AppLayout>
    );
}
