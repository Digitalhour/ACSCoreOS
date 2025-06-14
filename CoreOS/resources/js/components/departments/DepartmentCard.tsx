import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// --- Import the shared Department type ---
import { type Department } from '@/types';
import { Edit, Trash2, UserPlus, Users } from 'lucide-react';
import DeleteDepartmentDialog from './DeleteDepartmentDialog';

// --- The duplicate interface has been removed ---
interface DepartmentCardProps {
    department: Department;
    onEdit: (department: Department) => void;
    onAssignUsers: (department: Department) => void;
}

export default function DepartmentCard({ department, onEdit, onAssignUsers }: DepartmentCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{department.name}</CardTitle>
                <div className="flex items-center gap-2">
                    <Badge variant={department.is_active ? 'default' : 'secondary'}>{department.is_active ? 'Active' : 'Inactive'}</Badge>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(department)}>
                            <Edit size={14} />
                        </Button>
                        <DeleteDepartmentDialog
                            department={department}
                            trigger={
                                <Button variant="ghost" size="sm">
                                    <Trash2 size={14} />
                                </Button>
                            }
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {department.description && <p className="text-muted-foreground mb-3 text-sm">{department.description}</p>}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={14} />
                        <span className="text-sm">{department.users.length} users</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onAssignUsers(department)} className="flex items-center gap-1">
                        <UserPlus size={12} />
                        Manage
                    </Button>
                </div>
                {department.users.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {department.users.slice(0, 3).map((user) => (
                            <Badge key={user.id} variant="outline" className="text-xs">
                                {user.name}
                            </Badge>
                        ))}
                        {department.users.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                                +{department.users.length - 3} more
                            </Badge>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
