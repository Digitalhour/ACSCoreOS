import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Edit({ auth, holiday }) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Holidays',
            href: '/holidays',
        },
        {
            title: 'Edit Holiday',
            href: `/holidays/${holiday.id}/edit`,
        },
    ];

    const { data, setData, put, processing, errors } = useForm({
        name: holiday.name,
        date: holiday.date,
        description: holiday.description || '',
        type: holiday.type,
        is_recurring: holiday.is_recurring,
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('holidays.update', holiday.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Holiday" />

            <div className="py-12">
                <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-2xl">Edit Holiday</CardTitle>
                                <Link
                                    href={route('holidays.index')}
                                    className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Holidays
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Holiday Name</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g., Christmas Day"
                                        required
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">{errors.name}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={data.date}
                                        onChange={(e) => setData('date', e.target.value)}
                                        required
                                    />
                                    {errors.date && (
                                        <p className="text-sm text-destructive">{errors.date}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="type">Holiday Type</Label>
                                    <Select value={data.type} onValueChange={(value) => setData('type', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select holiday type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="company">Company Holiday</SelectItem>
                                            <SelectItem value="public">Public Holiday</SelectItem>
                                            <SelectItem value="custom">Custom Holiday</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.type && (
                                        <p className="text-sm text-destructive">{errors.type}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea
                                        id="description"
                                        rows={3}
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Add any additional details about this holiday..."
                                    />
                                    {errors.description && (
                                        <p className="text-sm text-destructive">{errors.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is_recurring"
                                        checked={data.is_recurring}
                                        onCheckedChange={(checked) => setData('is_recurring', checked)}
                                    />
                                    <Label
                                        htmlFor="is_recurring"
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        This is a recurring holiday (repeats annually)
                                    </Label>
                                </div>

                                <div className="flex items-center justify-end space-x-4 pt-4">
                                    <Button variant="outline" asChild>
                                        <Link href={route('holidays.index')}>Cancel</Link>
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Updating...' : 'Update Holiday'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
