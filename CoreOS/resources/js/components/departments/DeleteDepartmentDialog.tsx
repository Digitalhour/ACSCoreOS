import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
// --- Import the shared Department type ---
import { type Department } from '@/types';
import { useForm } from '@inertiajs/react';

// --- The local interface definition has been removed ---

interface DeleteDepartmentDialogProps {
    department: Department;
    trigger: React.ReactNode;
}

export default function DeleteDepartmentDialog({ department, trigger }: DeleteDepartmentDialogProps) {
    const { delete: destroy, processing } = useForm();

    const handleDelete = () => {
        destroy(`/human-resources/departments/${department.id}`);
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the "{department.name}" department and remove all user assignments.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={processing}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
