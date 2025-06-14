import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
// --- Import the shared types ---
import { type Department, type User } from '@/types';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

// --- The local interface definitions have been removed ---

interface AssignUsersDialogProps {
    department: Department | null;
    users: User[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AssignUsersDialog({ department, users, open, onOpenChange }: AssignUsersDialogProps) {
    const { data, setData, post, processing, reset } = useForm({
        user_ids: [] as number[],
    });

    useEffect(() => {
        if (department) {
            setData(
                'user_ids',
                department.users.map((user) => user.id),
            );
        }
    }, [department]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!department) return;

        post(`/departments/${department.id}/assign-users`, {
            onSuccess: () => {
                onOpenChange(false);
            },
            onFinish: () => {
                reset();
            },
        });
    };

    const handleUserToggle = (userId: number, checked: boolean) => {
        const currentUserIds = data.user_ids;
        if (checked) {
            setData('user_ids', [...currentUserIds, userId]);
        } else {
            setData(
                'user_ids',
                currentUserIds.filter((id) => id !== userId),
            );
        }
    };

    if (!department) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Assign Users to {department.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <ScrollArea className="h-60 w-full rounded-md border p-4">
                        <div className="space-y-2">
                            {users.map((user) => (
                                <div key={user.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`user-${user.id}`}
                                        checked={data.user_ids.includes(user.id)}
                                        onCheckedChange={(checked) => handleUserToggle(user.id, !!checked)}
                                    />
                                    <Label htmlFor={`user-${user.id}`} className="cursor-pointer text-sm font-normal">
                                        <div>
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-muted-foreground text-xs">{user.email}</div>
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <Separator />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Assign Users
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
