import AppLayout from '@/layouts/app-layout'; // Your main app layout
import { Head, Link as InertiaLink, useForm } from '@inertiajs/react';
import React from 'react';
// import AdminLayout from '@/layouts/admin-layout'; // Or your specific admin layout
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Shadcn Select
import { type BreadcrumbItem, type PageProps, type User as AuthenticatedUser } from '@/types';

// Define interfaces for data passed from Laravel (same as pre-registration example)
interface Position {
    id: number;
    name: string;
}

interface PotentialManager {
    id: number;
    name: string;
}

interface SpatieRole {
    id: number;
    name: string;
}

interface AdminAddUserPageProps extends PageProps {
    positions: Position[];
    potentialManagers: PotentialManager[];
    spatieRoles: SpatieRole[];
    auth: { user: AuthenticatedUser };
    flash?: { success?: string; error?: string };
    errors: Record<string, string>;
}

// Extend AppLayoutProps to include user property

export default function AddUserPage({ positions, potentialManagers, spatieRoles, auth, flash, errors: pageErrors }: AdminAddUserPageProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        position_id: '',
        reports_to_user_id: '',
        role_name: '',
    });

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Ensure your route name matches what's defined in Laravel routes
        post(route('adduser.store'), {
            // Adjust route name if necessary
            onSuccess: () => {
                reset(); // Reset form on success
            },
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Add a new Employee',
            href: '/users/add',
        },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* <AdminLayout> Or wrap with your Admin specific layout */}
            <Head title="Add New User" />

            <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Add New User</CardTitle>
                        <CardDescription>Fill in the details below to create a new user account directly.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {flash?.success && (
                            <div className="mb-4 rounded-md border border-green-400 bg-green-100 p-3 text-green-700 dark:border-green-600 dark:bg-green-700 dark:text-green-100">
                                {flash.success}
                            </div>
                        )}
                        {flash?.error && (
                            <div className="mb-4 rounded-md border border-red-400 bg-red-100 p-3 text-red-700 dark:border-red-600 dark:bg-red-700 dark:text-red-100">
                                {flash.error}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="mt-1 block w-full"
                                    required
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
                                {pageErrors?.name && !errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{pageErrors.name}</p>}
                            </div>

                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="mt-1 block w-full"
                                    required
                                />
                                {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
                                {pageErrors?.email && !errors.email && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{pageErrors.email}</p>
                                )}
                            </div>

                            {/*<div>*/}
                            {/*    <Label htmlFor="password">Password</Label>*/}
                            {/*    <Input*/}
                            {/*        id="password"*/}
                            {/*        type="password"*/}
                            {/*        value={data.password}*/}
                            {/*        onChange={(e) => setData('password', e.target.value)}*/}
                            {/*        className="mt-1 block w-full"*/}
                            {/*        required*/}
                            {/*    />*/}
                            {/*    {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>}*/}
                            {/*    {pageErrors?.password && !errors.password && (*/}
                            {/*        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{pageErrors.password}</p>*/}
                            {/*    )}*/}
                            {/*</div>*/}

                            {/*<div>*/}
                            {/*    <Label htmlFor="password_confirmation">Confirm Password</Label>*/}
                            {/*    <Input*/}
                            {/*        id="password_confirmation"*/}
                            {/*        type="password"*/}
                            {/*        value={data.password_confirmation}*/}
                            {/*        onChange={(e) => setData('password_confirmation', e.target.value)}*/}
                            {/*        className="mt-1 block w-full"*/}
                            {/*        required*/}
                            {/*    />*/}
                            {/*    /!* No specific error for password_confirmation from backend usually, error is on 'password' field *!/*/}
                            {/*</div>*/}

                            <div>
                                <Label htmlFor="position_id">Position Title</Label>
                                <Select value={data.position_id} onValueChange={(value) => setData('position_id', value)}>
                                    <SelectTrigger className="mt-1 w-full">
                                        <SelectValue placeholder="Select a position" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {positions.map((position) => (
                                            <SelectItem key={position.id} value={position.id.toString()}>
                                                {position.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.position_id && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.position_id}</p>}
                                {pageErrors?.position_id && !errors.position_id && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{pageErrors.position_id}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="reports_to_user_id">Reports To (Manager)</Label>
                                <Select value={data.reports_to_user_id} onValueChange={(value) => setData('reports_to_user_id', value)}>
                                    <SelectTrigger className="mt-1 w-full">
                                        <SelectValue placeholder="Select a manager (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {potentialManagers.map((manager) => (
                                            <SelectItem key={manager.id} value={manager.id.toString()}>
                                                {manager.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.reports_to_user_id && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reports_to_user_id}</p>
                                )}
                                {pageErrors?.reports_to_user_id && !errors.reports_to_user_id && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{pageErrors.reports_to_user_id}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="role_name">Assign Role (Spatie)</Label>
                                <Select value={data.role_name} onValueChange={(value) => setData('role_name', value)}>
                                    <SelectTrigger className="mt-1 w-full">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {spatieRoles.map((role) => (
                                            <SelectItem key={role.id} value={role.name}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.role_name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.role_name}</p>}
                                {pageErrors?.role_name && !errors.role_name && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{pageErrors.role_name}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-end space-x-3 pt-2">
                                <InertiaLink
                                    href="" // Adjust to your admin dashboard or user list route
                                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                >
                                    Cancel
                                </InertiaLink>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Adding User...' : 'Add User'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
            {/* </AdminLayout> */}
        </AppLayout>
    );
}
