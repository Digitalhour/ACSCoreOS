// role-permission-user-assignment.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Interfaces from parent or shared types
import type { Permission, Role, User } from '@/pages/RolesPermissionsPage'; // Adjust path if interfaces are elsewhere

interface UserAssignmentsTabProps {
    users: User[];
    roles: Role[]; // All available roles, each should have its permissions: role.permissions: Permission[]
    allPermissions: Permission[]; // All available permissions
    onManageUser: (userId: string) => void;
    initialSelectedUserId?: string | null;
}

export default function UserAssignmentsTab({
    users = [],
    roles: availableRoles = [],
    allPermissions = [],
    onManageUser,
    initialSelectedUserId = null,
}: UserAssignmentsTabProps) {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(initialSelectedUserId);

    const {
        data: assignUserRolesData,
        setData: setAssignUserRolesData,
        post: assignRolesToUser,
        processing: assignUserRolesProcessing,
        errors: assignUserRolesErrors,
        reset: resetAssignUserRolesForm,
    } = useForm<{ user_id: string; roles: (string | number)[] }>({
        user_id: initialSelectedUserId || '',
        roles: [],
    });

    const {
        data: assignUserDirectPermsData, // This form state holds ONLY the permissions to be directly synced
        setData: setAssignUserDirectPermsData,
        post: assignDirectPermissionsToUser,
        processing: assignUserDirectPermsProcessing,
        errors: assignUserDirectPermsErrors,
        reset: resetAssignUserDirectPermsForm,
    } = useForm<{ user_id: string; permissions: (string | number)[] }>({
        user_id: initialSelectedUserId || '',
        permissions: [],
    });

    const selectedUserObject = useMemo(() => {
        if (!selectedUserId) return null;
        return users.find((u) => u.id.toString() === selectedUserId);
    }, [selectedUserId, users]);

    // Permissions derived from the user's currently assigned roles (from selectedUserObject.roles)
    const permissionsFromRolesIdsSet = useMemo(() => {
        const permIds = new Set<string | number>();
        if (selectedUserObject?.roles) {
            selectedUserObject.roles.forEach((userRole) => {
                // Find the full role definition from availableRoles to get its permissions
                const fullRole = availableRoles.find((r) => r.id === userRole.id);
                fullRole?.permissions?.forEach((p) => permIds.add(p.id));
            });
        }
        return permIds;
    }, [selectedUserObject, availableRoles]);

    // Effective permissions for display: combines direct permissions from the FORM and permissions from roles
    const effectivePermissionIdsSet = useMemo(() => {
        // Start with direct permissions currently in the form state
        const directPermsFromForm = new Set<string | number>(assignUserDirectPermsData.permissions);
        // Add permissions derived from roles
        permissionsFromRolesIdsSet.forEach((id) => directPermsFromForm.add(id));
        return directPermsFromForm;
    }, [assignUserDirectPermsData.permissions, permissionsFromRolesIdsSet]);

    // Permissions that are inherited from roles AND NOT currently in the direct permissions form state
    // These should be checked and disabled.
    const inheritedAndNotDirectIdsSet = useMemo(() => {
        const inheritedNotDirect = new Set<string | number>();
        permissionsFromRolesIdsSet.forEach((rolePermId) => {
            if (!assignUserDirectPermsData.permissions.includes(rolePermId)) {
                inheritedNotDirect.add(rolePermId);
            }
        });
        return inheritedNotDirect;
    }, [assignUserDirectPermsData.permissions, permissionsFromRolesIdsSet]);

    useEffect(() => {
        if (selectedUserObject) {
            setAssignUserRolesData({
                user_id: selectedUserObject.id.toString(),
                roles: selectedUserObject.roles?.map((r) => r.id) || [],
            });

            const initialDirectPermIds =
                selectedUserObject.direct_permissions
                    ?.map((name) => allPermissions.find((p) => p.name === name)?.id)
                    .filter((id): id is string | number => id !== undefined) || [];
            setAssignUserDirectPermsData({
                user_id: selectedUserObject.id.toString(),
                permissions: initialDirectPermIds, // Initialize with actual direct permissions
            });
        } else {
            resetAssignUserRolesForm();
            resetAssignUserDirectPermsForm();
            // Ensure user_id is also cleared if reset doesn't do it fully
            setAssignUserRolesData((prev) => ({ ...prev, user_id: '' }));
            setAssignUserDirectPermsData((prev) => ({ ...prev, user_id: '' }));
        }
    }, [selectedUserObject, allPermissions, resetAssignUserRolesForm, resetAssignUserDirectPermsForm]);

    const handleUserSelectionChange = (userId: string | null) => {
        setSelectedUserId(userId);
    };

    const handleAssignRolesToUserSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedUserId) {
            toast.error('Please select a user.');
            return;
        }
        assignRolesToUser('/users/sync-roles', {
            onSuccess: () => toast.success(`Roles synced for ${selectedUserObject?.name || 'user'}.`),
            onError: (err) => {
                toast.error('Failed to sync roles.');
                console.error('Role sync error:', err);
            },
            preserveScroll: true,
        });
    };

    const handleAssignDirectPermissionsToUserSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedUserId) {
            toast.error('Please select a user.');
            return;
        }
        assignDirectPermissionsToUser('/users/sync-direct-permissions', {
            onSuccess: () => toast.success(`Direct permissions synced for ${selectedUserObject?.name || 'user'}.`),
            onError: (err) => {
                toast.error('Failed to sync direct permissions.');
                console.error('Direct perm error:', err);
            },
            preserveScroll: true,
        });
    };

    const handleRoleCheckboxChangeForUser = (roleId: number | string, checked: boolean | string) => {
        setAssignUserRolesData(
            'roles',
            checked ? [...new Set([...assignUserRolesData.roles, roleId])] : assignUserRolesData.roles.filter((id) => id !== roleId),
        );
    };

    const handleDirectPermissionCheckboxChangeForUser = (permissionId: number | string, checked: boolean | string) => {
        // This function updates the list of *direct* permissions.
        // If a permission is inherited (and thus was disabled but checked), checking it
        // explicitly here adds it to the direct permissions list.
        setAssignUserDirectPermsData(
            'permissions',
            checked
                ? [...new Set([...assignUserDirectPermsData.permissions, permissionId])]
                : assignUserDirectPermsData.permissions.filter((id) => id !== permissionId),
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Manage User Access</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-6">
                        <Label htmlFor="user-select-management">Select User to Manage</Label>
                        <Select value={selectedUserId || ''} onValueChange={handleUserSelectionChange}>
                            <SelectTrigger id="user-select-management">
                                <SelectValue placeholder="Select User..." />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedUserObject && (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Assign Roles Section */}
                            <form onSubmit={handleAssignRolesToUserSubmit} className="space-y-4 rounded-md border p-4">
                                <h3 className="text-lg font-medium">Assign Roles to {selectedUserObject.name}</h3>
                                <div className="max-h-60 space-y-2 overflow-y-auto">
                                    {availableRoles.map((role) => (
                                        <div key={role.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`user-role-assign-${role.id}`}
                                                checked={
                                                    assignUserRolesData.user_id === selectedUserObject.id.toString() &&
                                                    assignUserRolesData.roles.includes(role.id)
                                                }
                                                onCheckedChange={(checked) => handleRoleCheckboxChangeForUser(role.id, checked)}
                                            />
                                            <Label htmlFor={`user-role-assign-${role.id}`} className="font-normal">
                                                {role.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                                {assignUserRolesErrors.roles && <p className="text-xs text-red-500">{assignUserRolesErrors.roles}</p>}
                                <Button type="submit" className="w-full" disabled={assignUserRolesProcessing || !selectedUserId}>
                                    Sync Roles for User
                                </Button>
                            </form>

                            {/* Assign Direct Permissions Section */}
                            <form onSubmit={handleAssignDirectPermissionsToUserSubmit} className="space-y-4 rounded-md border p-4">
                                <h3 className="text-lg font-medium">Assign Direct Permissions to {selectedUserObject.name}</h3>
                                <div className="max-h-60 space-y-2 overflow-y-auto">
                                    {allPermissions.map((permission) => {
                                        const isEffectivelyChecked = effectivePermissionIdsSet.has(permission.id);
                                        const isInheritedOnly = inheritedAndNotDirectIdsSet.has(permission.id);
                                        // A permission is disabled if it's inherited ONLY (not also direct)
                                        // However, the user should still be able to click it to make it an explicit direct permission.
                                        // So, we don't disable it, but visually indicate it.
                                        // The `handleDirectPermissionCheckboxChangeForUser` will add it to direct permissions if checked.

                                        return (
                                            <div key={permission.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`user-direct-perm-${permission.id}`}
                                                    checked={isEffectivelyChecked}
                                                    // disabled={isInheritedOnly} // Let's not disable, allow promoting to direct
                                                    onCheckedChange={(checked) => handleDirectPermissionCheckboxChangeForUser(permission.id, checked)}
                                                />
                                                <Label
                                                    htmlFor={`user-direct-perm-${permission.id}`}
                                                    className={`font-normal ${isInheritedOnly && !assignUserDirectPermsData.permissions.includes(permission.id) ? 'text-muted-foreground' : ''}`}
                                                >
                                                    {permission.name}
                                                    {isInheritedOnly && !assignUserDirectPermsData.permissions.includes(permission.id) && (
                                                        <span className="text-muted-foreground ml-1 text-xs">(from role)</span>
                                                    )}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                                {assignUserDirectPermsErrors.permissions && (
                                    <p className="text-xs text-red-500">{assignUserDirectPermsErrors.permissions}</p>
                                )}
                                <Button type="submit" className="w-full" disabled={assignUserDirectPermsProcessing || !selectedUserId}>
                                    Sync Direct Permissions
                                </Button>
                            </form>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>User Access Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Assigned Roles</TableHead>
                                <TableHead>Direct Permissions</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.roles?.map((role) => role.name).join(', ') || 'None'}</TableCell>
                                    <TableCell>{user.direct_permissions?.join(', ') || 'None'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                onManageUser(user.id.toString());
                                                handleUserSelectionChange(user.id.toString());
                                            }}
                                        >
                                            Manage Access
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
