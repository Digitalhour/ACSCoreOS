//payroll/Dashboard.tsx
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import {
    BookOpenText,
    Building2,
    ChevronLeft,
    ChevronRight,
    FileDown,
    FileSpreadsheet,
    FileText,
    Play,
    X
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {debounce} from 'lodash';

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
    status: 'draft' | 'submitted' | 'approved' | 'processed' | 'rejected';
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    approved_at?: string;
    processed_at?: string;
    rejected_at?: string;
    user: User;
    approved_by?: User;
    processed_by?: User;
    rejected_by?: User;
    rejection_reason?: string;
    rejection_notes?: string;
}

interface Props {
    timesheets: {
        data: Timesheet[];
        links: any[];
        meta: any;
    };
    departments: Department[];
    filters: {
        week_start?: string;
        week_end?: string;
        department_id?: string;
        status?: string;
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

export default function PayrollDepartments({ timesheets, departments, filters }: Props) {






    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [timesheetToReject, setTimesheetToReject] = useState<Timesheet | null>(null);
    const [rejectionForm, setRejectionForm] = useState({
        reason: '',
        notes: ''
    });
    const [localFilters, setLocalFilters] = useState({
        department_id: filters.department_id || 'all',
        status: filters.status || 'all',
        week_start: filters.week_start || '',
        week_end: filters.week_end || ''
    });

    // Initialize with current week if no filters are set
    useEffect(() => {
        if (!filters.week_start && !filters.week_end) {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            const weekStart = startOfWeek.toISOString().split('T')[0];
            const weekEnd = endOfWeek.toISOString().split('T')[0];

            setLocalFilters(prev => ({
                ...prev,
                week_start: weekStart,
                week_end: weekEnd
            }));
        }
    }, []);

    const formatHours = (hours: number): string => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const formatPeriod = (startDate: string, endDate: string): string => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft':
                return <Badge variant="outline" className={"bg-green-500 text-white"}>Open</Badge>;
            case 'submitted':
                return <Badge variant="secondary">Submitted</Badge>;
            case 'approved':
                return <Badge variant="default">Approved</Badge>;
            case 'processed':
                return <Badge variant="destructive">Already Processed</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rejected</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    // Apply filters function
    const applyFilters = useCallback((filterValues: typeof localFilters) => {
        const params = new URLSearchParams();

        if (filterValues.week_start) params.set('week_start', filterValues.week_start);
        if (filterValues.week_end) params.set('week_end', filterValues.week_end);
        if (filterValues.department_id && filterValues.department_id !== 'all') {
            params.set('department_id', filterValues.department_id);
        }
        if (filterValues.status && filterValues.status !== 'all') {
            params.set('status', filterValues.status);
        }

        router.get('/time-clock/payroll/dashboard', Object.fromEntries(params), {
            preserveState: true,
            preserveScroll: true,
            only: ['timesheets', 'filters']
        });
    }, []);

    // Debounced filter application
    const debouncedApplyFilters = useCallback(
        debounce((filterValues: typeof localFilters) => {
            applyFilters(filterValues);
        }, 500),
        [applyFilters]
    );

    // Handle filter changes
    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        debouncedApplyFilters(newFilters);
    };

    // Week navigation
    const navigateWeek = (direction: 'prev' | 'next') => {
        const currentWeekStart = new Date(localFilters.week_start || new Date());
        const newWeekStart = new Date(currentWeekStart);
        newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));

        const newWeekEnd = new Date(newWeekStart);
        newWeekEnd.setDate(newWeekStart.getDate() + 6);

        const newFilters = {
            ...localFilters,
            week_start: newWeekStart.toISOString().split('T')[0],
            week_end: newWeekEnd.toISOString().split('T')[0]
        };

