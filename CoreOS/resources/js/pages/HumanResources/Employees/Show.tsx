import React from 'react';
import {Head, Link} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {ArrowLeft, Building, Calendar, Clock, Mail, MapPin, Phone, User} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    deleted_at?: string;
    departments: string;
    position: string;
    roles: Array<{
        id: number;
        name: string;
        permissions: string[];
    }>;
    all_permissions: string[];
    pto_stats: {
        total: number;
        pending: number;
        approved: number;
        denied: number;
        cancelled: number;
    };
    emergency_contacts: Array<{
        id: number;
        name: string;
        relationship: string;
        phone: string;
        email?: string;
        address?: string;
        is_primary: boolean;
    }>;
    addresses: Array<{
        id: number;
        type: string;
        label: string;
        address_line_1: string;
        address_line_2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
        is_primary: boolean;
        is_active: boolean;
        full_address: string;
        single_line_address: string;
    }>;
    pto_balances: Array<{
        id: number;
        type: string;
        balance: number;
        used_balance: number;
        pending_balance: number;
        year: number;
    }>;
    pto_requests: Array<{
        id: number;
        request_number: string;
        pto_type: string;
        start_date: string;
        end_date: string;
        total_days: number;
        status: string;
        reason?: string;
        created_at: string;
        updated_at: string;
    }>;
}

interface Props {
    user: User;
}

const EmployeesShow = ({ user }: Props) => {
    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'approved':
                return 'default';
            case 'pending':
                return 'secondary';
            case 'denied':
                return 'destructive';
            case 'cancelled':
                return 'outline';
            default:
                return 'outline';
        }
    };

    return (
        <AppLayout>
            <Head title={`Employee - ${user.name}`} />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <Link href="/human-resources/employees">
                            <Button variant="outline" className="mb-4">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Employees
                            </Button>
                        </Link>
                    </div>

                    <div className="space-y-6">
                        {/* Basic Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Employee Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-6">
                                    <div className="flex-shrink-0">
                                        {user.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="h-24 w-24 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                                                <User className="h-12 w-12 text-gray-500" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                                            {user.deleted_at && (
                                                <Badge variant="destructive">Inactive</Badge>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2 text-gray-600">
                                                <Mail className="h-4 w-4" />
                                                <span>{user.email}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-gray-600">
                                                <Building className="h-4 w-4" />
                                                <span>{user.departments}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-gray-600">
                                                <User className="h-4 w-4" />
                                                <span>{user.position}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <h3 className="text-sm font-medium text-gray-700 mb-2">Roles</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {user.roles.map((role) => (
                                                    <Badge key={role.id} variant="outline">
                                                        {role.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* PTO Statistics */}
                        <Card>
                            <CardHeader>
                                <CardTitle>PTO Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-900">{user.pto_stats.total}</div>
                                        <div className="text-sm text-gray-600">Total Requests</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-yellow-600">{user.pto_stats.pending}</div>
                                        <div className="text-sm text-gray-600">Pending</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">{user.pto_stats.approved}</div>
                                        <div className="text-sm text-gray-600">Approved</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-red-600">{user.pto_stats.denied}</div>
                                        <div className="text-sm text-gray-600">Denied</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-600">{user.pto_stats.cancelled}</div>
                                        <div className="text-sm text-gray-600">Cancelled</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* PTO Balances */}
                        {user.pto_balances.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>PTO Balances</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {user.pto_balances.map((balance) => (
                                            <div key={balance.id} className="flex justify-between items-center p-4 border rounded-lg">
                                                <div>
                                                    <div className="font-medium">{balance.type} ({balance.year})</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-600">
                                                        Available: <span className="font-medium">{balance.balance}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        Used: <span className="font-medium">{balance.used_balance}</span>
                                                    </div>
                                                    {balance.pending_balance > 0 && (
                                                        <div className="text-sm text-yellow-600">
                                                            Pending: <span className="font-medium">{balance.pending_balance}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Emergency Contacts */}
                        {user.emergency_contacts.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Emergency Contacts</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {user.emergency_contacts.map((contact) => (
                                            <div key={contact.id} className="p-4 border rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <h3 className="font-medium">{contact.name}</h3>
                                                            {contact.is_primary && (
                                                                <Badge variant="default">Primary</Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-600 mt-1">
                                                            {contact.relationship}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-3 space-y-1">
                                                    <div className="flex items-center space-x-2 text-sm">
                                                        <Phone className="h-4 w-4 text-gray-400" />
                                                        <span>{contact.phone}</span>
                                                    </div>
                                                    {contact.email && (
                                                        <div className="flex items-center space-x-2 text-sm">
                                                            <Mail className="h-4 w-4 text-gray-400" />
                                                            <span>{contact.email}</span>
                                                        </div>
                                                    )}
                                                    {contact.address && (
                                                        <div className="flex items-center space-x-2 text-sm">
                                                            <MapPin className="h-4 w-4 text-gray-400" />
                                                            <span>{contact.address}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Addresses */}
                        {user.addresses.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Addresses</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {user.addresses.map((address) => (
                                            <div key={address.id} className="p-4 border rounded-lg">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-medium">{address.label}</h3>
                                                        <div className="text-sm text-gray-600">{address.type}</div>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        {address.is_primary && (
                                                            <Badge variant="default">Primary</Badge>
                                                        )}
                                                        {address.is_active && (
                                                            <Badge variant="secondary">Active</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-700">
                                                    {address.single_line_address}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Recent PTO Requests */}
                        {user.pto_requests.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent PTO Requests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {user.pto_requests.slice(0, 5).map((request) => (
                                            <div key={request.id} className="p-4 border rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-3 mb-2">
                                                            <h3 className="font-medium">{request.pto_type}</h3>
                                                            <Badge variant={getStatusBadgeVariant(request.status)}>
                                                                {request.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-1 text-sm text-gray-600">
                                                            <div className="flex items-center space-x-2">
                                                                <Calendar className="h-4 w-4" />
                                                                <span>{request.start_date} to {request.end_date}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <Clock className="h-4 w-4" />
                                                                <span>{request.total_days} days</span>
                                                            </div>
                                                            {request.reason && (
                                                                <div className="text-sm text-gray-700 mt-2">
                                                                    <strong>Reason:</strong> {request.reason}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-xs text-gray-500">
                                                        <div>#{request.request_number}</div>
                                                        <div>{new Date(request.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default EmployeesShow;
