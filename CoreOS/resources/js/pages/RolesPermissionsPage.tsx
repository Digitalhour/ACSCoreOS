import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import PermissionsTab from '@/components/rbac/permissions';
import UserAssignmentsTab from '@/components/rbac/role-permission-user-assignment';
import RolesTab from '@/components/rbac/roles';

// Define interfaces for props
export interface Permission {
    id: number | string;
    name: string;
}

export interface Role {
    id: number | string;
    name: string;
    permissions?: Permission[]; // Permissions this role has
}

export interface User {
    id: number | string;
    name: string;
    roles?: Role[]; // Roles assigned to the user (array of Role objects)
    direct_permissions?: string[]; // Names of direct permissions assigned to the user
}

export interface RolesPermissionsPageProps {
    permissions: Permission[]; // All available permissions
    roles: Role[]; // All available roles (with their permissions)
    users: User[]; // All users (with their assigned roles and direct permission names)
    flash?: {
        success?: string;
        error?: string;
    };
}

const breadcrumbs = [
    {
        title: 'Roles and Permissions',
        href: route('roles-permissions.index'), // Assuming you have a named route
    },
];

export default function RolesPermissionsPage({
    permissions: initialPermissions,
    roles: initialRoles,
    users: initialUsers,
    flash,
}: RolesPermissionsPageProps) {
    const [activeTab, setActiveTab] = useState('permissions');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: string | null; id: number | string | null }>({
        type: null,
        id: null,
    });
    const [selectedUserIdForManagement, setSelectedUserIdForManagement] = useState<string | null>(null);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const openDeleteDialog = (type: string, id: number | string) => {
        setItemToDelete({ type, id });
        setDialogOpen(true);
    };

    const handleDelete = () => {
        if (itemToDelete.type && itemToDelete.id) {
            const typeOfItemBeingDeleted = itemToDelete.type;
            const singularType = typeOfItemBeingDeleted.endsWith('s') ? typeOfItemBeingDeleted.slice(0, -1) : typeOfItemBeingDeleted;

            router.delete(`/${typeOfItemBeingDeleted}/${itemToDelete.id}`, {
                onSuccess: () => {
                    toast.warning(`${singularType.charAt(0).toUpperCase() + singularType.slice(1)} deleted!`);
                },
                onError: (errors) => {
                    toast.error(`Failed to delete ${singularType}.`);
                    console.error('Delete error:', errors);
                },
                onFinish: () => {
                    setDialogOpen(false);
                    setItemToDelete({ type: null, id: null });
                },
                preserveScroll: true,
                preserveState: false, // Reload props to reflect deletion
            });
        }
    };

    // Callback for UserAssignmentsTab's "Manage Access" button or similar interactions
    const handleManageUser = (userId: string) => {
        setActiveTab('assignments');
        setSelectedUserIdForManagement(userId); // Set the user ID to be managed
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles & Permissions Management" />

            <div className="space-y-6 p-4 md:p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                        <TabsTrigger value="permissions">Permissions</TabsTrigger>
                        <TabsTrigger value="roles">Roles</TabsTrigger>
                        <TabsTrigger value="assignments">User Assignments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="permissions" className="mt-6">
                        <PermissionsTab permissions={initialPermissions} onOpenDeleteDialog={openDeleteDialog} />
                    </TabsContent>

                    <TabsContent value="roles" className="mt-6">
                        <RolesTab roles={initialRoles} permissions={initialPermissions} onOpenDeleteDialog={openDeleteDialog} />
                    </TabsContent>

                    <TabsContent value="assignments" className="mt-6">
                        <UserAssignmentsTab
                            users={initialUsers}
                            roles={initialRoles}
                            allPermissions={initialPermissions}
                            onManageUser={handleManageUser} // Used to switch tab and signal which user to manage
                            key={activeTab} // Optionally force re-mount or use selectedUserIdForManagement as key
                            initialSelectedUserId={selectedUserIdForManagement} // Pass the initially selected user
                        />
                    </TabsContent>
                </Tabs>
            </div>

            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this{' '}
                            {itemToDelete.type ? (itemToDelete.type.endsWith('s') ? itemToDelete.type.slice(0, -1) : itemToDelete.type) : 'item'}?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemToDelete({ type: null, id: null })}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
