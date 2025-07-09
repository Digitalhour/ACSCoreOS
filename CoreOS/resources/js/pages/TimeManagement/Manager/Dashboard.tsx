import {useState} from 'react';
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Download,
    Eye,
    FileText,
    Filter,
    TrendingUp,
    Users,
    XCircle
} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    current_position?: {
        title: string;
    };
}

interface Timesheet {
    id: number;
    user_id: number;
    week_start_date: string;
    week_end_date: string;
    status: 'draft' | 'submitted' | 'approved' | 'processed';
    submitted_at: string | null;
    approved_at: string | null;
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    notes: string | null;
    manager_notes: string | null;
    user: User;
}

interface DashboardStats {
    pending_count: number;
    total_employees: number;
    this_week_submissions: number;
    approved_this_week: number;
}

interface Props {
    pendingTimesheets: Timesheet[];
    allTimesheets: {
        data: Timesheet[];
        links: any[];
        meta: any;
    };
    subordinates: User[];
    dashboardStats: DashboardStats;
    filters: {
        status?: string;
        employee_id?: string;
        week_start?: string;
    };
    teamHoursData: Array<{
        employee: {
            id: number;
            name: string;
            position: string;
        };
        days: {
            sunday: number;
            monday: number;
            tuesday: number;
            wednesday: number;
            thursday: number;
            friday: number;
            saturday: number;
        };
        weekTotal: number;
        regularHours: number;
        overtimeHours: number;
    }>;
}

const breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Manager Dashboard',
        href: '/time-clock/manager/dashboard',
    },
];

