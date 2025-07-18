import {useState} from 'react';
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Calendar as CalendarComponent} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {
    AlertCircleIcon,
    Calendar,
    CheckCircle,
    ChevronDownIcon,
    Clock,
    Coffee,
    Edit3,
    FileText,
    MapPin,
    Play,
    Plus,
    Save,
    Trash2,
    User,
    XCircle
} from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {ScrollArea} from "@/components/ui/scroll-area";

interface BreakType {
    id: number;
    name: string;
    label: string;
    is_paid: boolean;
}

interface User {
    id: number;
    name: string;
    email: string;
    current_position?: {
        title: string;
    };
    avatar?: string;
}

interface TimeClockAudit {
    id: number;
    action: string;
    action_timestamp: string;
    ip_address: string;
    user_agent: string;
}

interface TimeClock {
    id: number | string;
    user_id: number;
    punch_type: 'work' | 'break';
    break_type_id?: number;
    clock_in_at: string;
    clock_out_at: string | null;
    regular_hours: number;
    overtime_hours: number;
    notes: string | null;
    status: 'active' | 'completed' | 'pending_approval';
    location_data: any;
    breakType?: BreakType;
    audits?: TimeClockAudit[];
}

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

interface Timesheet {
    id: number;
    user_id: number;
    week_start_date: string;
    week_end_date: string;
    status: 'draft' | 'submitted' | 'approved' | 'processed' | 'rejected';
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    break_hours: number;
    notes: string | null;
    legal_acknowledgment: boolean;
    user: User;
    // All actions chronologically
    actions?: TimesheetAction[];
    // Accessor properties for backward compatibility
    submitted_at?: string | null;
    approved_at?: string | null;
    processed_at?: string | null;
    withdrawn_at?: string | null;
    rejected_at?: string | null;
    manager_notes?: string | null;
    withdrawal_reason?: string | null;
    rejection_reason?: string | null;
    rejection_notes?: string | null;
    // Action relationships
    submission_action?: TimesheetAction;
    approval_action?: TimesheetAction;
    rejection_action?: TimesheetAction;
    processing_action?: TimesheetAction;
    withdrawal_action?: TimesheetAction;
}

interface Props {
    timesheet: Timesheet;
    timeEntries: TimeClock[];
    currentManagerId: number;
    title: string;
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
                        <CalendarComponent
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

export default function TimesheetDetail({ timesheet, timeEntries, currentManagerId }: Props) {
    const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
    const [managerNotes, setManagerNotes] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);

    // Time editing state
    const [timeEditDialogOpen, setTimeEditDialogOpen] = useState(false);
    const [dayEntries, setDayEntries] = useState<TimeClock[]>([]);
    const [editingEntry, setEditingEntry] = useState<TimeClock | null>(null);
    const [loading, setLoading] = useState(false);

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
            // Parse as local time, not UTC
            const date = new Date(dateString.replace(' ', 'T'));
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

    const formatBreakDuration = (hours: number): string => {
        if (isNaN(hours) || hours < 0) {
            return '0 mins';
        }
        const totalMinutes = Math.round(hours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return h > 0 ? `${h}:${m.toString().padStart(2, '0')} hrs` : `${m} mins`;
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

    const handleResubmit = () => {
        router.post(`/time-clock/manager/resubmit/${timesheet.id}`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                // Redirect back to dashboard after successful resubmission
                router.get('/time-clock/manager/dashboard');
            },
        });
    };

    const handleApprovalAction = (action: 'approve' | 'reject') => {
        setApprovalAction(action);
        setManagerNotes(timesheet.manager_notes || '');
        setDialogOpen(true);
    };

