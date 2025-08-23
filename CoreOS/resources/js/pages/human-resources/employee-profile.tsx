import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {Button} from "@/components/ui/button";
import React, {useState} from 'react';
import {
    AlertTriangle,
    Building,
    ChevronDown,
    ChevronUp,
    Edit3,
    GitBranch,
    Home,
    Mail,
    MapPin,
    Phone,
    Save,
    Shield,
    Trash2,
    User,
    Users,
    X
} from 'lucide-react';
import {Separator} from "@/components/ui/separator";
import {formatDate, formatDateTime} from "@/lib/utils";

export interface Address {
    id: number;
    type: string;
    label: string | null;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    is_primary: boolean;
    is_active: boolean;
    notes: string | null;
    full_address: string;
    single_line_address: string;
}

export interface EmergencyContact {
    id: number;
    name: string;
    relationship: string;
    phone: string;
    email: string;
    address: string;
    is_primary: boolean;
}

export interface PtoBalance {
    id: number;
    type: string;
    balance: number;
    used_balance: number;
    pending_balance: number;
    year: number;
}

export interface Blackout {
    message: string;
    blackout_name: string;
    date_range: string;
    can_override: boolean;
    type: 'conflict' | 'warning';
}

export interface PtoRequest {
    id: number;
    request_number: string;
    pto_type: string;
    start_date: string;
    end_date: string;
    total_days: number;
    status: string;
    reason: string;
    approval_notes?: string;
    approved_by?: string;
    approved_by_id?: number;
    approved_at?: string;
    denial_reason?: string;
    denied_by?: string;
    denied_by_id?: number;
    denied_at?: string;
    cancellation_reason?: string;
    cancelled_by?: string;
    cancelled_by_id?: number;
    cancelled_at?: string;
    created_at: string;
    updated_at: string;
    submitted_at?: string;
    status_changed_at?: string;
    status_changed_by?: string;
    manager_notes?: string;
    hr_notes?: string;
    blackouts: Blackout[];
    has_blackout_conflicts: boolean;
    has_blackout_warnings: boolean;
    modification_history: ModificationHistoryItem[];
}

export interface ModificationHistoryItem {
    action: string;
    user: string;
    timestamp: string;
    details: string;
}

export interface Role {
    id: number;
    name: string;
    permissions: string[];
}

export interface Permission {
    id: number;
    name: string;
    description?: string;
}

export interface HierarchyUser {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    position: string;
    deleted_at: string | null;
}

export interface Hierarchy {
    manager: HierarchyUser | null;
    subordinates: HierarchyUser[];
    is_manager: boolean;
    reports_to_user_id: number | null;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    departments: string;
    position: string;
    deleted_at: string | null;
    roles: Role[];
    permissions: Permission[];
    all_permissions: string[];
    pto_stats: {
        total: number;
        pending: number;
        approved: number;
        denied: number;
        cancelled: number;
    };
    emergency_contacts: EmergencyContact[];
    addresses: Address[];
    pto_balances: PtoBalance[];
    pto_requests: PtoRequest[];
    hierarchy: Hierarchy;
}

