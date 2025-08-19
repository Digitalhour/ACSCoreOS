import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {
    BarChart3,
    Building2,
    Calendar,
    Clock,
    DollarSign,
    Download,
    FileSpreadsheet,
    FileText,
    TrendingUp,
    Users
} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
}

interface WeeklySummary {
    total_timesheets: number;
    total_regular_hours: number;
    total_overtime_hours: number;
    total_hours: number;
}

interface EmployeeTotal {
    user_id: number;
    total_regular: number;
    total_overtime: number;
    total_hours: number;
    timesheet_count: number;
    user: User;
}

interface StatusBreakdown {
    status: string;
    count: number;
    hours: number;
}

interface Props {
    weeklySummary: WeeklySummary;
    employeeTotals: EmployeeTotal[];
    statusBreakdown: StatusBreakdown[];
    filters: {
        weekStart: string;
        weekEnd: string;
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
    {
        title: 'Reports',
        href: '/time-clock/payroll/reports',
    },
];

export default function PayrollReports({
                                           weeklySummary,
                                           employeeTotals,
                                           statusBreakdown,
                                           filters
                                       }: Props) {
    const formatHours = (hours: number): string => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
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

    const handleFilter = (weekStart: string, weekEnd: string) => {
        router.get('/time-clock/payroll/reports', {
            week_start: weekStart,
            week_end: weekEnd,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const getThisWeek = () => {
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        return {
            start: weekStart.toISOString().split('T')[0],
            end: weekEnd.toISOString().split('T')[0]
        };
    };

    const getLastWeek = () => {
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay() - 7));
        const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() - 1));
        return {
            start: weekStart.toISOString().split('T')[0],
            end: weekEnd.toISOString().split('T')[0]
        };
    };

    const handleExportReports = (format: 'csv' | 'pdf') => {
        const params = new URLSearchParams();
        params.set('format', format);
        params.set('week_start', filters.weekStart);
        params.set('week_end', filters.weekEnd);
        params.set('status', 'processed');

        window.location.href = `/time-clock/payroll/export?${params.toString()}`;
    };

