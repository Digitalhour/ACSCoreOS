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
import {Checkbox} from '@/components/ui/checkbox';
import {
    AlertCircle,
    Building2,
    CheckCircle,
    Clock,
    DollarSign,
    FileSpreadsheet,
    FileText,
    Filter,
    Play,
    TrendingUp,
    Users
} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    current_position?: {
        title: string;
    };
    departments?: Department[];
}

interface Department {
    id: number;
    name: string;
}

interface Timesheet {
    id: number;
    user_id: number;
    week_start_date: string;
    week_end_date: string;
    status: 'draft' | 'submitted' | 'approved' | 'processed';
    approved_at: string;
    processed_at?: string;
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    manager_notes: string | null;
    payroll_notes: string | null;
    user: User;
    approved_by?: User;
    processed_by?: User;
}

interface Stats {
    approved_count: number;
    processed_count: number;
    submitted_count: number;
    processed_this_week: number;
    total_approved_hours: number;
    total_approved_overtime: number;
}

interface StatusBreakdown {
    [key: string]: {
        count: number;
        hours: number;
    };
}

interface DepartmentSummary {
    name: string;
    approved_count: number;
    processed_count: number;
    total_hours: number;
    overtime_hours: number;
}

interface Props {
    approvedTimesheets: {
        data: Timesheet[];
        links: any[];
        meta: any;
    };
    processedTimesheets: Timesheet[];
    departments: Department[];
    employees: User[];
    stats: Stats;
    statusBreakdown: StatusBreakdown;
    departmentSummary: DepartmentSummary[];
    filters: {
        week_start?: string;
        week_end?: string;
        employee_id?: string;
        department_id?: string;
    };
}

const breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Payroll Processing',
        href: '/time-clock/payroll/dashboard',
    },
];

