import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import HistoricalPtoModal from '@/components/HistoricalPtoModal';

interface PtoStats {
    total_requests: number;
    pending_requests: number;
    approved_requests: number;
    denied_requests: number;
    total_types: number;
    total_policies: number;
    total_blackouts: number;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface PtoType {
    id: number;
    name: string;
    code: string;
    color: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'HR Dashboard',
        href: '/admin',
    },
    {
        title: 'PTO Dashboard',
        href: '/pto',
    },
];

export default function AdminPtoDashboardView({
    stats,
    users,
    ptoTypes,
}: PageProps & {
    stats?: PtoStats;
    users: User[];
    ptoTypes: PtoType[];
}) {
    const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState<boolean>(false);

    const handleHistoricalPtoSuccess = () => {
        toast.success('Historical PTO submitted successfully');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PTO Administration Dashboard" />
            <Toaster richColors position="top-right" />

            <div className="py-4">
                <div className="max-w-12xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800">
                        <div className="p-6 text-gray-900">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-lg font-medium">PTO System Overview</h3>
                                <Button onClick={() => setIsHistoricalModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Submit Historical PTO
                                </Button>
                            </div>

                            {/* Stats Cards */}
                            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                                        <div className="rounded-md bg-gray-500 p-2">
                                            <svg
                                                className="h-4 w-4 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                />
                                            </svg>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats?.total_requests || 0}</div>
                                        <p className="text-muted-foreground text-xs">All time PTO requests</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                                        <div className="rounded-md bg-yellow-500 p-2">
                                            <svg
                                                className="h-4 w-4 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats?.pending_requests || 0}</div>
                                        <p className="text-muted-foreground text-xs">Awaiting approval</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
                                        <div className="rounded-md bg-green-500 p-2">
                                            <svg
                                                className="h-4 w-4 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats?.approved_requests || 0}</div>
                                        <p className="text-muted-foreground text-xs">Approved time off</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Denied Requests</CardTitle>
                                        <div className="rounded-md bg-red-500 p-2">
                                            <svg
                                                className="h-4 w-4 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats?.denied_requests || 0}</div>
                                        <p className="text-muted-foreground text-xs">Rejected time off</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Quick Links */}
                            <div className="mb-8">
                                <h3 className="mb-4 text-lg font-medium">Quick Links</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                    <Card className="transition-colors hover:bg-indigo-50">
                                        <Link href={route('admin.pto.types')}>
                                            <CardHeader>
                                                <CardTitle className="text-gray-700">PTO Types</CardTitle>
                                                <CardDescription className="text-gray-600">Manage PTO types and their settings</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-xs text-indigo-500">Total: {stats?.total_types || 0}</p>
                                            </CardContent>
                                        </Link>
                                    </Card>

                                    <Card className="transition-colors hover:bg-purple-50">
                                        <Link href={route('admin.pto.policies')}>
                                            <CardHeader>
                                                <CardTitle className="text-purple-700">PTO Policies</CardTitle>
                                                <CardDescription className="text-purple-600">Manage PTO policies and assignments</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-xs text-purple-500">Total: {stats?.total_policies || 0}</p>
                                            </CardContent>
                                        </Link>
                                    </Card>

                                    <Card className="transition-colors hover:bg-blue-50">
                                        <Link href={route('admin.pto.blackouts')}>
                                            <CardHeader>
                                                <CardTitle className="text-blue-700">Blackout Periods</CardTitle>
                                                <CardDescription className="text-blue-600">Manage holidays and blackout periods</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-xs text-blue-500">Total: {stats?.total_blackouts || 0}</p>
                                            </CardContent>
                                        </Link>
                                    </Card>

                                    <Card className="transition-colors hover:bg-green-50">
                                        <Link href={route('admin.pto.requests')}>
                                            <CardHeader>
                                                <CardTitle className="text-green-700">PTO Requests</CardTitle>
                                                <CardDescription className="text-green-600">View and manage all PTO requests</CardDescription>
                                            </CardHeader>
                                        </Link>
                                    </Card>

                                    <Card className="transition-colors hover:bg-yellow-50">
                                        <Link href={route('admin.pto.balances')}>
                                            <CardHeader>
                                                <CardTitle className="text-yellow-700">PTO Balances</CardTitle>
                                                <CardDescription className="text-yellow-600">Manage employee PTO balances</CardDescription>
                                            </CardHeader>
                                        </Link>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Historical PTO Modal */}
            <HistoricalPtoModal
                isOpen={isHistoricalModalOpen}
                onClose={() => setIsHistoricalModalOpen(false)}
                users={users}
                ptoTypes={ptoTypes}
                onSuccess={handleHistoricalPtoSuccess}
            />
        </AppLayout>
    );
}
