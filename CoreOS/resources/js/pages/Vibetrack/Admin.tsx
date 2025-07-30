import React, {useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router, useForm} from '@inertiajs/react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {CheckIcon, EditIcon, RotateCcwIcon, TrashIcon, XIcon} from 'lucide-react';
import {route} from "ziggy-js";

interface Alias {
    id: number;
    device_id: string;
    name: string;
}

interface DeletedAlias extends Alias {
    deleted_at: string;
}

interface Props {
    aliases: Alias[];
    deletedAliases: DeletedAlias[];
    deviceIds: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Vibetrack Devices', href: '/vibetrack' },
    { title: 'Admin', href: '/vibetrack/admin' },
];

export default function VibetrackAdmin({ aliases, deletedAliases, deviceIds }: Props) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState<string>('');
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [dialogType, setDialogType] = useState<'delete' | 'restore'>('delete');
    const [selectedAlias, setSelectedAlias] = useState<Alias | DeletedAlias | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        device_id: '',
        name: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/vibetrack/admin', {
            onSuccess: () => reset(),
        });
    };

    const handleEdit = (alias: Alias) => {
        setEditingId(alias.id);
        setEditName(alias.name);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleSaveEdit = (id: number) => {
        router.put(`/vibetrack/admin/${id}`, {
            name: editName
        }, {
            onSuccess: () => {
                setEditingId(null);
                setEditName('');
            }
        });
    };

    const handleDelete = (alias: Alias) => {
        setSelectedAlias(alias);
        setDialogType('delete');
        setDialogOpen(true);
    };

    const handleRestore = (alias: DeletedAlias) => {
        setSelectedAlias(alias);
        setDialogType('restore');
        setDialogOpen(true);
    };

    const confirmAction = () => {
        if (!selectedAlias) return;

        if (dialogType === 'delete') {
            router.delete(`/vibetrack/admin/${selectedAlias.id}`);
        } else if (dialogType === 'restore') {
            router.patch(`/vibetrack/admin/${selectedAlias.id}/restore`);
        }

        setDialogOpen(false);
        setSelectedAlias(null);
    };

    const cancelAction = () => {
        setDialogOpen(false);
        setSelectedAlias(null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vibetrack Admin" />
            <div className="p-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Assign Device Name</CardTitle>
                        <CardDescription>
                            Assign a friendly name to a device ID. If the device ID already has a name, it will be updated.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="device_id">Device ID</Label>
                                <Select
                                    value={data.device_id}
                                    onValueChange={(value) => setData('device_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a Device ID" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {deviceIds.map(id => (
                                            <SelectItem key={id} value={id}>{id}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.device_id && <p className="text-sm text-destructive mt-1">{errors.device_id}</p>}
                            </div>
                            <div>
                                <Label htmlFor="name">Device Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g., Front Loader"
                                />
                                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                            </div>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Saving...' : 'Save Name'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Active Device Names</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Device ID</TableHead>
                                    <TableHead>Device API</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {aliases.length > 0 ? (
                                    aliases.map(alias => (
                                        <TableRow key={alias.id}>
                                            <TableCell className="font-medium">
                                                {editingId === alias.id ? (
                                                    <Input
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="max-w-xs"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleSaveEdit(alias.id);
                                                            } else if (e.key === 'Escape') {
                                                                handleCancelEdit();
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    alias.name
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono">{alias.device_id}</TableCell>
                                            <TableCell className="font-mono">
                                                <a className={"text-xs "} target="_blank" href={route('api.getVibetrackDeviceData', alias.device_id)}>Device API Link</a>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {editingId === alias.id ? (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleSaveEdit(alias.id)}
                                                            >
                                                                <CheckIcon className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={handleCancelEdit}
                                                            >
                                                                <XIcon className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEdit(alias)}
                                                            >
                                                                <EditIcon className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleDelete(alias)}
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">
                                            No device names have been assigned yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {deletedAliases.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Deleted Device Names</CardTitle>
                            <CardDescription>
                                These device names have been deleted but can be restored.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Device ID</TableHead>
                                        <TableHead>Deleted At</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deletedAliases.map(alias => (
                                        <TableRow key={`deleted-${alias.id}`} className="opacity-60">
                                            <TableCell className="font-medium">{alias.name}</TableCell>
                                            <TableCell className="font-mono">{alias.device_id}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(alias.deleted_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRestore(alias)}
                                                >
                                                    <RotateCcwIcon className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialogType === 'delete' ? 'Delete Device Name' : 'Restore Device Name'}
                        </DialogTitle>
                        <DialogDescription>
                            {dialogType === 'delete'
                                ? `Are you sure you want to delete the device name "${selectedAlias?.name}" for device ID "${selectedAlias?.device_id}"? This action can be undone by restoring it later.`
                                : `Are you sure you want to restore the device name "${selectedAlias?.name}" for device ID "${selectedAlias?.device_id}"?`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={cancelAction}>
                            Cancel
                        </Button>
                        <Button
                            variant={dialogType === 'delete' ? 'destructive' : 'default'}
                            onClick={confirmAction}
                        >
                            {dialogType === 'delete' ? 'Delete' : 'Restore'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
