import {Head, router} from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Badge} from "@/components/ui/badge";
import {AlertTriangle, ArrowUpDown, Briefcase, Coffee, Edit, FileSpreadsheet, FileText, Printer} from "lucide-react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
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
        title: "Department Timesheets",
        href: "/time-clock/payroll/departments",
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
    const [editSheetOpen, setEditSheetOpen] = useState(false);
    const [selectedPunch, setSelectedPunch] = useState<Punch | null>(null);
    const [editForm, setEditForm] = useState({
        time_in: '',
        time_out: '',
        notes: '',
        edit_reason: '',
    });
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const formatHours = (hours: number): string => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}:${m.toString().padStart(2, "0")}`;
    };

    const handleRowClick = (punch: Punch) => {
        setSelectedPunch(punch);
        setValidationErrors([]);

        setEditForm({
            time_in: punch.time_in ? formatTimeForInput(punch.time_in) : '',
            time_out: punch.time_out ? formatTimeForInput(punch.time_out) : '',
            notes: '',
            edit_reason: '',
        });

        setEditSheetOpen(true);
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

    const formatTimeForDisplay = (inputTime: string): string => {
        if (!inputTime) return '';
        try {
            const date = new Date(inputTime);
            if (isNaN(date.getTime())) return inputTime;

            return date.toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch {
            return inputTime;
        }
    };

    const handleDelete = () => {
        if (!selectedPunch) return;

        if (confirm(`Are you sure you want to delete this ${selectedPunch.row_type} punch?`)) {
            router.delete(`/time-clock/payroll/punch/${selectedPunch.id}/delete`, {
                preserveScroll: true,
                onSuccess: () => {
                    setEditSheetOpen(false);
                    setSelectedPunch(null);
                    resetForm();
                },
                onError: (errors) => {
                    console.error('Delete failed:', errors);
                    if (errors.message) {
                        setValidationErrors([errors.message]);
                    }
                }
            });
        }
    };

    const resetForm = () => {
        setEditForm({
            time_in: '',
            time_out: '',
            notes: '',
            edit_reason: '',
        });
        setValidationErrors([]);
    };

    const handleEditSubmit = () => {
        if (!selectedPunch) return;

        setValidationErrors([]);

        if (!editForm.edit_reason) {
            setValidationErrors(['Edit reason is required']);
            return;
        }

        const data = {
            time_in: editForm.time_in,
            time_out: editForm.time_out,
            notes: editForm.notes,
            edit_reason: editForm.edit_reason
        };

        router.put(`/time-clock/payroll/punch/${selectedPunch.id}/edit`, data, {
            preserveScroll: true,
            onSuccess: () => {
                setEditSheetOpen(false);
                setSelectedPunch(null);
                resetForm();
            },
            onError: (errors) => {
                console.error('Edit failed:', errors);
                if (errors.message) {
                    setValidationErrors([errors.message]);
                } else {
                    const errorMessages = Object.values(errors).flat() as string[];
                    setValidationErrors(errorMessages);
                }
            }
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

    const getRowBackgroundColor = (punch: Punch): string => {
        if (punch.row_type === 'break') {
            return punch.is_active_break
                ? 'bg-red-50 hover:bg-red-100'
                : 'bg-orange-50 hover:bg-orange-100';
        }
        if (punch.was_edited) {
            return 'bg-yellow-50 hover:bg-yellow-100';
        }
        return 'hover:bg-slate-50';
    };

    const getTypeBadge = (punch: Punch) => {
        let badgeClass = '';
        let variant: 'default' | 'destructive' | 'secondary' | 'outline' = 'default';
        let icon = null;

        if (punch.row_type === 'break') {
            icon = <Coffee className="w-3 h-3 mr-1" />;
            if (punch.is_active_break) {
                badgeClass = 'bg-red-500 hover:bg-red-600';
                variant = 'destructive';
            } else {
                badgeClass = 'bg-orange-500 hover:bg-orange-600';
            }
        } else {
            icon = <Briefcase className="w-3 h-3 mr-1" />;
            if (punch.type.includes("Open")) {
                badgeClass = "bg-red-500 hover:bg-red-600";
                variant = "destructive";
            } else if (punch.type.includes("Edited")) {
                badgeClass = "bg-yellow-500 hover:bg-yellow-600";
                variant = "secondary";
            } else {
                badgeClass = "bg-green-500 hover:bg-green-600";
            }
        }

        return (
            <Badge className={badgeClass} variant={variant}>
                {icon}
                {punch.type}
            </Badge>
        );
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-700">Total Work Hours</p>
                                <p className="text-2xl font-bold text-blue-900">{formatHours(totalWorkHours)}</p>
                            </div>
                            <Briefcase className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-700">Total Break Time</p>
                                <p className="text-2xl font-bold text-orange-900">{formatHours(totalBreakHours)}</p>
                            </div>
                            <Coffee className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-700">Total Punch Entries</p>
                                <p className="text-2xl font-bold text-green-900">{punches.length}</p>
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
                                        className={`${getRowBackgroundColor(punch)} cursor-pointer`}
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
                                            <span className={punch.row_type === 'break' ? 'text-orange-600' : ''}>
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

                {/* Back Button */}
                <div className="flex justify-start">
                    <Button
                        variant="outline"
                        onClick={() => router.get("/time-clock/payroll/departments")}
                    >
                        Back to Department Timesheets
                    </Button>
                </div>

                {/* Edit Punch Sheet */}
                <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
                    <SheetContent className="w-[400px] sm:w-[540px]">
                        <SheetHeader>
                            <SheetTitle>
                                Edit {selectedPunch?.row_type === 'break' ? 'Break' : 'Work'} Punch
                            </SheetTitle>
                            <SheetDescription>
                                Modify {selectedPunch?.row_type} punch for {selectedPunch?.employee}
                            </SheetDescription>
                        </SheetHeader>

                        {selectedPunch && (
                            <div className="space-y-6 mt-6">
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

                                {/* Current Details */}
                                <div className="bg-slate-50 border rounded-lg p-4">
                                    <h4 className="font-medium mb-2">Current Details</h4>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="font-medium">Employee:</span> {selectedPunch.employee}</p>
                                        <p><span className="font-medium">Type:</span> {selectedPunch.type}</p>
                                        {selectedPunch.break_type && (
                                            <p><span className="font-medium">Break Type:</span> {selectedPunch.break_type}</p>
                                        )}
                                        <p><span className="font-medium">Hours:</span> {formatHours(selectedPunch.hours)}</p>
                                    </div>
                                </div>

                                {/* Edit Form */}
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="time_in">Time In *</Label>
                                        <Input
                                            id="time_in"
                                            type="datetime-local"
                                            value={editForm.time_in}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, time_in: e.target.value }))}
                                            className="mt-1"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="time_out">Time Out</Label>
                                        <Input
                                            id="time_out"
                                            type="datetime-local"
                                            value={editForm.time_out}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, time_out: e.target.value }))}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="edit_reason">Reason for Edit *</Label>
                                        <Select
                                            value={editForm.edit_reason}
                                            onValueChange={(value) => setEditForm(prev => ({ ...prev, edit_reason: value }))}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select reason for edit" />
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

                                    <div>
                                        <Label htmlFor="notes">Additional Notes</Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Add any additional notes about this edit..."
                                            value={editForm.notes}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                            rows={3}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                {/* Preview */}
                                {(editForm.time_in || editForm.time_out) && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-medium mb-2 text-blue-900">Preview Changes</h4>
                                        <div className="space-y-1 text-sm text-blue-800">
                                            {editForm.time_in && (
                                                <p><span className="font-medium">New Time In:</span> {formatTimeForDisplay(editForm.time_in)}</p>
                                            )}
                                            {editForm.time_out && (
                                                <p><span className="font-medium">New Time Out:</span> {formatTimeForDisplay(editForm.time_out)}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex justify-between pt-4">
                                    <Button
                                        variant="destructive"
                                        onClick={handleDelete}
                                    >
                                        Delete Punch
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setEditSheetOpen(false);
                                                resetForm();
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleEditSubmit}
                                            disabled={!editForm.edit_reason}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </SheetContent>
                </Sheet>
            </div>
        </AppLayout>
    );
}
