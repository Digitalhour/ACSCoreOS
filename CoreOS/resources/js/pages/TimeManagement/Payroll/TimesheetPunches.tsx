//payroll/TimesheetPunches.tsx

import {Head, router} from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Badge} from "@/components/ui/badge";
import {Calendar} from "@/components/ui/calendar";
import {Input} from "@/components/ui/input";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {
    AlertTriangle,
    Calendar as CalendarIcon,
    CheckCircle,
    ChevronDownIcon,
    Clock,
    Coffee,
    Edit3,
    FileSpreadsheet,
    FileText,
    Play,
    Plus,
    Printer,
    Save,
    Trash2,
    User,
    X
} from "lucide-react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Textarea} from "@/components/ui/textarea";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useMemo, useState} from "react";

interface TimesheetAction {
    id: number;
    timesheet_id: number;
    user_id: number;
    action: 'submitted' | 'approved' | 'rejected' | 'processed' | 'withdrawn';
    notes: string | null;
    metadata: any;
    created_at: string;
    user: User;
}

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
    notes: string | null;
    user: User;
    actions?: TimesheetAction[];
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
    notes?: string;
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

// DateTimePicker Component
interface DateTimePickerProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    required?: boolean;
    className?: string;
}

function DateTimePicker({ value, onChange, label, required = false, className = "" }: DateTimePickerProps) {
    const [open, setOpen] = useState(false);

    // Parse the datetime string to separate date and time (keeping in local timezone)
    const parseDateTime = (dateTimeString: string) => {
        if (!dateTimeString) return { date: undefined, time: "" };

        // Create date from ISO string but treat as local time
        const dt = new Date(dateTimeString);
        if (isNaN(dt.getTime())) return { date: undefined, time: "" };

        const date = dt;
        // Format time as HH:MM:SS in local timezone
        const timeString = dt.toTimeString().slice(0, 8);

        return { date, time: timeString };
    };

    const { date, time } = parseDateTime(value);

    const handleDateChange = (selectedDate: Date | undefined) => {
        if (!selectedDate) {
            onChange("");
            return;
        }

        // Keep existing time or default to current time
        const timeToUse = time || new Date().toTimeString().slice(0, 8);
        const [hours, minutes, seconds] = timeToUse.split(':');

        // Create datetime in local timezone
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const day = selectedDate.getDate();

        const newDateTime = new Date(year, month, day, parseInt(hours), parseInt(minutes), parseInt(seconds || '0'));

        // Format for Laravel (YYYY-MM-DD HH:MM:SS)
        const formatted = formatForLaravel(newDateTime);
        onChange(formatted);
        setOpen(false);
    };

    const handleTimeChange = (newTime: string) => {
        if (!newTime) {
            if (date) {
                // If we have a date but no time, clear the whole value
                onChange("");
            }
            return;
        }

        const dateToUse = date || new Date();
        const [hours, minutes, seconds] = newTime.split(':');

        // Create datetime in local timezone
        const year = dateToUse.getFullYear();
        const month = dateToUse.getMonth();
        const day = dateToUse.getDate();

        const newDateTime = new Date(year, month, day, parseInt(hours), parseInt(minutes), parseInt(seconds || '0'));

        // Format for Laravel (YYYY-MM-DD HH:MM:SS)
        const formatted = formatForLaravel(newDateTime);
        onChange(formatted);
    };

    // Format datetime for Laravel backend
    const formatForLaravel = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    return (
        <div className={`flex gap-2 ${className}`}>
            <div className="flex flex-col gap-1">
                <Label htmlFor={`date-${label}`} className="px-1 text-xs">
                    Date {required && <span className="text-red-500">*</span>}
                </Label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            id={`date-${label}`}
                            className="w-28 justify-between font-normal text-xs h-7"
                        >
                            {date ? date.toLocaleDateString() : "Select date"}
                            <ChevronDownIcon className="w-3 h-3" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            captionLayout="dropdown"
                            onSelect={handleDateChange}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex flex-col gap-1">
                <Label htmlFor={`time-${label}`} className="px-1 text-xs">
                    Time {required && <span className="text-red-500">*</span>}
                </Label>
                <Input
                    type="time"
                    id={`time-${label}`}
                    step="1"
                    value={time}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none w-20 text-xs h-7"
                />
            </div>
        </div>
    );
}

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
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<Punch | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionForm, setRejectionForm] = useState({
        reason: '',
        notes: ''
    });

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (dateString: string): string => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
    };

    const formatDateTime = (dateString: string): string => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
    };

    const formatDateTimeForInput = (dateString: string): string => {
        if (!dateString) return '';
        try {
            // Handle different date formats from backend
            let date: Date;

            // Try parsing as-is first (handles ISO and most formats)
            date = new Date(dateString);

            // If that fails, try parsing display format like "12/1/2024 9:00:00 AM"
            if (isNaN(date.getTime())) {
                // Parse display format manually
                const parts = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)/i);
                if (parts) {
                    const [, month, day, year, hours, minutes, seconds, ampm] = parts;
                    let hour24 = parseInt(hours);
                    if (ampm.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
                    if (ampm.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;

                    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour24, parseInt(minutes), parseInt(seconds));
                }
            }

            if (isNaN(date.getTime())) return '';

            // Format for Laravel (YYYY-MM-DD HH:MM:SS)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');

            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch {
            return '';
        }
    };

    const formatHours = (hours: number | string | null | undefined): string => {
        // Handle various input types and null/undefined
        let numericHours: number;

        if (hours === null || hours === undefined) {
            numericHours = 0;
        } else if (typeof hours === 'string') {
            numericHours = parseFloat(hours);
        } else {
            numericHours = hours;
        }

        if (isNaN(numericHours) || numericHours < 0) {
            numericHours = 0;
        }

        const h = Math.floor(numericHours);
        const m = Math.round((numericHours - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const calculatePunchDuration = (clockIn: string, clockOut: string | null): number => {
        if (!clockOut) return 0;
        const start = new Date(clockIn).getTime();
        const end = new Date(clockOut).getTime();
        return (end - start) / (1000 * 60 * 60); // Convert to hours
    };

    const getWeekLabel = (startDate: string, endDate: string): string => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
            draft: { label: 'Draft', variant: 'secondary' },
            submitted: { label: 'Pending Approval', variant: 'outline' },
            approved: { label: 'Approved', variant: 'default' },
            processed: { label: 'Processed', variant: 'outline' },
            rejected: { label: 'Rejected', variant: 'destructive' },
        };

        const config = statusConfig[status] || statusConfig.draft;
        return (
            <Badge variant={config.variant}>
                {config.label}
            </Badge>
        );
    };

    const getDayOfWeek = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });
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

    const createNewPunch = (): Punch => {
        const now = new Date();
        const startOfWorkDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

        return {
            id: `new-${Date.now()}` as any,
            row_type: 'work',
            type: 'Manual Entry',
            employee: timesheet.user.name,
            location: '',
            task: '',
            time_in: formatDateTimeForInput(startOfWorkDay.toISOString()),
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
        startEditingEntry(newPunch);
        setEditDialogOpen(true);
    };

    const handleReject = () => {
        setRejectionForm({ reason: '', notes: '' });
        setRejectDialogOpen(true);
    };

    const confirmReject = () => {
        if (!rejectionForm.reason) return;

        router.post(`/time-clock/payroll/reject/${timesheet.id}`, {
            rejection_reason: rejectionForm.reason,
            rejection_notes: rejectionForm.notes
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setRejectDialogOpen(false);
                setRejectionForm({ reason: '', notes: '' });
                router.get('/time-clock/payroll/dashboard');
            }
        });
    };

    const handleSaveEntry = (entry: Punch) => {
        if (!editingEntry) return;

        const isNewEntry = String(entry.id).startsWith('new-');

        if (isNewEntry) {
            // Creating new entry - matches TimesheetDetails pattern
            const entryData = {
                user_id: timesheet.user_id,
                date: editingEntry.time_in.split(' ')[0],
                clock_in_at: editingEntry.time_in,
                clock_out_at: editingEntry.time_out || null,
                notes: editingEntry.notes || '',
                punch_type: editingEntry.row_type,
            };

            router.post('/time-clock/payroll/add-entry', entryData, {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingEntry(null);
                    setEditDialogOpen(false);
                    router.reload();
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
            // Updating existing entry - matches TimesheetDetails pattern
            const entryData = {
                clock_in_at: editingEntry.time_in,
                clock_out_at: editingEntry.time_out || null,
                notes: editingEntry.notes || '',
                punch_type: editingEntry.row_type,
            };

            router.post(`/time-clock/payroll/update-entry/${editingEntry.id}`, entryData, {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingEntry(null);
                    setEditDialogOpen(false);
                    router.reload();
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

    const handleDeleteEntry = (punch: Punch) => {
        if (!confirm(`Are you sure you want to delete this ${punch.row_type} punch?`)) return;

        router.delete(`/time-clock/payroll/delete-entry/${punch.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditDialogOpen(false);
                router.reload();
            },
            onError: (errors) => {
                console.error('Delete failed:', errors);
                if (errors.message) {
                    setValidationErrors([errors.message]);
                }
            }
        });
    };

    const handleClockOut = (entryId?: number) => {
        const targetPunch = entryId ? punches.find(p => p.id === entryId) : activeTodayWorkPunch;
        if (!targetPunch) return;

        router.post(`/time-clock/payroll/clock-out/${targetPunch.id}`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setEditDialogOpen(false);
                router.reload();
            },
            onError: (errors) => {
                console.error('Clock out failed:', errors);
                if (errors.message) {
                    setValidationErrors([errors.message]);
                }
            }
        });
    };

    const startEditingEntry = (punch: Punch) => {
        setEditingEntry({
            ...punch,
            time_in: formatDateTimeForInput(punch.time_in),
            time_out: punch.time_out ? formatDateTimeForInput(punch.time_out) : '',
        });
    };

    const cancelEditing = () => {
        setEditingEntry(null);
    };

    const handleEditEntry = (entry: Punch) => {
        startEditingEntry(entry);
        setEditDialogOpen(true);
    };

    const handleExport = (format: "csv" | "print") => {
        const params = new URLSearchParams();
        params.set("format", format);
        params.set("timesheet_id", timesheet.id.toString());

        if (format === "print") {
            window.print();
        } else {
            window.location.href = `/time-clock/payroll/export-punches?${params.toString()}`;
        }
    };

    // Get all punches sorted by date and time
    const getAllPunchesSorted = () => {
        return punches.sort((a, b) =>
            new Date(a.time_in).getTime() - new Date(b.time_in).getTime()
        );
    };

    const getPunchTypeIcon = (punchType: string) => {
        return punchType === 'work' ? (
            <Play className="w-4 h-4" />
        ) : (
            <Coffee className="w-4 h-4" />
        );
    };

    const getPunchTypeBadge = (entry: Punch) => {
        if (entry.row_type === 'work') {
            return (
                <Badge variant="outline">
                    Work
                </Badge>
            );
        } else {
            return (
                <Badge variant="secondary">
                    {entry.break_type || 'Break'}
                </Badge>
            );
        }
    };

    // Calculate totals
    const workPunches = punches.filter(p => p.row_type === 'work');
    const breakPunches = punches.filter(p => p.row_type === 'break');
    const totalWorkHours = workPunches.reduce((sum, punch) => sum + punch.hours, 0);
    const totalBreakHours = breakPunches.reduce((sum, punch) => sum + punch.hours, 0);
    const overtimeHours = Math.max(0, totalWorkHours - 40);
    const regularHours = Math.min(totalWorkHours, 40);

    const displayTotals = {
        total: totalWorkHours,
        regular: regularHours,
        overtime: overtimeHours,
        break: totalBreakHours
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Punches Audit Report" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">
                                Punches Audit Report
                            </h1>
                            <p className="text-muted-foreground">
                                {timesheet.user.name} - {getWeekLabel(timesheet.week_start_date, timesheet.week_end_date)} - {getStatusBadge(timesheet.status)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Only show Clock Out if there's an active work punch from today */}
                        {shouldShowClockOut && (
                            <Button
                                onClick={() => handleClockOut()}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                Clock Out
                            </Button>
                        )}

                        {(timesheet.status === 'submitted' || timesheet.status === 'approved') && (
                            <Button
                                onClick={handleReject}
                                variant="destructive"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Reject
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            onClick={handleAddEntry}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Entry
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleExport("csv")}
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-1" />
                            CSV
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleExport("print")}
                        >
                            <Printer className="w-4 h-4 mr-1" />
                            Print
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Employee Info & Timeline */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Employee Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Employee Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-1">
                                    {timesheet.user.avatar && (
                                        <img
                                            src={timesheet.user.avatar}
                                            alt={timesheet.user.name}
                                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                                        />
                                    )}
                                    <div className="">
                                        <p className="font-medium">{timesheet.user.name}</p>
                                        <p className="text-sm text-muted-foreground">{timesheet.user.email}</p>
                                        {timesheet.user.current_position && (
                                            <p className="text-sm text-muted-foreground">{timesheet.user.current_position.title}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Timesheet Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Timesheet Timeline ({timesheet.actions?.length || 0} actions)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-100">
                                    <div className="relative">
                                        {/* Main Timeline Line */}
                                        {timesheet.actions && timesheet.actions.length > 0 && (
                                            <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-border"></div>
                                        )}

                                        <div className="space-y-6">
                                            {/* Current Status if still in progress */}
                                            {timesheet.status !== 'processed' && (
                                                <div className="relative flex items-start">
                                                    {/* Timeline Icon for Current Status */}
                                                    <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-muted border-2 border-dashed border-muted-foreground/30 rounded-full ring-4 ring-muted/50">
                                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                                    </div>

                                                    {/* Current Status Content */}
                                                    <div className="ml-6 flex-1 min-w-0">
                                                        <h4>Current Status</h4>
                                                        <div className="bg-muted/30 border border-dashed rounded-lg p-4">
                                                            <h4 className="text-sm font-semibold text-foreground mb-1">
                                                                {timesheet.status === 'submitted' ? 'Pending Approval' :
                                                                    timesheet.status === 'approved' ? 'Ready for Processing' :
                                                                        timesheet.status === 'rejected' ? 'Rejected - Manager Review Needed' :
                                                                            'In Progress'}
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {timesheet.status === 'submitted' ? 'Waiting for manager approval' :
                                                                    timesheet.status === 'approved' ? 'Ready for payroll processing' :
                                                                        timesheet.status === 'rejected' ? 'Manager needs to fix and resubmit' :
                                                                            'Timesheet is being prepared'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {timesheet.actions && timesheet.actions.length > 0 ? (
                                                // Reverse the actions array to show newest first
                                                [...timesheet.actions].reverse().map((action, index) => {
                                                    const getActionIcon = (actionType: string) => {
                                                        switch (actionType) {
                                                            case 'submitted':
                                                                return {
                                                                    icon: <CheckCircle className="w-4 h-4 text-blue-600" />,
                                                                    bgColor: 'bg-blue-50',
                                                                    borderColor: 'border-blue-200',
                                                                    ringColor: 'ring-blue-100'
                                                                };
                                                            case 'approved':
                                                                return {
                                                                    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
                                                                    bgColor: 'bg-green-50',
                                                                    borderColor: 'border-green-200',
                                                                    ringColor: 'ring-green-100'
                                                                };
                                                            case 'rejected':
                                                                return {
                                                                    icon: <X className="w-4 h-4 text-red-600" />,
                                                                    bgColor: 'bg-red-50',
                                                                    borderColor: 'border-red-200',
                                                                    ringColor: 'ring-red-100'
                                                                };
                                                            case 'processed':
                                                                return {
                                                                    icon: <CheckCircle className="w-4 h-4 text-purple-600" />,
                                                                    bgColor: 'bg-purple-50',
                                                                    borderColor: 'border-purple-200',
                                                                    ringColor: 'ring-purple-100'
                                                                };
                                                            case 'withdrawn':
                                                                return {
                                                                    icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
                                                                    bgColor: 'bg-orange-50',
                                                                    borderColor: 'border-orange-200',
                                                                    ringColor: 'ring-orange-100'
                                                                };
                                                            default:
                                                                return {
                                                                    icon: <Clock className="w-4 h-4 text-gray-600" />,
                                                                    bgColor: 'bg-gray-50',
                                                                    borderColor: 'border-gray-200',
                                                                    ringColor: 'ring-gray-100'
                                                                };
                                                        }
                                                    };

                                                    const { icon, bgColor, borderColor, ringColor } = getActionIcon(action.action);

                                                    return (
                                                        <div key={action.id} className="relative flex items-start">
                                                            {/* Timeline Icon */}
                                                            <div className={`relative z-10 flex items-center justify-center w-8 h-8 ${bgColor} border-2 ${borderColor} rounded-full ring-1 ${ringColor} bg-background`}>
                                                                {icon}
                                                            </div>

                                                            {/* Content Card */}
                                                            <div className="ml-3 flex-1 min-w-0">
                                                                <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                                                    {/* Header */}
                                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                                        <h4 className="text-sm font-semibold text-foreground capitalize">
                                                                            {action.action}
                                                                        </h4>
                                                                        <Badge variant="outline" className="text-xs font-medium">
                                                                            {formatDateTime(action.created_at)}
                                                                        </Badge>
                                                                    </div>

                                                                    {/* User info */}
                                                                    <p className="text-sm text-muted-foreground mb-3">
                                                                        By {action.user.name}
                                                                    </p>

                                                                    {/* Action-specific content */}
                                                                    <div className="space-y-3">
                                                                        {/* Handle rejection-specific metadata */}
                                                                        {action.action === 'rejected' && action.metadata && (
                                                                            <Alert variant="destructive">
                                                                                {action.metadata.rejection_reason && (
                                                                                    <AlertDescription className="text-sm font-medium mb-2">
                                                                                        <strong>Reason:</strong> {action.metadata.rejection_reason.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                                                                    </AlertDescription>
                                                                                )}
                                                                                {action.notes && (
                                                                                    <AlertDescription className="text-sm">
                                                                                        {action.notes}
                                                                                    </AlertDescription>
                                                                                )}
                                                                                {action.metadata.rejection_notes && action.metadata.rejection_notes !== action.notes && (
                                                                                    <AlertDescription className="text-sm">
                                                                                        {action.metadata.rejection_notes}
                                                                                    </AlertDescription>
                                                                                )}
                                                                            </Alert>
                                                                        )}

                                                                        {/* General notes for other actions */}
                                                                        {action.action !== 'rejected' && action.notes && (
                                                                            <Alert>
                                                                                <AlertDescription className="text-sm">
                                                                                    {action.notes}
                                                                                </AlertDescription>
                                                                            </Alert>
                                                                        )}

                                                                        {/* Employee notes for submissions */}
                                                                        {action.action === 'submitted' && timesheet.notes && (
                                                                            <Alert>
                                                                                <AlertTitle className="text-sm">Employee Notes</AlertTitle>
                                                                                <AlertDescription className="text-sm">
                                                                                    {timesheet.notes}
                                                                                </AlertDescription>
                                                                            </Alert>
                                                                        )}

                                                                        {/* Processing completion message */}
                                                                        {action.action === 'processed' && (
                                                                            <div className="bg-muted/50 rounded-md p-3">
                                                                                <p className="text-sm text-muted-foreground">
                                                                                    ✅ Timesheet has been processed for payroll
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-8">
                                                    <div className="w-12 h-12 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                                                        <FileText className="w-6 h-6 text-muted-foreground" />
                                                    </div>
                                                    <h3 className="text-sm font-medium text-foreground mb-1">No Timeline Actions</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        No actions recorded for this timesheet yet.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Summary & Punch Records */}
                    <div className="lg:col-span-2">
                        {/* Timesheet Summary */}
                        <div className="grid grid-cols-4 gap-4">
                            <Card className="@container/card">
                                <CardHeader>
                                    <CardDescription>Regular Hours</CardDescription>
                                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                        {formatHours(displayTotals.regular)}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="@container/card">
                                <CardHeader>
                                    <CardDescription>Overtime Hours</CardDescription>
                                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                        {formatHours(displayTotals.overtime)}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="@container/card">
                                <CardHeader>
                                    <CardDescription>Break Totals</CardDescription>
                                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                        {formatHours(displayTotals.break)}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="@container/card">
                                <CardHeader>
                                    <CardDescription>Total Hours</CardDescription>
                                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                        {formatHours(displayTotals.total)}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        {/* Punch Records Table */}
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5" />
                                    Daily Punch Records ({punches.length} punches)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {punches.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No Time Entries</h3>
                                        <p className="text-muted-foreground">
                                            No time entries found for this timesheet week.
                                        </p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Clock In</TableHead>
                                                <TableHead>Clock Out</TableHead>
                                                <TableHead>Duration</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Notes</TableHead>
                                                <TableHead className="text-center">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {getAllPunchesSorted().map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{formatDate(entry.time_in)}</p>
                                                            <p className="text-xs text-muted-foreground">{getDayOfWeek(entry.time_in)}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {getPunchTypeIcon(entry.row_type)}
                                                            {getPunchTypeBadge(entry)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-mono text-sm">{formatTime(entry.time_in)}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-mono text-sm">
                                                            {entry.time_out ? formatTime(entry.time_out) : (
                                                                <span className="font-medium">Active</span>
                                                            )}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-mono text-sm">
                                                            {entry.time_out ?
                                                                formatHours(calculatePunchDuration(entry.time_in, entry.time_out)) :
                                                                '--'
                                                            }
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={entry.time_out ? 'default' : 'secondary'}>
                                                            {entry.time_out ? 'Completed' : 'Active'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {/* Show actual notes if they exist */}
                                                            {entry.notes && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <p className="text-sm text-muted-foreground truncate max-w-32">{entry.notes}</p>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{entry.notes}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {entry.type.includes('(auto-split)') && (
                                                                <Badge variant="outline" className="text-xs">Auto-Split</Badge>
                                                            )}
                                                            {entry.was_edited && (
                                                                <Badge variant="outline" className="text-xs">Edited</Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {!entry.time_out && entry.row_type === 'work' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleClockOut(entry.id)}
                                                                    className="px-2 py-1 h-7 text-xs"
                                                                >
                                                                    Clock Out
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleEditEntry(entry)}
                                                                className="px-2 py-1 h-7"
                                                            >
                                                                <Edit3 className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleDeleteEntry(entry)}
                                                                className="px-2 py-1 h-7"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Time Entry Editing Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                Edit Time Entry - {timesheet.user.name}
                            </DialogTitle>
                        </DialogHeader>

                        {editingEntry ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select
                                            value={editingEntry.row_type}
                                            onValueChange={(value: 'work' | 'break') => setEditingEntry({...editingEntry, row_type: value})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="work">Work</SelectItem>
                                                <SelectItem value="break">Break</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <div className="pt-2">
                                            <Badge variant={editingEntry.time_out ? 'default' : 'secondary'}>
                                                {editingEntry.time_out ? 'Completed' : 'Active'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Clock In</Label>
                                        <DateTimePicker
                                            value={editingEntry.time_in}
                                            onChange={(value) => setEditingEntry({...editingEntry, time_in: value})}
                                            label="clock-in"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Clock Out</Label>
                                        <DateTimePicker
                                            value={editingEntry.time_out || ''}
                                            onChange={(value) => setEditingEntry({...editingEntry, time_out: value || ''})}
                                            label="clock-out"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Textarea
                                        value={editingEntry.notes || ''}
                                        onChange={(e) => setEditingEntry({...editingEntry, notes: e.target.value})}
                                        placeholder="Enter any notes..."
                                        rows={3}
                                    />
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

                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            cancelEditing();
                                            setEditDialogOpen(false);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => handleSaveEntry(editingEntry)}
                                        disabled={!editingEntry.time_in}
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Entry
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>

                {/* Reject Dialog */}
                <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Reject Timesheet</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4">
                                <div className="space-y-2">
                                    <p><strong>Employee:</strong> {timesheet.user.name}</p>
                                    <p><strong>Week:</strong> {getWeekLabel(timesheet.week_start_date, timesheet.week_end_date)}</p>
                                    <p><strong>Total Hours:</strong> {formatHours(displayTotals.total)}</p>
                                    {displayTotals.overtime > 0 && (
                                        <p><strong>Overtime:</strong> {formatHours(displayTotals.overtime)}</p>
                                    )}
                                </div>
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

                            <div className="flex justify-end gap-2">
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
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
