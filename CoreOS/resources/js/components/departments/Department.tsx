import { Button } from '@/components/ui/button';
import { type Department as DepartmentType, type User } from '@/types';
import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import AssignUsersDialog from './AssignUsersDialog';
import CreateDepartmentDialog from './CreateDepartmentDialog';
import DepartmentCard from './DepartmentCard';
import EditDepartmentDialog from './EditDepartmentDialog';

interface DepartmentProps {
    departments?: DepartmentType[];
    users?: User[];
    showCreateButton?: boolean;
    title?: string;
    className?: string;
    onDepartmentCreated?: (department: DepartmentType) => void;
    onDepartmentUpdated?: (department: DepartmentType) => void;
    onDepartmentDeleted?: (departmentId: number) => void;
    onUsersAssigned?: (department: DepartmentType, userIds: number[]) => void;
}

export default function Department({
    departments = [],
    users = [],
    showCreateButton = true,
    title = 'Departments',
    className = '',
    onDepartmentCreated,
    onDepartmentUpdated,
    onDepartmentDeleted,
    onUsersAssigned,
}: DepartmentProps) {
    const [editingDepartment, setEditingDepartment] = useState<DepartmentType | null>(null);
    const [assigningDepartment, setAssigningDepartment] = useState<DepartmentType | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

    const handleEdit = (department: DepartmentType) => {
        setEditingDepartment(department);
        setIsEditDialogOpen(true);
    };

    const handleAssignUsers = (department: DepartmentType) => {
        setAssigningDepartment(department);
        setIsAssignDialogOpen(true);
    };

    const handleEditDialogClose = () => {
        setIsEditDialogOpen(false);
        setEditingDepartment(null);
    };

    const handleAssignDialogClose = () => {
        setIsAssignDialogOpen(false);
        setAssigningDepartment(null);
    };

    // Load departments if not provided
    const loadDepartments = () => {
        if (departments.length === 0) {
            router.get('/departments');
        }
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{title}</h1>
                {showCreateButton && (
                    <CreateDepartmentDialog
                        trigger={
                            <Button className="flex items-center gap-2">
                                <Plus size={16} />
                                Add Department
                            </Button>
                        }
                    />
                )}
            </div>

            {/* Departments Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {departments.length === 0 ? (
                    <div className="col-span-full py-8 text-center">
                        <p className="text-muted-foreground">No departments found.</p>
                        {showCreateButton && (
                            <Button variant="outline" className="mt-4" onClick={loadDepartments}>
                                Load Departments
                            </Button>
                        )}
                    </div>
                ) : (
                    departments.map((department) => (
                        <DepartmentCard key={department.id} department={department} onEdit={handleEdit} onAssignUsers={handleAssignUsers} />
                    ))
                )}
            </div>

            {/* Edit Dialog */}
            <EditDepartmentDialog department={editingDepartment} open={isEditDialogOpen} onOpenChange={handleEditDialogClose} />

            {/* Assign Users Dialog */}
            <AssignUsersDialog department={assigningDepartment} users={users} open={isAssignDialogOpen} onOpenChange={handleAssignDialogClose} />
        </div>
    );
}
