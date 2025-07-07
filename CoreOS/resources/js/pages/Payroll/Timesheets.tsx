import React, {useEffect, useState} from 'react';
import {AlertTriangle, Calendar, Download, Eye, FileText, Hourglass, Lock, Search, Unlock, Users} from 'lucide-react';
import {Head} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Textarea} from "@/components/ui/textarea";

interface Timesheet {
    id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    week_start_date: string;
    week_end_date: string;
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    break_hours: number;
    status: string;
    submitted_at?: string;
    approved_at?: string;
    locked_at?: string;
    self_submitted: boolean;
    submitted_by?: string;
    approved_by?: string;
    locked_by?: string;
    departments: string[];
}

interface SummaryStats {
    total_employees: number;
    total_hours: number;
    total_regular: number;
    total_overtime: number;
    pending_approval: number;
    locked_count: number;
    estimated_costs?: {
        regular_cost: number;
        overtime_cost: number;
        total_cost: number;
    };
    status_breakdown?: {
        draft: number;
        submitted: number;
        approved: number;
        rejected: number;
        locked: number;
    };
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface DateRange {
    start: string;
    end: string;
}

interface LockForm {
    lock_reason: string;
}

interface UnlockForm {
    unlock_reason: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Payroll Timesheets',
        href: '/payroll/timesheets',
    },
];

