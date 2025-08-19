import React from 'react';
import {Head, Link} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Building, Mail, User} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    deleted_at?: string;
    departments: string;
    position: string;
    pto_stats: {
        total: number;
        pending: number;
        approved: number;
        denied: number;
        cancelled: number;
    };
}

interface Props {
    users: User[];
}

const EmployeesIndex = ({ users }: Props) => {
    return (
        <AppLayout>
            <Head title="HR - Employees" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                        <div className="p-6 sm:px-20 bg-white border-b border-gray-200">
                            <div className="text-2xl font-semibold text-gray-900">
                                Employees
                            </div>
                            <div className="mt-2 text-gray-600">
                                Manage and view employee information
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {users.map((user) => (
                                <Card key={user.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex-shrink-0">
                                                        {user.avatar ? (
                                                            <img
                                                                src={user.avatar}
                                                                alt={user.name}
                                                                className="h-12 w-12 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                                                                <User className="h-6 w-6 text-gray-500" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center space-x-3">
                                                            <Link
                                                                href={`/human-resources/employees/${user.id}`}
                                                                className="text-lg font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                            >
                                                                {user.name}
                                                            </Link>
                                                            {user.deleted_at && (
                                                                <Badge variant="destructive">Inactive</Badge>
                                                            )}
                                                        </div>

                                                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                                                            <div className="flex items-center space-x-1">
                                                                <Mail className="h-4 w-4" />
                                                                <span>{user.email}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-1">
                                                                <Building className="h-4 w-4" />
                                                                <span>{user.departments}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-1">
                                                                <User className="h-4 w-4" />
                                                                <span>{user.position}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-shrink-0">
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-600">PTO Requests</div>
                                                    <div className="flex space-x-2 mt-1">
                                                        <Badge variant="outline">
                                                            Total: {user.pto_stats.total}
                                                        </Badge>
                                                        {user.pto_stats.pending > 0 && (
                                                            <Badge variant="secondary">
                                                                Pending: {user.pto_stats.pending}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {users.length === 0 && (
                                <Card>
                                    <CardContent className="p-12 text-center">
                                        <div className="text-gray-500">
                                            No employees found.
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default EmployeesIndex;
