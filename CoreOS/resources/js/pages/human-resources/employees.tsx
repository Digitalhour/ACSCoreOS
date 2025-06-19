import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import HrLayout from "@/layouts/settings/hr-layout";
import {Table, TableBody, TableCell, TableHeader, TableRow} from "@/components/ui/table";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {useState} from 'react';
import {
    AlertTriangle,
    Briefcase,
    Calendar,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Clock,
    Key,
    Mail,
    MapPin,
    Phone,
    Shield,
    UserRoundCheck,
    UserX,
    XCircle,
} from 'lucide-react';
import {Separator} from "@/components/ui/separator";

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
    denial_reason?: string;
    approved_by?: string;
    denied_by?: string;
    created_at: string;
    approved_at?: string;
    denied_at?: string;
    blackouts: Blackout[];
    has_blackout_conflicts: boolean;
    has_blackout_warnings: boolean;
}

export interface Role {
    id: number;
    name: string;
    permissions: string[];
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
    all_permissions: string[];
    pto_stats: {
        total: number;
        pending: number;
        approved: number;
        denied: number;
        cancelled: number;
    };
    emergency_contacts: EmergencyContact[];
    pto_balances: PtoBalance[];
    pto_requests: PtoRequest[];
}

type SortField = 'name' | 'departments' | 'position' | 'pto_total';
type SortDirection = 'asc' | 'desc';