    // Calculate percentages for status breakdown
    const totalTimesheets = statusBreakdown.reduce((sum, item) => sum + item.count, 0);
    const totalHours = statusBreakdown.reduce((sum, item) => sum + item.hours, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payroll Reports" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Payroll Reports</h1>
                        <p className="text-slate-600 mt-1">
                            Comprehensive timesheet analytics and processed payroll data
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => handleExportReports('csv')}
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleExportReports('pdf')}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Export PDF
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.get('/time-clock/payroll/dashboard')}
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                </div>

                {/* Date Range Controls */}
                <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Report Period
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <Label className="text-sm font-medium text-slate-700">Start Date</Label>
                                <Input
                                    type="date"
                                    value={filters.weekStart}
                                    onChange={(e) => handleFilter(e.target.value, filters.weekEnd)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-slate-700">End Date</Label>
                                <Input
                                    type="date"
                                    value={filters.weekEnd}
                                    onChange={(e) => handleFilter(filters.weekStart, e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={() => {
                                        const thisWeek = getThisWeek();
                                        handleFilter(thisWeek.start, thisWeek.end);
                                    }}
                                    variant="outline"
                                    className="w-full"
                                >
                                    This Week
                                </Button>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={() => {
                                        const lastWeek = getLastWeek();
                                        handleFilter(lastWeek.start, lastWeek.end);
                                    }}
                                    variant="outline"
                                    className="w-full"
                                >
                                    Last Week
                                </Button>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={() => {
                                        const today = new Date();
                                        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                                        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                                        handleFilter(
                                            monthStart.toISOString().split('T')[0],
                                            monthEnd.toISOString().split('T')[0]
                                        );
                                    }}
                                    variant="outline"
                                    className="w-full"
                                >
                                    This Month
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-slate-200 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Total Timesheets</p>
                                    <p className="text-2xl font-bold text-slate-900">{weeklySummary?.total_timesheets || 0}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        For selected period
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Regular Hours</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatHours(weeklySummary?.total_regular_hours || 0)}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Standard work hours
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Overtime Hours</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatHours(weeklySummary?.total_overtime_hours || 0)}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {weeklySummary?.total_hours ?
                                            `${Math.round((weeklySummary.total_overtime_hours / weeklySummary.total_hours) * 100)}% of total` :
                                            '0% of total'
                                        }
                                    </p>
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
                                    <p className="text-sm font-medium text-slate-600">Total Hours</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatHours(weeklySummary?.total_hours || 0)}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        All processed hours
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Employees Performance */}
                    <Card className="border-slate-200">
                        <CardHeader className="border-b border-slate-200 bg-slate-50">
                            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Employee Hours Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {employeeTotals.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Employee Data</h3>
                                    <p className="text-slate-600">No processed timesheets found for selected period</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {employeeTotals.map((employee) => (
                                        <div key={employee.user_id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h4 className="font-semibold text-slate-900">{employee.user.name}</h4>
                                                    <p className="text-sm text-slate-600">{employee.user.email}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-bold text-slate-900">
                                                        {formatHours(employee.total_hours)}
                                                    </span>
                                                    <p className="text-xs text-slate-500">
                                                        {employee.timesheet_count} timesheet{employee.timesheet_count !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                                    <p className="text-xs font-medium text-green-700">Regular</p>
                                                    <p className="text-sm font-bold text-green-900">{formatHours(employee.total_regular)}</p>
                                                </div>
                                                <div className="bg-orange-50 rounded-lg p-3 text-center">
                                                    <p className="text-xs font-medium text-orange-700">Overtime</p>
                                                    <p className="text-sm font-bold text-orange-900">{formatHours(employee.total_overtime)}</p>
                                                </div>
                                            </div>
                                            {employee.total_overtime > 0 && (
                                                <div className="mt-2">
                                                    <div className="bg-slate-200 rounded-full h-2">
                                                        <div
                                                            className="bg-orange-500 h-2 rounded-full"
                                                            style={{
                                                                width: `${Math.min((employee.total_overtime / employee.total_hours) * 100, 100)}%`
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {Math.round((employee.total_overtime / employee.total_hours) * 100)}% overtime
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Status Analysis */}
                    <Card className="border-slate-200">
                        <CardHeader className="border-b border-slate-200 bg-slate-50">
                            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Status Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {statusBreakdown.length === 0 ? (
                                <div className="text-center py-8">
                                    <BarChart3 className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Status Data</h3>
                                    <p className="text-slate-600">No timesheet data found for selected period</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {statusBreakdown.map((status) => (
                                        <div key={status.status} className="border border-slate-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <Badge className={getStatusColor(status.status)} variant="outline">
                                                        {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                                                    </Badge>
                                                    <span className="font-medium text-slate-900">
                                                        {status.count} timesheet{status.count !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <span className="text-lg font-bold text-slate-900">
                                                    {formatHours(status.hours)}
                                                </span>
                                            </div>

                                            {/* Progress bars */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-600">Count</span>
                                                    <span className="text-slate-900">
                                                        {totalTimesheets > 0 ? Math.round((status.count / totalTimesheets) * 100) : 0}%
                                                    </span>
                                                </div>
                                                <div className="bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className="bg-blue-500 h-2 rounded-full"
                                                        style={{
                                                            width: `${totalTimesheets > 0 ? (status.count / totalTimesheets) * 100 : 0}%`
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-600">Hours</span>
                                                    <span className="text-slate-900">
                                                        {totalHours > 0 ? Math.round((status.hours / totalHours) * 100) : 0}%
                                                    </span>
                                                </div>
                                                <div className="bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className="bg-green-500 h-2 rounded-full"
                                                        style={{
                                                            width: `${totalHours > 0 ? (status.hours / totalHours) * 100 : 0}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Summary */}
                                    <div className="bg-slate-50 rounded-lg p-4 mt-4">
                                        <h4 className="font-medium text-slate-900 mb-2">Period Summary</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-slate-600">Total Timesheets:</span>
                                                <span className="font-bold text-slate-900 ml-2">{totalTimesheets}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-600">Total Hours:</span>
                                                <span className="font-bold text-slate-900 ml-2">{formatHours(totalHours)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button
                                variant="outline"
                                onClick={() => router.get('/time-clock/payroll/dashboard')}
                                className="h-20 flex-col gap-2"
                            >
                                <Building2 className="w-6 h-6" />
                                <span>Return to Dashboard</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.get('/time-clock/payroll/departments')}
                                className="h-20 flex-col gap-2"
                            >
                                <Users className="w-6 h-6" />
                                <span>View Departments</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleExportReports('csv')}
                                className="h-20 flex-col gap-2"
                            >
                                <FileSpreadsheet className="w-6 h-6" />
                                <span>Export All Data</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