        setLocalFilters(newFilters);
        applyFilters(newFilters);
    };

    const clearFilters = () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const defaultFilters = {
            department_id: 'all',
            status: 'all',
            week_start: startOfWeek.toISOString().split('T')[0],
            week_end: endOfWeek.toISOString().split('T')[0]
        };

        setLocalFilters(defaultFilters);
        applyFilters(defaultFilters);
    };

    const handleReject = (timesheet: Timesheet) => {
        setTimesheetToReject(timesheet);
        setRejectionForm({ reason: '', notes: '' });
        setRejectDialogOpen(true);
    };

    const confirmReject = () => {
        if (!timesheetToReject || !rejectionForm.reason) return;

        router.post(`/time-clock/payroll/reject/${timesheetToReject.id}`, {
            rejection_reason: rejectionForm.reason,
            rejection_notes: rejectionForm.notes
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setRejectDialogOpen(false);
                setTimesheetToReject(null);
                setRejectionForm({ reason: '', notes: '' });
            }
        });
    };

    const handleBulkReject = () => {
        if (selectedRows.size === 0) return;

        router.post('/time-clock/payroll/bulk-reject', {
            timesheet_ids: Array.from(selectedRows),
            rejection_reason: 'other',
            rejection_notes: 'Bulk rejection'
        }, {
            preserveScroll: true,
            onSuccess: () => setSelectedRows(new Set())
        });
    };

    const handleExport = (format: 'csv' | 'pdf') => {
        const params = new URLSearchParams();
        params.set('format', format);
        if (localFilters.week_start) params.set('week_start', localFilters.week_start);
        if (localFilters.week_end) params.set('week_end', localFilters.week_end);
        if (localFilters.department_id && localFilters.department_id !== 'all') {
            params.set('department_id', localFilters.department_id);
        }
        if (localFilters.status && localFilters.status !== 'all') {
            params.set('status', localFilters.status);
        }

        window.location.href = `/time-clock/payroll/export?${params.toString()}`;
    };

    const viewTimesheetDetail = (timesheetId: number) => {
        router.get(`/time-clock/payroll/timesheet/${timesheetId}/punches`);
    };

    const handleProcess = (timesheetId: number) => {
        router.post(`/time-clock/payroll/process/${timesheetId}`, {
            payroll_notes: '',
        }, {
            preserveScroll: true,
        });
    };

    const handleRowSelect = (timesheetId: number, checked: boolean) => {
        const newSelected = new Set(selectedRows);
        if (checked) {
            newSelected.add(timesheetId);
        } else {
            newSelected.delete(timesheetId);
        }
        setSelectedRows(newSelected);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedRows(new Set(timesheets.data.map(t => t.id)));
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleTimesheetAction = (action: string, timesheetId: number) => {
        switch (action) {
            case 'view':
                viewTimesheetDetail(timesheetId);
                break;
            case 'export':
                handleExport('csv');
                break;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payroll Timesheets" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Department Timesheets</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage individual timesheet periods by employee and department
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport('csv')}
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport('pdf')}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Export PDF
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-muted/50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <Label className="text-sm font-medium mb-1 block">Department</Label>
                            <Select
                                value={localFilters.department_id}
                                onValueChange={(value) => handleFilterChange('department_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Selected Departments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Selected Departments</SelectItem>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id.toString()}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-sm font-medium mb-1 block">Timesheet Status</Label>
                            <Select
                                value={localFilters.status}
                                onValueChange={(value) => handleFilterChange('status', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="submitted">Submitted</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="processed">Processed</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Week Navigation */}
                        <div>
                            <Label className="text-sm font-medium mb-1 block">Week Period</Label>
                            <div className="flex items-center border rounded-md">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 border-r"
                                    onClick={() => navigateWeek('prev')}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex-1 px-3 py-2 text-sm text-center">
                                    {localFilters.week_start && localFilters.week_end ?
                                        formatPeriod(localFilters.week_start, localFilters.week_end) :
                                        'Select Week'
                                    }
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 border-l"
                                    onClick={() => navigateWeek('next')}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div>
                            <Button type="button" onClick={clearFilters} variant="outline" className="w-full">
                                Reset to Current Week
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedRows.size === timesheets.data.length && timesheets.data.length > 0}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Reporting Period</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Total Hours</TableHead>
                                <TableHead className="w-32">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {timesheets.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No Timesheets Found</h3>
                                        <p className="text-muted-foreground">
                                            No timesheets found for the selected filters.
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                timesheets.data.map((timesheet) => (
                                    <TableRow key={timesheet.id} className="hover:bg-muted/30">
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedRows.has(timesheet.id)}
                                                onCheckedChange={(checked) => handleRowSelect(timesheet.id, checked as boolean)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                className="font-medium text-primary hover:underline text-left"
                                                onClick={() => viewTimesheetDetail(timesheet.id)}
                                            >
                                                {formatPeriod(timesheet.week_start_date, timesheet.week_end_date)}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{timesheet.user.name}</div>
                                            <div className="text-sm text-muted-foreground">{timesheet.user.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {timesheet.user.departments?.map(d => d.name).join(', ') || 'No Department'}
                                            </div>
                                            {timesheet.user.current_position && (
                                                <div className="text-xs text-muted-foreground">
                                                    {timesheet.user.current_position.title}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(timesheet.status)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{formatHours(timesheet.regular_hours)} hrs worked</div>
                                            {timesheet.overtime_hours > 0 && (
                                                <div className="text-sm text-orange-600 font-medium">
                                                    +{formatHours(timesheet.overtime_hours)} overtime
                                                </div>
                                            )}
                                            <div className="text-xs text-muted-foreground">
                                                Total: {formatHours(timesheet.total_hours)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {(timesheet.status === 'approved' || timesheet.status === 'draft' || timesheet.status === 'submitted' || timesheet.status === 'rejected') && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleProcess(timesheet.id)}
                                                            variant={"secondary"}
                                                        >
                                                            <Play className="w-3 h-3 mr-1" />
                                                            Process
                                                        </Button>

                                                        <Button
                                                            size={"sm"}
                                                            onClick={() => handleTimesheetAction('view', timesheet.id)}
                                                            variant={"secondary"}
                                                        >
                                                            <BookOpenText className="w-3 h-3 mr-1" />
                                                            View Details
                                                        </Button>
                                                        <Button
                                                            size={"sm"}
                                                            onClick={() => handleTimesheetAction('export', timesheet.id)}
                                                            variant={"secondary"}
                                                        >
                                                            <FileDown className="w-3 h-3 mr-1"/>
                                                            Export
                                                        </Button>
                                                    </>
                                                )}
                                                {(timesheet.status === 'submitted' || timesheet.status === 'approved') && (
                                                    <Button
                                                        size={"sm"}
                                                        onClick={() => handleReject(timesheet)}
                                                        variant={"destructive"}
                                                    >
                                                        <X className="w-3 h-3 mr-1" />
                                                        Reject
                                                    </Button>
                                                )}
                                                {(timesheet.status === 'processed') && (
                                                    <Button
                                                        size={"sm"}
                                                        onClick={()=> handleTimesheetAction('view', timesheet.id)}
                                                        variant={"secondary"}
                                                    >
                                                        View Timesheet
                                                    </Button>
                                                )}

                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {timesheets.meta?.from || 0} to {timesheets.meta?.to || 0} of {timesheets.meta?.total || 0} entries
                    </div>
                    <div className="flex items-center space-x-2">
                        {timesheets.links?.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    if (link.url) {
                                        const url = new URL(link.url, window.location.origin);
                                        const params = Object.fromEntries(url.searchParams);
                                        router.post('/time-clock/payroll/dashboard', params, {
                                            only: ['timesheets'],
                                            preserveScroll: true,
                                            preserveState: true,
                                        });
                                    }
                                }}
                                disabled={!link.url}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedRows.size > 0 && (
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">
                                {selectedRows.size} timesheet{selectedRows.size !== 1 ? 's' : ''} selected
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        router.post('/time-clock/payroll/bulk-process', {
                                            timesheet_ids: Array.from(selectedRows),
                                            payroll_notes: ''
                                        }, {
                                            preserveScroll: true,
                                            onSuccess: () => setSelectedRows(new Set())
                                        });
                                    }}
                                >
                                    Bulk Process
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleBulkReject()}
                                >
                                    Bulk Reject
                                </Button>
                                <Button size="sm" variant="secondary">
                                    Bulk Export

                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedRows(new Set())}
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject Timesheet</DialogTitle>
                    </DialogHeader>
                    {timesheetToReject && (
                        <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                Rejecting timesheet for {timesheetToReject.user.name}
                                ({formatPeriod(timesheetToReject.week_start_date, timesheetToReject.week_end_date)})
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rejection_reason">Reason for Rejection *</Label>
                                <Select
                                    value={rejectionForm.reason}
                                    onValueChange={(value) => setRejectionForm(prev => ({ ...prev, reason: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="incomplete_data">Incomplete Data</SelectItem>
                                        <SelectItem value="missing_punches">Missing Punches</SelectItem>
                                        <SelectItem value="policy_violation">Policy Violation</SelectItem>
                                        <SelectItem value="incorrect_hours">Incorrect Hours</SelectItem>
                                        <SelectItem value="documentation_missing">Documentation Missing</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rejection_notes">Additional Notes</Label>
                                <Textarea
                                    id="rejection_notes"
                                    value={rejectionForm.notes}
                                    onChange={(e) => setRejectionForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Additional details about the rejection..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setRejectDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmReject}
                                    variant="destructive"
                                    disabled={!rejectionForm.reason}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Confirm Rejection
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
