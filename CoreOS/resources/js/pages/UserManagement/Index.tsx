import React from 'react';
import AppLayout from '@/layouts/app-layout';
import {Head} from '@inertiajs/react';
import UserManagementWidget from '@/components/UserManagementWidget';
import {type BreadcrumbItem} from '@/types';

// Removed the unused 'Props' interface

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'User Management',
        href: '/user-management',
    },
];

// Removed the unused 'users' prop from the component definition
export default function UserManagementIndex() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <div className="p-6">
                        {/* Removed the unused 'users' prop from the widget */}
                        <UserManagementWidget />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
