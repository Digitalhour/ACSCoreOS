import {JSX, useState} from 'react';
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
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {usePermission} from '@/hooks/usePermission';
import {
    AlertCircle,
    CheckCircle,
    ChevronDownIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Edit3,
    Plus,
    Save,
    Search,
    Trash2,
    TrendingUp,
    User,
    Users
} from 'lucide-react';

interface BreakType {
    id: number;
    name: string;
    label: string;
    is_paid: boolean;
}

interface TimeEntry {
    id: number | string;
    user_id: number;
    punch_type: 'work' | 'break';
    break_type_id?: number | null;
    clock_in_at: string;
    clock_out_at: string | null;
    regular_hours: number;
    overtime_hours: number;
    notes: string | null;
    status: 'active' | 'completed' | 'draft';
    break_type?: BreakType | null;
}

interface Position {
    title: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    avatar: string;
    current_position?: Position;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationMeta {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
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
    notes: string | null;
    user: User;
    // Accessor properties for backward compatibility
    submitted_at?: string | null;
    approved_at?: string | null;
    rejected_at?: string | null;
    manager_notes?: string | null;
    rejection_reason?: string | null;
    rejection_notes?: string | null;
    // Action relationships
    submission_action?: TimesheetAction;
    approval_action?: TimesheetAction;
    rejection_action?: TimesheetAction;
    processing_action?: TimesheetAction;
    withdrawal_action?: TimesheetAction;
}

interface DashboardStats {
    pending_count: number;
    total_employees: number;
    this_week_submissions: number;
    approved_this_week: number;
}

interface CurrentStatus {
    is_clocked_in?: boolean;
    is_on_break?: boolean;
    clock_in_time?: string;
    break_start_time?: string;
    current_hours_today?: number;
    break_type?: string;
}

interface Employee {
    avatar: string | undefined;
    id: number;
    name: string;
    position: string;
}

interface WeeklyDays {
    sunday: number;
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
}

interface TeamHoursData {
    employee: Employee;
    days: WeeklyDays;
    weekTotal: number;
    regularHours: number;
    overtimeHours: number;
    currentStatus?: CurrentStatus;
    timesheetId?: number | null;
    timesheetStatus?: string | null;
}

interface Filters {
    status?: string;
    employee_id?: string;
    week_start?: string;
    week_end?: string;
}

interface SelectedWeek {
    start: string;
    end: string;
    label: string;
}

interface Props {
    pendingTimesheets: Timesheet[];
    allTimesheets: {
        data: Timesheet[];
        links: PaginationLink[];
        meta: PaginationMeta;
    };
    subordinates: User[];
    dashboardStats: DashboardStats;
    filters: Filters;
    teamHoursData: TeamHoursData[];
    currentManagerId: number;
    selectedWeek: SelectedWeek;
}

interface BreadcrumbItem {
    title: string;
    href: string;
}

interface NewEntryForm {
    clock_in_at: string;
    clock_out_at: string;
    notes: string;
    punch_type: 'work' | 'break';
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
                    className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none w-28 text-xs h-7"
                />
            </div>
        </div>
    );
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Team Management',
        href: '/time-clock/manager/dashboard',
    },
];