    const submitApproval = () => {
        if (!approvalAction) return;

        router.post(`/time-clock/manager/approve/${timesheet.id}`, {
            action: approvalAction,
            manager_notes: managerNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setApprovalAction(null);
                setManagerNotes('');
            },
        });
    };

    // Time entry editing handlers
    const handleEditEntry = (entry: TimeClock) => {
        setDayEntries([entry]);
        startEditingEntry(entry);
        setTimeEditDialogOpen(true);
    };

    const startEditingEntry = (entry: TimeClock) => {
        setEditingEntry({
            ...entry,
            clock_in_at: formatDateTimeForInput(entry.clock_in_at),
            clock_out_at: entry.clock_out_at ? formatDateTimeForInput(entry.clock_out_at) : null,
        });
    };

    const cancelEditing = () => {
        setEditingEntry(null);
    };

    const handleSaveEntry = (entry: TimeClock) => {
        if (!editingEntry) return;

        const isNewEntry = entry.id.toString().startsWith('new-');

        if (isNewEntry) {
            // Creating new entry
            const entryData = {
                user_id: timesheet.user_id,
                date: editingEntry.clock_in_at.split(' ')[0],
                clock_in_at: editingEntry.clock_in_at,
                clock_out_at: editingEntry.clock_out_at || null,
                notes: editingEntry.notes || '',
                punch_type: editingEntry.punch_type,
            };

            router.post('/time-clock/manager/add-entry', entryData, {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingEntry(null);
                    setTimeEditDialogOpen(false);
                    router.reload();
                }
            });
        } else {
            // Updating existing entry
            const entryData = {
                clock_in_at: editingEntry.clock_in_at,
                clock_out_at: editingEntry.clock_out_at || null,
                notes: editingEntry.notes || '',
                punch_type: editingEntry.punch_type,
            };

            router.post(`/time-clock/manager/update-entry/${editingEntry.id}`, entryData, {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingEntry(null);
                    setTimeEditDialogOpen(false);
                    router.reload();
                }
            });
        }
    };

    const handleClockOut = (entryId: number | string) => {
        router.post(`/time-clock/manager/clock-out/${entryId}`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setTimeEditDialogOpen(false);
                router.reload();
            }
        });
    };

    const handleDeleteEntry = (entryId: number | string) => {
        if (!confirm('Are you sure you want to delete this time entry?')) return;

        router.delete(`/time-clock/manager/delete-entry/${entryId}`, {
            preserveScroll: true,
            onSuccess: () => {
                setTimeEditDialogOpen(false);
                router.reload();
            }
        });
    };

    const handleAddEntry = () => {
        const now = new Date();
        const newEntry: TimeClock = {
            id: `new-${Date.now()}`,
            user_id: timesheet.user_id,
            punch_type: 'work',
            break_type_id: undefined,
            clock_in_at: now.toISOString(),
            clock_out_at: null,
            regular_hours: 0,
            overtime_hours: 0,
            notes: '',
            status: 'active',
            location_data: null,
        };
        setDayEntries([newEntry]);
        startEditingEntry(newEntry);
        setTimeEditDialogOpen(true);
    };

    const getDayOfWeek = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });
    };

    const isOwnTimesheet = (): boolean => {
        return timesheet.user_id === currentManagerId;
    };

    // Get all punches sorted by date and time
    const getAllPunchesSorted = () => {
        return timeEntries.sort((a, b) =>
            new Date(a.clock_in_at).getTime() - new Date(b.clock_in_at).getTime()
        );
    };

    const getPunchTypeIcon = (punchType: string) => {
        return punchType === 'work' ? (
            <Play className="w-4 h-4" />
        ) : (
            <Coffee className="w-4 h-4" />
        );
    };

    const getPunchTypeBadge = (entry: TimeClock) => {
        if (entry.punch_type === 'work') {
            return (
                <Badge variant="outline">
                    Work
                </Badge>
            );
        } else {
            return (
                <Badge variant="secondary">
                    {entry.breakType?.label || 'Break'}
                </Badge>
            );
        }
    };

    // Calculate totals from time entries
    // Calculate totals from time entries with work splitting at break boundaries
    const calculateTotalsFromEntries = () => {
        let totalWorkHours = 0;
        let totalBreakHours = 0;

        console.log('Calculating from entries:', timeEntries);

        // Separate work and break entries
        const workEntries = timeEntries.filter(entry => entry.punch_type === 'work');
        const breakEntries = timeEntries.filter(entry => entry.punch_type === 'break');

        // Process each work entry and split it by breaks
        workEntries.forEach(workEntry => {
            if (!workEntry.clock_out_at) return;

            const workStart = new Date(workEntry.clock_in_at);
            const workEnd = new Date(workEntry.clock_out_at);

            // Find breaks that occur within this work period
            const overlappingBreaks = breakEntries.filter(breakEntry => {
                if (!breakEntry.clock_out_at) return false;
                const breakStart = new Date(breakEntry.clock_in_at);
                const breakEnd = new Date(breakEntry.clock_out_at);
                return breakStart >= workStart && breakEnd <= workEnd;
            }).sort((a, b) => new Date(a.clock_in_at).getTime() - new Date(b.clock_in_at).getTime());

            if (overlappingBreaks.length === 0) {
                // No breaks - count full work time
                const workHours = calculatePunchDuration(workEntry.clock_in_at, workEntry.clock_out_at);
                totalWorkHours += workHours;
            } else {
                // Split work entry by breaks
                let currentStart = workStart;

                overlappingBreaks.forEach(breakEntry => {
                    const breakStart = new Date(breakEntry.clock_in_at);
                    const breakEnd = new Date(breakEntry.clock_out_at!);

                    // Add work time before this break
                    if (currentStart < breakStart) {
                        const segmentHours = (breakStart.getTime() - currentStart.getTime()) / (1000 * 60 * 60);
                        totalWorkHours += segmentHours;
                    }

                    // Move past this break
                    currentStart = breakEnd;
                });

                // Add remaining work time after last break
                if (currentStart < workEnd) {
                    const segmentHours = (workEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60);
                    totalWorkHours += segmentHours;
                }
            }
        });

        // Calculate total break hours for display
        breakEntries.forEach(breakEntry => {
            if (breakEntry.clock_out_at) {
                totalBreakHours += calculatePunchDuration(breakEntry.clock_in_at, breakEntry.clock_out_at);
            }
        });

        // Apply weekly overtime rule (40+ hours)
        const regularHours = Math.min(totalWorkHours, 40);
        const overtimeHours = Math.max(0, totalWorkHours - 40);

        console.log('Calculated totals:', {
            totalWorkHours,
            regularHours,
            overtimeHours,
            totalBreakHours
        });

        return {
            totalHours: totalWorkHours,
            regularHours,
            overtimeHours,
            breakHours: totalBreakHours
        };
    };

    // Always use calculated totals for accuracy
    const calculatedTotals = calculateTotalsFromEntries();

    const breadcrumbs = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Manager TimeSheets',
            href: '/time-clock/manager/dashboard',
        },
        {
            title: `Timesheet for ${timesheet.user.name} - ${getWeekLabel(timesheet.week_start_date, timesheet.week_end_date)} `,
            href: '#',
        },
    ];

    const displayTotals = {
        total: calculatedTotals.totalHours,
        regular: calculatedTotals.regularHours,
        overtime: calculatedTotals.overtimeHours,
        break: calculatedTotals.breakHours
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Timesheet Details - ${timesheet.user.name}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">

                        <div>
                            <h1 className="text-3xl font-bold">
                                Timesheet Details
                                {isOwnTimesheet() && <span className="ml-2">(Your Timesheet)</span>}
                            </h1>
                            <p className="text-muted-foreground">
                                {timesheet.user.name} - {getWeekLabel(timesheet.week_start_date, timesheet.week_end_date)} - {getStatusBadge(timesheet.status)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {timesheet.status === 'submitted' && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleApprovalAction('approve')}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleApprovalAction('reject')}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                </Button>
                            </div>
                        )}
                        {timesheet.status === 'rejected' && (
                            <Button
                                onClick={handleResubmit}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Resubmit to Payroll
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={handleAddEntry}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Entry
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - Timesheet Summary */}
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
                                <div className="flex gap-1 ">
                                    <img
                                        src={timesheet.user.avatar}
                                        alt={timesheet.user.name}
                                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                                    />
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
                                    Timesheet Status ({timesheet.actions?.length || 0} actions)
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
                                                                    icon: <XCircle className="w-4 h-4 text-red-600" />,
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
                                                                    icon: <AlertCircleIcon className="w-4 h-4 text-orange-600" />,
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



                    <div className="lg:col-span-2">
                        {/* Timesheet Summary */}
                        <div className="grid grid-cols-4 gap-4 ">
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


                        {/* Right Column - Time Entries */}
                        <Card className={"mt-4"}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Daily Punch Records ({timeEntries.length} punches)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {timeEntries.length === 0 ? (
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
                                                            <p className="font-medium">{formatDate(entry.clock_in_at)}</p>
                                                            <p className="text-xs text-muted-foreground">{getDayOfWeek(entry.clock_in_at)}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {getPunchTypeIcon(entry.punch_type)}
                                                            {getPunchTypeBadge(entry)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-mono text-sm">{formatTime(entry.clock_in_at)}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-mono text-sm">
                                                            {entry.clock_out_at ? formatTime(entry.clock_out_at) : (
                                                                <span className="font-medium">Active</span>
                                                            )}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-mono text-sm">
                                                            {entry.clock_out_at ?
                                                                formatHours(calculatePunchDuration(entry.clock_in_at, entry.clock_out_at)) :
                                                                '--'
                                                            }
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={entry.status === 'completed' ? 'default' : 'secondary'}>
                                                            {entry.status === 'completed' ? 'Completed' : 'Active'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
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
                                                            {entry.location_data && (
                                                                <MapPin className="w-4 h-4 text-muted-foreground"  />
                                                            )}
                                                            {entry.breakType?.is_paid && entry.punch_type === 'break' && (
                                                                <Badge variant="outline" className="text-xs">Paid</Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {!entry.clock_out_at && entry.status === 'active' && (
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
                                                                onClick={() => handleDeleteEntry(entry.id)}
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
                <Dialog open={timeEditDialogOpen} onOpenChange={setTimeEditDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                Edit Time Entry - {timesheet.user.name}
                            </DialogTitle>
                        </DialogHeader>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="text-muted-foreground">Loading...</div>
                            </div>
                        ) : editingEntry ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select
                                            value={editingEntry.punch_type}
                                            onValueChange={(value: 'work' | 'break') => setEditingEntry({...editingEntry, punch_type: value})}
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
                                            <Badge variant={editingEntry.status === 'completed' ? 'default' : 'secondary'}>
                                                {editingEntry.status === 'completed' ? 'Completed' : 'Active'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Clock In</Label>
                                        <DateTimePicker
                                            value={editingEntry.clock_in_at}
                                            onChange={(value) => setEditingEntry({...editingEntry, clock_in_at: value})}
                                            label="clock-in"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Clock Out</Label>
                                        <DateTimePicker
                                            value={editingEntry.clock_out_at || ''}
                                            onChange={(value) => setEditingEntry({...editingEntry, clock_out_at: value || null})}
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

                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (editingEntry.id.toString().startsWith('new-')) {
                                                setDayEntries([]);
                                            }
                                            cancelEditing();
                                            setTimeEditDialogOpen(false);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => handleSaveEntry(editingEntry)}
                                        disabled={!editingEntry.clock_in_at}
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Entry
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>

                {/* Approval Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {approvalAction === 'approve' ? 'Approve Timesheet' : 'Reject Timesheet'}
                            </DialogTitle>
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
                                <Label htmlFor="manager-notes">
                                    {approvalAction === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
                                </Label>
                                <Textarea
                                    id="manager-notes"
                                    placeholder={
                                        approvalAction === 'approve'
                                            ? "Add any notes about this approval..."
                                            : "Please explain why this timesheet is being rejected..."
                                    }
                                    value={managerNotes}
                                    onChange={(e) => setManagerNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={submitApproval}

                                    disabled={approvalAction === 'reject' && !managerNotes.trim()}
                                    variant={approvalAction === 'reject' ? 'destructive' : 'default'}
                                >
                                    {approvalAction === 'approve' ? 'Approve' : 'Reject'} Timesheet
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
