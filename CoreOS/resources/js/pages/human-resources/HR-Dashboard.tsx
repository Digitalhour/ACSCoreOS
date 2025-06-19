import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import HrLayout from '@/layouts/settings/hr-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import axios from 'axios';
import {Activity, Calendar, CheckCircle, Clock, Filter, Loader2, TrendingUp, User, Users, XCircle} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {toast} from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'HR Dashboard',
        href: '/admin/hr-dashboard',
    },
];

interface User {
    id: number;
    name: string;
    email: string;
    department?: string;
    start_date?: string;
}

interface PtoType {
    id: number;
    name: string;
    code: string;
    color: string;
}

interface PtoRequest {
    id: number;
    request_number: string;
    user: User;
    pto_type: PtoType;
    start_date: string;
    end_date: string;
    total_days: number;
    status: 'pending' | 'approved' | 'denied' | 'cancelled';
    submitted_at: string;
}

interface DashboardStats {
    total_requests: number;
    pending_requests: number;
    approved_requests: number;
    denied_requests: number;
    total_types: number;
    total_policies: number;
    total_blackouts: number;
    total_employees: number;
    requests_this_month: number;
    approved_days_this_month: number;
}

interface TopPtoType {
    name: string;
    code: string;
    color: string;
    request_count: number;
}

interface RecentActivity {
    id: string;
    type: string;
    description: string;
    user_name: string;
    created_at: string;
}

interface DepartmentStat {
    department: string;
    employee_count: number;
    pending_requests: number;
}

interface Department {
    id: number;
    name: string;
    employee_count?: number;
    pending_requests?: number;
}

interface UserPtoData {
    id: number;
    name: string;
    email: string;
    department: string;
    start_date: string;
    pto_data: Array<{
        type_id: number;
        type_name: string;
        balance: number;
        used_balance: number;
        pending_balance: number;
        available_balance: number;
        assigned_balance: number;
    }>;
    total_balance: number;
    total_used: number;
    total_available: number;
    total_assigned: number;
}