export default function Employees({ users }: { users: User[] }) {
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [expandedRequests, setExpandedRequests] = useState<Set<number>>(new Set());
    const [requestStatusFilter, setRequestStatusFilter] = useState<string>('all');
    const [requestSortField, setRequestSortField] = useState<string>('created_at');
    const [requestSortDirection, setRequestSortDirection] = useState<'asc' | 'desc'>('desc');
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);

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

    const getBlackoutRestrictionColor = (restrictionType: string) => {
        switch (restrictionType.toLowerCase()) {
            case 'full_block':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'limit_requests':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'warning_only':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getBlackoutRestrictionText = (restrictionType: string) => {
        switch (restrictionType.toLowerCase()) {
            case 'full_block':
                return 'Full Block';
            case 'limit_requests':
                return 'Limited';
            case 'warning_only':
                return 'Warning';
            default:
                return restrictionType;
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

    const openEmployeeSheet = (user: User) => {
        setSelectedUser(user);
        setExpandedRequests(new Set());
        setRequestStatusFilter('all');
        setRequestSortField('created_at');
        setRequestSortDirection('desc');
        setIsSheetOpen(true);
    };

    const toggleRequestExpansion = (requestId: number) => {
        const newExpanded = new Set(expandedRequests);
        if (newExpanded.has(requestId)) {
            newExpanded.delete(requestId);
        } else {
            newExpanded.add(requestId);
        }
        setExpandedRequests(newExpanded);
    };

    const handleUserStatusToggle = async (userId: number, currentlyActive: boolean) => {
        setIsTogglingStatus(true);

        try {
            if (currentlyActive) {
                await router.delete(`/hr/employees/${userId}`, {
                    preserveState: true,
                    preserveScroll: true,
                });
            } else {
                await router.patch(`/hr/employees/${userId}/restore`, {}, {
                    preserveState: true,
                    preserveScroll: true,
                });
            }
        } catch (error) {
            console.error('Failed to toggle user status:', error);
        } finally {
            setIsTogglingStatus(false);
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

    const sortedUsers = [...users].sort((a, b) => {
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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employees" />
            <HrLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
                            <p className="text-gray-600">Employees time off details </p>
                        </div>
                        <div className="text-sm text-gray-500">
                            {users.length} employee{users.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortHeader field="name">Employee</SortHeader>
                                    <SortHeader field="departments">Department</SortHeader>
                                    <SortHeader field="position">Position</SortHeader>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Roles</th>
                                    <SortHeader field="pto_total">PTO Requests</SortHeader>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedUsers.map((user) => (
                                    <TableRow
                                        key={user.id}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => openEmployeeSheet(user)}
                                    >
                                        <TableCell className="py-4 px-4">
                                            <div className="flex items-center space-x-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={user.avatar || undefined} alt={user.name} />
                                                    <AvatarFallback className="bg-blue-100 text-blue-600">
                                                        {getInitials(user.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium text-gray-900">{user.name}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 px-4">
                                            <div className="text-sm text-gray-900">{user.departments}</div>
                                        </TableCell>
                                        <TableCell className="py-4 px-4">
                                            <div className="text-sm text-gray-900">{user.position}</div>
                                        </TableCell>
                                        <TableCell className="py-4 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.length > 0 ? (
                                                    user.roles.slice(0, 2).map((role) => (
                                                        <Badge key={role.id} className={getRoleColor(role.name)}>
                                                            {role.name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-500">
                                                        No Role
                                                    </Badge>
                                                )}
                                                {user.roles.length > 2 && (
                                                    <Badge variant="outline" className="text-gray-500">
                                                        +{user.roles.length - 2} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                <Badge variant="secondary" >
                                                    Total: {user.pto_stats.total}
                                                </Badge>
                                                {user.pto_stats.pending > 0 && (
                                                    <Badge variant="secondary" >
                                                        Pending: {user.pto_stats.pending}
                                                    </Badge>
                                                )}
                                                {user.pto_stats.approved > 0 && (
                                                    <Badge variant="secondary" >
                                                        Approved: {user.pto_stats.approved}
                                                    </Badge>
                                                )}
                                                {user.pto_stats.denied > 0 && (
                                                    <Badge variant="secondary" >
                                                        Denied: {user.pto_stats.denied}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {users.length === 0 && (
                            <div className="text-center py-12">
                                <div className="text-gray-500">No employees found</div>
                            </div>
                        )}
                    </div>
                </div>

                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent side="right" className="min-w-6/12  p-0 overflow-hidden">
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
                                                    <MapPin className="h-4 w-4 mr-1" />
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
                                        <div className=" px-6">
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
                                                <TabsTrigger value="pto-balances" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 hover:bg-gray-50 border border-transparent data-[state=active]:border-gray-200 rounded-md">
                                                    PTO Balances
                                                </TabsTrigger>
                                                <TabsTrigger value="pto-requests" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 hover:bg-gray-50 border border-transparent data-[state=active]:border-gray-200 rounded-md">
                                                    PTO Requests
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>
                                        <Separator />
                                        <div className="flex-1 overflow-y-auto">
                                            <TabsContent value="overview" className="p-6 space-y-6 m-0">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Employee Information</CardTitle>
                                                        <CardDescription>Basic employee profile and contact details</CardDescription>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                                                                    <div className="mt-1 text-sm">{selectedUser.name}</div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Email Address</label>
                                                                    <div className="mt-1 text-sm">{selectedUser.email}</div>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Department</label>
                                                                    <div className="mt-1 text-sm">{selectedUser.departments}</div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Position</label>
                                                                    <div className="mt-1 text-sm">{selectedUser.position}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>PTO Balances</CardTitle>
                                                        <CardDescription>Current time-off balances by type</CardDescription>
                                                    </CardHeader>
                                                    <CardContent>
                                                        {selectedUser.pto_balances.length > 0 ? (
                                                            <div className="space-y-4">
                                                                {selectedUser.pto_balances.map((balance) => (
                                                                    <div key={balance.id} className="flex items-center justify-between p-2 border rounded-sm">
                                                                        <div className="flex items-center space-x-2">
                                                                            <span className="font-medium">{balance.type}</span>
                                                                            <Badge variant="outline">{balance.year}</Badge>
                                                                        </div>
                                                                        <div className="flex space-x-2">
                                                                            <Badge className="bg-green-100 text-green-800 border-green-200">
                                                                                Available: {balance.balance.toFixed(1)}
                                                                            </Badge>
                                                                            <Badge className="bg-red-100 text-red-800 border-red-200">
                                                                                Used: {balance.used_balance.toFixed(1)}
                                                                            </Badge>
                                                                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                                                                Pending: {balance.pending_balance.toFixed(1)}
                                                                            </Badge>
                                                                            <Badge variant={"secondary"} className="border-gray-200">
                                                                                Total Allocated:  {(balance.balance + balance.used_balance).toFixed(2)}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-8">
                                                                <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                                                <p className="text-gray-500 text-sm">No PTO balances available</p>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>

                                            <TabsContent value="roles" className="p-6 space-y-6 m-0">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="flex items-center">
                                                            <Shield className="h-5 w-5 mr-2" />
                                                            Assigned Roles ({selectedUser.roles.length})
                                                        </CardTitle>
                                                        <CardDescription>Roles define groups of permissions for this employee</CardDescription>
                                                    </CardHeader>
                                                    <CardContent>
                                                        {selectedUser.roles.length > 0 ? (
                                                            <div className="space-y-4">
                                                                {selectedUser.roles.map((role) => (
                                                                    <Card key={role.id} className="border-l-4 border-l-blue-500">
                                                                        <CardContent className="p-4">
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <h3 className="font-semibold text-lg">{role.name}</h3>
                                                                                <Badge className={getRoleColor(role.name)}>
                                                                                    {role.permissions.length} permissions
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {role.permissions.map((permission, index) => (
                                                                                    <Badge key={index} variant="outline" className="text-xs">
                                                                                        {permission}
                                                                                    </Badge>
                                                                                ))}
                                                                            </div>
                                                                        </CardContent>
                                                                    </Card>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-8">
                                                                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Roles Assigned</h3>
                                                                <p className="text-gray-500">This employee doesn't have any roles assigned yet.</p>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>

                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="flex items-center">
                                                            <Key className="h-5 w-5 mr-2" />
                                                            All Permissions ({selectedUser.all_permissions.length})
                                                        </CardTitle>
                                                        <CardDescription>Complete list of permissions this employee has access to</CardDescription>
                                                    </CardHeader>
                                                    <CardContent>
                                                        {selectedUser.all_permissions.length > 0 ? (
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                                {selectedUser.all_permissions.map((permission, index) => (
                                                                    <Badge key={index} variant="secondary" className="justify-start p-2 text-xs">
                                                                        <Key className="h-3 w-3 mr-1" />
                                                                        {permission}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-8">
                                                                <Key className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Permissions</h3>
                                                                <p className="text-gray-500">This employee doesn't have any permissions assigned.</p>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>

                                            <TabsContent value="emergency" className="p-6 space-y-6 m-0">
                                                {selectedUser.emergency_contacts.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {selectedUser.emergency_contacts.map((contact) => (
                                                            <Card key={contact.id}>
                                                                <CardContent className="p-6">
                                                                    <div className="flex items-start justify-between mb-4">
                                                                        <div>
                                                                            <h3 className="font-semibold text-lg">{contact.name}</h3>
                                                                            <p className="text-sm text-gray-500">{contact.relationship}</p>
                                                                        </div>
                                                                        {contact.is_primary && (
                                                                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">Primary</Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label className="text-sm font-medium text-gray-500">Phone</label>
                                                                            <div className="mt-1 text-sm font-mono">{contact.phone}</div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-sm font-medium text-gray-500">Email</label>
                                                                            <div className="mt-1 text-sm">{contact.email}</div>
                                                                        </div>
                                                                        {contact.address && (
                                                                            <div className="md:col-span-2">
                                                                                <label className="text-sm font-medium text-gray-500">Address</label>
                                                                                <div className="mt-1 text-sm">{contact.address}</div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <Card>
                                                        <CardContent className="p-12 text-center">
                                                            <Phone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Emergency Contacts</h3>
                                                            <p className="text-gray-500">This employee hasn't added any emergency contacts yet.</p>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="pto-balances" className="p-6 space-y-6 m-0">
                                                {selectedUser.pto_balances.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {selectedUser.pto_balances.map((balance) => (
                                                            <Card key={balance.id}>
                                                                <CardHeader>
                                                                    <div className="flex items-center justify-between">
                                                                        <CardTitle>{balance.type}</CardTitle>
                                                                        <Badge variant="outline">{balance.year}</Badge>
                                                                    </div>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                        <div className="text-center p-4 bg-green-50 rounded-lg">
                                                                            <div className="text-2xl font-bold text-green-600">{balance.balance.toFixed(2)}</div>
                                                                            <div className="text-sm text-gray-600">Available</div>
                                                                        </div>
                                                                        <div className="text-center p-4 bg-red-50 rounded-lg">
                                                                            <div className="text-2xl font-bold text-red-600">{balance.used_balance.toFixed(2)}</div>
                                                                            <div className="text-sm text-gray-600">Used</div>
                                                                        </div>
                                                                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                                                            <div className="text-2xl font-bold text-yellow-600">{balance.pending_balance.toFixed(2)}</div>
                                                                            <div className="text-sm text-gray-600">Pending</div>
                                                                        </div>
                                                                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                                                                            <div className="text-2xl font-bold text-blue-600">
                                                                                {(balance.balance + balance.used_balance).toFixed(2)}
                                                                            </div>
                                                                            <div className="text-sm text-gray-600">Total Allocated</div>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <Card>
                                                        <CardContent className="p-12 text-center">
                                                            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No PTO Balances</h3>
                                                            <p className="text-gray-500">No PTO balance information is available for this employee.</p>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="pto-requests" className="p-6 space-y-6 m-0">
                                                {selectedUser.pto_requests.length > 0 ? (
                                                    <Card>
                                                        <CardHeader>
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <CardTitle>PTO Requests ({getFilteredAndSortedRequests(selectedUser.pto_requests).length})</CardTitle>
                                                                    <CardDescription>Click on any request to view detailed information</CardDescription>
                                                                </div>
                                                                <div className="flex items-center space-x-4">
                                                                    <div className="flex items-center space-x-2">
                                                                        <span className="text-sm font-medium">Filter by status:</span>
                                                                        <Select value={requestStatusFilter} onValueChange={setRequestStatusFilter}>
                                                                            <SelectTrigger className="w-32">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="all">All</SelectItem>
                                                                                <SelectItem value="pending">Pending</SelectItem>
                                                                                <SelectItem value="approved">Approved</SelectItem>
                                                                                <SelectItem value="denied">Denied</SelectItem>
                                                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="p-0">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <th className="w-8"></th>
                                                                        <RequestSortHeader field="request_number">Request #</RequestSortHeader>
                                                                        <RequestSortHeader field="pto_type">Type</RequestSortHeader>
                                                                        <RequestSortHeader field="start_date">Dates</RequestSortHeader>
                                                                        <RequestSortHeader field="total_days">Days</RequestSortHeader>
                                                                        <RequestSortHeader field="status">Status</RequestSortHeader>
                                                                        <th className="text-left py-3 px-4 font-medium text-gray-900">Blackouts</th>
                                                                        <RequestSortHeader field="created_at">Created</RequestSortHeader>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {getFilteredAndSortedRequests(selectedUser.pto_requests).map((request) => (
                                                                        <>
                                                                            <TableRow
                                                                                key={request.id}
                                                                                className="hover:bg-gray-50 cursor-pointer"
                                                                                onClick={() => toggleRequestExpansion(request.id)}
                                                                            >
                                                                                <TableCell className="py-3 px-4">
                                                                                    <ChevronRight
                                                                                        className={`h-4 w-4 transition-transform ${
                                                                                            expandedRequests.has(request.id) ? 'rotate-90' : ''
                                                                                        }`}
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell className="py-3 px-4">
                                                                                    <div className="font-medium">{request.request_number}</div>
                                                                                </TableCell>
                                                                                <TableCell className="py-3 px-4">
                                                                                    <Badge variant="outline" className="text-xs">{request.pto_type}</Badge>
                                                                                </TableCell>
                                                                                <TableCell className="py-3 px-4">
                                                                                    <div className="text-sm">
                                                                                        {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell className="py-3 px-4">
                                                                                    <div className="text-sm font-medium">{request.total_days.toFixed(1)}</div>
                                                                                </TableCell>
                                                                                <TableCell className="py-3 px-4">
                                                                                    <Badge className={getStatusColor(request.status)}>
                                                                                        {request.status}
                                                                                    </Badge>
                                                                                </TableCell>
                                                                                <TableCell className="py-3 px-4">
                                                                                    {request.has_blackout_conflicts || request.has_blackout_warnings ? (
                                                                                        <div className="flex items-center space-x-1">
                                                                                            <AlertTriangle className={`h-4 w-4 ${request.has_blackout_conflicts ? 'text-red-500' : 'text-amber-500'}`} />
                                                                                            <Badge className={`text-xs ${request.has_blackout_conflicts ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                                                                                                {request.blackouts.length} {request.has_blackout_conflicts ? 'conflict' : 'warning'}{request.blackouts.length !== 1 ? 's' : ''}
                                                                                            </Badge>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-sm text-gray-500">None</span>
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="py-3 px-4">
                                                                                    <div className="text-sm text-gray-500">{formatDate(request.created_at)}</div>
                                                                                </TableCell>
                                                                            </TableRow>

                                                                            {expandedRequests.has(request.id) && (
                                                                                <TableRow>
                                                                                    <TableCell colSpan={8} className="p-0">
                                                                                        <div className="bg-gray-50 border-t p-4">
                                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                                <div className="space-y-3">
                                                                                                    <div>
                                                                                                        <label className="text-sm font-medium text-gray-500">Reason</label>
                                                                                                        <div className="mt-1 text-balance text-sm">{request.reason}</div>

                                                                                                    </div>

                                                                                                    {request.approval_notes && (
                                                                                                        <div>
                                                                                                            <label className="text-sm font-medium text-gray-500">Approval Notes</label>
                                                                                                            <div className="mt-1 text-balance text-sm p-3 bg-green-50 rounded-lg border border-green-200">
                                                                                                                {request.approval_notes}

                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}

                                                                                                    {request.denial_reason && (
                                                                                                        <div>
                                                                                                            <label className="text-sm font-medium text-gray-500">Denial Reason</label>
                                                                                                            <div className="mt-1 text-balance text-sm p-3 bg-red-50 rounded-lg border border-red-200">
                                                                                                                {request.denial_reason}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}

                                                                                                    {(request.has_blackout_conflicts || request.has_blackout_warnings) && (
                                                                                                        <div>
                                                                                                            <label className={`text-sm font-medium flex items-center ${request.has_blackout_conflicts ? 'text-red-600' : 'text-amber-600'}`}>
                                                                                                                {request.has_blackout_conflicts ? <XCircle className="h-4 w-4 mr-1" /> : <AlertTriangle className="h-4 w-4 mr-1" />}
                                                                                                                Blackout {request.has_blackout_conflicts ? 'Conflicts' : 'Warnings'} ({request.blackouts.length})
                                                                                                            </label>
                                                                                                            <div className="mt-2 space-y-2">
                                                                                                                {request.blackouts.map((blackout, index) => (
                                                                                                                    <div key={index} className={`p-3 rounded-lg border ${blackout.type === 'conflict' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                                                                                                                        <div className="flex items-start justify-between mb-2">
                                                                                                                            <div className={`font-medium ${blackout.type === 'conflict' ? 'text-red-800' : 'text-amber-800'}`}>
                                                                                                                                {blackout.blackout_name}
                                                                                                                            </div>
                                                                                                                            <Badge className={blackout.type === 'conflict' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                                                                                                                                {blackout.type === 'conflict' ? 'Conflict' : 'Warning'}
                                                                                                                            </Badge>
                                                                                                                        </div>
                                                                                                                        <div className={`text-sm mb-1 ${blackout.type === 'conflict' ? 'text-red-700' : 'text-amber-700'}`}>
                                                                                                                            {blackout.date_range}
                                                                                                                        </div>
                                                                                                                        <div className={`text-balance text-sm ${blackout.type === 'conflict' ? 'text-red-600' : 'text-amber-600'}`}>
                                                                                                                            {blackout.message}

                                                                                                                        </div>
                                                                                                                        {blackout.can_override && (
                                                                                                                            <div className="mt-2">
                                                                                                                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                                                                                                                                    Emergency Override Allowed
                                                                                                                                </Badge>
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>

                                                                                                <div className="space-y-3">
                                                                                                    <div>
                                                                                                        <label className="text-sm font-medium text-gray-500">Request Details</label>
                                                                                                        <div className="mt-1 space-y-2 text-sm">
                                                                                                            <div className="flex justify-between">
                                                                                                                <span className="text-gray-500">Created:</span>
                                                                                                                <span>{formatDateTime(request.created_at)}</span>
                                                                                                            </div>
                                                                                                            {request.approved_at && (
                                                                                                                <div className="flex justify-between">
                                                                                                                    <span className="text-gray-500">Approved:</span>
                                                                                                                    <span className="text-green-700">{formatDateTime(request.approved_at)}</span>
                                                                                                                </div>
                                                                                                            )}
                                                                                                            {request.denied_at && (
                                                                                                                <div className="flex justify-between">
                                                                                                                    <span className="text-gray-500">Denied:</span>
                                                                                                                    <span className="text-red-700">{formatDateTime(request.denied_at)}</span>
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {(request.approved_by || request.denied_by) && (
                                                                                                        <div>
                                                                                                            <label className="text-sm font-medium text-gray-500">Decision Made By</label>
                                                                                                            <div className="mt-1 text-sm">
                                                                                                                {request.approved_by && (
                                                                                                                    <div className="flex items-center space-x-2">
                                                                                                                        <Badge className="bg-green-100 text-green-800 border-green-200">
                                                                                                                            Approved by: {request.approved_by}
                                                                                                                        </Badge>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                                {request.denied_by && (
                                                                                                                    <div className="flex items-center space-x-2">
                                                                                                                        <Badge className="bg-red-100 text-red-800 border-red-200">
                                                                                                                            Denied by: {request.denied_by}
                                                                                                                        </Badge>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            )}
                                                                        </>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                            {getFilteredAndSortedRequests(selectedUser.pto_requests).length === 0 && requestStatusFilter !== 'all' && (
                                                                <div className="text-center py-8">
                                                                    <p className="text-gray-500">No {requestStatusFilter} requests found</p>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                ) : (
                                                    <Card>
                                                        <CardContent className="p-12 text-center">
                                                            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No PTO Requests</h3>
                                                            <p className="text-gray-500">This employee hasn't submitted any PTO requests yet.</p>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                </div>
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </HrLayout>
        </AppLayout>
    );
}
