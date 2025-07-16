import {Head, router} from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Badge} from "@/components/ui/badge";
import {
    AlertTriangle,
    ArrowUpDown,
    Briefcase,
    Clock,
    Coffee,
    Edit,
    FileSpreadsheet,
    FileText,
    Plus,
    Printer,
    Save,
    Trash2
} from "lucide-react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {useMemo, useState} from "react";

interface User {
    id: number;
    name: string;
    email: string;
    current_position?: {
        title: string;
    };
    avatar?: string;
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
    status: string;
    user: User;
}

interface Punch {
    id: number;
    row_type: 'work' | 'break';
    type: string;
    employee: string;
    location: string;
    task: string;
    time_in: string;
    time_out: string;
    hours: number;
    break_duration: number;
    modified_date: string;
    was_edited: boolean;
    is_active_break?: boolean;
    break_type?: string;
}

interface Props {
    timesheet: Timesheet;
    punches: Punch[];
    departments: Department[];
    filters: {
        location?: string;
        employee?: string;
        source?: string;
    };
}

type SortKey = keyof Punch | "";

const breadcrumbs = [
    {
        title: "Dashboard",
        href: "/dashboard",
    },
    {
        title: "Payroll Processing",
        href: "/time-clock/payroll/dashboard",
    },
    {
        title: "Punches Audit Report",
        href: "#",
    },
];

