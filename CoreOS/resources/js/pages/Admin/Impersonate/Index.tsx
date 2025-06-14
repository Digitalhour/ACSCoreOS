import { ImpersonationBannerHome } from '@/components/impersonation-banner';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

interface User {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
}

interface ImpersonateProps extends PageProps {
    users: User[];
    isImpersonating: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'User Impersonation',
        href: '/impersonate',
    },
];

export default function Index({ users, isImpersonating }: ImpersonateProps) {
    const { url } = usePage();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Impersonation" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">User Impersonation</h1>
                </div>
                <ImpersonationBannerHome />
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="mb-4 text-lg font-medium">Select a user to impersonate:</h3>

                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {users.map((user) => (
                                <div key={user.id} className="flex items-center space-x-4 rounded-lg border p-4">
                                    <div className="flex-shrink-0">
                                        {user.avatar ? (
                                            <img className="h-10 w-10 rounded-full" src={user.avatar} alt={user.name} />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                                                <span className="text-gray-600">{user.name.charAt(0)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                                        <p className="truncate text-sm text-gray-500">{user.email}</p>
                                    </div>
                                    <div>
                                        <Link
                                            href={`/impersonate/take/${user.id}`}
                                            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
                                        >
                                            Impersonate
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {users.length === 0 && <p className="text-gray-500">No users available for impersonation.</p>}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
