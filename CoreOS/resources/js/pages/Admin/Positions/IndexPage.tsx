import PositionsTable from '@/components/Admin/Positions/PositionsTable'; // Create this
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/layouts/app-layout'; // Assuming AppLayout is in Layouts
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: route('dashboard'), // Ensure 'dashboard' route exists
    },
    {
        title: 'Admin',
        href: '#', // Or a generic admin dashboard route if you have one
    },
    {
        title: 'Manage Positions',
        href: route('admin.positions.index'), // Ensure this route is defined in web.php
    },
];

export default function PositionsIndexPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Positions" />
            <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Job Positions</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Create, view, edit, and delete job positions within the company.</p>
                </div>
                <PositionsTable />
            </div>
            <Toaster richColors position="top-right" />
        </AppLayout>
    );
}