export default function TimesheetPunches({
                                             timesheet,
                                             punches,
                                         }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedPunch, setSelectedPunch] = useState<Punch | null>(null);
    const [editForm, setEditForm] = useState({
        time_in: '',
        time_out: '',
        notes: '',
        edit_reason: '',
        punch_type: 'work' as 'work' | 'break',
    });
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [editingPunch, setEditingPunch] = useState<Punch | null>(null);
    const [punchEntries, setPunchEntries] = useState<Punch[]>([]);
    const [clockOutModalOpen, setClockOutModalOpen] = useState(false);
    const [punchToClockOut, setPunchToClockOut] = useState<Punch | null>(null);
    const [clockOutTime, setClockOutTime] = useState('');

    const formatHours = (hours: number): string => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}:${m.toString().padStart(2, "0")}`;
    };

    // Helper function to check if a date string is today
    const isToday = (dateString: string): boolean => {
        if (!dateString) return false;
        try {
            const punchDate = new Date(dateString);
            const today = new Date();

            return punchDate.toDateString() === today.toDateString();
        } catch {
            return false;
        }
    };

    // Helper function to check if today is within the timesheet period
    const isTodayInTimesheetPeriod = (): boolean => {
        try {
            const today = new Date();
            const startDate = new Date(timesheet.week_start_date);
            const endDate = new Date(timesheet.week_end_date);

            // Set times to compare just dates
            today.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            return today >= startDate && today <= endDate;
        } catch {
            return false;
        }
    };

    // Find active work punch that's from today
    const activeTodayWorkPunch = useMemo(() => {
        return punches.find(p =>
            p.row_type === 'work' &&
            !p.time_out &&
            isToday(p.time_in)
        );
    }, [punches]);

    // Check if we should show clock out button
    const shouldShowClockOut = activeTodayWorkPunch && isTodayInTimesheetPeriod();

    const handleRowClick = (punch: Punch) => {
        setSelectedPunch(punch);
        setValidationErrors([]);
        setPunchEntries([punch]);
        setEditDialogOpen(true);
    };

    const formatTimeForInput = (timeString: string): string => {
        if (!timeString) return '';
        try {
            const date = new Date(timeString);
            if (isNaN(date.getTime())) return '';

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch {
            return '';
        }
    };

    const createNewPunch = (): Punch => {
        const now = new Date();
        const startOfWorkDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

        return {
            id: `new-${Date.now()}` as any, // temporary ID for new entries
            row_type: 'work',
            type: 'Manual Entry',
            employee: timesheet.user.name,
            location: '',
            task: '',
            time_in: startOfWorkDay.toISOString(),
            time_out: '',
            hours: 0,
            break_duration: 0,
            modified_date: now.toISOString(),
            was_edited: false,
            is_active_break: false,
        };
    };

    const handleAddEntry = () => {
        const newPunch = createNewPunch();
        setPunchEntries([newPunch]);
        setSelectedPunch(newPunch);
        startEditingPunch(newPunch);
        setEditDialogOpen(true);
    };

    const handleClockInNow = () => {
        const now = new Date();

        // Create new punch entry
        router.post('/time-clock/payroll/punch/create', {
            user_id: timesheet.user_id,
            timesheet_id: timesheet.id,
            punch_type: 'work',
            time_in: 'now',
            notes: 'Clocked in by payroll',
            edit_reason: 'payroll_clock_in',
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditDialogOpen(false);
                router.reload({ only: ['punches'] });
            },
            onError: (errors) => {
                console.error('Create failed:', errors);
                if (errors.message) {
                    setValidationErrors([errors.message]);
                } else {
                    const errorMessages = Object.values(errors).flat() as string[];
                    setValidationErrors(errorMessages);
                }
            }
        });
    };

    const handleSavePunch = (punch: Punch) => {
        if (!editingPunch) return;

        const isNewEntry = String(punch.id).startsWith('new-');

        if (isNewEntry) {
            // Creating new entry
            const punchData = {
                user_id: timesheet.user_id,
                timesheet_id: timesheet.id,
                punch_type: editingPunch.row_type,
                time_in: editingPunch.time_in,
                time_out: editingPunch.time_out || null,
                notes: editForm.notes || '',
                edit_reason: editForm.edit_reason,
            };

            router.post('/time-clock/payroll/punch/create', punchData, {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingPunch(null);
                    setEditDialogOpen(false);
                    router.reload({ only: ['punches'] });
                },
                onError: (errors) => {
                    console.error('Create failed:', errors);
                    if (errors.message) {
                        setValidationErrors([errors.message]);
                    } else {
                        const errorMessages = Object.values(errors).flat() as string[];
                        setValidationErrors(errorMessages);
                    }
                }
            });
        } else {
            // Updating existing entry
            const punchData = {
                time_in: editingPunch.time_in,
                time_out: editingPunch.time_out || null,
                notes: editForm.notes || '',
                edit_reason: editForm.edit_reason,
            };

            const route = editingPunch.row_type === 'break'
                ? `/time-clock/payroll/break/${editingPunch.id}/edit`
                : `/time-clock/payroll/punch/${editingPunch.id}/edit`;

            router.put(route, punchData, {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingPunch(null);
                    setEditDialogOpen(false);
                    router.reload({ only: ['punches'] });
                },
                onError: (errors) => {
                    console.error('Update failed:', errors);
                    if (errors.message) {
                        setValidationErrors([errors.message]);
                    } else {
                        const errorMessages = Object.values(errors).flat() as string[];
                        setValidationErrors(errorMessages);
                    }
                }
            });
        }
    };

    const handleDeletePunch = (punch: Punch) => {
        if (!confirm(`Are you sure you want to delete this ${punch.row_type} punch?`)) return;

        const route = punch.row_type === 'break'
            ? `/time-clock/payroll/break/${punch.id}/delete`
            : `/time-clock/payroll/punch/${punch.id}/delete`;

        router.delete(route, {
            preserveScroll: true,
            onSuccess: () => {
                setEditDialogOpen(false);
                router.reload({ only: ['punches'] });
            },
            onError: (errors) => {
                console.error('Delete failed:', errors);
                if (errors.message) {
                    setValidationErrors([errors.message]);
                }
            }
        });
    };

    const startEditingPunch = (punch: Punch) => {
        setEditingPunch({
            ...punch,
            time_in: formatTimeForInput(punch.time_in),
            time_out: formatTimeForInput(punch.time_out),
        });
        setEditForm({
            time_in: formatTimeForInput(punch.time_in),
            time_out: formatTimeForInput(punch.time_out),
            notes: '',
            edit_reason: '',
            punch_type: punch.row_type,
        });
    };

    const cancelEditing = () => {
        setEditingPunch(null);
        setEditForm({
            time_in: '',
            time_out: '',
            notes: '',
            edit_reason: '',
            punch_type: 'work',
        });
    };

    const formatDateRange = (startDate: string, endDate: string): string => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `${start.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
        })}-${end.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
        })}`;
    };

    const getTypeBadge = (punch: Punch) => {
        if (punch.row_type === 'break') {
            return (
                <Badge variant="secondary">
                    <Coffee className="w-3 h-3 mr-1" />
                    {punch.type}
                </Badge>
            );
        } else {
            return (
                <Badge variant="default">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {punch.type}
                </Badge>
            );
        }
    };

    const handleExport = (format: "csv" | "excel" | "print") => {
        const params = new URLSearchParams();
        params.set("format", format);
        params.set("timesheet_id", timesheet.id.toString());

        if (format === "print") {
            window.print();
        } else {
            window.location.href = `/time-clock/payroll/export-punches?${params.toString()}`;
        }
    };

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    };

    const handleClockOut = (punchId?: number) => {
        const targetPunch = punchId ? punches.find(p => p.id === punchId) : activeTodayWorkPunch;
        if (!targetPunch) return;

        // Set default clock out time to the punch's date with current time
        const punchDate = new Date(targetPunch.time_in);
        const now = new Date();
        const defaultClockOutTime = new Date(
            punchDate.getFullYear(),
            punchDate.getMonth(),
            punchDate.getDate(),
            now.getHours(),
            now.getMinutes()
        );

        setPunchToClockOut(targetPunch);
        setClockOutTime(formatTimeForInput(defaultClockOutTime.toISOString()));
        setClockOutModalOpen(true);
    };

    const confirmClockOut = () => {
        if (!punchToClockOut || !clockOutTime) return;

        router.post(`/time-clock/payroll/punch/${punchToClockOut.id}/clock-out`, {
            clock_out_time: clockOutTime
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setClockOutModalOpen(false);
                setPunchToClockOut(null);
                setClockOutTime('');
                setEditDialogOpen(false);
                router.reload({ only: ['punches'] });
            },
            onError: (errors) => {
                console.error('Clock out failed:', errors);
                if (errors.message) {
                    setValidationErrors([errors.message]);
                }
            }
        });
    };

    const sortedPunches = useMemo(() => {
        if (!sortKey) return punches;

        return [...punches].sort((a, b) => {
            const aValue = a[sortKey as keyof Punch];
            const bValue = b[sortKey as keyof Punch];

            if (aValue === undefined && bValue === undefined) return 0;
            if (aValue === undefined) return sortDirection === "asc" ? 1 : -1;
            if (bValue === undefined) return sortDirection === "asc" ? -1 : 1;

            if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
            if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    }, [punches, sortKey, sortDirection]);

    const paginatedPunches = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedPunches.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedPunches, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedPunches.length / itemsPerPage);

    // Calculate totals
    const workPunches = punches.filter(p => p.row_type === 'work');
    const breakPunches = punches.filter(p => p.row_type === 'break');
    const totalWorkHours = workPunches.reduce((sum, punch) => sum + punch.hours, 0);
    const totalBreakHours = breakPunches.reduce((sum, punch) => sum + punch.hours, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Punches Audit Report" />
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Punches Audit Report</h1>
                        <div className="flex items-center gap-3 mt-2">
                            {timesheet.user.avatar && (
                                <img
                                    src={timesheet.user.avatar}
                                    alt="Avatar"
                                    className="w-12 h-12 rounded-full border-2 border-gray-500"
                                />
                            )}
                            <div>
                                <p className="font-medium text-slate-900">
                                    {timesheet.user.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {formatDateRange(
                                        timesheet.week_start_date,
                                        timesheet.week_end_date
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">

                        {/* Only show Clock Out if there's an active work punch from today */}
                        {shouldShowClockOut ? (
                            <Button
                                onClick={handleClockOut}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                size="sm"
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                Clock Out
                            </Button>
                        ) : isTodayInTimesheetPeriod() ? (
                            <Button
                                onClick={handleClockInNow}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                Clock In Now
                            </Button>
                        ) : null}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddEntry}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Entry
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport("csv")}
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-1" />
                            CSV
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport("excel")}
                        >
                            <FileText className="w-4 h-4 mr-1" />
                            Excel
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport("print")}
                        >
                            <Printer className="w-4 h-4 mr-1" />
                            Print
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-700">Total Work Hours</p>
                                <p className="text-2xl font-bold text-slate-900">{formatHours(totalWorkHours)}</p>
                            </div>
                            <Briefcase className="w-8 h-8 text-slate-600" />
                        </div>
                    </div>
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-700">Total Break Time</p>
                                <p className="text-2xl font-bold text-slate-900">{formatHours(totalBreakHours)}</p>
                            </div>
                            <Coffee className="w-8 h-8 text-slate-600" />
                        </div>
                    </div>
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-700">Total Punch Entries</p>
                                <p className="text-2xl font-bold text-slate-900">{punches.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Punches Table */}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead
                                    onClick={() => handleSort("type")}
                                    className="cursor-pointer"
                                >
                                    Type <ArrowUpDown className="w-4 h-4 inline-block ml-1" />
                                </TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead
                                    onClick={() => handleSort("time_in")}
                                    className="cursor-pointer"
                                >
                                    Time In <ArrowUpDown className="w-4 h-4 inline-block ml-1" />
                                </TableHead>
                                <TableHead
                                    onClick={() => handleSort("time_out")}
                                    className="cursor-pointer"
                                >
                                    Time Out <ArrowUpDown className="w-4 h-4 inline-block ml-1" />
                                </TableHead>
                                <TableHead
                                    onClick={() => handleSort("hours")}
                                    className="cursor-pointer"
                                >
                                    Hours <ArrowUpDown className="w-4 h-4 inline-block ml-1" />
                                </TableHead>
                                <TableHead
                                    onClick={() => handleSort("modified_date")}
                                    className="cursor-pointer"
                                >
                                    Modified Date
                                    <ArrowUpDown className="w-4 h-4 inline-block ml-1" />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedPunches && paginatedPunches.length > 0 ? (
                                paginatedPunches.map((punch) => (
                                    <TableRow
                                        key={`${punch.row_type}-${punch.id}`}
                                        className="cursor-pointer hover:bg-slate-50"
                                        onClick={() => handleRowClick(punch)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getTypeBadge(punch)}
                                                <Edit className="w-3 h-3 text-slate-400" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {punch.employee}
                                        </TableCell>
                                        <TableCell>{punch.location}</TableCell>
                                        <TableCell>
                                            {punch.time_in}
                                        </TableCell>
                                        <TableCell>
                                            {punch.time_out || (punch.is_active_break ? 'Active' : '-')}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <span className={punch.row_type === 'break' ? 'text-slate-600' : ''}>
                                                {formatHours(punch.hours)}
                                                {punch.row_type === 'break' && ' (break)'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {punch.modified_date}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <h3 className="text-lg font-medium">No Punch Data</h3>
                                        <p className="text-muted-foreground">
                                            No punch records found for this timesheet.
                                        </p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, sortedPunches.length)} to {Math.min(currentPage * itemsPerPage, sortedPunches.length)} of {sortedPunches.length} entries
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="items-per-page">Rows per page:</Label>
                            <Select
                                value={itemsPerPage.toString()}
                                onValueChange={(value) => {
                                    setItemsPerPage(Number(value));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger id="items-per-page" className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-sm font-medium">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                                }
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium">
                            <div>Work Hours: {formatHours(totalWorkHours)}</div>
                            <div>Break Hours: {formatHours(totalBreakHours)}</div>
                        </div>
                    </div>
                </div>

                {/* Edit/Add Punch Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedPunch ? `Edit ${selectedPunch.row_type === 'break' ? 'Break' : 'Work'} Punch` : 'Add New Punch'}
                                {selectedPunch && (
                                    <div className="text-sm font-normal text-slate-600 mt-1">
                                        {selectedPunch.employee} - {selectedPunch.type}
                                    </div>
                                )}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Quick Actions */}
                            <div className="flex gap-2 justify-end">
                                {/* Show Clock Out if the selected punch is an active work punch */}
                                {selectedPunch && selectedPunch.row_type === 'work' && !selectedPunch.time_out ? (
                                    <Button
                                        onClick={() => handleClockOut(selectedPunch.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        size="sm"
                                    >
                                        <Clock className="w-4 h-4 mr-2" />
                                        Clock Out
                                    </Button>
                                ) : isTodayInTimesheetPeriod() && !activeTodayWorkPunch ? (
                                    <Button
                                        onClick={handleClockInNow}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        size="sm"
                                    >
                                        <Clock className="w-4 h-4 mr-2" />
                                        Clock In Now
                                    </Button>
                                ) : null}

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddEntry}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Manual Entry
                                </Button>
                            </div>

                            {/* Validation Errors */}
                            {validationErrors.length > 0 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        <ul className="list-disc list-inside">
                                            {validationErrors.map((error, index) => (
                                                <li key={index}>{error}</li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Punch Entries Table */}
                            {punchEntries.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-medium mb-3">
                                        {selectedPunch ? 'Edit Entry' : 'Punch Entries'}
                                    </h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b">
                                            <tr>
                                                <th className="text-left p-3 font-medium">Type</th>
                                                <th className="text-left p-3 font-medium">Time In</th>
                                                <th className="text-left p-3 font-medium">Time Out</th>
                                                <th className="text-left p-3 font-medium">Duration</th>
                                                <th className="text-left p-3 font-medium">Notes</th>
                                                <th className="text-center p-3 font-medium">Actions</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {punchEntries.map((punch, index) => {
                                                const isEditing = editingPunch?.id === punch.id;
                                                const duration = punch.time_out
                                                    ? (new Date(punch.time_out).getTime() - new Date(punch.time_in).getTime()) / (1000 * 60 * 60)
                                                    : 0;

                                                return (
                                                    <tr key={punch.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}>
                                                        <td className="p-3">
                                                            {isEditing ? (
                                                                <Select
                                                                    value={editingPunch.row_type}
                                                                    onValueChange={(value: 'work' | 'break') =>
                                                                        setEditingPunch({...editingPunch, row_type: value})
                                                                    }
                                                                >
                                                                    <SelectTrigger className="w-24 h-7 text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="work">Work</SelectItem>
                                                                        <SelectItem value="break">Break</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : (
                                                                <Badge variant={punch.row_type === 'work' ? 'default' : 'secondary'}>
                                                                    {punch.row_type === 'work' ? 'Work' : 'Break'}
                                                                </Badge>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {isEditing ? (
                                                                <Input
                                                                    type="datetime-local"
                                                                    value={editingPunch.time_in}
                                                                    onChange={(e) => setEditingPunch({...editingPunch, time_in: e.target.value})}
                                                                    className="w-40 text-xs"
                                                                />
                                                            ) : (
                                                                <span className="font-mono">{punch.time_in}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {isEditing ? (
                                                                <Input
                                                                    type="datetime-local"
                                                                    value={editingPunch.time_out || ''}
                                                                    onChange={(e) => setEditingPunch({...editingPunch, time_out: e.target.value || ''})}
                                                                    className="w-40 text-xs"
                                                                />
                                                            ) : punch.time_out ? (
                                                                <span className="font-mono">{punch.time_out}</span>
                                                            ) : (
                                                                <Badge variant="outline">Active</Badge>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                                <span className="font-mono">
                                                                    {punch.time_out ? formatHours(duration) : '—'}
                                                                </span>
                                                        </td>
                                                        <td className="p-3">
                                                            {isEditing ? (
                                                                <Input
                                                                    value={editForm.notes || ''}
                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                                                    placeholder="Notes..."
                                                                    className="w-32 text-xs"
                                                                />
                                                            ) : (
                                                                <span className="text-slate-600 text-xs">
                                                                        {editForm.notes || '—'}
                                                                    </span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-1 justify-center">
                                                                {isEditing ? (
                                                                    <>
                                                                        <div className="space-y-2 mb-2">
                                                                            <Label htmlFor="edit_reason">Edit Reason *</Label>
                                                                            <Select
                                                                                value={editForm.edit_reason}
                                                                                onValueChange={(value) => setEditForm(prev => ({ ...prev, edit_reason: value }))}
                                                                            >
                                                                                <SelectTrigger className="w-48">
                                                                                    <SelectValue placeholder="Select reason" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="time_correction">Time Correction</SelectItem>
                                                                                    <SelectItem value="missed_punch">Missed Punch</SelectItem>
                                                                                    <SelectItem value="system_error">System Error</SelectItem>
                                                                                    <SelectItem value="manager_adjustment">Manager Adjustment</SelectItem>
                                                                                    <SelectItem value="other">Other</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleSavePunch(punch)}
                                                                            className="px-2 py-1 h-7"
                                                                            disabled={!editingPunch.time_in || !editForm.edit_reason}
                                                                        >
                                                                            <Save className="w-3 h-3" />
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={cancelEditing}
                                                                            className="px-2 py-1 h-7"
                                                                        >
                                                                            ✕
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => startEditingPunch(punch)}
                                                                            className="px-2 py-1 h-7"
                                                                        >
                                                                            <Edit className="w-3 h-3" />
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="destructive"
                                                                            onClick={() => handleDeletePunch(punch)}
                                                                            className="px-2 py-1 h-7"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Manual Entry Form */}
                            {!selectedPunch && punchEntries.length === 0 && (
                                <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                                    <Clock className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                                    <h3 className="text-lg font-medium text-slate-900 mb-2">Add Time Entry</h3>
                                    <p className="text-slate-600 mb-4">
                                        Create a new time entry for {timesheet.user.name}
                                    </p>
                                    <div className="flex justify-center gap-3">
                                        {isTodayInTimesheetPeriod() && (
                                            <Button
                                                onClick={handleClockInNow}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                <Clock className="w-4 h-4 mr-2" />
                                                Clock In Now
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={handleAddEntry}
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Add Manual Entry
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Clock Out Confirmation Modal */}
                <Dialog open={clockOutModalOpen} onOpenChange={setClockOutModalOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Clock Out Entry</DialogTitle>
                        </DialogHeader>
                        {punchToClockOut && (
                            <div className="space-y-4">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Clocking out:
                                    </p>
                                    <div className="bg-slate-50 p-4 rounded-lg">
                                        <p className="font-medium text-slate-900">
                                            {punchToClockOut.employee}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            Clocked in: {punchToClockOut.time_in}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clock_out_time">Clock Out Time *</Label>
                                    <Input
                                        id="clock_out_time"
                                        type="datetime-local"
                                        value={clockOutTime}
                                        onChange={(e) => setClockOutTime(e.target.value)}
                                        className="w-full"
                                        required
                                    />
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setClockOutModalOpen(false);
                                            setClockOutTime('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={confirmClockOut}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        disabled={!clockOutTime}
                                    >
                                        <Clock className="w-4 h-4 mr-2" />
                                        Confirm Clock Out
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
