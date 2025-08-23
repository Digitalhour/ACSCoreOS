import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import HrLayout from "@/layouts/settings/hr-layout";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {Card, CardContent} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import React, {useState} from 'react';
import {
    AlertTriangle,
    Briefcase,
    Building,
    CalendarMinus2,
    ChevronDown,
    ChevronUp,
    Edit3,
    Eye,
    Filter,
    Home,
    Mail,
    MapPin,
    Save,
    Search,
    Shield,
    Trash2,
    User,
    UserRoundCheck,
    Users,
    UserX,
    X
} from 'lucide-react';
import {Separator} from "@/components/ui/separator";
import {formatDate, formatDateTime} from "@/lib/utils";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Human Resources',
        href: '/hr',
    },
    {
        title: 'Employees',
        href: '/hr/employees',
    },
];

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

    // Enhanced approval details
    approval_notes?: string;
    approved_by?: string;
    approved_by_id?: number;
    approved_at?: string;

    // Enhanced denial details
    denial_reason?: string;
    denied_by?: string;
    denied_by_id?: number;
    denied_at?: string;

    // Enhanced cancellation details
    cancellation_reason?: string;
    cancelled_by?: string;
    cancelled_by_id?: number;
    cancelled_at?: string;

    // Request lifecycle details
    created_at: string;
    updated_at: string;
    submitted_at?: string;

    // Additional status information
    status_changed_at?: string;
    status_changed_by?: string;

    // Manager/supervisor information
    manager_notes?: string;
    hr_notes?: string;

    // Blackout information
    blackouts: Blackout[];
    has_blackout_conflicts: boolean;
    has_blackout_warnings: boolean;

    // Request modification history
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

// Single User interface definition with all required properties
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
    addresses: Address[]; // Make sure this is included
    pto_balances: PtoBalance[];
    pto_requests: PtoRequest[];
}

export interface Permission {
    id: number;
    name: string;
    description?: string;
}

type SortField = 'name' | 'departments' | 'position' | 'pto_total';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'deactivated';

