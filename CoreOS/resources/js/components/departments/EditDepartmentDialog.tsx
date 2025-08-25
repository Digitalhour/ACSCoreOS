import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
// --- Import the shared Department type ---
import { type Department } from '@/types';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

// --- The local interface definition has been removed ---

// --- Define the shape of the form data using a 'type' alias ---
// This resolves the 'FormDataType' constraint issue with useForm.
type FormData = {
    name: string;
    description: string;
    is_active: boolean;
};

interface EditDepartmentDialogProps {
    department: Department | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function EditDepartmentDialog({ department, open, onOpenChange }: EditDepartmentDialogProps) {
    // --- Explicitly type the useForm hook with our FormData type ---
    const { data, setData, put, processing, errors, reset } = useForm<FormData>({
        name: '',
        description: '',
        is_active: true,
    });

    useEffect(() => {
        if (department) {
            setData({
                name: department.name,
                description: department.description || '',
                is_active: department.is_active,
            });
        }
    }, [department]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!department) return;

        put(`/human-resources/departments/${department.id}`, {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    if (!department) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Department</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Name</Label>
                        <Input id="edit-name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                        {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea id="edit-description" value={data.description} onChange={(e) => setData('description', e.target.value)} />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="is-active" checked={data.is_active} onCheckedChange={(checked) => setData('is_active', checked)} />
                        <Label htmlFor="is-active">Active</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Update Department
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
