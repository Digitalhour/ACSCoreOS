import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '@/components/ui/dropdown-menu';
import {Building2, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, MoreHorizontal} from 'lucide-react';
import {useState} from 'react';

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
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    approved_at?: string;
    processed_at?: string;
    user: User;
    approved_by?: User;
    processed_by?: User;
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
    {
        title: 'Department Timesheets',
        href: '/time-clock/payroll/departments',
    },
];

export default function PayrollDepartments({timesheets, departments, filters}: Props) {
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

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
                return <Badge variant="outline">Draft</Badge>;
            case 'submitted':
                return <Badge variant="secondary">Submitted</Badge>;
            case 'approved':
                return <Badge variant="default">Approved</Badge>;
            case 'processed':
                return <Badge variant="destructive">Processed</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    // Week navigation logic
    const getCurrentWeek = () => {
        if (filters.week_start) {
            return new Date(filters.week_start);
        }
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return startOfWeek;
    };

    const currentWeekStart = getCurrentWeek();
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newWeekStart = new Date(currentWeekStart);
        newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));

        const newWeekEnd = new Date(newWeekStart);
        newWeekEnd.setDate(newWeekStart.getDate() + 6);

        const params = new URLSearchParams();
        params.set('week_start', newWeekStart.toISOString().split('T')[0]);
        params.set('week_end', newWeekEnd.toISOString().split('T')[0]);

        if (filters.department_id && filters.department_id !== 'all') {
            params.set('department_id', filters.department_id);
        }
        if (filters.status && filters.status !== 'all') {
            params.set('status', filters.status);
        }

        router.get('/time-clock/payroll/departments', Object.fromEntries(params), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleFilter = () => {
        const formData = new FormData(document.getElementById('filter-form') as HTMLFormElement);
        const params = new URLSearchParams();

        const departmentId = formData.get('department_id') as string;
        const status = formData.get('status') as string;

        if (departmentId && departmentId !== 'all') params.set('department_id', departmentId);
        if (status && status !== 'all') params.set('status', status);

        // Keep current week if set
        if (filters.week_start) params.set('week_start', filters.week_start);
        if (filters.week_end) params.set('week_end', filters.week_end);

        router.get('/time-clock/payroll/departments', Object.fromEntries(params), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        router.get('/time-clock/payroll/departments', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleExport = (format: 'csv' | 'pdf') => {
        const params = new URLSearchParams();
        params.set('format', format);
        if (filters.week_start) params.set('week_start', filters.week_start);
        if (filters.week_end) params.set('week_end', filters.week_end);
        if (filters.department_id) params.set('department_id', filters.department_id);
        if (filters.status) params.set('status', filters.status);

        window.location.href = `/time-clock/payroll/export?${params.toString()}`;
    };

    const viewTimesheetDetail = (timesheetId: number) => {
        router.get(`/time-clock/payroll/timesheet/${timesheetId}/punches`);
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
            case 'process':
                // Handle process action
                router.post(`/time-clock/payroll/timesheet/${timesheetId}/process`);
                break;
            case 'export':
                // Handle export action
                handleExport('csv');
                break;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Department Timesheets" />

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
                    <form id="filter-form" className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <Label className="text-sm font-medium mb-1 block">Department</Label>
                            <Select name="department_id" defaultValue={filters.department_id || "all"}>
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
                            <Select name="status" defaultValue={filters.status || "all"}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="submitted">Submitted</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="processed">Processed</SelectItem>
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
                                    {formatPeriod(
                                        currentWeekStart.toISOString().split('T')[0],
                                        currentWeekEnd.toISOString().split('T')[0]
                                    )}
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
                            <Button type="button" onClick={handleFilter} className="w-full">
                                Search
                            </Button>
                        </div>

                        <div>
                            <Button type="button" onClick={clearFilters} variant="outline" className="w-full">
                                Clear
                            </Button>
                        </div>
                    </form>
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
                                <TableHead className="w-12">Actions</TableHead>
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => handleTimesheetAction('view', timesheet.id)}
                                                    >
                                                        View Details
                                                    </DropdownMenuItem>
                                                    {timesheet.status === 'approved' && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleTimesheetAction('process', timesheet.id)}
                                                        >
                                                            Process Timesheet
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => handleTimesheetAction('export', timesheet.id)}
                                                    >
                                                        Export
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                                onClick={() => link.url && router.get(link.url)}
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
                                <Button size="sm" variant="secondary">
                                    Bulk Process
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
        </AppLayout>
    );
}
