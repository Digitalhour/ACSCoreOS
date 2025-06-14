import AssignUsersDialog from '@/components/departments/AssignUsersDialog';
import CreateDepartmentDialog from '@/components/departments/CreateDepartmentDialog';
import DepartmentCard from '@/components/departments/DepartmentCard';
import EditDepartmentDialog from '@/components/departments/EditDepartmentDialog';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
// --- Import the shared types ---
import { type BreadcrumbItem, type Department, type User } from '@/types';
import { Head } from '@inertiajs/react';
import { Users } from 'lucide-react';
import { useState } from 'react';

// --- The local interface definitions have been removed ---

// Define the component props using the imported types
interface Props {
    departments: Department[];
    users: User[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Departments', href: '/departments' },
];

export default function DepartmentsIndex({ departments, users }: Props) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [assigningUsers, setAssigningUsers] = useState<Department | null>(null);

    // This function's parameter is now typed with the imported Department interface,
    // ensuring consistency across the application.
    const handleEdit = (department: Department) => {
        setEditingDepartment(department);
        setEditDialogOpen(true);
    };

    const handleAssignUsers = (department: Department) => {
        setAssigningUsers(department);
        setAssignDialogOpen(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Departments" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Departments</h1>
                    <CreateDepartmentDialog />
                </div>

                <EditDepartmentDialog
                    department={editingDepartment}
                    open={editDialogOpen}
                    onOpenChange={(open) => {
                        setEditDialogOpen(open);
                        if (!open) setEditingDepartment(null);
                    }}
                />

                <AssignUsersDialog
                    department={assigningUsers}
                    users={users}
                    open={assignDialogOpen}
                    onOpenChange={(open) => {
                        setAssignDialogOpen(open);
                        if (!open) setAssigningUsers(null);
                    }}
                />

                {departments.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {departments.map((department) => (
                            <DepartmentCard key={department.id} department={department} onEdit={handleEdit} onAssignUsers={handleAssignUsers} />
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Users size={48} className="text-muted-foreground mb-4" />
                            <h3 className="mb-2 text-lg font-medium">No departments yet</h3>
                            <p className="text-muted-foreground mb-4">Create your first department to get started.</p>
                            <CreateDepartmentDialog />
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
