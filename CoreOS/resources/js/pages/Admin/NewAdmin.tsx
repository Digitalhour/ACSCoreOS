import PositionsTable from '@/components/Admin/Positions/PositionsTable';
import UserHierarchyTable from '@/components/Admin/UserHierarchy/UserHierarchyTable';
import AppLayout from '@/layouts/app-layout';

import DepartmentTable from '@/components/departments/DepartmentTable';
import { type BreadcrumbItem, type Department, type User } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/dashboard',
    },
    {
        title: 'Admin Dashboard',
        href: '/New Admin Dashboard',
    },
];

interface DashboardProps {
    departments?: Department[];
    users?: User[];
}

export default function Dashboard({ departments = [], users = [] }: DashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <PositionsTable />
                    <UserHierarchyTable />
                    <DepartmentTable departments={departments} users={users} />
                </div>
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    {/*<PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />*/}
                </div>
            </div>
        </AppLayout>
    );
}