export default function PayrollDashboard({
                                             approvedTimesheets,
                                             processedTimesheets,
                                             departments,
                                             employees,
                                             stats,
                                             statusBreakdown,
                                             departmentSummary,
                                             filters
                                         }: Props) {
    const [selectedTimesheets, setSelectedTimesheets] = useState<number[]>([]);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [singleDialogOpen, setSingleDialogOpen] = useState(false);
    const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
    const [payrollNotes, setPayrollNotes] = useState('');

    // Filter states
    const [filterEmployee, setFilterEmployee] = useState(filters.employee_id || 'all');
    const [filterDepartment, setFilterDepartment] = useState(filters.department_id || 'all');
    const [filterWeekStart, setFilterWeekStart] = useState(filters.week_start || '');
    const [filterWeekEnd, setFilterWeekEnd] = useState(filters.week_end || '');

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

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'submitted': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'processed': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const handleSelectTimesheet = (timesheetId: number, checked: boolean) => {
        if (checked) {
            setSelectedTimesheets([...selectedTimesheets, timesheetId]);
        } else {
            setSelectedTimesheets(selectedTimesheets.filter(id => id !== timesheetId));
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedTimesheets(approvedTimesheets.data.map(t => t.id));
        } else {
            setSelectedTimesheets([]);
        }
    };

    const handleSingleProcess = (timesheet: Timesheet) => {
        setSelectedTimesheet(timesheet);
        setPayrollNotes('');
        setSingleDialogOpen(true);
    };

    const handleBulkProcess = () => {
        if (selectedTimesheets.length === 0) return;
        setPayrollNotes('');
        setBulkDialogOpen(true);
    };

    const submitSingleProcess = () => {
        if (!selectedTimesheet) return;

        router.post(`/time-clock/payroll/process/${selectedTimesheet.id}`, {
            payroll_notes: payrollNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSingleDialogOpen(false);
                setSelectedTimesheet(null);
                setPayrollNotes('');
            },
        });
    };

    const submitBulkProcess = () => {
        router.post('/time-clock/payroll/bulk-process', {
            timesheet_ids: selectedTimesheets,
            payroll_notes: payrollNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setBulkDialogOpen(false);
                setSelectedTimesheets([]);
                setPayrollNotes('');
            },
        });
    };

    const handleExport = (format: 'csv' | 'pdf') => {
        const params = new URLSearchParams();
        params.set('format', format);
        params.set('status', 'approved');
        if (filterWeekStart) params.set('week_start', filterWeekStart);
        if (filterWeekEnd) params.set('week_end', filterWeekEnd);
        if (filterEmployee && filterEmployee !== 'all') params.set('employee_id', filterEmployee);
        if (filterDepartment && filterDepartment !== 'all') params.set('department_id', filterDepartment);

        window.location.href = `/time-clock/payroll/export?${params.toString()}`;
    };

    const handleFilter = () => {
        const params = new URLSearchParams();
        if (filterEmployee && filterEmployee !== 'all') params.set('employee_id', filterEmployee);
        if (filterDepartment && filterDepartment !== 'all') params.set('department_id', filterDepartment);
        if (filterWeekStart) params.set('week_start', filterWeekStart);
        if (filterWeekEnd) params.set('week_end', filterWeekEnd);

        router.get('/time-clock/payroll/dashboard', Object.fromEntries(params), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setFilterEmployee('all');
        setFilterDepartment('all');
        setFilterWeekStart('');
        setFilterWeekEnd('');
        router.get('/time-clock/payroll/dashboard', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payroll Processing" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Payroll Processing</h1>
                        <p className="text-slate-600 mt-1">
                            Process approved timesheets and manage payroll data
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => router.get('/time-clock/payroll/departments')}
                        >
                            <Building2 className="w-4 h-4 mr-2" />
                            Departments
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.get('/time-clock/payroll/reports')}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Reports
                        </Button>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <Card className="border-slate-200 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Ready to Process</p>
                                    <p className="text-2xl font-bold text-slate-900">{stats.approved_count}</p>
                                </div>
                                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Awaiting Approval</p>
                                    <p className="text-2xl font-bold text-slate-900">{stats.submitted_count}</p>
                                </div>
                                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Processed This Week</p>
                                    <p className="text-2xl font-bold text-slate-900">{stats.processed_this_week}</p>
                                </div>
                                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Total Ready Hours</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatHours(stats.total_approved_hours)}</p>
                                </div>
                                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Overtime Hours</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatHours(stats.total_approved_overtime)}</p>
                                </div>
                                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Total Processed</p>
                                    <p className="text-2xl font-bold text-slate-900">{stats.processed_count}</p>
                                </div>
                                <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <Users className="h-6 w-6 text-emerald-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Status Breakdown & Department Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status Breakdown */}
                    <Card className="border-slate-200">
                        <CardHeader className="border-b border-slate-200 bg-slate-50">
                            <CardTitle className="text-lg font-semibold text-slate-900">Status Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {Object.entries(statusBreakdown).map(([status, data]) => (
                                    <div key={status} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Badge className={getStatusColor(status)}>
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </Badge>
                                            <span className="text-sm font-medium">{data.count} timesheets</span>
                                        </div>
                                        <span className="text-sm text-slate-600">{formatHours(data.hours)}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Department Summary */}
                    <Card className="border-slate-200">
                        <CardHeader className="border-b border-slate-200 bg-slate-50">
                            <CardTitle className="text-lg font-semibold text-slate-900">Top Departments</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {departmentSummary.length === 0 ? (
                                    <p className="text-slate-600 text-center py-4">No department data available</p>
                                ) : (
                                    departmentSummary.map((dept) => (
                                        <div key={dept.name} className="border border-slate-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-slate-900">{dept.name}</h4>
                                                <span className="text-lg font-bold">{formatHours(dept.total_hours)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-600">Ready:</span> {dept.approved_count}
                                                </div>
                                                <div>
                                                    <span className="text-slate-600">Overtime:</span> {formatHours(dept.overtime_hours)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div>
                                <Label className="text-sm font-medium text-slate-700">Department</Label>
                                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="All departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All departments</SelectItem>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id.toString()}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-sm font-medium text-slate-700">Employee</Label>
                                <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="All employees" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All employees</SelectItem>
                                        {employees.map((employee) => (
                                            <SelectItem key={employee.id} value={employee.id.toString()}>
                                                {employee.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-sm font-medium text-slate-700">Week Start</Label>
                                <Input
                                    type="date"
                                    value={filterWeekStart}
                                    onChange={(e) => setFilterWeekStart(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label className="text-sm font-medium text-slate-700">Week End</Label>
                                <Input
                                    type="date"
                                    value={filterWeekEnd}
                                    onChange={(e) => setFilterWeekEnd(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex items-end gap-2">
                                <Button onClick={handleFilter} className="flex-1">
                                    Apply
                                </Button>
                                <Button onClick={clearFilters} variant="outline">
                                    Clear
                                </Button>
                            </div>

                            <div className="flex items-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExport('csv')}
                                    className="flex-1"
                                >
                                    <FileSpreadsheet className="w-4 h-4 mr-1" />
                                    CSV
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExport('pdf')}
                                    className="flex-1"
                                >
                                    <FileText className="w-4 h-4 mr-1" />
                                    PDF
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Ready to Process Timesheets */}
                <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold text-slate-900">
                                Ready to Process ({approvedTimesheets.meta?.total || approvedTimesheets.data?.length || 0})
                            </CardTitle>
                            <div className="flex items-center gap-4">
                                {selectedTimesheets.length > 0 && (
                                    <Button onClick={handleBulkProcess} className="bg-blue-600 hover:bg-blue-700">
                                        <Play className="w-4 h-4 mr-2" />
                                        Process ({selectedTimesheets.length})
                                    </Button>
                                )}
                                {approvedTimesheets.data.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={selectedTimesheets.length === approvedTimesheets.data.length}
                                            onCheckedChange={handleSelectAll}
                                        />
                                        <Label className="text-sm font-medium">Select All</Label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {approvedTimesheets.data.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                                <h3 className="text-lg font-medium text-slate-900 mb-2">All Processed!</h3>
                                <p className="text-slate-600">
                                    No approved timesheets are currently waiting for processing.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {approvedTimesheets.data.map((timesheet) => (
                                    <div key={timesheet.id} className="border border-slate-200 rounded-lg p-6 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <Checkbox
                                                checked={selectedTimesheets.includes(timesheet.id)}
                                                onCheckedChange={(checked) => handleSelectTimesheet(timesheet.id, checked === true)}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-3">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900">{timesheet.user.name}</h4>
                                                        <p className="text-sm text-slate-600">{timesheet.user.email}</p>
                                                        {timesheet.user.departments && timesheet.user.departments.length > 0 && (
                                                            <p className="text-sm text-slate-500">
                                                                {timesheet.user.departments.map(d => d.name).join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Badge className="bg-green-100 text-green-700 border-green-200">
                                                        Approved
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <span className="font-medium">Period:</span><br />
                                                        {getWeekLabel(timesheet.week_start_date, timesheet.week_end_date)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Regular:</span> {formatHours(timesheet.regular_hours)}<br />
                                                        <span className="font-medium">Overtime:</span> {formatHours(timesheet.overtime_hours)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Total Hours:</span><br />
                                                        <span className="text-lg font-semibold">{formatHours(timesheet.total_hours)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Approved:</span><br />
                                                        {formatDate(timesheet.approved_at)}
                                                    </div>
                                                </div>
                                                {timesheet.manager_notes && (
                                                    <div className="mt-3 p-3 bg-slate-50 rounded">
                                                        <span className="font-medium text-sm">Manager Notes:</span>
                                                        <p className="text-sm text-slate-600 mt-1">{timesheet.manager_notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSingleProcess(timesheet)}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Play className="w-4 h-4 mr-2" />
                                                Process
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recently Processed */}
                {processedTimesheets.length > 0 && (
                    <Card className="border-slate-200">
                        <CardHeader className="border-b border-slate-200 bg-slate-50">
                            <CardTitle className="text-lg font-semibold text-slate-900">
                                Recently Processed
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {processedTimesheets.map((timesheet) => (
                                    <div key={timesheet.id} className="border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <h4 className="font-semibold text-slate-900">{timesheet.user.name}</h4>
                                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                                        Processed
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <span className="font-medium">Period:</span><br />
                                                        {getWeekLabel(timesheet.week_start_date, timesheet.week_end_date)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Total Hours:</span><br />
                                                        {formatHours(timesheet.total_hours)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Processed:</span><br />
                                                        {timesheet.processed_at && formatDate(timesheet.processed_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Single Process Dialog */}
                <Dialog open={singleDialogOpen} onOpenChange={setSingleDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Process Timesheet</DialogTitle>
                        </DialogHeader>
                        {selectedTimesheet && (
                            <div className="space-y-4">
                                <div className="bg-slate-50 border rounded-lg p-4">
                                    <h4 className="font-medium mb-2">{selectedTimesheet.user.name}</h4>
                                    <div className="text-sm space-y-1">
                                        <p><span className="font-medium">Week:</span> {getWeekLabel(selectedTimesheet.week_start_date, selectedTimesheet.week_end_date)}</p>
                                        <p><span className="font-medium">Total Hours:</span> {formatHours(selectedTimesheet.total_hours)}</p>
                                        <p><span className="font-medium">Regular:</span> {formatHours(selectedTimesheet.regular_hours)} | <span className="font-medium">Overtime:</span> {formatHours(selectedTimesheet.overtime_hours)}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="payroll-notes">Payroll Notes (Optional)</Label>
                                    <Textarea
                                        id="payroll-notes"
                                        placeholder="Add any payroll processing notes..."
                                        value={payrollNotes}
                                        onChange={(e) => setPayrollNotes(e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setSingleDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={submitSingleProcess} className="bg-blue-600 hover:bg-blue-700">
                                        Process Timesheet
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Bulk Process Dialog */}
                <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Bulk Process Timesheets</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="bg-slate-50 border rounded-lg p-4">
                                <p className="font-medium mb-2">Processing {selectedTimesheets.length} timesheets</p>
                                <p className="text-sm text-slate-600">
                                    This will mark all selected timesheets as processed and finalize them for payroll.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bulk-payroll-notes">Payroll Notes (Optional)</Label>
                                <Textarea
                                    id="bulk-payroll-notes"
                                    placeholder="Add notes that will apply to all processed timesheets..."
                                    value={payrollNotes}
                                    onChange={(e) => setPayrollNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={submitBulkProcess} className="bg-blue-600 hover:bg-blue-700">
                                    Process {selectedTimesheets.length} Timesheets
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
