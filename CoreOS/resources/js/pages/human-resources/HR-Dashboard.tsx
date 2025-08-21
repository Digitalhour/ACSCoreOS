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
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Progress} from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import axios from 'axios';
import {
    Activity, CheckCircle, Clock, Loader2, User, Users, XCircle,
    Building2, BarChart3, FileText, Eye,
    UserPlus, Briefcase, GraduationCap,
    Ban, TrendingUp
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {toast} from 'sonner';
import InviteUserComponent from "@/components/InviteUserComponent";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Human Resources',
        href: '/hr/overview',
    },
];

interface User {
    id: number;
    name: string;
    email: string;
    department?: string;
    start_date?: string;
    position?: string;
    is_active?: boolean;
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

interface Department {
    id: number;
    name: string;
    description?: string;
    employee_count: number;
    pending_requests?: number;
}

interface Position {
    id: number;
    title: string;
    department?: string;
    employee_count?: number;
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
    total_departments: number;
    total_positions: number;
    active_employees: number;
    inactive_employees: number;
    requests_this_month: number;
    approved_days_this_month: number;
    new_hires_this_month: number;
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
    const [userData, setUserData] = useState<UserPtoData[]>([]);
    const [topPtoTypes, setTopPtoTypes] = useState<TopPtoType[]>([]);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
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

            // Get dashboard data from API endpoints
            const [dashboardResponse, requestsResponse] = await Promise.all([
                axios.get(`/api/pto-overview/dashboard?year=${selectedYear}`),
                axios.get('/api/pto-requests?status=pending&per_page=10')
            ]);

            const dashboardData = dashboardResponse.data;