const PayrollTimesheetView: React.FC = () => {
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange>({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [showLockModal, setShowLockModal] = useState<boolean>(false);
    const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
    const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
    const [lockForm, setLockForm] = useState<LockForm>({ lock_reason: '' });
    const [unlockForm, setUnlockForm] = useState<UnlockForm>({ unlock_reason: '' });
    const [summaryStats, setSummaryStats] = useState<SummaryStats>({
        total_employees: 0,
        total_hours: 0,
        total_regular: 0,
        total_overtime: 0,
        pending_approval: 0,
        locked_count: 0
    });

    useEffect(() => {
        fetchTimesheets();
        fetchSummaryStats();
    }, [selectedPeriod, dateRange, departmentFilter, statusFilter, searchTerm]);

    const fetchTimesheets = async (): Promise<void> => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('period', selectedPeriod);
            if (searchTerm) params.append('search', searchTerm);
            if (departmentFilter && departmentFilter !== 'all') params.append('department', departmentFilter);
            if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
            if (selectedPeriod === 'custom') {
                if (dateRange.start) params.append('start_date', dateRange.start);
                if (dateRange.end) params.append('end_date', dateRange.end);
            }

            const response = await fetch(`/api/payroll/timesheets?${params}`);
            const data = await response.json();

            setTimesheets(data.timesheets || []);
            setPagination(data.pagination || null);
        } catch (error) {
            console.error('Failed to fetch timesheets:', error);
            showNotification('Failed to fetch timesheets', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchSummaryStats = async (): Promise<void> => {
        try {
            const params = new URLSearchParams();
            params.append('period', selectedPeriod);
            if (departmentFilter && departmentFilter !== 'all') params.append('department', departmentFilter);
            if (selectedPeriod === 'custom') {
                if (dateRange.start) params.append('start_date', dateRange.start);
                if (dateRange.end) params.append('end_date', dateRange.end);
            }

            const response = await fetch(`/api/payroll/summary?${params}`);
            const data = await response.json();
            setSummaryStats(data);
        } catch (error) {
            console.error('Failed to fetch summary stats:', error);
        }
    };

    const handleLockTimesheet = async (): Promise<void> => {
        if (!selectedTimesheet) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/timesheet/lock/${selectedTimesheet.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(lockForm)
            });

            const data = await response.json();

            if (response.ok) {
                setShowLockModal(false);
                setLockForm({ lock_reason: '' });
                setSelectedTimesheet(null);
                fetchTimesheets();
                fetchSummaryStats();
                showNotification('Timesheet locked successfully!', 'success');
            } else {
                showNotification(data.error || 'Failed to lock timesheet', 'error');
            }
        } catch (error) {
            showNotification('Failed to lock timesheet. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUnlockTimesheet = async (): Promise<void> => {
        if (!selectedTimesheet || !unlockForm.unlock_reason.trim()) {
            showNotification('Please provide a reason for unlocking', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/timesheet/unlock/${selectedTimesheet.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(unlockForm)
            });

            const data = await response.json();

            if (response.ok) {
                setShowUnlockModal(false);
                setUnlockForm({ unlock_reason: '' });
                setSelectedTimesheet(null);
                fetchTimesheets();
                fetchSummaryStats();
                showNotification('Timesheet unlocked successfully!', 'success');
            } else {
                showNotification(data.error || 'Failed to unlock timesheet', 'error');
            }
        } catch (error) {
            showNotification('Failed to unlock timesheet. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkLock = async (timesheetIds: number[]): Promise<void> => {
        setLoading(true);
        try {
            const response = await fetch('/api/payroll/bulk-lock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    timesheet_ids: timesheetIds,
                    lock_reason: 'Bulk locked for payroll processing'
                })
            });

            const data = await response.json();

            if (response.ok) {
                fetchTimesheets();
                fetchSummaryStats();
                showNotification(`${data.locked_count} timesheets locked successfully!`, 'success');
            } else {
                showNotification(data.error || 'Failed to lock timesheets', 'error');
            }
        } catch (error) {
            showNotification('Failed to lock timesheets. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExportTimesheets = async (format: string = 'csv'): Promise<void> => {
        try {
            const params = new URLSearchParams();
            params.append('format', format);
            params.append('period', selectedPeriod);
            if (searchTerm) params.append('search', searchTerm);
            if (departmentFilter && departmentFilter !== 'all') params.append('department', departmentFilter);
            if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
            if (selectedPeriod === 'custom') {
                if (dateRange.start) params.append('start_date', dateRange.start);
                if (dateRange.end) params.append('end_date', dateRange.end);
            }

            const url = `/api/payroll/export?${params}`;

            // Use window.open for file download instead of fetch
            window.open(url, '_blank');

            showNotification('Export started successfully!', 'success');
        } catch (error) {
            showNotification('Export failed. Please try again.', 'error');
        }
    };

    const showNotification = (message: string, type: 'success' | 'error'): void => {
        console.log(`${type}: ${message}`);
        // You can implement a proper notification system here
    };

    const formatHours = (hours: number | null): string => {
        if (!hours) return '0.00';
        return parseFloat(hours.toString()).toFixed(2);
    };

    const formatCurrency = (amount: number | null): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            draft: { color: 'bg-gray-100 text-gray-800', text: 'Draft' },
            submitted: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
            approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
            rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
            locked: { color: 'bg-blue-100 text-blue-800', text: 'Locked' }
        };

        const badge = badges[status as keyof typeof badges] || badges.draft;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.text}
            </span>
        );
    };

    const approvedTimesheets = timesheets.filter(t => t.status === 'approved');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payroll Timesheets" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Payroll Timesheets</h1>
                        <p className="text-muted-foreground">
                            Manage timesheet processing for payroll
                        </p>
                    </div>

                    <div className="flex items-center space-x-3">
                        {approvedTimesheets.length > 0 && (
                            <Button
                                onClick={() => handleBulkLock(approvedTimesheets.map(t => t.id))}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Lock className="w-4 h-4 mr-2" />
                                Bulk Lock Approved ({approvedTimesheets.length})
                            </Button>
                        )}
                        <Button
                            onClick={() => handleExportTimesheets('csv')}
                            variant="outline"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                        <Button
                            onClick={() => handleExportTimesheets('pdf')}
                            variant="outline"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Export PDF
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-muted-foreground">Employees</p>
                                    <p className="text-lg font-semibold">{summaryStats.total_employees}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                    <Hourglass className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                                    <p className="text-lg font-semibold">{formatHours(summaryStats.total_hours)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center">
                                <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
                                    <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-muted-foreground">Regular</p>
                                    <p className="text-lg font-semibold">{formatHours(summaryStats.total_regular)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-muted-foreground">Overtime</p>
                                    <p className="text-lg font-semibold">{formatHours(summaryStats.total_overtime)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                                    <Calendar className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                                    <p className="text-lg font-semibold">{summaryStats.pending_approval}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                    <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-muted-foreground">Locked</p>
                                    <p className="text-lg font-semibold">{summaryStats.locked_count}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Cost Summary */}
                {summaryStats.estimated_costs && (
                    <Card>
                        <CardContent className="p-4">
                            <h3 className="text-lg font-semibold mb-4">Estimated Payroll Costs</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Regular Hours Cost</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {formatCurrency(summaryStats.estimated_costs.regular_cost)}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Overtime Cost</p>
                                    <p className="text-xl font-bold text-amber-600">
                                        {formatCurrency(summaryStats.estimated_costs.overtime_cost)}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Total Cost</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {formatCurrency(summaryStats.estimated_costs.total_cost)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <Label>Pay Period</Label>
                                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="current">Current Period</SelectItem>
                                        <SelectItem value="previous">Previous Period</SelectItem>
                                        <SelectItem value="custom">Custom Range</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedPeriod === 'custom' && (
                                <>
                                    <div>
                                        <Label>Start Date</Label>
                                        <Input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <Label>End Date</Label>
                                        <Input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <Label>Department</Label>
                                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        <SelectItem value="hr">Human Resources</SelectItem>
                                        <SelectItem value="it">Information Technology</SelectItem>
                                        <SelectItem value="sales">Sales</SelectItem>
                                        <SelectItem value="marketing">Marketing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="locked">Locked</SelectItem>
                                        <SelectItem value="submitted">Pending Approval</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Timesheets Table */}
                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : timesheets.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-2 text-sm font-medium">No timesheets found</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    No timesheets match your current filters.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Employee</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Period</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Hours</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Regular</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Overtime</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                    {timesheets.map((timesheet) => (
                                        <tr key={timesheet.id} className="hover:bg-muted/50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {timesheet.user_name}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {timesheet.user_email}
                                                    </div>
                                                    {timesheet.departments && timesheet.departments.length > 0 && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {timesheet.departments.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {formatDate(timesheet.week_start_date)} - {formatDate(timesheet.week_end_date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {formatHours(timesheet.total_hours)}h
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                                {formatHours(timesheet.regular_hours)}h
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">
                                                {formatHours(timesheet.overtime_hours)}h
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="space-y-1">
                                                    {getStatusBadge(timesheet.status)}
                                                    {!timesheet.self_submitted && (
                                                        <div className="flex items-center text-xs text-amber-600">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Manager submitted
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            // View details logic - you can implement this
                                                            console.log('View timesheet details:', timesheet.id);
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>

                                                    {timesheet.status === 'approved' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedTimesheet(timesheet);
                                                                setShowLockModal(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-700"
                                                        >
                                                            <Lock className="w-4 h-4" />
                                                        </Button>
                                                    )}

                                                    {timesheet.status === 'locked' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedTimesheet(timesheet);
                                                                setShowUnlockModal(true);
                                                            }}
                                                            className="text-amber-600 hover:text-amber-700"
                                                        >
                                                            <Unlock className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {pagination && pagination.total > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Showing {pagination.from} to {pagination.to} of {pagination.total} results
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const params = new URLSearchParams();
                                        params.append('period', selectedPeriod);
                                        params.append('page', (pagination.current_page - 1).toString());
                                        params.append('per_page', pagination.per_page.toString());

                                        if (searchTerm) params.append('search', searchTerm);
                                        if (departmentFilter && departmentFilter !== 'all') params.append('department', departmentFilter);
                                        if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
                                        if (selectedPeriod === 'custom') {
                                            if (dateRange.start) params.append('start_date', dateRange.start);
                                            if (dateRange.end) params.append('end_date', dateRange.end);
                                        }

                                        const response = await fetch(`/api/payroll/timesheets?${params}`);
                                        const data = await response.json();
                                        setTimesheets(data.timesheets || []);
                                        setPagination(data.pagination || null);
                                    } catch (error) {
                                        console.error('Failed to fetch page:', error);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={pagination.current_page <= 1}
                            >
                                Previous
                            </Button>
                            <span className="text-sm">
                                        Page {pagination.current_page} of {pagination.last_page}
                                    </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const params = new URLSearchParams();
                                        params.append('period', selectedPeriod);
                                        params.append('page', (pagination.current_page + 1).toString());
                                        params.append('per_page', pagination.per_page.toString());

                                        if (searchTerm) params.append('search', searchTerm);
                                        if (departmentFilter && departmentFilter !== 'all') params.append('department', departmentFilter);
                                        if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
                                        if (selectedPeriod === 'custom') {
                                            if (dateRange.start) params.append('start_date', dateRange.start);
                                            if (dateRange.end) params.append('end_date', dateRange.end);
                                        }

                                        const response = await fetch(`/api/payroll/timesheets?${params}`);
                                        const data = await response.json();
                                        setTimesheets(data.timesheets || []);
                                        setPagination(data.pagination || null);
                                    } catch (error) {
                                        console.error('Failed to fetch page:', error);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={pagination.current_page >= pagination.last_page}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}

                {/* Lock Modal */}
                <Dialog open={showLockModal} onOpenChange={setShowLockModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Lock Timesheet for Payroll</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                You are about to lock the timesheet for <strong>{selectedTimesheet?.user_name}</strong> for payroll processing.
                                This will prevent any further modifications.
                            </p>

                            <div>
                                <Label htmlFor="lock-reason">Lock Reason (Optional)</Label>
                                <Textarea
                                    id="lock-reason"
                                    value={lockForm.lock_reason}
                                    onChange={(e) => setLockForm({...lockForm, lock_reason: e.target.value})}
                                    rows={3}
                                    placeholder="Reason for locking this timesheet..."
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowLockModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleLockTimesheet}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {loading ? 'Locking...' : 'Lock Timesheet'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Unlock Modal */}
                <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Unlock Timesheet</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                You are about to unlock the timesheet for <strong>{selectedTimesheet?.user_name}</strong>.
                                This will allow modifications to be made.
                            </p>

                            <div>
                                <Label htmlFor="unlock-reason">
                                    Unlock Reason <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="unlock-reason"
                                    value={unlockForm.unlock_reason}
                                    onChange={(e) => setUnlockForm({...unlockForm, unlock_reason: e.target.value})}
                                    rows={3}
                                    placeholder="Please explain why this timesheet needs to be unlocked..."
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowUnlockModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUnlockTimesheet}
                                disabled={loading || !unlockForm.unlock_reason.trim()}
                                variant="destructive"
                            >
                                {loading ? 'Unlocking...' : 'Unlock Timesheet'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};

export default PayrollTimesheetView;
