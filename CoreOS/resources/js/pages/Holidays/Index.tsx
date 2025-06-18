import React, {useCallback, useState} from 'react';
import {Head, router, useForm} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {Edit, Plus, Trash2} from 'lucide-react';


interface IndexProps {
    holidays: Holiday[];  // or `any[]`
}

export default function Index({ holidays }: IndexProps) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Holidays',
            href: '/holidays',
        },
    ];

    // Create form
    const createForm = useForm({
        name: '',
        date: '',
        description: '',
        type: 'company',
        is_recurring: false,
    });

    // Edit form
    const editForm = useForm({
        name: '',
        date: '',
        description: '',
        type: 'company',
        is_recurring: false,
    });

    const handleCreate = (e) => {
        e.preventDefault();
        createForm.post(route('holidays.store'), {
            onSuccess: () => {
                setCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEdit = (e) => {
        e.preventDefault();
        editForm.put(route('holidays.update', editingHoliday.id), {
            onSuccess: () => {
                setEditModalOpen(false);
                setEditingHoliday(null);
                editForm.reset();
            },
        });
    };

    const openEditModal = (holiday) => {
        setEditingHoliday(holiday);
        editForm.setData({
            name: holiday.name,
            date: holiday.date,
            description: holiday.description || '',
            type: holiday.type,
            is_recurring: holiday.is_recurring,
        });
        setEditModalOpen(true);
    };

    const handleDelete = useCallback((id) => {
        router.delete(route('holidays.destroy', id));
    }, []);

    const getTypeVariant = useCallback((type) => {
        switch (type) {
            case 'public': return 'default';
            case 'company': return 'secondary';
            case 'custom': return 'outline';
            default: return 'secondary';
        }
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Holidays" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-2xl">Holidays</CardTitle>
                                <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Holiday
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Add New Holiday</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleCreate} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="create-name">Holiday Name</Label>
                                                <Input
                                                    id="create-name"
                                                    type="text"
                                                    value={createForm.data.name}
                                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                                    placeholder="e.g., Christmas Day"
                                                    required
                                                />
                                                {createForm.errors.name && (
                                                    <p className="text-sm text-destructive">{createForm.errors.name}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="create-date">Date</Label>
                                                <Input
                                                    id="create-date"
                                                    type="date"
                                                    value={createForm.data.date}
                                                    onChange={(e) => createForm.setData('date', e.target.value)}
                                                    required
                                                />
                                                {createForm.errors.date && (
                                                    <p className="text-sm text-destructive">{createForm.errors.date}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="create-type">Holiday Type</Label>
                                                <Select value={createForm.data.type} onValueChange={(value) => createForm.setData('type', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select holiday type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="company">Company Holiday</SelectItem>
                                                        <SelectItem value="public">Public Holiday</SelectItem>
                                                        <SelectItem value="custom">Custom Holiday</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {createForm.errors.type && (
                                                    <p className="text-sm text-destructive">{createForm.errors.type}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="create-description">Description (Optional)</Label>
                                                <Textarea
                                                    id="create-description"
                                                    rows={3}
                                                    value={createForm.data.description}
                                                    onChange={(e) => createForm.setData('description', e.target.value)}
                                                    placeholder="Add any additional details..."
                                                />
                                                {createForm.errors.description && (
                                                    <p className="text-sm text-destructive">{createForm.errors.description}</p>
                                                )}
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="create-recurring"
                                                    checked={createForm.data.is_recurring}
                                                    onCheckedChange={(checked) => createForm.setData('is_recurring', checked)}
                                                />
                                                <Label htmlFor="create-recurring" className="text-sm font-normal cursor-pointer">
                                                    Recurring holiday (repeats annually)
                                                </Label>
                                            </div>

                                            <div className="flex justify-end space-x-2 pt-4">
                                                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                                                    Cancel
                                                </Button>
                                                <Button type="submit" disabled={createForm.processing}>
                                                    {createForm.processing ? 'Adding...' : 'Add Holiday'}
                                                </Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {holidays.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-muted-foreground text-lg mb-4">
                                        No holidays added yet
                                    </div>
                                    <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Your First Holiday
                                            </Button>
                                        </DialogTrigger>
                                    </Dialog>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {holidays.map((holiday) => (
                                        <Card key={holiday.id} className="relative">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <h4 className="font-semibold text-lg leading-tight">
                                                        {holiday.name}
                                                    </h4>
                                                    <Badge variant={getTypeVariant(holiday.type)}>
                                                        {holiday.type}
                                                    </Badge>
                                                </div>

                                                <p className="text-sm text-muted-foreground mb-3">
                                                    {holiday.formatted_date}
                                                </p>

                                                {holiday.description && (
                                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                                        {holiday.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-2">
                                                        {holiday.is_recurring && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Recurring
                                                            </Badge>
                                                        )}
                                                        {holiday.is_upcoming && (
                                                            <Badge variant="default" className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                                                                Upcoming
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditModal(holiday)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-destructive hover:text-destructive"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>
                                                                        Delete Holiday
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        <p>Are you sure you want to delete </p>
                                                                            <span className="flex justify-center capitalize text-md  font-bold text-red-500 italic">{holiday.name} </span>
                                                                       <p> This action cannot be undone.</p>
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>
                                                                  Cancel
                                                                    </AlertDialogCancel>
                                                                    <Button  variant="destructive" onClick={() => handleDelete(holiday.id)} >
                                                                        Delete
                                                                    </Button>

                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Edit Modal */}
                    <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Edit Holiday</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleEdit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Holiday Name</Label>
                                    <Input
                                        id="edit-name"
                                        type="text"
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                        placeholder="e.g., Christmas Day"
                                        required
                                    />
                                    {editForm.errors.name && (
                                        <p className="text-sm text-destructive">{editForm.errors.name}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-date">Date</Label>
                                    <Input
                                        id="edit-date"
                                        type="date"
                                        value={editForm.data.date}
                                        onChange={(e) => editForm.setData('date', e.target.value)}
                                        required
                                    />
                                    {editForm.errors.date && (
                                        <p className="text-sm text-destructive">{editForm.errors.date}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-type">Holiday Type</Label>
                                    <Select value={editForm.data.type} onValueChange={(value) => editForm.setData('type', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select holiday type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="company">Company Holiday</SelectItem>
                                            <SelectItem value="public">Public Holiday</SelectItem>
                                            <SelectItem value="custom">Custom Holiday</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {editForm.errors.type && (
                                        <p className="text-sm text-destructive">{editForm.errors.type}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-description">Description (Optional)</Label>
                                    <Textarea
                                        id="edit-description"
                                        rows={3}
                                        value={editForm.data.description}
                                        onChange={(e) => editForm.setData('description', e.target.value)}
                                        placeholder="Add any additional details..."
                                    />
                                    {editForm.errors.description && (
                                        <p className="text-sm text-destructive">{editForm.errors.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="edit-recurring"
                                        checked={editForm.data.is_recurring}
                                        onCheckedChange={(checked) => editForm.setData('is_recurring', checked)}
                                    />
                                    <Label htmlFor="edit-recurring" className="text-sm font-normal cursor-pointer">
                                        Recurring holiday (repeats annually)
                                    </Label>
                                </div>

                                <div className="flex justify-end space-x-2 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={editForm.processing}>
                                        {editForm.processing ? 'Updating...' : 'Update Holiday'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
}
