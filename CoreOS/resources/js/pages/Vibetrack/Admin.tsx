import React from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router, useForm} from '@inertiajs/react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {TrashIcon} from 'lucide-react';

interface Alias {
    id: number;
    device_id: string;
    name: string;
}

interface Props {
    aliases: Alias[];
    deviceIds: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Vibetrack Devices', href: '/vibetrack' },
    { title: 'Admin', href: '/vibetrack/admin' },
];

export default function VibetrackAdmin({ aliases, deviceIds }: Props) {
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

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this alias?')) {
            router.delete(`/vibetrack/admin/${id}`);
        }
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
                        <CardTitle>Existing Device Names</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Device ID</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {aliases.length > 0 ? (
                                    aliases.map(alias => (
                                        <TableRow key={alias.id}>
                                            <TableCell className="font-medium">{alias.name}</TableCell>
                                            <TableCell className="font-mono">{alias.device_id}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="destructive" size="sm" onClick={() => handleDelete(alias.id)}>
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
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
            </div>
        </AppLayout>
    );
}