export default function HrDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [pendingRequests, setPendingRequests] = useState<PtoRequest[]>([]);
    const [ptoTypes, setPtoTypes] = useState<PtoType[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [userData, setUserData] = useState<UserPtoData[]>([]);
    const [topPtoTypes, setTopPtoTypes] = useState<TopPtoType[]>([]);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [availableYears, setAvailableYears] = useState<number[]>([]);

    // Quick approval modal state
    const [showQuickApprovalModal, setShowQuickApprovalModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PtoRequest | null>(null);
    const [approvalComments, setApprovalComments] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);

            // Get dashboard data from the new API endpoint
            const dashboardResponse = await axios.get(`/api/pto-overview/dashboard?year=${selectedYear}`);
            const dashboardData = dashboardResponse.data;

            // Get pending requests
            const requestsResponse = await axios.get('/api/pto-requests?status=pending&per_page=10');

            setStats(dashboardData.stats);
            setUserData(dashboardData.users || []);
            setPtoTypes(dashboardData.ptoTypes || []);
            setDepartments(dashboardData.departments || []);
            setAvailableYears(dashboardData.availableYears || []);
            setTopPtoTypes(dashboardData.top_pto_types || []);
            setRecentActivities(dashboardData.recent_activities || []);
            setDepartmentStats(dashboardData.department_breakdown || []);
            setPendingRequests(requestsResponse.data.data || []);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleQuickApproval = useCallback((request: PtoRequest) => {
        setSelectedRequest(request);
        setApprovalComments('');
        setShowQuickApprovalModal(true);
    }, []);

    const submitQuickApproval = useCallback(async () => {
        if (!selectedRequest) return;

        try {
            setSubmitting(true);
            await axios.post(`/api/pto-requests/${selectedRequest.id}/approve`, {
                comments: approvalComments,
            });

            toast.success(`Request ${selectedRequest.request_number} approved successfully.`);
            setShowQuickApprovalModal(false);
            await fetchDashboardData();
        } catch (error: any) {
            console.error('Error approving request:', error);
            toast.error(error.response?.data?.error || 'Failed to approve request.');
        } finally {
            setSubmitting(false);
        }
    }, [selectedRequest, approvalComments, fetchDashboardData]);

    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }, []);

    const getStatusBadge = (status: string) => {
        const variants: { [key: string]: string } = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            denied: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800',
        };
        return (
            <Badge className={variants[status] || variants.pending}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'denied':
                return <XCircle className="h-4 w-4 text-red-600" />;
            default:
                return <Clock className="h-4 w-4 text-yellow-600" />;
        }
    };

    // Calculate department breakdown from server data (with safety check)
    const departmentBreakdown = departmentStats || [];



    if (loading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="HR Dashboard" />
                <HrLayout>
                    <div className="flex h-full flex-1 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                </HrLayout>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="HR Dashboard" />
            <HrLayout>
                <div className="flex h-full flex-1 flex-col gap-6 ">
                    <div className="flex items-right justify-end">

                        <div className="flex items-center gap-2">
                            <Label htmlFor="year-select" className="text-sm font-medium">
                                Year:
                            </Label>
                            <Select
                                value={selectedYear}
                                onValueChange={(value) => setSelectedYear(value)}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(availableYears || []).map((year) => (
                                        <SelectItem key={`year-${year}`} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {(userData || []).length}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Active employees with PTO
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stats?.pending_requests || 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Awaiting approval
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stats?.total_requests || 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    All time requests
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stats?.total_policies || 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    PTO policies configured
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1  gap-6 lg:grid-cols-4">
                        {/* Top PTO Types by Usage */}
                        <Card className={""}>
                            <CardHeader>
                                <CardTitle>Most Used PTO Types</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(topPtoTypes || []).length > 0 ? (
                                    <div className="space-y-3">
                                        {(topPtoTypes || []).map((type) => (
                                            <div key={`${type.name}-${type.code}`} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-3 w-3 rounded-full border"
                                                        style={{ backgroundColor: type.color }}
                                                    />
                                                    <span className="font-medium">{type.name}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {type.code}
                                                    </Badge>
                                                </div>
                                                <span className="text-sm font-medium">
                                                    {type.request_count} days
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground">
                                        No PTO usage data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Department Overview */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Department Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(departmentBreakdown || []).length > 0 ? (
                                    <div className="space-y-3">
                                        {(departmentBreakdown || []).map((dept) => (
                                            <div key={dept.department} className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{dept.department}</span>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-muted-foreground">
                                                            {dept.employee_count} employees
                                                        </span>
                                                        {(dept.pending_requests || 0) > 0 && (
                                                            <Badge variant="secondary">
                                                                {dept.pending_requests} pending
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground">
                                        No department data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Activities */}
                        <Card className={"col-span-2"}>
                            <CardHeader>
                                <CardTitle>Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(recentActivities || []).length > 0 ? (
                                    <div className="space-y-4">
                                        {(recentActivities || []).slice(0, 5).map((activity) => (
                                            <div key={`activity-${activity.id}`} className="flex items-start gap-3">
                                                <div className="mt-0.5">
                                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-sm">{activity.description}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{activity.user_name}</span>
                                                        <span>•</span>
                                                        <span>{formatDate(activity.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground">
                                        No recent activity
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Recent Pending Requests */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Recent Pending Approvals</CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.visit('/admin/pto-requests?status=pending')}
                                >
                                    <Filter className="mr-2 h-4 w-4" />
                                    View All
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {(pendingRequests || []).length === 0 ? (
                                    <div className="text-center text-sm text-muted-foreground">
                                        No pending requests
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {(pendingRequests || []).slice(0, 5).map((request) => (
                                            <div
                                                key={`pending-${request.id}`}
                                                className="flex items-center justify-between rounded-lg border p-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="font-medium text-sm">
                                                            {request.user.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-3 w-3 rounded-full border"
                                                        style={{ backgroundColor: request.pto_type.color }}
                                                    />
                                                    <span className="text-xs">
                                                        {request.total_days} days
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleQuickApproval(request)}
                                                        className="ml-2"
                                                    >
                                                        Quick Approve
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {(pendingRequests || []).length > 5 && (
                                            <div className="text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.visit('/admin/pto-requests?status=pending')}
                                                >
                                                    View {(pendingRequests || []).length - 5} more
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* PTO Balance Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>PTO Balance Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(userData || []).length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <div className="text-2xl font-bold">
                                                    {(userData || []).reduce((sum, user) => sum + (user.total_assigned || 0), 0)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Total Assigned</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold">
                                                    {(userData || []).reduce((sum, user) => sum + (user.total_used || 0), 0)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Total Used</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold">
                                                    {(userData || []).reduce((sum, user) => sum + (user.total_available || 0), 0)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Total Available</div>
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <div className="text-sm font-medium mb-2">By Department:</div>
                                            <div className="space-y-2">
                                                {departmentBreakdown.slice(0, 3).map((dept) => {
                                                    const deptUsers = userData.filter(user => user.department === dept.department);
                                                    const deptTotal = deptUsers.reduce((sum, user) => sum + user.total_available, 0);

                                                    return (
                                                        <div key={dept.department} className="flex justify-between text-sm">
                                                            <span>{dept.department}</span>
                                                            <span>{deptTotal} days available</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground">
                                        No balance data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Approval Modal */}
                    <Dialog open={showQuickApprovalModal} onOpenChange={setShowQuickApprovalModal}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Quick Approve PTO Request</DialogTitle>
                                <DialogDescription>
                                    Approve this PTO request with optional comments.
                                </DialogDescription>
                            </DialogHeader>
                            {selectedRequest && (
                                <div className="space-y-4">
                                    <div className="rounded-lg bg-gray-50 p-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <strong>Employee:</strong> {selectedRequest.user.name}
                                            </div>
                                            <div>
                                                <strong>PTO Type:</strong> {selectedRequest.pto_type.name}
                                            </div>
                                            <div>
                                                <strong>Request #:</strong> {selectedRequest.request_number}
                                            </div>
                                            <div>
                                                <strong>Days:</strong> {selectedRequest.total_days}
                                            </div>
                                            <div className="col-span-2">
                                                <strong>Dates:</strong> {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="approval-comments">Comments (Optional)</Label>
                                        <Textarea
                                            id="approval-comments"
                                            value={approvalComments}
                                            onChange={(e) => setApprovalComments(e.target.value)}
                                            placeholder="Add any comments about this approval..."
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            )}
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowQuickApprovalModal(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={submitQuickApproval}
                                    disabled={submitting}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Approve Request
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </HrLayout>
        </AppLayout>
    );
}
