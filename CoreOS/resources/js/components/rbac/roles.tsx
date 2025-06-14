// roles.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

// Interfaces (assuming these are defined in a shared types file or passed as props)
interface Permission {
    id: number | string;
    name: string;
}

interface Role {
    id: number | string;
    name: string;
    permissions?: Permission[];
}

interface RolesTabProps {
    roles: Role[];
    permissions: Permission[];
    onOpenDeleteDialog: (type: string, id: number | string) => void; // Callback to open delete dialog
}

// Extracted Role Row component (can be kept here or moved to a shared components file)
function RoleRow({ role, onUpdate, onDelete }: { role: Role; onUpdate: (id: string | number, name: string) => void; onDelete: () => void }) {
    const [editing, setEditing] = useState(false);
    const { data, setData, errors, clearErrors } = useForm({ name: role.name });

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData('name', e.target.value);
        if (errors.name) clearErrors('name');
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (data.name.trim() === '') {
            toast.error('Role name cannot be empty.');
            return;
        }
        onUpdate(role.id, data.name);
        setEditing(false);
    };

    const handleCancel = () => {
        setEditing(false);
        setData('name', role.name);
        clearErrors('name');
    };

    return (
        <TableRow>
            <TableCell className="w-full">
                {editing ? (
                    <form onSubmit={handleSubmit} className="flex items-start gap-2">
                        <div className="flex-grow">
                            <Input value={data.name} onChange={handleNameChange} className="w-full" autoFocus />
                            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                        </div>
                        <Button type="submit" size="sm" variant="outline">
                            Save
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </form>
                ) : (
                    <div className="flex items-center justify-between">
                        <span>{role.name}</span>
                        <Button
                            onClick={() => {
                                setEditing(true);
                                setData('name', role.name);
                                clearErrors('name');
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                            </svg>
                        </Button>
                    </div>
                )}
            </TableCell>
            <TableCell className="text-right">
                {!editing && (
                    <Button size="sm" variant="destructive" onClick={onDelete}>
                        Delete
                    </Button>
                )}
            </TableCell>
        </TableRow>
    );
}

export default function RolesTab({ roles = [], permissions = [], onOpenDeleteDialog }: RolesTabProps) {
    const {
        data: createRoleData,
        setData: setCreateRoleData,
        post: createRole,
        processing: createRoleProcessing,
        reset: resetCreateRole,
        errors: createRoleErrors,
    } = useForm({
        name: '',
    });

    const {
        data: editRolePermData,
        setData: setEditRolePermData,
        post: updateRolePermissions,
        processing: updateRolePermProcessing,
        errors: editRolePermErrors,
    } = useForm<{ role_id: string; permissions: (string | number)[] }>({
        role_id: '',
        permissions: [],
    });

    const handleCreateRoleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        createRole('/roles', {
            onSuccess: () => {
                resetCreateRole();
                toast.success('Role Created.');
            },
            preserveScroll: true,
        });
    };

    const handleUpdateRole = (id: number | string, name: string) => {
        router.put(
            `/roles/${id}`,
            { name },
            {
                onSuccess: () => toast.success('Role updated.'),
                onError: () => toast.error('Failed to update role.'),
                preserveScroll: true,
            },
        );
    };

    const handleEditRolePermissionsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editRolePermData.role_id) {
            toast.error('Please select a role first.');
            return;
        }
        const selectedRole = roles.find((role) => role.id.toString() === editRolePermData.role_id);
        const roleName = selectedRole ? selectedRole.name : 'the selected role';
        updateRolePermissions('/roles/permissions', {
            onSuccess: () => {
                toast.success(`Permissions synced with ${roleName} role.`);
            },
            preserveScroll: true,
        });
    };

    const handlePermissionChangeForRole = (permissionId: number | string, checked: boolean | string) => {
        const currentPermissions = [...editRolePermData.permissions];
        if (checked) {
            if (!currentPermissions.includes(permissionId)) {
                setEditRolePermData('permissions', [...currentPermissions, permissionId]);
            }
        } else {
            setEditRolePermData(
                'permissions',
                currentPermissions.filter((id) => id !== permissionId),
            );
        }
    };

    const handleRoleSelectForPermissions = (roleId: string) => {
        setEditRolePermData('role_id', roleId);
        const role = roles.find((r) => r.id.toString() === roleId);
        if (role && role.permissions) {
            setEditRolePermData(
                'permissions',
                role.permissions.map((p) => p.id),
            );
        } else {
            setEditRolePermData('permissions', []);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Role</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateRoleSubmit} className="flex items-start gap-2">
                            <div className="flex-grow">
                                <Input
                                    placeholder="Role name (e.g., administrator)"
                                    value={createRoleData.name}
                                    onChange={(e) => setCreateRoleData('name', e.target.value)}
                                />
                                {createRoleErrors.name && <p className="mt-1 text-xs text-red-500">{createRoleErrors.name}</p>}
                            </div>
                            <Button type="submit" disabled={createRoleProcessing}>
                                Create
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Existing Roles</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Role Name</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roles.map((role) => (
                                    <RoleRow
                                        key={role.id}
                                        role={role}
                                        onUpdate={handleUpdateRole}
                                        onDelete={() => onOpenDeleteDialog('roles', role.id)}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Role Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleEditRolePermissionsSubmit}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="role-select-permissions">Select Role</Label>
                                <Select value={editRolePermData.role_id} onValueChange={handleRoleSelectForPermissions}>
                                    <SelectTrigger id="role-select-permissions">
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={role.id.toString()}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {editRolePermErrors.role_id && <p className="mt-1 text-xs text-red-500">{editRolePermErrors.role_id}</p>}
                            </div>

                            {editRolePermData.role_id && (
                                <>
                                    <div className="rounded-md border p-4">
                                        <h3 className="mb-2 font-medium">Assign Permissions to Role</h3>
                                        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                            {permissions.map((permission) => (
                                                <div key={permission.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`role-perm-${permission.id}`}
                                                        checked={editRolePermData.permissions.includes(permission.id)}
                                                        onCheckedChange={(checked) => handlePermissionChangeForRole(permission.id, checked)}
                                                    />
                                                    <Label
                                                        htmlFor={`role-perm-${permission.id}`}
                                                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                    >
                                                        {permission.name}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                        {editRolePermErrors.permissions && (
                                            <p className="mt-2 text-xs text-red-500">{editRolePermErrors.permissions}</p>
                                        )}
                                    </div>
                                    <Button type="submit" disabled={updateRolePermProcessing}>
                                        Save Permissions for Role
                                    </Button>
                                </>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