export default function ManagerDashboard({
                                             pendingTimesheets,
                                             // allTimesheets, // Commented out as it's not used in current implementation
                                             // subordinates, // Commented out as it's not used in current implementation
                                             dashboardStats,
                                             filters,
                                             teamHoursData,
                                             currentManagerId,
                                             selectedWeek
                                         }: Props): JSX.Element {
    const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
    const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
    const [managerNotes, setManagerNotes] = useState<string>('');
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const { hasPermission, hasRole, hasAnyRole } = usePermission();

    // Week navigation state
    const [localFilters, setLocalFilters] = useState({
        week_start: filters.week_start || selectedWeek.start,
        week_end: filters.week_end || selectedWeek.end,
        status: filters.status || 'all',
        employee_id: filters.employee_id || 'all',
    });

    // Time editing modal state
    const [timeEditDialogOpen, setTimeEditDialogOpen] = useState<boolean>(false);
    const [selectedEmployee, setSelectedEmployee] = useState<TeamHoursData | null>(null);
    const [selectedDay, setSelectedDay] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [dayEntries, setDayEntries] = useState<TimeEntry[]>([]);
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

    // Week navigation functions
    const applyFilters = (filterValues: typeof localFilters) => {
        const params = new URLSearchParams();

        if (filterValues.week_start) params.set('week_start', filterValues.week_start);
        if (filterValues.week_end) params.set('week_end', filterValues.week_end);
        if (filterValues.status && filterValues.status !== 'all') {
            params.set('status', filterValues.status);
        }
        if (filterValues.employee_id && filterValues.employee_id !== 'all') {
            params.set('employee_id', filterValues.employee_id);
        }

        router.get('/time-clock/manager/dashboard', Object.fromEntries(params), {
            preserveState: true,
            preserveScroll: true,
            only: ['teamHoursData', 'dashboardStats', 'selectedWeek', 'filters']
        });
    };

    const navigateWeek = (direction: 'prev' | 'next') => {
        const currentWeekStart = new Date(localFilters.week_start || selectedWeek.start);
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

    const formatPeriod = (startDate: string, endDate: string): string => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const resetToCurrentWeek = () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const defaultFilters = {
            ...localFilters,
            week_start: startOfWeek.toISOString().split('T')[0],
            week_end: endOfWeek.toISOString().split('T')[0]
        };

        setLocalFilters(defaultFilters);
        applyFilters(defaultFilters);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const formatHours = (hours: number): string => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const formatTime = (dateString: string): string => {
        // Parse as local time, not UTC
        const date = new Date(dateString.replace(' ', 'T'));
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
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

    const getCurrentDayColumn = (): string => {
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        return dayName;
    };

    const getDateForDay = (dayName: string): string => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayIndex = days.indexOf(dayName);

        // Use the selected week's start date instead of today
        const selectedWeekStart = new Date(localFilters.week_start || selectedWeek.start);

        // Calculate the target date within the selected week
        const targetDate = new Date(selectedWeekStart);
        targetDate.setDate(selectedWeekStart.getDate() + dayIndex);

        return targetDate.toISOString().split('T')[0];
    };

    const handleDayClick = async (emp: TeamHoursData, dayName: string): Promise<void> => {
        setLoading(true);
        setSelectedEmployee(emp);
        setSelectedDay(dayName);
        const targetDate = getDateForDay(dayName);
        setSelectedDate(targetDate);

        try {
            const response = await fetch(`/time-clock/manager/day-entries-modal?user_id=${emp.employee.id}&date=${targetDate}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (response.ok) {
                const entries: TimeEntry[] = await response.json();
                setDayEntries(Array.isArray(entries) ? entries : []);
            } else {
                console.error('Failed to fetch day entries:', response.status);
                setDayEntries([]);
            }
        } catch (error) {
            console.error('Error fetching day entries:', error);
            setDayEntries([]);
        } finally {
            setLoading(false);
            setTimeEditDialogOpen(true);
        }
    };

    const handleClockOut = (entryId: number | string): void => {
        router.post(`/time-clock/manager/clock-out/${entryId}`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                // Refresh the day entries
                if (selectedEmployee) {
                    handleDayClick(selectedEmployee, selectedDay);
                }
                // Also refresh the page data to update status indicators
                router.reload({ only: ['teamHoursData'] });
            }
        });
    };

    const handleSaveEntry = (entry: TimeEntry): void => {
        if (!editingEntry) return;

        const isNewEntry = entry.id.toString().startsWith('new-');

        if (isNewEntry) {
            // Creating new entry
            const entryData = {
                user_id: selectedEmployee?.employee.id,
                date: selectedDate,
                clock_in_at: editingEntry.clock_in_at,
                clock_out_at: editingEntry.clock_out_at || null,
                notes: editingEntry.notes || '',
                punch_type: editingEntry.punch_type,
            };

            router.post('/time-clock/manager/add-entry', entryData, {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingEntry(null);
                    if (selectedEmployee) {
                        handleDayClick(selectedEmployee, selectedDay);
                    }
                    router.reload({ only: ['teamHoursData'] });
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
                    if (selectedEmployee) {
                        handleDayClick(selectedEmployee, selectedDay);
                    }
                    router.reload({ only: ['teamHoursData'] });
                }
            });
        }
    };

    const handleClockInNow = (): void => {
        if (!selectedEmployee) return;

        // Send minimal data - let the server handle the timestamp
        const clockInData = {
            user_id: selectedEmployee.employee.id,
            punch_type: 'work',
            notes: 'Clocked in by manager',
            is_clock_in_now: true, // Flag to indicate this is a "clock in now" action
        };

        setLoading(true);
        router.post('/time-clock/manager/add-entry', clockInData, {
            preserveScroll: true,
            onSuccess: () => {
                // Refresh the day entries to show the new active entry
                if (selectedEmployee) {
                    handleDayClick(selectedEmployee, selectedDay);
                }
                // Also refresh the page data to update status indicators
                router.reload({ only: ['teamHoursData'] });
            },
            onFinish: () => {
                setLoading(false);
            }
        });
    };

    const createNewManualEntry = (): TimeEntry => {
        const now = new Date();

        // For manual entries, set a reasonable default time (like 9 AM today)
        // but let the user edit it - don't try to guess the timezone
        const startOfWorkDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

        return {
            id: `new-${Date.now()}`,
            user_id: selectedEmployee?.employee.id ?? 0,
            punch_type: 'work',
            break_type_id: null,
            clock_in_at: startOfWorkDay.toISOString(),
            clock_out_at: null,
            regular_hours: 0,
            overtime_hours: 0,
            notes: '',
            status: 'draft',
            break_type: null
        };
    };

    const handleAddManualEntry = (): void => {
        const newEntry = createNewManualEntry();
        setDayEntries([...dayEntries, newEntry]);
        startEditingEntry(newEntry);
    };

    const handleDeleteEntry = (entryId: number | string): void => {
        if (!confirm('Are you sure you want to delete this time entry?')) return;

        router.delete(`/time-clock/manager/delete-entry/${entryId}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedEmployee) {
                    handleDayClick(selectedEmployee, selectedDay);
                }
                router.reload({ only: ['teamHoursData'] });
            }
        });
    };

    const startEditingEntry = (entry: TimeEntry): void => {
        setEditingEntry({
            ...entry,
            clock_in_at: formatDateTimeForInput(entry.clock_in_at),
            clock_out_at: entry.clock_out_at ? formatDateTimeForInput(entry.clock_out_at) : null,
        });
    };

    const cancelEditing = (): void => {
        setEditingEntry(null);
    };

    const renderDayCell = (hours: number, dayName: string, emp: TeamHoursData): JSX.Element => {
        const isToday = getCurrentDayColumn() === dayName;
        const status = emp.currentStatus ?? {
            is_clocked_in: false,
            is_on_break: false,
            current_hours_today: 0
        };

        return (
            <td
                className={`text-center p-3 font-mono text-sm cursor-pointer hover:bg-blue-100 transition-colors ${isToday ? 'bg-blue-50 border-l-2 border-l-blue-400' : ''}`}
                onClick={() => handleDayClick(emp, dayName)}
                title={`Click to edit ${dayName} hours for ${emp.employee.name}`}
            >
                <div>
                    {hours > 0 ? formatHours(hours) : '—'}
                </div>
                {isToday && status.is_clocked_in && (
                    <div className="mt-1 space-y-1">
                        <div className="flex items-center justify-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${status.is_on_break ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                            <span className={`text-xs font-medium ${status.is_on_break ? 'text-orange-600' : 'text-green-600'}`}>
                                {status.is_on_break ? 'Break' : 'Active'}
                            </span>
                        </div>
                        {status.clock_in_time && (
                            <div className="text-xs text-slate-600">
                                In: {formatTime(status.clock_in_time)}
                            </div>
                        )}
                        {status.is_on_break && status.break_start_time && (
                            <div className="text-xs text-orange-600">
                                {status.break_type || 'Break'}: {formatTime(status.break_start_time)}
                            </div>
                        )}
                        <div className="text-xs font-medium text-blue-600">
                            Today: {formatHours(status.current_hours_today ?? 0)}
                        </div>
                    </div>
                )}
            </td>
        );
    };

    const getWeekLabel = (startDate: string, endDate: string): string => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    const getStatusBadge = (status: string): JSX.Element => {
        const config = {
            draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
            submitted: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
            approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700' },
            processed: { label: 'Processed', className: 'bg-blue-100 text-blue-700' },
            rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
        }[status] || { label: 'Draft', className: 'bg-slate-100 text-slate-700' };

        return <Badge className={config.className}>{config.label}</Badge>;
    };

    const handleQuickApproval = (timesheet: Timesheet, action: 'approve' | 'reject'): void => {
        if (action === 'approve') {
            router.post(`/time-clock/manager/approve/${timesheet.id}`, {
                action: 'approve',
                manager_notes: '',
            }, { preserveScroll: true });
        } else {
            setSelectedTimesheet(timesheet);
            setApprovalAction(action);
            setManagerNotes('');
            setDialogOpen(true);
        }
    };

    const submitApproval = (): void => {
        if (!selectedTimesheet || !approvalAction) return;

        router.post(`/time-clock/manager/approve/${selectedTimesheet.id}`, {
            action: approvalAction,
            manager_notes: managerNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setSelectedTimesheet(null);
                setApprovalAction(null);
                setManagerNotes('');
            },
        });
    };

    const isOwnTimesheet = (timesheet: Timesheet): boolean => {
        return timesheet.user_id === currentManagerId;
    };

    const safeTeamHoursData = (teamHoursData || []).filter((emp: TeamHoursData) => {
        if (!emp || !emp.employee) {
            console.error('Invalid employee data:', emp);
            return false;
        }
        // Ensure currentStatus exists with defaults
        if (!emp.currentStatus) {
            emp.currentStatus = {
                is_clocked_in: false,
                is_on_break: false,
                current_hours_today: 0
            };
        }
        return true;
    });

    const grandTotal = safeTeamHoursData.reduce((sum: number, emp: TeamHoursData) => sum + emp.weekTotal, 0);
    const totalOvertime = safeTeamHoursData.reduce((sum: number, emp: TeamHoursData) => sum + emp.overtimeHours, 0);

    // Filter pending timesheets by search
    const filteredPendingTimesheets = pendingTimesheets.filter((timesheet: Timesheet) =>
        timesheet.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        timesheet.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Team Management" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Team Management</h1>
                        <p className="text-slate-600 mt-1">
                            Monitor, approve, and manage your team's time
                        </p>
                    </div>
                    <div className="p-4">
                        <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center border rounded-md bg-white">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="px-3 border-r hover:bg-slate-100"
                                        onClick={() => navigateWeek('prev')}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <div className="flex-1 px-4 py-2 text-sm font-medium text-center min-w-[200px]">
                                        {formatPeriod(localFilters.week_start, localFilters.week_end)}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="px-3 border-l hover:bg-slate-100"
                                        onClick={() => navigateWeek('next')}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <Button
                                type="button"
                                onClick={resetToCurrentWeek}
                                variant="outline"
                                size="sm"
                            >
                                Current Week
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card>
                        <CardContent className="">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-600">Pending Approvals</p>
                                    <p className="text-xl font-bold text-slate-900">{dashboardStats.pending_count}</p>
                                    <p className="text-xs text-red-600 mt-1">Requires attention</p>
                                </div>
                                <AlertCircle className="h-8 w-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card >
                        <CardContent >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Team Members</p>
                                    <p className="text-xl font-bold text-slate-900">{dashboardStats.total_employees}</p>
                                    <p className="text-xs text-slate-500 mt-1">Active employees</p>
                                </div>
                                <Users className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card >
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Team Hours for the Week</p>
                                    <p className="text-xl font-bold text-slate-900">{formatHours(grandTotal)}</p>
                                    <p className="text-xs text-green-600 mt-1">Total hours logged</p>
                                </div>
                                <Clock className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card >
                        <CardContent >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600">Overtime</p>
                                    <p className="text-xl font-bold text-slate-900">{formatHours(totalOvertime)}</p>
                                    <p className="text-xs text-orange-600 mt-1">This week</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {hasPermission('payroll-submit-payroll') && (
                        <>
                    {/* Action Required - Left Column */}
                    <div className="lg:col-span-1">

                        <Card className="h-fit">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                        Action Required
                                        {pendingTimesheets.length > 0 && (
                                            <Badge variant="destructive" className="ml-2">
                                                {pendingTimesheets.length}
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </div>
                                {pendingTimesheets.length > 0 && (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Search employees..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                {filteredPendingTimesheets.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                                        <h3 className="font-medium text-slate-900 mb-1">All caught up!</h3>
                                        <p className="text-sm text-slate-600">No pending approvals</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1 max-h-96 overflow-y-auto">
                                        {filteredPendingTimesheets.map((timesheet: Timesheet) => (
                                            <div
                                                key={timesheet.id}
                                                className={`border rounded-lg p-4 hover:bg-slate-50 transition-colors ${
                                                    isOwnTimesheet(timesheet) ? 'border-blue-200 bg-blue-50' :
                                                        timesheet.status === 'rejected' ? 'border-red-200 bg-red-50' : 'border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <img
                                                            src={timesheet.user.avatar}
                                                            alt={timesheet.user.name}
                                                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="font-medium text-slate-900 truncate">
                                                                    {timesheet.user.name}
                                                                </p>
                                                                {isOwnTimesheet(timesheet) && (
                                                                    <User className="w-4 h-4 text-blue-600" />
                                                                )}
                                                                {getStatusBadge(timesheet.status)}
                                                            </div>

                                                            <p className="text-xs text-slate-500 mb-2">
                                                                {getWeekLabel(timesheet.week_start_date, timesheet.week_end_date)}
                                                            </p>

                                                            {timesheet.status === 'rejected' && timesheet.rejection_reason && (
                                                                <div className="mb-2 p-2 bg-red-100 rounded text-xs">
                                                                    <p className="font-medium text-red-800">Rejected by Payroll:</p>
                                                                    <p className="text-red-700">{timesheet.rejection_reason.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                                                                    {timesheet.rejection_notes && (
                                                                        <p className="text-red-600 mt-1">{timesheet.rejection_notes}</p>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-4 text-xs">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-slate-600">Regular:</span>
                                                                    <span className="font-medium text-slate-900">
                                                                        {formatHours(timesheet.regular_hours)}
                                                                    </span>
                                                                </div>

                                                                {timesheet.overtime_hours > 0 && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-slate-600">OT:</span>
                                                                        <span className="font-medium text-orange-600">
                                                                            {formatHours(timesheet.overtime_hours)}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-slate-600">Total:</span>
                                                                    <span className="font-semibold text-slate-900">
                                                                        {formatHours(timesheet.total_hours)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant={timesheet.status === 'rejected' ? 'default' : 'outline'}
                                                        onClick={() => router.get(`/time-clock/manager/timesheet/${timesheet.id}`)}
                                                        className="ml-3"
                                                    >
                                                        <Clock className="w-4 h-4 mr-2" />
                                                        {timesheet.status === 'rejected' ? 'Fix & Resubmit' : 'Timesheet'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </div>
                        </>
                    )}



                    {/* Team Hours - Right Column */}
                    <div className="lg:col-span-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                                    <span>Weekly Team Hours</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left p-3 font-medium text-slate-700">Employee</th>
                                            <th className="text-center p-3 font-medium text-slate-700">Sun</th>
                                            <th className="text-center p-3 font-medium text-slate-700">Mon</th>
                                            <th className="text-center p-3 font-medium text-slate-700">Tue</th>
                                            <th className="text-center p-3 font-medium text-slate-700">Wed</th>
                                            <th className="text-center p-3 font-medium text-slate-700">Thu</th>
                                            <th className="text-center p-3 font-medium text-slate-700">Fri</th>
                                            <th className="text-center p-3 font-medium text-slate-700">Sat</th>
                                            <th className="text-center p-3 font-medium text-slate-700 bg-slate-50">Total</th>

                                        </tr>
                                        </thead>
                                        <tbody>
                                        {safeTeamHoursData.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="text-center p-8 text-slate-500">
                                                    No team hours data available for this week
                                                </td>
                                            </tr>
                                        ) : (
                                            safeTeamHoursData.map((emp: TeamHoursData, index: number) => (
                                                <tr key={emp.employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={emp.employee.avatar}
                                                                alt={emp.employee.name}
                                                                className="w-8 h-8 rounded-full border border-slate-200"
                                                            />
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium text-slate-900">{emp.employee.name}</p>
                                                                    {emp.employee.id === currentManagerId && (
                                                                        <User className="w-3 h-3 text-blue-600" />
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500">{emp.employee.position}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {renderDayCell(emp.days.sunday, 'sunday', emp)}
                                                    {renderDayCell(emp.days.monday, 'monday', emp)}
                                                    {renderDayCell(emp.days.tuesday, 'tuesday', emp)}
                                                    {renderDayCell(emp.days.wednesday, 'wednesday', emp)}
                                                    {renderDayCell(emp.days.thursday, 'thursday', emp)}
                                                    {renderDayCell(emp.days.friday, 'friday', emp)}
                                                    {renderDayCell(emp.days.saturday, 'saturday', emp)}
                                                    <td className="text-center p-3 font-mono font-semibold bg-slate-50">
                                                        {formatHours(emp.weekTotal)}
                                                        {emp.overtimeHours > 0 && (
                                                            <div className="text-xs text-orange-600">
                                                                +{formatHours(emp.overtimeHours)} OT
                                                            </div>
                                                        )}
                                                    </td>

                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                {hasPermission('payroll-submit-payroll') && (
                    <>
                {/* Time Editing Dialog */}
                <Dialog open={timeEditDialogOpen} onOpenChange={setTimeEditDialogOpen}>
                    <DialogContent className="min-w-8/12 w-9/12 max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                Edit Time - {selectedEmployee?.employee.name} - {selectedDay} ({selectedDate})
                                {getCurrentDayColumn() === selectedDay && selectedEmployee?.currentStatus?.is_clocked_in && (
                                    <div className="text-sm font-normal text-green-600 mt-1">
                                        Currently Active - Clocked in at {selectedEmployee?.currentStatus?.clock_in_time ? formatTime(selectedEmployee.currentStatus.clock_in_time) : ''}
                                        {selectedEmployee.currentStatus.is_on_break && (
                                            <span className="text-orange-600"> • On Break</span>
                                        )}
                                    </div>
                                )}
                            </DialogTitle>
                        </DialogHeader>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="text-slate-500">Loading entries...</div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Quick Actions Section */}
                                <div className="flex gap-2 flex-wrap justify-end">
                                    {/* Clock In Now Button - Show if no active entries or not clocked in today */}
                                    {(!selectedEmployee?.currentStatus?.is_clocked_in || getCurrentDayColumn() !== selectedDay) && (
                                        <Button
                                            onClick={handleClockInNow}
                                            disabled={loading}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            size="sm"
                                        >
                                            <Clock className="w-4 h-4 mr-2" />
                                            Clock In Now
                                        </Button>
                                    )}

                                    {/* Add Manual Entry Button */}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const newEntry: TimeEntry = {
                                                id: `new-${Date.now()}`,
                                                user_id: selectedEmployee?.employee.id ?? 0,
                                                punch_type: 'work',
                                                break_type_id: null,
                                                clock_in_at: new Date().toISOString(),
                                                clock_out_at: null,
                                                regular_hours: 0,
                                                overtime_hours: 0,
                                                notes: '',
                                                status: 'draft',
                                                break_type: null
                                            };
                                            setDayEntries([...dayEntries, newEntry]);
                                            startEditingEntry(newEntry);
                                        }}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Manual Entry
                                    </Button>
                                </div>

                                {/* No Entries State - Updated */}
                                {dayEntries.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                                        <Clock className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-900 mb-2">No Time Entries</h3>
                                        <p className="text-slate-600 mb-4">
                                            {selectedEmployee?.employee.name} has no time entries for {selectedDay}
                                        </p>

                                        {getCurrentDayColumn() === selectedDay && selectedEmployee?.currentStatus?.is_clocked_in ? (
                                            <div className="bg-orange-100 border border-orange-200 rounded-lg p-4 mx-4 mb-4">
                                                <p className="text-sm text-orange-800">
                                                    <strong>Note:</strong> Employee appears to be currently clocked in but no entries were found.
                                                    This may indicate a data sync issue.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex justify-center gap-3">
                                                <Button
                                                    onClick={handleClockInNow}
                                                    disabled={loading}
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    <Clock className="w-4 h-4 mr-2" />
                                                    Clock In Now
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={handleAddManualEntry}
                                                >
                                                    <Edit3 className="w-4 h-4 mr-2" />
                                                    Add Manual Entry
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Existing Entries Datatable */
                                    <div>
                                        <h3 className="text-lg font-medium mb-3">Existing Entries ({dayEntries.length})</h3>
                                        <div className="border rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 border-b">
                                                <tr>
                                                    <th className="text-left p-3 font-medium">Type</th>
                                                    <th className="text-left p-3 font-medium">Clock In</th>
                                                    <th className="text-left p-3 font-medium">Clock Out</th>
                                                    <th className="text-left p-3 font-medium">Duration</th>
                                                    <th className="text-left p-3 font-medium">Notes</th>
                                                    <th className="text-center p-3 font-medium">Actions</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {dayEntries.map((entry: TimeEntry, index: number) => {
                                                    const isEditing = editingEntry?.id === entry.id;
                                                    const duration = entry.clock_out_at
                                                        ? (new Date(entry.clock_out_at).getTime() - new Date(entry.clock_in_at).getTime()) / (1000 * 60 * 60)
                                                        : 0;

                                                    return (
                                                        <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}>
                                                            <td className="p-3">
                                                                {isEditing ? (
                                                                    <Select
                                                                        value={editingEntry.punch_type}
                                                                        onValueChange={(value: 'work' | 'break') => setEditingEntry({...editingEntry, punch_type: value})}
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
                                                                    <Badge variant={entry.punch_type === 'work' ? 'default' : 'secondary'}>
                                                                        {entry.punch_type === 'work' ? 'Work' : entry.break_type?.label || 'Break'}
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                            <td className="p-3">
                                                                {isEditing ? (
                                                                    <DateTimePicker
                                                                        value={editingEntry.clock_in_at}
                                                                        onChange={(value) => setEditingEntry({...editingEntry, clock_in_at: value})}
                                                                        label="clock-in"
                                                                        required
                                                                    />
                                                                ) : (
                                                                    <span className="font-mono">{formatTime(entry.clock_in_at)}</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3">
                                                                {isEditing ? (
                                                                    <DateTimePicker
                                                                        value={editingEntry.clock_out_at || ''}
                                                                        onChange={(value) => setEditingEntry({...editingEntry, clock_out_at: value || null})}
                                                                        label="clock-out"
                                                                    />
                                                                ) : entry.clock_out_at ? (
                                                                    <span className="font-mono">{formatTime(entry.clock_out_at)}</span>
                                                                ) : (
                                                                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                                                                )}
                                                            </td>
                                                            <td className="p-3">
                                                                <span className="font-mono">
                                                                    {entry.clock_out_at ? formatHours(duration) : '—'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3">
                                                                {isEditing ? (
                                                                    <Textarea
                                                                        value={editingEntry.notes || ''}
                                                                        onChange={(e) => setEditingEntry({...editingEntry, notes: e.target.value})}
                                                                        placeholder="Notes..."
                                                                        className="w-56 text-xs"
                                                                    />
                                                                ) : (
                                                                    <span className="text-slate-600 text-xs">
                                                                        {entry.notes || '—'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex items-center gap-1 justify-center">
                                                                    {isEditing ? (
                                                                        <>
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => handleSaveEntry(entry)}
                                                                                className="px-2 py-1 h-7"
                                                                                disabled={!editingEntry.clock_in_at}
                                                                            >
                                                                                <Save className="w-3 h-3" />
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => {
                                                                                    if (entry.id.toString().startsWith('new-')) {
                                                                                        // Remove new entry from list
                                                                                        setDayEntries(dayEntries.filter((e: TimeEntry) => e.id !== entry.id));
                                                                                    }
                                                                                    cancelEditing();
                                                                                }}
                                                                                className="px-2 py-1 h-7"
                                                                            >
                                                                                ✕
                                                                            </Button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {!entry.clock_out_at && entry.status === 'active' && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    onClick={() => handleClockOut(entry.id)}
                                                                                    className="bg-green-600 hover:bg-green-700 px-2 py-1 h-7 text-xs mr-1"
                                                                                >
                                                                                    Clock Out
                                                                                </Button>
                                                                            )}
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => startEditingEntry(entry)}
                                                                                className="px-2 py-1 h-7"
                                                                            >
                                                                                <Edit3 className="w-3 h-3" />
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="destructive"
                                                                                onClick={() => {
                                                                                    if (entry.id.toString().startsWith('new-')) {
                                                                                        setDayEntries(dayEntries.filter((e: TimeEntry) => e.id !== entry.id));
                                                                                    } else {
                                                                                        handleDeleteEntry(entry.id);
                                                                                    }
                                                                                }}
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
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Approval Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {approvalAction === 'approve' ? 'Approve Timesheet' : 'Reject Timesheet'}
                            </DialogTitle>
                        </DialogHeader>
                        {selectedTimesheet && (
                            <div className="space-y-4">
                                <div className="bg-slate-50 border rounded-lg p-4">
                                    <div className="space-y-2">
                                        <p><span className="font-medium">Employee:</span> {selectedTimesheet.user.name}</p>
                                        <p><span className="font-medium">Week:</span> {getWeekLabel(selectedTimesheet.week_start_date, selectedTimesheet.week_end_date)}</p>
                                        <p><span className="font-medium">Total Hours:</span> {formatHours(selectedTimesheet.total_hours)}</p>
                                        {selectedTimesheet.overtime_hours > 0 && (
                                            <p><span className="font-medium">Overtime:</span> {formatHours(selectedTimesheet.overtime_hours)}</p>
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
                                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={submitApproval}
                                        disabled={approvalAction === 'reject' && !managerNotes.trim()}
                                        className={approvalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                                        variant={approvalAction === 'reject' ? 'destructive' : 'default'}
                                    >
                                        {approvalAction === 'approve' ? 'Approve' : 'Reject'} Timesheet
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