export default function ManagerDashboard({
                                             pendingTimesheets,
                                             allTimesheets,
                                             subordinates,
                                             dashboardStats,
                                             filters,
                                             teamHoursData
                                         }: Props) {
    const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
    const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
    const [managerNotes, setManagerNotes] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);

    // Filter states
    const [filterStatus, setFilterStatus] = useState(filters.status || 'all');
    const [filterEmployee, setFilterEmployee] = useState(filters.employee_id || 'all');
    const [filterWeekStart, setFilterWeekStart] = useState(filters.week_start || '');

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatHours = (hours: number): string => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const getWeekLabel = (startDate: string, endDate: string): string => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-200' },
            submitted: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
            approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            processed: { label: 'Processed', className: 'bg-blue-100 text-blue-700 border-blue-200' },
        };

        const config = statusConfig[status] || statusConfig.draft;
        return (
            <Badge variant="outline" className={config.className}>
                {config.label}
            </Badge>
        );
    };

    const handleApprovalAction = (timesheet: Timesheet, action: 'approve' | 'reject') => {
        setSelectedTimesheet(timesheet);
        setApprovalAction(action);
        setManagerNotes('');
        setDialogOpen(true);
    };

    const submitApproval = () => {
        if (!selectedTimesheet || !approvalAction) return;

        router.post(`/time-clock/manager/approve/${selectedTimesheet.id}`, {
            action: approvalAction,
            manager_notes: managerNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setSelectedTimesheet(null);
                setApprovalAction(null);
                setManagerNotes('');
            },
        });
    };

    const handleFilter = () => {
        const params = new URLSearchParams();
        if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
        if (filterEmployee && filterEmployee !== 'all') params.set('employee_id', filterEmployee);
        if (filterWeekStart) params.set('week_start', filterWeekStart);

        router.get('/time-clock/manager/dashboard', Object.fromEntries(params), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setFilterStatus('all');
        setFilterEmployee('all');
        setFilterWeekStart('');
        router.get('/time-clock/manager/dashboard', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Calculate totals from real data (with safety check)
    const safeTeamHoursData = teamHoursData || [];

    const dayTotals = {
        sunday: safeTeamHoursData.reduce((sum, emp) => sum + emp.days.sunday, 0),
        monday: safeTeamHoursData.reduce((sum, emp) => sum + emp.days.monday, 0),
        tuesday: safeTeamHoursData.reduce((sum, emp) => sum + emp.days.tuesday, 0),
        wednesday: safeTeamHoursData.reduce((sum, emp) => sum + emp.days.wednesday, 0),
        thursday: safeTeamHoursData.reduce((sum, emp) => sum + emp.days.thursday, 0),
        friday: safeTeamHoursData.reduce((sum, emp) => sum + emp.days.friday, 0),
        saturday: safeTeamHoursData.reduce((sum, emp) => sum + emp.days.saturday, 0),
    };

    const grandTotal = safeTeamHoursData.reduce((sum, emp) => sum + emp.weekTotal, 0);
    const totalOvertime = safeTeamHoursData.reduce((sum, emp) => sum + emp.overtimeHours, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manager Dashboard" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Team Management</h1>
                        <p className="text-slate-600 mt-1">
                            Monitor team performance and approve timesheets
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                        {pendingTimesheets.length > 0 && (
                            <Badge variant="destructive" className="px-3 py-1">
                                {pendingTimesheets.length} Pending
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Pending Approvals</p>
                                    <p className="text-2xl font-bold text-slate-900">{dashboardStats.pending_count}</p>
                                </div>
                                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Team Size</p>
                                    <p className="text-2xl font-bold text-slate-900">{dashboardStats.total_employees}</p>
                                </div>
                                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">This Week</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatHours(grandTotal)}</p>
                                </div>
                                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Overtime</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatHours(totalOvertime)}</p>
                                </div>
                                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="team-hours" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="team-hours">Team Hours</TabsTrigger>
                        <TabsTrigger value="pending">
                            Pending ({pendingTimesheets.length})
                        </TabsTrigger>
                        <TabsTrigger value="all-timesheets">All Timesheets</TabsTrigger>
                    </TabsList>

                    {/* Team Hours Table */}
                    <TabsContent value="team-hours" className="space-y-6">
                        <Card className="border-slate-200">
                            <CardHeader className="border-b border-slate-200 bg-slate-50">
                                <CardTitle className="text-lg font-semibold text-slate-900">
                                    Weekly Hours Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">

                                        <tr>
                                            <th className="text-left p-4 font-medium text-slate-700">Employee</th>
                                            <th className="text-center p-4 font-medium text-slate-700">Sun</th>
                                            <th className="text-center p-4 font-medium text-slate-700">Mon</th>
                                            <th className="text-center p-4 font-medium text-slate-700">Tue</th>
                                            <th className="text-center p-4 font-medium text-slate-700">Wed</th>
                                            <th className="text-center p-4 font-medium text-slate-700">Thu</th>
                                            <th className="text-center p-4 font-medium text-slate-700">Fri</th>
                                            <th className="text-center p-4 font-medium text-slate-700">Sat</th>
                                            <th className="text-center p-4 font-medium text-slate-700 bg-slate-100">Total</th>
                                            <th className="text-center p-4 font-medium text-slate-700 bg-orange-50">OT</th>
                                        </tr>
                                        
                                        </thead>
                                        <tbody>
                                        {safeTeamHoursData.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="text-center p-8 text-slate-500">
                                                    No team hours data available for this week
                                                </td>
                                            </tr>
                                        ) : (
                                            safeTeamHoursData.map((emp, index) => (
                                                <tr key={emp.employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                    <td className="p-4 border-r border-slate-200">
                                                        <div>
                                                            <p className="font-medium text-slate-900">{emp.employee.name}</p>
                                                            <p className="text-xs text-slate-500">{emp.employee.position}</p>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-4 font-mono">{emp.days.sunday > 0 ? formatHours(emp.days.sunday) : '—'}</td>
                                                    <td className="text-center p-4 font-mono">{emp.days.monday > 0 ? formatHours(emp.days.monday) : '—'}</td>
                                                    <td className="text-center p-4 font-mono">{emp.days.tuesday > 0 ? formatHours(emp.days.tuesday) : '—'}</td>
                                                    <td className="text-center p-4 font-mono">{emp.days.wednesday > 0 ? formatHours(emp.days.wednesday) : '—'}</td>
                                                    <td className="text-center p-4 font-mono">{emp.days.thursday > 0 ? formatHours(emp.days.thursday) : '—'}</td>
                                                    <td className="text-center p-4 font-mono">{emp.days.friday > 0 ? formatHours(emp.days.friday) : '—'}</td>
                                                    <td className="text-center p-4 font-mono">{emp.days.saturday > 0 ? formatHours(emp.days.saturday) : '—'}</td>
                                                    <td className="text-center p-4 font-mono font-semibold bg-slate-100 border-l border-slate-200">
                                                        {formatHours(emp.weekTotal)}
                                                    </td>
                                                    <td className="text-center p-4 font-mono font-semibold bg-orange-50 border-l border-slate-200">
                                                        {emp.overtimeHours > 0 ? formatHours(emp.overtimeHours) : '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                        {safeTeamHoursData.length > 0 && (
                                            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                                            <tr>
                                                <td className="p-4 font-semibold text-slate-900 border-r border-slate-200">Daily Totals</td>
                                                <td className="text-center p-4 font-mono font-semibold">{formatHours(dayTotals.sunday)}</td>
                                                <td className="text-center p-4 font-mono font-semibold">{formatHours(dayTotals.monday)}</td>
                                                <td className="text-center p-4 font-mono font-semibold">{formatHours(dayTotals.tuesday)}</td>
                                                <td className="text-center p-4 font-mono font-semibold">{formatHours(dayTotals.wednesday)}</td>
                                                <td className="text-center p-4 font-mono font-semibold">{formatHours(dayTotals.thursday)}</td>
                                                <td className="text-center p-4 font-mono font-semibold">{formatHours(dayTotals.friday)}</td>
                                                <td className="text-center p-4 font-mono font-semibold">{formatHours(dayTotals.saturday)}</td>
                                                <td className="text-center p-4 font-mono font-bold text-lg bg-slate-200 border-l border-slate-300">
                                                    {formatHours(grandTotal)}
                                                </td>
                                                <td className="text-center p-4 font-mono font-bold text-lg bg-orange-100 border-l border-slate-300">
                                                    {formatHours(totalOvertime)}
                                                </td>
                                            </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Pending Approvals */}
                    <TabsContent value="pending" className="space-y-6">
                        <Card className="border-slate-200">
                            <CardHeader className="border-b border-slate-200 bg-slate-50">
                                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                    Pending Approvals
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {pendingTimesheets.length === 0 ? (
                                    <div className="text-center py-12">
                                        <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-900 mb-2">All Caught Up!</h3>
                                        <p className="text-slate-600">
                                            No timesheets are currently pending your approval.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingTimesheets.map((timesheet) => (
                                            <div key={timesheet.id} className="border border-amber-200 bg-amber-50 rounded-lg p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-4 mb-3">
                                                            <div>
                                                                <h4 className="font-semibold text-slate-900">{timesheet.user.name}</h4>
                                                                <p className="text-sm text-slate-600">{timesheet.user.email}</p>
                                                            </div>
                                                            {getStatusBadge(timesheet.status)}
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <span className="font-medium">Period:</span><br />
                                                                {getWeekLabel(timesheet.week_start_date, timesheet.week_end_date)}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Hours:</span><br />
                                                                {formatHours(timesheet.total_hours)}
                                                                {timesheet.overtime_hours > 0 && (
                                                                    <span className="text-orange-600"> (+{formatHours(timesheet.overtime_hours)} OT)</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Submitted:</span><br />
                                                                {timesheet.submitted_at && formatDate(timesheet.submitted_at)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2 ml-6">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => router.get(`/time-clock/manager/timesheet/${timesheet.id}`)}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            Review
                                                        </Button>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleApprovalAction(timesheet, 'approve')}
                                                                className="bg-emerald-600 hover:bg-emerald-700"
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleApprovalAction(timesheet, 'reject')}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-1" />
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* All Timesheets */}
                    <TabsContent value="all-timesheets" className="space-y-6">
                        {/* Filters */}
                        <Card className="border-slate-200">
                            <CardHeader className="border-b border-slate-200 bg-slate-50">
                                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <Filter className="w-5 h-5" />
                                    Filters
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <Label htmlFor="status-filter" className="text-sm font-medium text-slate-700">Status</Label>
                                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="All statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All statuses</SelectItem>
                                                <SelectItem value="draft">Draft</SelectItem>
                                                <SelectItem value="submitted">Pending Approval</SelectItem>
                                                <SelectItem value="approved">Approved</SelectItem>
                                                <SelectItem value="processed">Processed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="employee-filter" className="text-sm font-medium text-slate-700">Employee</Label>
                                        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="All employees" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All employees</SelectItem>
                                                {subordinates.map((employee) => (
                                                    <SelectItem key={employee.id} value={employee.id.toString()}>
                                                        {employee.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="week-filter" className="text-sm font-medium text-slate-700">Week Start</Label>
                                        <Input
                                            id="week-filter"
                                            type="date"
                                            value={filterWeekStart}
                                            onChange={(e) => setFilterWeekStart(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div className="flex items-end gap-2">
                                        <Button onClick={handleFilter} className="flex-1">
                                            Apply Filters
                                        </Button>
                                        <Button onClick={clearFilters} variant="outline">
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Timesheets Table */}
                        <Card className="border-slate-200">
                            <CardHeader className="border-b border-slate-200 bg-slate-50">
                                <CardTitle className="text-lg font-semibold text-slate-900">
                                    All Timesheets ({allTimesheets.meta?.total || allTimesheets.data?.length || 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {allTimesheets.data.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-900 mb-2">No Timesheets Found</h3>
                                        <p className="text-slate-600">
                                            No timesheets match your current filters.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {allTimesheets.data.map((timesheet) => (
                                            <div key={timesheet.id} className="border border-slate-200 rounded-lg p-6 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-4 mb-3">
                                                            <div>
                                                                <h4 className="font-semibold text-slate-900">{timesheet.user.name}</h4>
                                                                <p className="text-sm text-slate-600">{timesheet.user.email}</p>
                                                            </div>
                                                            {getStatusBadge(timesheet.status)}
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <span className="font-medium">Period:</span><br />
                                                                {getWeekLabel(timesheet.week_start_date, timesheet.week_end_date)}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Hours:</span><br />
                                                                {formatHours(timesheet.total_hours)}
                                                                {timesheet.overtime_hours > 0 && (
                                                                    <span className="text-orange-600"> (+{formatHours(timesheet.overtime_hours)} OT)</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                {timesheet.submitted_at && (
                                                                    <>
                                                                        <span className="font-medium">Submitted:</span><br />
                                                                        {formatDate(timesheet.submitted_at)}
                                                                    </>
                                                                )}
                                                                {timesheet.approved_at && (
                                                                    <>
                                                                        <span className="font-medium">Approved:</span><br />
                                                                        {formatDate(timesheet.approved_at)}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-6">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => router.get(`/time-clock/manager/timesheet/${timesheet.id}`)}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Approval Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {approvalAction === 'approve' ? 'Approve Timesheet' : 'Reject Timesheet'}
                            </DialogTitle>
                        </DialogHeader>
                        {selectedTimesheet && (
                            <div className="space-y-4">
                                <div className="bg-slate-50 border rounded-lg p-4">
                                    <div className="space-y-2">
                                        <p><span className="font-medium">Employee:</span> {selectedTimesheet.user.name}</p>
                                        <p><span className="font-medium">Week:</span> {getWeekLabel(selectedTimesheet.week_start_date, selectedTimesheet.week_end_date)}</p>
                                        <p><span className="font-medium">Total Hours:</span> {formatHours(selectedTimesheet.total_hours)}</p>
                                        {selectedTimesheet.overtime_hours > 0 && (
                                            <p><span className="font-medium">Overtime:</span> {formatHours(selectedTimesheet.overtime_hours)}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="manager-notes">
                                        {approvalAction === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
                                    </Label>
                                    <Textarea
                                        id="manager-notes"
                                        placeholder={
                                            approvalAction === 'approve'
                                                ? "Add any notes about this approval..."
                                                : "Please explain why this timesheet is being rejected..."
                                        }
                                        value={managerNotes}
                                        onChange={(e) => setManagerNotes(e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={submitApproval}
                                        disabled={approvalAction === 'reject' && !managerNotes.trim()}
                                        className={approvalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                                        variant={approvalAction === 'reject' ? 'destructive' : 'default'}
                                    >
                                        {approvalAction === 'approve' ? 'Approve' : 'Reject'} Timesheet
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
