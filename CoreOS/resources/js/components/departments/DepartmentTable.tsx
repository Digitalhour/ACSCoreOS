import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Department, type User } from '@/types';
import { Edit, Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import AssignUsersDialog from './AssignUsersDialog';
import CreateDepartmentDialog from './CreateDepartmentDialog';
import DeleteDepartmentDialog from './DeleteDepartmentDialog';
import EditDepartmentDialog from './EditDepartmentDialog';

interface DepartmentTableProps {
    departments?: Department[];
    users?: User[];
    showCreateButton?: boolean;
    className?: string;
}

export default function DepartmentTable({ departments = [], users = [], showCreateButton = true, className = '' }: DepartmentTableProps) {
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [assigningDepartment, setAssigningDepartment] = useState<Department | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

    const handleEdit = (department: Department) => {
        setEditingDepartment(department);
        setIsEditDialogOpen(true);
    };

    const handleAssignUsers = (department: Department) => {
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

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Departments</h2>
                {showCreateButton && <CreateDepartmentDialog />}
            </div>

            {/* Table */}
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>

                            <TableHead>Status</TableHead>
                            <TableHead>Users</TableHead>

                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {departments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                                    No departments found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            departments.map((department) => (
                                <TableRow key={department.id}>
                                    <TableCell className="font-medium">{department.name}</TableCell>

                                    <TableCell>
                                        <Badge variant={department.is_active ? 'default' : 'secondary'}>
                                            {department.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Users size={14} />
                                            <span>{department.users.length}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => handleAssignUsers(department)} className="h-8 w-8 p-0">
                                                <UserPlus size={14} />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(department)} className="h-8 w-8 p-0">
                                                <Edit size={14} />
                                            </Button>
                                            <DeleteDepartmentDialog
                                                department={department}
                                                trigger={
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <Trash2 size={14} />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Dialog */}
            <EditDepartmentDialog department={editingDepartment} open={isEditDialogOpen} onOpenChange={handleEditDialogClose} />

            {/* Assign Users Dialog */}
            <AssignUsersDialog department={assigningDepartment} users={users} open={isAssignDialogOpen} onOpenChange={handleAssignDialogClose} />
        </div>
    );
}