            setStats(dashboardData.stats);
            setUserData(dashboardData.users || []);
            setAvailableYears(dashboardData.availableYears || []);
            setTopPtoTypes(dashboardData.top_pto_types || []);
            setRecentActivities(dashboardData.recent_activities || []);
            setDepartments(dashboardData.departments || []);
            setPositions(dashboardData.positions || []);
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
        } catch (error) {
            console.error('Error approving request:', error);
            const errorMessage = error && typeof error === 'object' && 'response' in error 
                ? (error as {response?: {data?: {error?: string}}}).response?.data?.error || 'Failed to approve request.'
                : 'Failed to approve request.';
            toast.error(errorMessage);
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

    if (loading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Human Resources Dashboard" />
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p className="text-muted-foreground">Loading HR Dashboard...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Human Resources Dashboard" />
            <div className="container mx-auto p-6 space-y-8">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Human Resources Dashboard
                        </h1>
                        <p className="text-muted-foreground">
                            Comprehensive overview of your organization's HR metrics and activities
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
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
                        <InviteUserComponent />
                    </div>
                </div>

                {/* Key Metrics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.active_employees || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                +{stats?.new_hires_this_month || 0} new hires this month
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.pending_requests || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                Time off requests awaiting review
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Departments</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total_departments || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                Active organizational units
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total_policies || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                PTO and HR policies in effect
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Dashboard Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="employees">Employees</TabsTrigger>
                        <TabsTrigger value="time-off">Time Off</TabsTrigger>
                        <TabsTrigger value="organization">Organization</TabsTrigger>
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column - Recent Activities */}
                            <Card className="lg:col-span-2">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Recent Activity</CardTitle>
                                        <p className="text-sm text-muted-foreground">Latest HR system activities</p>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        <Eye className="h-4 w-4 mr-2" />
                                        View All
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {recentActivities.length > 0 ? (
                                        <div className="space-y-4">
                                            {recentActivities.slice(0, 8).map((activity) => (
                                                <div key={`activity-${activity.id}`} className="flex items-start gap-3">
                                                    <div className="h-2 w-2 bg-primary rounded-full mt-2" />
                                                    <div className="flex-1 space-y-1">
                                                        <p className="text-sm">{activity.description}</p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <User className="h-3 w-3" />
                                                            <span>{activity.user_name}</span>
                                                            <span>•</span>
                                                            <span>{formatDate(activity.created_at)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">No recent activity</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Right Column - Quick Stats */}
                            <div className="space-y-6">
                                {/* Pending Requests Summary */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Pending Approvals</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {pendingRequests.length > 0 ? (
                                            <div className="space-y-3">
                                                {pendingRequests.slice(0, 5).map((request) => (
                                                    <div key={`pending-${request.id}`} className="flex items-center justify-between p-2 border rounded">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: request.pto_type.color }} />
                                                            <span className="text-sm">{request.user.name}</span>
                                                        </div>
                                                        <Button size="sm" onClick={() => handleQuickApproval(request)}>
                                                            Approve
                                                        </Button>
                                                    </div>
                                                ))}
                                                {pendingRequests.length > 5 && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full"
                                                        onClick={() => router.visit('/hr/time-off-requests?status=pending')}
                                                    >
                                                        View {pendingRequests.length - 5} more
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                                <p className="text-sm text-muted-foreground">All caught up!</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Quick Actions */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Button variant="outline" className="w-full justify-start" onClick={() => router.visit('/hr/employees')}>
                                            <Users className="h-4 w-4 mr-2" />
                                            Manage Employees
                                        </Button>
                                        <Button variant="outline" className="w-full justify-start" onClick={() => router.visit('/departments')}>
                                            <Building2 className="h-4 w-4 mr-2" />
                                            View Departments
                                        </Button>
                                        <Button variant="outline" className="w-full justify-start" onClick={() => router.visit('/admin/positions')}>
                                            <Briefcase className="h-4 w-4 mr-2" />
                                            Manage Positions
                                        </Button>
                                        <Button variant="outline" className="w-full justify-start" onClick={() => router.visit('/user-management/onboard')}>
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Onboard Employee
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Employees Tab */}
                    <TabsContent value="employees" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Employee Overview</CardTitle>
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Active Employees</span>
                                            <span className="font-medium">{stats?.active_employees || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Inactive Employees</span>
                                            <span className="font-medium">{stats?.inactive_employees || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">New Hires (Month)</span>
                                            <span className="font-medium">{stats?.new_hires_this_month || 0}</span>
                                        </div>
                                    </div>
                                    <Button 
                                        className="w-full mt-4" 
                                        onClick={() => router.visit('/hr/employees')}
                                    >
                                        View All Employees
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Departments</CardTitle>
                                    <Building2 className="h-5 w-5 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {departments.slice(0, 4).map((dept) => (
                                            <div key={dept.id} className="flex justify-between items-center">
                                                <span className="text-sm font-medium">{dept.name}</span>
                                                <Badge variant="secondary">{dept.employee_count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        className="w-full mt-4" 
                                        onClick={() => router.visit('/departments')}
                                    >
                                        Manage Departments
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Positions</CardTitle>
                                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {positions.slice(0, 4).map((position) => (
                                            <div key={position.id} className="flex justify-between items-center">
                                                <span className="text-sm font-medium">{position.title}</span>
                                                <Badge variant="outline">{position.employee_count || 0}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        className="w-full mt-4" 
                                        onClick={() => router.visit('/admin/positions')}
                                    >
                                        Manage Positions
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Time Off Tab */}
                    <TabsContent value="time-off" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>PTO Usage Analytics</CardTitle>
                                    <p className="text-sm text-muted-foreground">Most requested time off types</p>
                                </CardHeader>
                                <CardContent>
                                    {topPtoTypes.length > 0 ? (
                                        <div className="space-y-4">
                                            {topPtoTypes.map((type) => {
                                                const maxCount = Math.max(...topPtoTypes.map(t => t.request_count));
                                                const percentage = maxCount > 0 ? (type.request_count / maxCount * 100) : 0;
                                                return (
                                                    <div key={`${type.name}-${type.code}`} className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
                                                                <span className="font-medium text-sm">{type.name}</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {type.code}
                                                                </Badge>
                                                            </div>
                                                            <span className="text-sm font-medium">
                                                                {type.request_count} requests
                                                            </span>
                                                        </div>
                                                        <Progress value={percentage} className="h-2" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">No PTO usage data available</p>
                                        </div>
                                    )}
                                    <div className="mt-4 space-y-2">
                                        <Button 
                                            variant="outline" 
                                            className="w-full" 
                                            onClick={() => router.visit('/hr/time-off-requests')}
                                        >
                                            View All Requests
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="w-full" 
                                            onClick={() => router.visit('/hr/pto-types')}
                                        >
                                            Manage PTO Types
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Request Statistics</CardTitle>
                                    <p className="text-sm text-muted-foreground">Time off request breakdown</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 border rounded">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <span className="text-sm font-medium">Approved</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-600">{stats?.approved_requests || 0}</div>
                                                <div className="text-xs text-muted-foreground">{stats?.approved_days_this_month || 0} days</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 border rounded">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-yellow-500" />
                                                <span className="text-sm font-medium">Pending</span>
                                            </div>
                                            <div className="font-bold text-yellow-600">{stats?.pending_requests || 0}</div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 border rounded">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="h-4 w-4 text-red-500" />
                                                <span className="text-sm font-medium">Denied</span>
                                            </div>
                                            <div className="font-bold text-red-600">{stats?.denied_requests || 0}</div>
                                        </div>
                                    </div>
                                    <Button 
                                        className="w-full mt-4" 
                                        onClick={() => router.visit('/hr/pto-policies')}
                                    >
                                        Manage PTO Policies
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Organization Tab */}
                    <TabsContent value="organization" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.visit('/departments')}>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Building2 className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Departments</h3>
                                            <p className="text-sm text-muted-foreground">{stats?.total_departments || 0} departments</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.visit('/admin/positions')}>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Briefcase className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Positions</h3>
                                            <p className="text-sm text-muted-foreground">{stats?.total_positions || 0} job positions</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.visit('/admin/user-hierarchy')}>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Users className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Hierarchy</h3>
                                            <p className="text-sm text-muted-foreground">Organizational structure</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.visit('/admin/blackouts')}>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Ban className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Blackout Periods</h3>
                                            <p className="text-sm text-muted-foreground">{stats?.total_blackouts || 0} active periods</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.visit('/user-management/onboard')}>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <UserPlus className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Onboarding</h3>
                                            <p className="text-sm text-muted-foreground">New employee setup</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.visit('/hr/training')}>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <GraduationCap className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Training</h3>
                                            <p className="text-sm text-muted-foreground">Learning & development</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Reports Tab */}
                    <TabsContent value="reports" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>PTO Balance Summary</CardTitle>
                                    <p className="text-sm text-muted-foreground">Company-wide time off balances</p>
                                </CardHeader>
                                <CardContent>
                                    {userData.length > 0 ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div>
                                                    <div className="text-2xl font-bold">
                                                        {userData.reduce((sum, user) => sum + (user.total_assigned || 0), 0)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Total Assigned</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold">
                                                        {userData.reduce((sum, user) => sum + (user.total_used || 0), 0)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Total Used</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold">
                                                        {userData.reduce((sum, user) => sum + (user.total_available || 0), 0)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Total Available</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">No balance data available</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Monthly Trends</CardTitle>
                                    <p className="text-sm text-muted-foreground">Key HR metrics for this month</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 border rounded">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-green-500" />
                                                <span className="text-sm">New Requests</span>
                                            </div>
                                            <span className="font-bold">{stats?.requests_this_month || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 border rounded">
                                            <div className="flex items-center gap-2">
                                                <UserPlus className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm">New Hires</span>
                                            </div>
                                            <span className="font-bold">{stats?.new_hires_this_month || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 border rounded">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <span className="text-sm">Days Approved</span>
                                            </div>
                                            <span className="font-bold">{stats?.approved_days_this_month || 0}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

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
                                <div className="rounded-lg bg-muted p-4">
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
                            >
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Approve Request
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}