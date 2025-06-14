// permissions.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

// Interfaces (assuming these are defined in a shared types file or passed as props)
interface Permissions {
    id: number | string;
    name: string;
}

interface PermissionsTabProps {
    permissions: Permissions[];
    onOpenDeleteDialog: (type: string, id: number | string) => void; // Callback to open delete dialog
}

// Extracted Permissions Row component (can be kept here or moved to a shared components file)
function PermissionRow({
    permission,
    onUpdate,
    onDelete,
}: {
    permission: Permissions;
    onUpdate: (id: string | number, name: string) => void;
    onDelete: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const { data, setData, errors, clearErrors, put } = useForm({ name: permission.name }); // useForm for inline editing

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData('name', e.target.value);
        if (errors.name) clearErrors('name');
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (data.name.trim() === '') {
            toast.error('Permissions name cannot be empty.');
            return;
        }
        // Assuming onUpdate will handle the router.put call or similar logic
        onUpdate(permission.id, data.name);
        setEditing(false);
    };

    const handleCancel = () => {
        setEditing(false);
        setData('name', permission.name); // Reset to original name
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
                        <span>{permission.name}</span>
                        <Button
                            onClick={() => {
                                setEditing(true);
                                setData('name', permission.name); // Set initial value for edit
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

export default function PermissionsTab({ permissions = [], onOpenDeleteDialog }: PermissionsTabProps) {
    const {
        data: createPermData,
        setData: setCreatePermData,
        post: createPermission,
        processing: createPermProcessing,
        reset: resetCreatePerm,
        errors: createPermErrors,
    } = useForm({
        name: '',
    });

    const handleCreatePermissionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        createPermission('/permissions', {
            onSuccess: () => {
                resetCreatePerm();
                toast.success(`Permission created.`);
            },
            preserveScroll: true,
        });
    };

    const handleUpdatePermission = (id: number | string, name: string) => {
        // The actual update logic might be slightly different if using router.put directly from parent
        // For now, assuming the parent component or a global handler takes care of it.
        // This could also be a `put` call from a useForm hook specific to editing if preferred.
        router.put(
            `/permissions/${id}`,
            { name },
            {
                onSuccess: () => toast.success('Permissions updated.'),
                onError: () => toast.error('Failed to update permission.'),
                preserveScroll: true,
            },
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreatePermissionSubmit} className="flex items-start gap-2">
                        <div className="flex-grow">
                            <Input
                                placeholder="Permissions name (e.g., edit articles)"
                                value={createPermData.name}
                                onChange={(e) => setCreatePermData('name', e.target.value)}
                            />
                            {createPermErrors.name && <p className="mt-1 text-xs text-red-500">{createPermErrors.name}</p>}
                        </div>
                        <Button type="submit" disabled={createPermProcessing}>
                            Create
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Existing Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Permissions Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {permissions.map((permission) => (
                                <PermissionRow
                                    key={permission.id}
                                    permission={permission}
                                    onUpdate={handleUpdatePermission}
                                    onDelete={() => onOpenDeleteDialog('permissions', permission.id)}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