export default function EmployeeProfile({ user }: { user: User }) {
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [isEditingRoles, setIsEditingRoles] = useState(false);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
    const [isSavingRoles, setIsSavingRoles] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User>(user);
    const [requestStatusFilter, setRequestStatusFilter] = useState<string>('all');
    const [requestSortField, setRequestSortField] = useState<string>('created_at');
    const [requestSortDirection, setRequestSortDirection] = useState<'asc' | 'desc'>('desc');

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Human Resources',
            href: '/hr/dashboard',
        },
        {
            title: 'Employees',
            href: '/hr/employees',
        },
        {
            title: user.name,
            href: `/hr/employees/${user.id}`,
        },
    ];

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'approved':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'denied':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getRoleColor = (roleName: string) => {
        switch (roleName.toLowerCase()) {
            case 'admin':
            case 'administrator':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'manager':
            case 'supervisor':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'hr':
            case 'human resources':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'employee':
            case 'user':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const fetchRolesAndPermissions = async () => {
        try {
            const [rolesResponse, permissionsResponse] = await Promise.all([
                fetch('/user-management/roles'),
                fetch('/user-management/permissions')
            ]);

            if (rolesResponse.ok && permissionsResponse.ok) {
                const rolesData = await rolesResponse.json();
                const permissionsData = await permissionsResponse.json();
                setAvailableRoles(rolesData.data || []);
                setAvailablePermissions(permissionsData.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch roles and permissions:', error);
        }
    };

    const handleEditRoles = () => {
        setIsEditingRoles(true);
        fetchRolesAndPermissions();
    };

    const handleCancelEditRoles = () => {
        setIsEditingRoles(false);
    };

    const handleAddRole = (roleId: number) => {
        const role = availableRoles.find(r => r.id === roleId);
        if (role && !selectedUser.roles.some(r => r.id === roleId)) {
            setSelectedUser({
                ...selectedUser,
                roles: [...selectedUser.roles, role]
            });
        }
    };

    const handleRemoveRole = (roleId: number) => {
        setSelectedUser({
            ...selectedUser,
            roles: selectedUser.roles.filter(r => r.id !== roleId)
        });
    };

    const handleAddPermission = (permissionId: number) => {
        const permission = availablePermissions.find(p => p.id === permissionId);
        if (permission && !selectedUser.permissions.some(p => p.id === permissionId)) {
            setSelectedUser({
                ...selectedUser,
                permissions: [...selectedUser.permissions, permission]
            });
        }
    };

    const handleRemovePermission = (permissionId: number) => {
        setSelectedUser({
            ...selectedUser,
            permissions: selectedUser.permissions.filter(p => p.id !== permissionId)
        });
    };

    const handleSaveRoles = async () => {
        setIsSavingRoles(true);
        try {
            await router.post(`/role-permission/sync-user-roles`, {
                user_id: selectedUser.id,
                roles: selectedUser.roles.map(r => r.id)
            }, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    console.log('Roles saved successfully');
                },
                onError: (errors) => {
                    console.error('Failed to save roles:', errors);
                }
            });

            await router.post(`/role-permission/sync-user-direct-permissions`, {
                user_id: selectedUser.id,
                permissions: selectedUser.permissions.map(p => p.id)
            }, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    console.log('Permissions saved successfully');
                },
                onError: (errors) => {
                    console.error('Failed to save permissions:', errors);
                }
            });

            setIsEditingRoles(false);
        } catch (error) {
            console.error('Failed to save roles and permissions:', error);
        } finally {
            setIsSavingRoles(false);
        }
    };

    const handleUserStatusToggle = (userId: number, currentlyActive: boolean) => {
        setIsTogglingStatus(true);

        if (currentlyActive) {
            router.delete(`/hr/employees/${userId}`, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedUser({
                        ...selectedUser,
                        deleted_at: new Date().toISOString()
                    });
                },
                onError: (errors) => {
                    console.error('Failed to deactivate user:', errors);
                },
                onFinish: () => {
                    setIsTogglingStatus(false);
                }
            });
        } else {
            router.patch(`/hr/employees/${userId}/restore`, {}, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedUser({
                        ...selectedUser,
                        deleted_at: null
                    });
                },
                onError: (errors) => {
                    console.error('Failed to reactivate user:', errors);
                },
                onFinish: () => {
                    setIsTogglingStatus(false);
                }
            });
        }
    };

    const handleRequestSort = (field: string) => {
        if (requestSortField === field) {
            setRequestSortDirection(requestSortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setRequestSortField(field);
            setRequestSortDirection('desc');
        }
    };

    const getFilteredAndSortedRequests = (requests: PtoRequest[]) => {
        let filteredRequests = requests;
        if (requestStatusFilter !== 'all') {
            filteredRequests = requests.filter(request => request.status === requestStatusFilter);
        }

        return filteredRequests.sort((a, b) => {
            let aValue: any, bValue: any;

            switch (requestSortField) {
                case 'request_number':
                    aValue = a.request_number.toLowerCase();
                    bValue = b.request_number.toLowerCase();
                    break;
                case 'pto_type':
                    aValue = a.pto_type.toLowerCase();
                    bValue = b.pto_type.toLowerCase();
                    break;
                case 'start_date':
                    aValue = new Date(a.start_date).getTime();
                    bValue = new Date(b.start_date).getTime();
                    break;
                case 'total_days':
                    aValue = a.total_days;
                    bValue = b.total_days;
                    break;
                case 'status':
                    aValue = a.status.toLowerCase();
                    bValue = b.status.toLowerCase();
                    break;
                case 'created_at':
                default:
                    aValue = new Date(a.created_at).getTime();
                    bValue = new Date(b.created_at).getTime();
                    break;
            }

            if (aValue < bValue) return requestSortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return requestSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const RequestSortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
        <th className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
            onClick={() => handleRequestSort(field)}>
            <div className="flex items-center space-x-1">
                <span>{children}</span>
                {requestSortField === field && (
                    requestSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                )}
            </div>
        </th>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${user.name} - Employee Profile`} />

                <div className="bg-gray-50 min-h-screen">
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <h1 className="text-xl font-semibold text-gray-900">Employee Profile</h1>

                                <div className="h-4 w-px bg-gray-300"></div>
                                <p className={"mr-4"}>{selectedUser.name}</p>

                            </div>
                            <div className="flex items-center space-x-3">
                                <Button variant="outline" size="sm">
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    Edit Profile
                                </Button>
                                <Switch
                                    checked={!selectedUser.deleted_at}
                                    onCheckedChange={() => handleUserStatusToggle(selectedUser.id, !selectedUser.deleted_at)}
                                    disabled={isTogglingStatus}
                                    className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex">
                        {/* Sidebar */}
                        <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
                            {/* Profile Section */}
                            <div className="p-6 border-b border-gray-200">
                                <div className="text-center">
                                    <div className="relative inline-block">
                                        <Avatar className="h-50 w-50 mx-auto">
                                            <AvatarImage  src={selectedUser.avatar || undefined} alt={selectedUser.name} />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-bold">
                                                {getInitials(selectedUser.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white ${
                                            selectedUser.deleted_at ? 'bg-red-500' : 'bg-green-500'
                                        }`}></div>
                                    </div>
                                    <h2 className="mt-4 text-xl font-semibold text-gray-900">{selectedUser.name}</h2>
                                    <p className="text-sm text-gray-600 mt-1">{selectedUser.position}</p>
                                    <Badge className={`mt-2 ${
                                        selectedUser.deleted_at
                                            ? 'bg-red-100 text-red-700 border-red-200'
                                            : 'bg-green-100 text-green-700 border-green-200'
                                    }`}>
                                        {selectedUser.deleted_at ? 'Inactive' : 'Active'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Contact Information</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center text-sm">
                                        <Mail className="h-4 w-4 mr-3 text-gray-400" />
                                        <span className="text-gray-900">{selectedUser.email}</span>
                                    </div>
                                    {selectedUser.emergency_contacts.length > 0 && (
                                        <div className="flex items-start text-sm">
                                            <Phone className="h-4 w-4 mr-3 text-gray-400 mt-0.5" />
                                            <span className="text-gray-900">{selectedUser.emergency_contacts[0].phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center text-sm">
                                        <Building className="h-4 w-4 mr-3 text-gray-400" />
                                        <span className="text-gray-900">{selectedUser.departments}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <User className="h-4 w-4 mr-3 text-gray-400" />
                                        <span className="text-gray-900">ID #{selectedUser.id.toString().padStart(6, '0')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="p-6">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">PTO Overview</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Available Balance</span>
                                        <span className="text-sm font-semibold text-blue-600">
                                            {selectedUser.pto_balances.length > 0 ? selectedUser.pto_balances[0].balance.toFixed(1) : '0'} days
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Total Requests</span>
                                        <span className="text-sm font-medium text-gray-900">{selectedUser.pto_stats.total}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Pending</span>
                                        <span className="text-sm font-medium text-yellow-600">{selectedUser.pto_stats.pending}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Approved</span>
                                        <span className="text-sm font-medium text-green-600">{selectedUser.pto_stats.approved}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1">
                            <div className="p-6">
                                <Tabs defaultValue="overview" className="space-y-6">
                                    {/* Navigation Tabs */}
                                    <div className="mb-8">
                                        <TabsList className="h-auto p-1 bg-gray-100 rounded-xl inline-flex">
                                            <TabsTrigger
                                                value="overview"
                                                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                                            >
                                                Overview
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="roles"
                                                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                                            >
                                                Roles & Permissions
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="emergency"
                                                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                                            >
                                                Emergency Contacts
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="addresses"
                                                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                                            >
                                                Addresses
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="pto-requests"
                                                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                                            >
                                                PTO History
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Basic Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Full Name</label>
                                            <p className="text-sm text-gray-900 mt-1">{selectedUser.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Email Address</label>
                                            <p className="text-sm text-gray-900 mt-1">{selectedUser.email}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Department</label>
                                            <p className="text-sm text-gray-900 mt-1">{selectedUser.departments}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Position</label>
                                            <p className="text-sm text-gray-900 mt-1">{selectedUser.position}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Primary Address</label>
                                            {(() => {
                                                const addresses = selectedUser.addresses || [];
                                                const primaryAddress = addresses.find(addr => addr.is_primary && addr.is_active);
                                                return primaryAddress ? (
                                                    <div className="text-sm text-gray-900 mt-1">
                                                        <div className="font-medium">{primaryAddress.label || primaryAddress.type}</div>
                                                        <div className="text-gray-600 text-xs mt-1 whitespace-pre-line">
                                                            {primaryAddress.full_address}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 mt-1">No primary address</p>
                                                );
                                            })()}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">PTO Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Total Requests</span>
                                            <span className="text-sm font-medium">{selectedUser.pto_stats.total}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Pending</span>
                                            <span className="text-sm font-medium text-yellow-600">{selectedUser.pto_stats.pending}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Approved</span>
                                            <span className="text-sm font-medium text-green-600">{selectedUser.pto_stats.approved}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Denied</span>
                                            <span className="text-sm font-medium text-red-600">{selectedUser.pto_stats.denied}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Cancelled</span>
                                            <span className="text-sm font-medium text-gray-600">{selectedUser.pto_stats.cancelled}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between">
                                            <span className="text-sm font-medium text-gray-700">Available Balance</span>
                                            <span className="text-sm font-bold text-blue-600">
                                                {selectedUser.pto_balances.length > 0 ? selectedUser.pto_balances[0].balance.toFixed(1) : '0'} days
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Organizational Hierarchy */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center">
                                        <GitBranch className="h-5 w-5 mr-2" />
                                        Organizational Hierarchy
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* Manager Section */}
                                    <div className="mb-8">
                                        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                                            <User className="h-4 w-4 mr-2" />
                                            Reports To
                                        </h3>
                                        {selectedUser.hierarchy.manager ? (
                                            <div className="border rounded-lg p-4 bg-blue-50/50">
                                                <div className="flex items-center space-x-4">
                                                    <div className="relative">
                                                        <Avatar className="h-12 w-12">
                                                            <AvatarImage src={selectedUser.hierarchy.manager.avatar || undefined} alt={selectedUser.hierarchy.manager.name} />
                                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                                                                {getInitials(selectedUser.hierarchy.manager.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                                            selectedUser.hierarchy.manager.deleted_at ? 'bg-red-500' : 'bg-green-500'
                                                        }`}></div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2">
                                                            <h4 className="font-semibold text-gray-900">{selectedUser.hierarchy.manager.name}</h4>
                                                            <Badge className={`text-xs ${
                                                                selectedUser.hierarchy.manager.deleted_at
                                                                    ? 'bg-red-100 text-red-700 border-red-200'
                                                                    : 'bg-green-100 text-green-700 border-green-200'
                                                            }`}>
                                                                {selectedUser.hierarchy.manager.deleted_at ? 'Inactive' : 'Active'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">{selectedUser.hierarchy.manager.position}</p>
                                                        <p className="text-sm text-gray-500">{selectedUser.hierarchy.manager.email}</p>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.visit(`/hr/employees/${selectedUser.hierarchy.manager?.id}`)}
                                                        className="shrink-0"
                                                    >
                                                        <User className="h-4 w-4 mr-2" />
                                                        View Profile
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                            : (
                                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500">
                                                <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                                <p>This employee doesn't report to anyone</p>
                                                <p className="text-sm text-gray-400 mt-1">Top-level position</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Direct Reports Section */}
                                    <div>
                                        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                                            <Users className="h-4 w-4 mr-2" />
                                            Direct Reports ({selectedUser.hierarchy.subordinates.length})
                                        </h3>

                                        {selectedUser.hierarchy.subordinates.length > 0 ? (
                                            <div className="grid grid-cols-4 md:grid-cols-4 gap-4">
                                                {selectedUser.hierarchy.subordinates.map((subordinate) => (
                                                    <div key={subordinate.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="relative">
                                                                <Avatar className="h-10 w-10">
                                                                    <AvatarImage src={subordinate.avatar || undefined} alt={subordinate.name} />
                                                                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white font-semibold text-sm">
                                                                        {getInitials(subordinate.name)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                                                    subordinate.deleted_at ? 'bg-red-500' : 'bg-green-500'
                                                                }`}></div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center space-x-2">
                                                                    <h4 className="font-medium text-gray-900 truncate">{subordinate.name}</h4>
                                                                    <Badge className={`text-xs ${
                                                                        subordinate.deleted_at
                                                                            ? 'bg-red-100 text-red-700 border-red-200'
                                                                            : 'bg-green-100 text-green-700 border-green-200'
                                                                    }`}>
                                                                        {subordinate.deleted_at ? 'Inactive' : 'Active'}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-sm text-gray-600 truncate">{subordinate.position}</p>
                                                                <p className="text-sm text-gray-500 truncate">{subordinate.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => router.visit(`/hr/employees/${subordinate.id}`)}
                                                                className="w-full justify-center text-sm hover:bg-blue-50 hover:text-blue-700"
                                                            >
                                                                <User className="h-4 w-4 mr-2" />
                                                                View Profile
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <></>
                                            // <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-500">
                                            //     <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                            //     <p className="text-lg font-medium">No Direct Reports</p>
                                            //     <p className="text-sm text-gray-400 mt-1">This employee doesn't manage anyone</p>
                                            // </div>
                                        )}
                                    </div>

                                    {/* Hierarchy Summary */}
                                    <div className="mt-8 pt-6 border-t border-gray-200">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {selectedUser.hierarchy.manager ? 1 : 0}
                                                </div>
                                                <div className="text-sm text-gray-600">Manager</div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {selectedUser.hierarchy.subordinates.length}
                                                </div>
                                                <div className="text-sm text-gray-600">Direct Reports</div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <div className="text-2xl font-bold text-purple-600">
                                                    {selectedUser.hierarchy.is_manager ? 'Yes' : 'No'}
                                                </div>
                                                <div className="text-sm text-gray-600">Is Manager</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Roles & Permissions Tab */}
                        <TabsContent value="roles" className="space-y-6">
                            {/* Roles Section */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">Assigned Roles</CardTitle>
                                        <div className="flex gap-2">
                                            {!isEditingRoles ? (
                                                <Button variant="outline" size="sm" onClick={handleEditRoles}>
                                                    <Edit3 className="h-4 w-4 mr-2" />
                                                    Edit Roles
                                                </Button>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleCancelEditRoles}
                                                        disabled={isSavingRoles}
                                                    >
                                                        <X className="h-4 w-4 mr-2" />
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleSaveRoles}
                                                        disabled={isSavingRoles}
                                                    >
                                                        <Save className="h-4 w-4 mr-2" />
                                                        {isSavingRoles ? 'Saving...' : 'Save Changes'}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isEditingRoles && (
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Add Role</h4>
                                            <Select onValueChange={(value) => handleAddRole(parseInt(value))}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a role to add" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableRoles
                                                        .filter(role => !selectedUser.roles.some(r => r.id === role.id))
                                                        .map((role) => (
                                                            <SelectItem key={role.id} value={role.id.toString()}>
                                                                {role.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {selectedUser.roles.length > 0 ? (
                                        <div className="space-y-4">
                                            {selectedUser.roles.map((role) => (
                                                <div key={role.id} className="border rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <Badge className={getRoleColor(role.name)}>
                                                            {role.name}
                                                        </Badge>
                                                        {isEditingRoles && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRemoveRole(role.id)}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Role Permissions</h4>
                                                        <div className="flex flex-wrap gap-1">
                                                            {role.permissions.map((permission, index) => (
                                                                <Badge key={index} variant="outline" className="text-xs">
                                                                    {permission}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No roles assigned</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Direct Permissions Section */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">Direct Permissions</CardTitle>
                                        <span className="text-sm text-gray-500">Permissions assigned directly to user</span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isEditingRoles && (
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Add Permission</h4>
                                            <Select onValueChange={(value) => handleAddPermission(parseInt(value))}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a permission to add" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availablePermissions
                                                        .filter(permission => !selectedUser.permissions.some(p => p.id === permission.id))
                                                        .map((permission) => (
                                                            <SelectItem key={permission.id} value={permission.id.toString()}>
                                                                {permission.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {selectedUser.permissions.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedUser.permissions.map((permission) => (
                                                <div key={permission.id} className="flex items-center gap-1">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {permission.name}
                                                    </Badge>
                                                    {isEditingRoles && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemovePermission(permission.id)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No direct permissions assigned</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* All Permissions Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">All Effective Permissions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-600 mb-3">All permissions this user has through roles and direct assignments</p>
                                    {selectedUser.all_permissions && selectedUser.all_permissions.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {selectedUser.all_permissions.map((permission, index) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                    {permission}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No permissions</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Emergency Contacts Tab */}
                        <TabsContent value="emergency" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Emergency Contacts</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedUser.emergency_contacts.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {selectedUser.emergency_contacts.map((contact) => (
                                                <div key={contact.id} className="border rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center">
                                                            <User className="h-5 w-5 mr-2 text-gray-400"/>
                                                            <h4 className="font-medium text-gray-900">
                                                                {contact.name}
                                                            </h4>
                                                        </div>
                                                        {contact.is_primary && (
                                                            <Badge variant="secondary">Primary</Badge>
                                                        )}
                                                    </div>
                                                    <div className="space-y-3 text-sm">
                                                        <div>
                                                            <label className="text-gray-500 font-medium">Relationship</label>
                                                            <p className="text-gray-900">{contact.relationship}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-gray-500 font-medium">Phone</label>
                                                            <p className="text-gray-900">{contact.phone}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-gray-500 font-medium">Email</label>
                                                            <p className="text-gray-900">{contact.email || "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-gray-500 font-medium">Address</label>
                                                            <p className="text-gray-900">{contact.address}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No emergency contacts on file</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Addresses Tab */}
                        <TabsContent value="addresses" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">All Addresses</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedUser.addresses && selectedUser.addresses.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedUser.addresses
                                                .sort((a, b) => {
                                                    if (a.is_primary && !b.is_primary) return -1;
                                                    if (!a.is_primary && b.is_primary) return 1;
                                                    if (a.is_active && !b.is_active) return -1;
                                                    if (!a.is_active && b.is_active) return 1;
                                                    return a.type.localeCompare(b.type);
                                                })
                                                .map((address) => (
                                                    <div key={address.id} className={`border rounded-lg p-4 ${!address.is_active ? 'opacity-60' : ''}`}>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="flex items-center">
                                                                    {(() => {
                                                                        switch (address.type.toLowerCase()) {
                                                                            case 'home':
                                                                                return <Home className="h-4 w-4 text-blue-600 mr-2" />;
                                                                            case 'work':
                                                                                return <Building className="h-4 w-4 text-gray-600 mr-2" />;
                                                                            case 'emergency':
                                                                                return <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />;
                                                                            default:
                                                                                return <MapPin className="h-4 w-4 text-gray-600 mr-2" />;
                                                                        }
                                                                    })()}
                                                                    <h4 className="font-medium text-gray-900">
                                                                        {address.label || address.type}
                                                                        {address.label && address.label !== address.type && (
                                                                            <span className="text-sm font-normal text-gray-500 ml-1">
                                                                                ({address.type})
                                                                            </span>
                                                                        )}
                                                                    </h4>
                                                                </div>
                                                            </div>
                                                            <div className="flex space-x-1">
                                                                {address.is_primary && (
                                                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                                                        <Shield className="h-3 w-3 mr-1" />
                                                                        Primary
                                                                    </Badge>
                                                                )}
                                                                {!address.is_active && (
                                                                    <Badge variant="secondary">
                                                                        Inactive
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-sm text-gray-900 whitespace-pre-line">
                                                            {address.full_address}
                                                        </div>
                                                        {address.notes && (
                                                            <div className="mt-2 text-sm text-gray-500 italic">
                                                                {address.notes}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No addresses on file</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>


                        {/* PTO Balances Tab */}
                        <TabsContent value="pto-balances" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">PTO Balances</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedUser.pto_balances.length > 0 ? (
                                        <div className="space-y-4">
                                            {selectedUser.pto_balances.map((balance) => (
                                                <div key={balance.id} className="border rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="font-medium text-gray-900">{balance.type}</h4>
                                                        <Badge variant="secondary">{balance.year}</Badge>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div className="text-center">
                                                            <p className="text-gray-500">Available</p>
                                                            <p className="text-lg font-semibold text-green-600">{balance.balance}</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-gray-500">Used</p>
                                                            <p className="text-lg font-semibold text-red-600">{balance.used_balance}</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-gray-500">Pending</p>
                                                            <p className="text-lg font-semibold text-yellow-600">{balance.pending_balance}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No PTO balances available</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* PTO Requests Tab */}
                        <TabsContent value="pto-requests" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg">PTO Requests</CardTitle>
                                        <div className="flex gap-2">
                                            <Select value={requestStatusFilter} onValueChange={setRequestStatusFilter}>
                                                <SelectTrigger className="w-32">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Status</SelectItem>
                                                    <SelectItem value="pending">Pending</SelectItem>
                                                    <SelectItem value="approved">Approved</SelectItem>
                                                    <SelectItem value="denied">Denied</SelectItem>
                                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {selectedUser.pto_requests.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full border border-gray-200 rounded-lg">
                                                <thead className="bg-gray-50">
                                                <tr>
                                                    <RequestSortHeader field="request_number">Request #</RequestSortHeader>
                                                    <RequestSortHeader field="pto_type">Type</RequestSortHeader>
                                                    <RequestSortHeader field="start_date">Start Date</RequestSortHeader>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-900">End Date</th>
                                                    <RequestSortHeader field="total_days">Days</RequestSortHeader>
                                                    <RequestSortHeader field="status">Status</RequestSortHeader>
                                                    <RequestSortHeader field="created_at">Created</RequestSortHeader>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {getFilteredAndSortedRequests(selectedUser.pto_requests).map((request) => (
                                                    <tr
                                                        key={request.id}
                                                        className="border-t hover:bg-gray-50"
                                                    >
                                                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                                            {request.request_number}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-900">
                                                            {request.pto_type}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-900">
                                                            {formatDate(request.start_date)}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-900">
                                                            {formatDate(request.end_date)}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-900">
                                                            {request.total_days}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <Badge className={getStatusColor(request.status)}>
                                                                {request.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-900">
                                                            {formatDateTime(request.created_at)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No PTO requests found</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                            </div>
                        </div>
                    </div>
                </div>

        </AppLayout>
    );
}
