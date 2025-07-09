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
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {CheckCircle, Clock, DollarSign, FileSpreadsheet, FileText, Filter, Play, TrendingUp, Users} from 'lucide-react';

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
    processed_this_week: number;
    total_approved_hours: number;
    total_approved_overtime: number;
}

interface Props {
    approvedTimesheets: {
        data: Timesheet[];
        links: any[];
        meta: any;
    };
    processedTimesheets: Timesheet[];
    employees: User[];
    stats: Stats;
    filters: {
        week_start?: string;
        week_end?: string;
        employee_id?: string;
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
];

export default function PayrollDashboard({
                                             approvedTimesheets,
                                             processedTimesheets,
                                             employees,
                                             stats,
                                             filters
                                         }: Props) {
    const [selectedTimesheets, setSelectedTimesheets] = useState<number[]>([]);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [singleDialogOpen, setSingleDialogOpen] = useState(false);
    const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
    const [payrollNotes, setPayrollNotes] = useState('');

    // Filter states
    const [filterEmployee, setFilterEmployee] = useState(filters.employee_id || 'all');
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
        if (filterWeekStart) params.set('week_start', filterWeekStart);
        if (filterWeekEnd) params.set('week_end', filterWeekEnd);
        if (filterEmployee && filterEmployee !== 'all') params.set('employee_id', filterEmployee);

        window.location.href = `/time-clock/payroll/export?${params.toString()}`;
    };

    const handleFilter = () => {
        const params = new URLSearchParams();
        if (filterEmployee && filterEmployee !== 'all') params.set('employee_id', filterEmployee);
        if (filterWeekStart) params.set('week_start', filterWeekStart);
        if (filterWeekEnd) params.set('week_end', filterWeekEnd);

        router.get('/time-clock/payroll/dashboard', Object.fromEntries(params), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setFilterEmployee('all');
        setFilterWeekStart('');
        setFilterWeekEnd('');
        router.get('/time-clock/payroll/dashboard', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payroll Dashboard" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Payroll Processing</h1>
                        <p className="text-slate-600 mt-1">
                            Process approved timesheets and generate payroll reports
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
                        {selectedTimesheets.length > 0 && (
                            <Button onClick={handleBulkProcess} className="bg-blue-600 hover:bg-blue-700">
                                <Play className="w-4 h-4 mr-2" />
                                Process ({selectedTimesheets.length})
                            </Button>
                        )}
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-slate-200">
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

                    <Card className="border-slate-200">
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

                    <Card className="border-slate-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Total Hours</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatHours(stats.total_approved_hours)}</p>
                                </div>
                                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
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
                </div>

                <Tabs defaultValue="approved" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="approved">
                            Ready to Process ({stats.approved_count})
                        </TabsTrigger>
                        <TabsTrigger value="processed">
                            Recently Processed
                        </TabsTrigger>
                    </TabsList>

                    {/* Approved Timesheets */}
                    <TabsContent value="approved" className="space-y-6">
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
                                </div>
                            </CardContent>
                        </Card>

                        {/* Approved Timesheets Table */}
                        <Card className="border-slate-200">
                            <CardHeader className="border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg font-semibold text-slate-900">
                                        Approved Timesheets ({approvedTimesheets.meta?.total || approvedTimesheets.data?.length || 0})
                                    </CardTitle>
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
                    </TabsContent>

                    {/* Processed Timesheets */}
                    <TabsContent value="processed" className="space-y-6">
                        <Card className="border-slate-200">
                            <CardHeader className="border-b border-slate-200 bg-slate-50">
                                <CardTitle className="text-lg font-semibold text-slate-900">
                                    Recently Processed
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {processedTimesheets.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-900 mb-2">No Recent Activity</h3>
                                        <p className="text-slate-600">
                                            No timesheets have been processed recently.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {processedTimesheets.map((timesheet) => (
                                            <div key={timesheet.id} className="border border-slate-200 rounded-lg p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-4 mb-2">
                                                            <h4 className="font-semibold text-slate-900">{timesheet.user.name}</h4>
                                                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
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
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

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