export default function Employees({ users }: { users: User[] }) {
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedPtoRequest, setSelectedPtoRequest] = useState<PtoRequest | null>(null);
    const [isPtoSheetOpen, setIsPtoSheetOpen] = useState(false);
    const [requestStatusFilter, setRequestStatusFilter] = useState<string>('all');
    const [requestSortField, setRequestSortField] = useState<string>('created_at');
    const [requestSortDirection, setRequestSortDirection] = useState<'asc' | 'desc'>('desc');
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [isEditingRoles, setIsEditingRoles] = useState(false);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
    const [isSavingRoles, setIsSavingRoles] = useState(false);

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

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const openEmployeeProfile = (user: User) => {
        router.visit(`/hr/employees/${user.id}`);
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
        if (!selectedUser) return;

        const role = availableRoles.find(r => r.id === roleId);
        if (role && !selectedUser.roles.some(r => r.id === roleId)) {
            setSelectedUser({
                ...selectedUser,
                roles: [...selectedUser.roles, role]
            });
        }
    };

    const handleRemoveRole = (roleId: number) => {
        if (!selectedUser) return;

        setSelectedUser({
            ...selectedUser,
            roles: selectedUser.roles.filter(r => r.id !== roleId)
        });
    };

    const handleAddPermission = (permissionId: number) => {
        if (!selectedUser) return;

        const permission = availablePermissions.find(p => p.id === permissionId);
        if (permission && !selectedUser.permissions.some(p => p.id === permissionId)) {
            setSelectedUser({
                ...selectedUser,
                permissions: [...selectedUser.permissions, permission]
            });
        }
    };

    const handleRemovePermission = (permissionId: number) => {
        if (!selectedUser) return;

        setSelectedUser({
            ...selectedUser,
            permissions: selectedUser.permissions.filter(p => p.id !== permissionId)
        });
    };

    const handleSaveRoles = async () => {
        if (!selectedUser) return;

        setIsSavingRoles(true);
        try {
            // Save roles
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

            // Save direct permissions
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

    const openPtoRequestSheet = (request: PtoRequest, event: React.MouseEvent) => {
        event.stopPropagation();
        setSelectedPtoRequest(request);
        setIsPtoSheetOpen(true);
    };

    const handleUserStatusToggle = (userId: number, currentlyActive: boolean) => {
        setIsTogglingStatus(true);

        if (currentlyActive) {
            router.delete(`/hr/employees/${userId}`, {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    if (selectedUser && selectedUser.id === userId) {
                        setSelectedUser({
                            ...selectedUser,
                            deleted_at: new Date().toISOString()
                        });
                    }
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
                    if (selectedUser && selectedUser.id === userId) {
                        setSelectedUser({
                            ...selectedUser,
                            deleted_at: null
                        });
                    }
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

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
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

    const getFilteredUsers = () => {
        let filtered = users;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(user =>
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.departments.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.position.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by status
        if (statusFilter === 'active') {
            filtered = filtered.filter(user => !user.deleted_at);
        } else if (statusFilter === 'deactivated') {
            filtered = filtered.filter(user => user.deleted_at);
        }

        return filtered;
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

    const filteredUsers = getFilteredUsers();
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'departments':
                aValue = a.departments.toLowerCase();
                bValue = b.departments.toLowerCase();
                break;
            case 'position':
                aValue = a.position.toLowerCase();
                bValue = b.position.toLowerCase();
                break;
            case 'pto_total':
                aValue = a.pto_stats.total;
                bValue = b.pto_stats.total;
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <th className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
            onClick={() => handleSort(field)}>
            <div className="flex items-center space-x-1">
                <span>{children}</span>
                {sortField === field && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                )}
            </div>
        </th>
    );


    const activeFiltersCount = (searchTerm ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employees" />
            <HrLayout>
                <div className="space-y-6">
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold">Employee Directory</h1>
                                <p className="text-blue-100 mt-1">Manage and view employee profiles</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold">{users.length}</div>
                                <div className="text-sm text-blue-100">Total Employees</div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <div className="flex items-center">
                                    <UserRoundCheck className="h-5 w-5 mr-2" />
                                    <div>
                                        <div className="text-lg font-semibold">{users.filter(u => !u.deleted_at).length}</div>
                                        <div className="text-xs text-blue-100">Active</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <div className="flex items-center">
                                    <UserX className="h-5 w-5 mr-2" />
                                    <div>
                                        <div className="text-lg font-semibold">{users.filter(u => u.deleted_at).length}</div>
                                        <div className="text-xs text-blue-100">Inactive</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <div className="flex items-center">
                                    <CalendarMinus2 className="h-5 w-5 mr-2" />
                                    <div>
                                        <div className="text-lg font-semibold">{users.reduce((sum, u) => sum + u.pto_stats.pending, 0)}</div>
                                        <div className="text-xs text-blue-100">Pending PTO</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <div className="flex items-center">
                                    <Building className="h-5 w-5 mr-2" />
                                    <div>
                                        <div className="text-lg font-semibold">{new Set(users.map(u => u.departments)).size}</div>
                                        <div className="text-xs text-blue-100">Departments</div>
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div className="flex flex-col lg:flex-row gap-4 p-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input
                                    placeholder="Search employees by name, email, department, or position..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-11 h-11 text-base"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                                    <SelectTrigger className="w-44 h-11">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4" />
                                            <SelectValue />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Employees</SelectItem>
                                        <SelectItem value="active">Active Only</SelectItem>
                                        <SelectItem value="deactivated">Inactive Only</SelectItem>
                                    </SelectContent>
                                </Select>
                                {activeFiltersCount > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={clearFilters}
                                        className="flex items-center gap-2 h-11"
                                    >
                                        <X className="h-4 w-4" />
                                        Clear Filters ({activeFiltersCount})
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

    

                    {/* Employee Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {sortedUsers.map((user) => (
                            <Card
                                key={user.id}
                                className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-md hover:-translate-y-1"
                                onClick={() => openEmployeeProfile(user)}
                            >
                                <CardContent className="p-6">
                                    {/* Employee Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="relative">
                                                <Avatar className="h-12 w-12 ring-2 ring-gray-100">
                                                    <AvatarImage src={user.avatar || undefined} alt={user.name} />
                                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-sm">
                                                        {getInitials(user.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                                    user.deleted_at ? 'bg-red-500' : 'bg-green-500'
                                                }`}></div>
                                            </div>
                                        </div>
                                        <Badge className={`${
                                            user.deleted_at
                                                ? 'bg-red-100 text-red-700 border-red-200'
                                                : 'bg-green-100 text-green-700 border-green-200'
                                        } font-medium`}>
                                            {user.deleted_at ? 'Inactive' : 'Active'}
                                        </Badge>
                                    </div>

                                    {/* Employee Info */}
                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 text-lg leading-tight">{user.name}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center text-sm">
                                                <Briefcase className="h-4 w-4 text-gray-400 mr-2" />
                                                <span className="text-gray-700 font-medium">{user.position}</span>
                                            </div>
                                            <div className="flex items-center text-sm">
                                                <Building className="h-4 w-4 text-gray-400 mr-2" />
                                                <span className="text-gray-600">{user.departments}</span>
                                            </div>
                                        </div>

                                        {/* Roles */}
                                        <div>
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.length > 0 ? (
                                                    user.roles.slice(0, 2).map((role) => (
                                                        <Badge key={role.id} variant="secondary" className="text-xs px-2 py-1">
                                                            {role.name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <Badge variant="outline" className="text-xs text-gray-500">
                                                        No Role
                                                    </Badge>
                                                )}
                                                {user.roles.length > 2 && (
                                                    <Badge variant="outline" className="text-xs text-gray-500">
                                                        +{user.roles.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* PTO Stats */}
                                        <div className="border-t pt-3 mt-4">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600">PTO Balance</span>
                                                <span className="font-semibold text-blue-600">
                                                    {user.pto_balances.length > 0 ? user.pto_balances[0].balance.toFixed(1) : '0'} days
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm mt-1">
                                                <span className="text-gray-600">Total Requests</span>
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-medium">{user.pto_stats.total}</span>
                                                    {user.pto_stats.pending > 0 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {user.pto_stats.pending} pending
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* View Profile Button */}
                                    <div className="mt-4 pt-4 border-t">
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEmployeeProfile(user);
                                            }}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Profile
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Empty State */}
                    {sortedUsers.length === 0 && (
                        <Card className="shadow-sm">
                            <CardContent className="p-12 text-center">
                                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {activeFiltersCount > 0 ? 'No employees match your search' : 'No employees found'}
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    {activeFiltersCount > 0
                                        ? 'Try adjusting your search criteria or filters.'
                                        : 'Start by adding employees to your organization.'
                                    }
                                </p>
                                {activeFiltersCount > 0 && (
                                    <Button variant="outline" onClick={clearFilters}>
                                        Clear all filters
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Employees Details Sheet */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent side="right" className="min-w-7/12 p-0 overflow-hidden">
                        {selectedUser && (
                            <>
                                <SheetHeader className="p-6 border-b bg-gradient-to-r from-gray-50 to-indigo-50">
                                    <div className="flex items-start space-x-4">
                                        <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                                            <AvatarImage src={selectedUser.avatar || undefined} alt={selectedUser.name} />
                                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
                                                {getInitials(selectedUser.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <SheetTitle className="text-2xl">{selectedUser.name}</SheetTitle>
                                            <SheetDescription className="text-base">
                                                ID #{selectedUser.id.toString().padStart(6, '0')}
                                            </SheetDescription>
                                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <Mail className="h-4 w-4 mr-1" />
                                                    {selectedUser.email}
                                                </div>
                                                <div className="flex items-center">
                                                    <Briefcase className="h-4 w-4 mr-1" />
                                                    {selectedUser.position}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center">
                                                    <Users className="h-4 w-4 mr-1" />
                                                    <span className="text-sm text-gray-600">{selectedUser.departments}</span>
                                                    <Badge className={`ml-3 ${selectedUser.deleted_at ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                                                        {selectedUser.deleted_at ? (
                                                            <>
                                                                <UserX className="h-3 w-3 mr-1"/>
                                                                Deactivated
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserRoundCheck className="h-3 w-3 mr-1"/>
                                                                Active
                                                            </>
                                                        )}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {selectedUser.deleted_at ? 'Deactivated' : 'Active'}
                                                        </span>
                                                        <Switch
                                                            checked={!selectedUser.deleted_at}
                                                            onCheckedChange={() => handleUserStatusToggle(selectedUser.id, !selectedUser.deleted_at)}
                                                            disabled={isTogglingStatus}
                                                            className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <Badge variant={"secondary"} className="border-gray-200 px-3 py-1">
                                            Total Requests: {selectedUser.pto_stats.total}
                                        </Badge>
                                        <Badge variant={"secondary"} className="border-gray-200 px-3 py-1">
                                            Pending: {selectedUser.pto_stats.pending}
                                        </Badge>
                                        <Badge variant={"secondary"} className="border-gray-200 px-3 py-1">
                                            Approved: {selectedUser.pto_stats.approved}
                                        </Badge>
                                        <Badge variant={"secondary"} className="border-gray-200 px-3 py-1">
                                            Cancelled: {selectedUser.pto_stats.cancelled}
                                        </Badge>
                                        <Badge className="bg-red-100 text-red-800 border-red-200 px-3 py-1">
                                            Denied: {selectedUser.pto_stats.denied}
                                        </Badge>
                                        <Badge variant={"secondary"} className=" border-gray-200 px-3 py-1">
                                            Days Available: {selectedUser.pto_balances.length > 0 ? selectedUser.pto_balances[0].balance.toFixed(1) : '0'}
                                        </Badge>
                                    </div>
                                </SheetHeader>

                                <div className="flex-1 overflow-hidden">
                                    <Tabs defaultValue="overview" className="h-full flex flex-col">
                                        <div className="px-6">
                                            <TabsList className="h-12 p-0 bg-transparent">
                                                <TabsTrigger value="overview" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 hover:bg-gray-50 border border-transparent data-[state=active]:border-gray-200 rounded-md">
                                                    Overview
                                                </TabsTrigger>
                                                <TabsTrigger value="roles" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 hover:bg-gray-50 border border-transparent data-[state=active]:border-gray-200 rounded-md">
                                                    Roles & Permissions
                                                </TabsTrigger>
                                                <TabsTrigger value="emergency" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 hover:bg-gray-50 border border-transparent data-[state=active]:border-gray-200 rounded-md">
                                                    Emergency Contacts
                                                </TabsTrigger>
                                                <TabsTrigger value="addresses" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 hover:bg-gray-50 border border-transparent data-[state=active]:border-gray-200 rounded-md">
                                                    Addresses
                                                </TabsTrigger>
                                                <TabsTrigger value="pto-balances" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 hover:bg-gray-50 border border-transparent data-[state=active]:border-gray-200 rounded-md">
                                                    PTO Balances
                                                </TabsTrigger>
                                                <TabsTrigger value="pto-requests" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 hover:bg-gray-50 border border-transparent data-[state=active]:border-gray-200 rounded-md">
                                                    PTO Requests
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>
                                        <Separator />

                                        <div className="flex-1 overflow-auto">
                                            {/* Overview Tab with proper null checking */}
                                            <TabsContent value="overview" className="p-6 space-y-6 m-0">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <Card>
                                                        <CardContent className="p-6">
                                                            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                                                                    <p className="text-sm text-gray-900">{selectedUser.name}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Email Address</label>
                                                                    <p className="text-sm text-gray-900">{selectedUser.email}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Department</label>
                                                                    <p className="text-sm text-gray-900">{selectedUser.departments}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Position</label>
                                                                    <p className="text-sm text-gray-900">{selectedUser.position}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Status</label>
                                                                    <Badge className={`${selectedUser.deleted_at ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                                                                        {selectedUser.deleted_at ? 'Deactivated' : 'Active'}
                                                                    </Badge>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Primary Address</label>
                                                                    {(() => {
                                                                        // Safe null checking for addresses
                                                                        const addresses = selectedUser.addresses || [];
                                                                        const primaryAddress = addresses.find(addr => addr.is_primary && addr.is_active);
                                                                        return primaryAddress ? (
                                                                            <div className="text-sm text-gray-900">
                                                                                <div className="font-medium">{primaryAddress.label || primaryAddress.type}</div>
                                                                                <div className="text-gray-600 text-xs mt-1 whitespace-pre-line">
                                                                                    {primaryAddress.full_address}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-sm text-gray-500">No primary address</p>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>

                                                    <Card>
                                                        <CardContent className="p-6">
                                                            <h3 className="text-lg font-semibold mb-4">PTO Summary</h3>
                                                            <div className="space-y-3">
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
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </TabsContent>

                                            {/* Roles & Permissions Tab */}
                                            <TabsContent value="roles" className="p-6 space-y-6 m-0">
                                                <div className="space-y-6">
                                                    {/* Roles Section */}
                                                    <Card>
                                                        <CardContent className="p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-lg font-semibold">Assigned Roles</h3>
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
                                                        <CardContent className="p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h3 className="text-lg font-semibold">Direct Permissions</h3>
                                                                <span className="text-sm text-gray-500">Permissions assigned directly to user</span>
                                                            </div>

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
                                                        <CardContent className="p-6">
                                                            <h3 className="text-lg font-semibold mb-4">All Effective Permissions</h3>
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
                                                </div>
                                            </TabsContent>

                                            {/* Emergency Contacts Tab */}
                                            <TabsContent value="emergency" className="p-6 space-y-6 m-0">
                                                <Card>
                                                    <CardContent className="p-6">
                                                        <h3 className="text-lg font-semibold mb-4">Emergency Contacts</h3>
                                                        {selectedUser.emergency_contacts.length > 0 ? (
                                                            <div className="space-y-4 grid grid-cols-2">
                                                                {selectedUser.emergency_contacts.map((contact) => (
                                                                    <div key={contact.id} className="border rounded-lg p-4">
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <div className="flex ">
                                                                                <User className="h-5 w-5 mr-1"/>
                                                                                <h4 className="font-medium  dark:text-gray-200 text-gray-900">
                                                                                    {contact.name}
                                                                                </h4>
                                                                            </div>
                                                                            {contact.is_primary && (
                                                                                <Badge variant="secondary">Primary</Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                                            <div>
                                                                                <label className="text-gray-500">Relationship</label>
                                                                                <p className="text-gray-900">{contact.relationship}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-gray-500">Phone</label>
                                                                                <p className="text-gray-900">{contact.phone}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-gray-500">Email</label>
                                                                                <p className="text-gray-900">{contact.email || "N/A"}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-gray-500">Address</label>
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

                                            {/* Addresses Tab with proper null checking */}
                                            <TabsContent value="addresses" className="p-6 space-y-6 m-0 ">
                                                <Card>
                                                    <CardContent className="p-6">
                                                        <h3 className="text-lg font-semibold mb-4">All Addresses</h3>
                                                        {selectedUser.addresses && selectedUser.addresses.length > 0 ? (
                                                            <div className="grid grid-cols-2 gap-4">
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
                                            <TabsContent value="pto-balances" className="p-6 space-y-6 m-0">
                                                <Card>
                                                    <CardContent className="p-6">
                                                        <h3 className="text-lg font-semibold mb-4">PTO Balances</h3>
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
                                            <TabsContent value="pto-requests" className="p-6 space-y-4 m-0">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="text-lg font-semibold">PTO Requests</h3>
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

                                                {selectedUser.pto_requests.length > 0 ? (
                                                    <div className="space-y-3">
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
                                                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                                                                </tr>
                                                                </thead>
                                                                <tbody>
                                                                {getFilteredAndSortedRequests(selectedUser.pto_requests).map((request) => (
                                                                    <tr
                                                                        key={request.id}
                                                                        className="border-t hover:bg-gray-50 cursor-pointer"
                                                                        onClick={(e) => openPtoRequestSheet(request, e)}
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
                                                                        <td className="py-3 px-4">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={(e) => openPtoRequestSheet(request, e)}
                                                                            >
                                                                                <Eye className="h-4 w-4" />
                                                                            </Button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500">No PTO requests found</p>
                                                )}
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                </div>
                            </>
                        )}
                    </SheetContent>
                </Sheet>

                {/* PTO Request Details Sheet */}
                <Sheet open={isPtoSheetOpen} onOpenChange={setIsPtoSheetOpen}>
                    <SheetContent side="right" className="min-w-6/12 p-0 overflow-hidden">
                        {selectedPtoRequest && (
                            <>
                                <SheetHeader className="p-6 border-b bg-gradient-to-r from-gray-50 to-blue-50">
                                    <div className="flex items-start justify-between mr-10 ">
                                        <div className="flex-1">
                                            <SheetTitle className="text-2xl">PTO Request Details</SheetTitle>
                                            <SheetDescription className="text-base">
                                                Request #{selectedPtoRequest.request_number}
                                            </SheetDescription>
                                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <Briefcase className="h-4 w-4 mr-1" />
                                                    {selectedPtoRequest.pto_type}
                                                </div>
                                                <div className="flex items-center">
                                                    <CalendarMinus2 className="h-4 w-4 mr-1" />
                                                    {selectedPtoRequest.total_days} days
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className={getStatusColor(selectedPtoRequest.status)}>
                                            {selectedPtoRequest.status.toUpperCase()}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <Badge variant="secondary" className="border-gray-200 px-3 py-1">
                                            From: {formatDate(selectedPtoRequest.start_date)}
                                        </Badge>
                                        <Badge variant="secondary" className="border-gray-200 px-3 py-1">
                                            To: {formatDate(selectedPtoRequest.end_date)}
                                        </Badge>
                                        <Badge variant="secondary" className="border-gray-200 px-3 py-1">
                                            Created: {formatDate(selectedPtoRequest.created_at)}
                                        </Badge>
                                    </div>
                                </SheetHeader>

                                <div className="flex-1 overflow-auto p-6">
                                    <div className="space-y-6">
                                        {/* Request Overview */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Request Details</h4>
                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reason for Request</label>
                                                        <p className="text-sm text-gray-900 mt-1">{selectedPtoRequest.reason || 'No reason provided'}</p>
                                                    </div>

                                                    {selectedPtoRequest.manager_notes && (
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manager Notes</label>
                                                            <p className="text-sm text-gray-900 mt-1">{selectedPtoRequest.manager_notes}</p>
                                                        </div>
                                                    )}

                                                    {selectedPtoRequest.hr_notes && (
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">HR Notes</label>
                                                            <p className="text-sm text-gray-900 mt-1">{selectedPtoRequest.hr_notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Current Status</h4>
                                                <div className="space-y-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Badge className={getStatusColor(selectedPtoRequest.status)}>
                                                            {selectedPtoRequest.status.toUpperCase()}
                                                        </Badge>
                                                        {selectedPtoRequest.status_changed_by && (
                                                            <span className="text-xs text-gray-500">
                                                                by {selectedPtoRequest.status_changed_by}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {selectedPtoRequest.status_changed_at && (
                                                        <p className="text-xs text-gray-500">
                                                            Status changed: {formatDateTime(selectedPtoRequest.status_changed_at)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status-Specific Details */}
                                        {(selectedPtoRequest.status === 'approved' || selectedPtoRequest.status === 'denied' || selectedPtoRequest.status === 'cancelled') && (
                                            <div className="border-t pt-4">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                                    {selectedPtoRequest.status === 'approved' && 'Approval Details'}
                                                    {selectedPtoRequest.status === 'denied' && 'Denial Details'}
                                                    {selectedPtoRequest.status === 'cancelled' && 'Cancellation Details'}
                                                </h4>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Approval Details */}
                                                    {selectedPtoRequest.status === 'approved' && (
                                                        <>
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approved By</label>
                                                                <p className="text-sm text-gray-900 mt-1">{selectedPtoRequest.approved_by || 'Unknown'}</p>
                                                                {selectedPtoRequest.approved_at && (
                                                                    <p className="text-xs text-gray-500">{formatDateTime(selectedPtoRequest.approved_at)}</p>
                                                                )}
                                                            </div>
                                                            {selectedPtoRequest.approval_notes && (
                                                                <div>
                                                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approval Notes</label>
                                                                    <p className="text-sm text-gray-900 mt-1">{selectedPtoRequest.approval_notes}</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* Denial Details */}
                                                    {selectedPtoRequest.status === 'denied' && (
                                                        <>
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Denied By</label>
                                                                <p className="text-sm text-gray-900 mt-1">{selectedPtoRequest.denied_by || 'Unknown'}</p>
                                                                {selectedPtoRequest.denied_at && (
                                                                    <p className="text-xs text-gray-500">{formatDateTime(selectedPtoRequest.denied_at)}</p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Denial Reason</label>
                                                                <p className="text-sm text-red-900 mt-1 font-medium">
                                                                    {selectedPtoRequest.denial_reason || 'No reason provided'}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Cancellation Details */}
                                                    {selectedPtoRequest.status === 'cancelled' && (
                                                        <>
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cancelled By</label>
                                                                <p className="text-sm text-gray-900 mt-1">{selectedPtoRequest.cancelled_by || 'Unknown'}</p>
                                                                {selectedPtoRequest.cancelled_at && (
                                                                    <p className="text-xs text-gray-500">{formatDateTime(selectedPtoRequest.cancelled_at)}</p>
                                                                )}
                                                            </div>
                                                            {selectedPtoRequest.cancellation_reason && (
                                                                <div>
                                                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cancellation Reason</label>
                                                                    <p className="text-sm text-orange-900 mt-1 font-medium">{selectedPtoRequest.cancellation_reason}</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Request Timeline */}
                                        {selectedPtoRequest.modification_history && selectedPtoRequest.modification_history.length > 0 && (
                                            <div className="border-t pt-4">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Request Timeline</h4>
                                                <div className="space-y-3">
                                                    {selectedPtoRequest.modification_history
                                                        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                                        .map((item, index) => (
                                                            <div key={index} className="flex items-start space-x-3">
                                                                <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 ${
                                                                    item.action === 'approved' ? 'bg-green-500' :
                                                                        item.action === 'denied' ? 'bg-red-500' :
                                                                            item.action === 'cancelled' ? 'bg-orange-500' :
                                                                                item.action === 'submitted' ? 'bg-blue-500' : 'bg-gray-400'
                                                                }`}></div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-sm font-medium text-gray-900 capitalize">
                                                                            {item.action} by {item.user}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">{formatDateTime(item.timestamp)}</p>
                                                                    </div>
                                                                    <p className="text-sm text-gray-600 mt-1">{item.details}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Blackout Periods */}
                                        {selectedPtoRequest.blackouts && selectedPtoRequest.blackouts.length > 0 && (
                                            <div className="border-t pt-4">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Blackout Period Conflicts</h4>
                                                <div className="space-y-2">
                                                    {selectedPtoRequest.blackouts.map((blackout, index) => (
                                                        <div key={index} className={`p-3 rounded-lg text-sm ${
                                                            blackout.type === 'conflict'
                                                                ? 'bg-red-50 border border-red-200'
                                                                : 'bg-yellow-50 border border-yellow-200'
                                                        }`}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="font-medium">
                                                                    {blackout.blackout_name}
                                                                </div>
                                                                <Badge variant={blackout.type === 'conflict' ? 'destructive' : 'secondary'}>
                                                                    {blackout.type.toUpperCase()}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-xs mb-1">{blackout.date_range}</div>
                                                            <div className="text-xs">{blackout.message}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Request Metadata */}
                                        <div className="border-t pt-4">
                                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Request Information</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                <div>
                                                    <label className="font-medium text-gray-500 uppercase tracking-wide">PTO Request ID</label>
                                                    <p className="text-gray-900 mt-1">{(selectedPtoRequest.request_number)}</p>
                                                </div>
                                                <div>
                                                    <label className="font-medium text-gray-500 uppercase tracking-wide">Created</label>
                                                    <p className="text-gray-900 mt-1">{formatDateTime(selectedPtoRequest.created_at)}</p>
                                                </div>
                                                {selectedPtoRequest.submitted_at && selectedPtoRequest.submitted_at !== selectedPtoRequest.created_at && (
                                                    <div>
                                                        <label className="font-medium text-gray-500 uppercase tracking-wide">Submitted</label>
                                                        <p className="text-gray-900 mt-1">{formatDateTime(selectedPtoRequest.submitted_at)}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="font-medium text-gray-500 uppercase tracking-wide">Last Updated</label>
                                                    <p className="text-gray-900 mt-1">{formatDateTime(selectedPtoRequest.updated_at)}</p>
                                                </div>

                                                <div>
                                                    <label className="font-medium text-gray-500 uppercase tracking-wide">Request System ID</label>
                                                    <p className="text-gray-900 mt-1">#{selectedPtoRequest.id}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </HrLayout>
        </AppLayout>
    );
}
