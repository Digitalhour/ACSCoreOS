import UserHierarchyTable from '@/components/Admin/UserHierarchy/UserHierarchyTable';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: route('dashboard'),
    },
    {
        title: 'Admin',
        href: '/admin',
    },
    {
        title: 'User Hierarchy',
        href: route('admin.user-hierarchy.index'), // Ensure this route is defined in web.php
    },
];

export default function UserHierarchyIndexPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Hierarchy Management" />
            <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">User Hierarchy & Assignments</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Assign positions and managers to users, and view reporting structures.</p>
                </div>
                <UserHierarchyTable />
            </div>
        </AppLayout>
    );
}
