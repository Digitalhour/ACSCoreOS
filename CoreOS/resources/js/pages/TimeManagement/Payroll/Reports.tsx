import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {BarChart3, Calendar, FileText, TrendingUp, Users} from 'lucide-react';

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
        title: 'Payroll Dashboard',
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

    const handleFilter = (weekStart: string, weekEnd: string) => {
        router.get('/time-clock/payroll/reports', {
            week_start: weekStart,
            week_end: weekEnd,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payroll Reports" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Payroll Reports</h1>
                        <p className="text-slate-600 mt-1">
                            View processed timesheet summaries and analytics
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => router.get('/time-clock/payroll/dashboard')}
                    >
                        Back to Dashboard
                    </Button>
                </div>

                {/* Date Range Filter */}
                <Card className="border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-slate-50">
                        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Date Range
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label className="text-sm font-medium text-slate-700">Start Date</Label>
                                <Input
                                    type="date"
                                    defaultValue={filters.weekStart}
                                    onChange={(e) => handleFilter(e.target.value, filters.weekEnd)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-slate-700">End Date</Label>
                                <Input
                                    type="date"
                                    defaultValue={filters.weekEnd}
                                    onChange={(e) => handleFilter(filters.weekStart, e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={() => {
                                        const today = new Date();
                                        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
                                        const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
                                        handleFilter(
                                            weekStart.toISOString().split('T')[0],
                                            weekEnd.toISOString().split('T')[0]
                                        );
                                    }}
                                    variant="outline"
                                    className="w-full"
                                >
                                    This Week
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Total Timesheets</p>
                                    <p className="text-2xl font-bold text-slate-900">{weeklySummary?.total_timesheets || 0}</p>
                                </div>
                                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Regular Hours</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatHours(weeklySummary?.total_regular_hours || 0)}</p>
                                </div>
                                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Overtime Hours</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatHours(weeklySummary?.total_overtime_hours || 0)}</p>
                                </div>
                                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <BarChart3 className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Total Hours</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatHours(weeklySummary?.total_hours || 0)}</p>
                                </div>
                                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Users className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Employee Totals */}
                    <Card className="border-slate-200">
                        <CardHeader className="border-b border-slate-200 bg-slate-50">
                            <CardTitle className="text-lg font-semibold text-slate-900">
                                Employee Hours Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {employeeTotals.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                                    <p className="text-slate-600">No employee data for selected period</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {employeeTotals.map((employee) => (
                                        <div key={employee.user_id} className="border border-slate-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-slate-900">{employee.user.name}</h4>
                                                <span className="text-lg font-bold text-slate-900">
                                                    {formatHours(employee.total_hours)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-600">Regular:</span><br />
                                                    <span className="font-medium">{formatHours(employee.total_regular)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-600">Overtime:</span><br />
                                                    <span className="font-medium">{formatHours(employee.total_overtime)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-600">Timesheets:</span><br />
                                                    <span className="font-medium">{employee.timesheet_count}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Status Breakdown */}
                    <Card className="border-slate-200">
                        <CardHeader className="border-b border-slate-200 bg-slate-50">
                            <CardTitle className="text-lg font-semibold text-slate-900">
                                Status Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {statusBreakdown.length === 0 ? (
                                <div className="text-center py-8">
                                    <BarChart3 className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                                    <p className="text-slate-600">No status data for selected period</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {statusBreakdown.map((status) => (
                                        <div key={status.status} className="border border-slate-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-slate-900 capitalize">{status.status}</h4>
                                                <span className="text-lg font-bold text-slate-900">
                                                    {status.count}
                                                </span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-slate-600">Total Hours: </span>
                                                <span className="font-medium">{formatHours(status.hours)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
