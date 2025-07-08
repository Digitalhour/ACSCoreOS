import React, {useEffect, useState} from 'react';
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import {Popover, PopoverContent, PopoverTrigger,} from '@/components/ui/popover';
import {Calendar} from '@/components/ui/calendar';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {
    AlertTriangle,
    Building,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Edit3,
    Eye,
    Plus,
    Save,
    Trash2,
    Users,
    X
} from 'lucide-react';
import {addWeeks, format, parseISO, startOfWeek, subWeeks} from 'date-fns';
import {cn} from '@/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================
interface User {
    id: number;
    name: string;
    email: string;
    position?: string;
    departments?: string[];
}

// Updated EditHistoryItem to match the new controller response
interface EditHistoryItem {
    id: number;
    adjustment_type: string;
    reason: string;
    employee_notes?: string;
    status: string;
    created_at: string;
    original_data?: {
        clock_in_time?: string;
        clock_out_time?: string;
        total_hours?: number;
    };
    adjusted_clock_in?: string;
    adjusted_clock_out?: string;
    adjusted_hours?: number;
    requestedBy?: { id: number; name: string; };
    approvedBy?: { id: number; name: string; };
    rejectedBy?: { id: number; name: string; };
    approved_at?: string;
    rejection_reason?: string;
    rejected_at?: string;
    approval_notes?: string;
}

interface TimeEntry {
    id: number;
    clock_in_time: string;
    clock_out_time?: string;
    total_hours?: number;
    status: string;
    is_active?: boolean;
    is_edited?: boolean;
    edit_history?: EditHistoryItem[];
}

interface DayData {
    date: string;
    day_name: string;
    is_weekend: boolean;
    total_hours: number;
    regular_hours?: number;
    overtime_hours?: number;
    entries_count?: number;
    entries: TimeEntry[];
}

interface WeeklyTotals {
    total_hours: number;
    regular_hours?: number;
    overtime_hours?: number;
}

interface Submission {
    id: number;
    status: string;
    submitted_at?: string;
    can_edit?: boolean;
    is_locked?: boolean;
}

interface UserData {
    user: User;
    week_info?: {
        start_date: string;
        end_date: string;
        display: string;
    };
    submission?: Submission;
    daily_data: DayData[];
    weekly_totals: WeeklyTotals;
}

interface WeekInfo {
    start_date: string;
    end_date: string;
    display: string;
}

interface WeeklyDataResponse {
    week_info: WeekInfo;
    users_data: UserData[];
}

interface EditingEntry extends TimeEntry {
    user?: User;
}

interface AdjustmentData {
    time_entry_id: number;
    adjustment_type: string;
    adjusted_clock_in: string;
    adjusted_clock_out: string | null;
    adjusted_hours: number;
    reason: string;
    employee_notes: string;
    original_data: {
        clock_in_time: string;
        clock_out_time?: string;
        total_hours?: number;
    };
}

type AdjustmentType = 'time_correction' | 'missed_punch' | 'break_adjustment' | 'manual_entry';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Timesheet', href: '/timesheet' },
    { title: 'Manager', href: '/timesheet/manager' },
];

// ============================================================================
// DateTimePicker Component (for Edit Dialog only)
// ============================================================================
interface DateTimePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, placeholder = "Pick a date and time" }) => {
    const [open, setOpen] = useState<boolean>(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(value ? parseISO(value) : undefined);
    const [timeValue, setTimeValue] = useState<string>(
        value ? format(parseISO(value), 'HH:mm') : '09:00'
    );

    const handleDateSelect = (date: Date | undefined): void => {
        if (date) {
            setSelectedDate(date);
            const [hours, minutes] = timeValue.split(':');
            const newDateTime = new Date(date);
            newDateTime.setHours(parseInt(hours), parseInt(minutes));
            onChange(format(newDateTime, "yyyy-MM-dd'T'HH:mm"));
        }
    };

    const handleTimeChange = (time: string): void => {
        setTimeValue(time);
        if (selectedDate && time) {
            try {
                const [hours, minutes] = time.split(':');
                const hoursNum = parseInt(hours, 10);
                const minutesNum = parseInt(minutes, 10);

                if (isNaN(hoursNum) || isNaN(minutesNum) || hoursNum < 0 || hoursNum > 23 || minutesNum < 0 || minutesNum > 59) {
                    console.warn('Invalid time values:', hours, minutes);
                    return;
                }

                const newDateTime = new Date(selectedDate);
                newDateTime.setHours(hoursNum, minutesNum);

                if (isNaN(newDateTime.getTime())) {
                    console.warn('Invalid date created:', newDateTime);
                    return;
                }

                onChange(format(newDateTime, "yyyy-MM-dd'T'HH:mm"));
            } catch (err) {
                console.error('Error handling time change:', err);
            }
        }
    };

    useEffect(() => {
        if (value) {
            try {
                const date = parseISO(value);
                setSelectedDate(date);
                setTimeValue(format(date, 'HH:mm'));
            } catch (e) {
                setSelectedDate(undefined);
                setTimeValue('09:00');
            }
        } else {
            setSelectedDate(undefined);
            setTimeValue('09:00');
        }
    }, [value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value ? (
                        format(parseISO(value), "PPP 'at' HH:mm")
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="space-y-4 p-4">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        initialFocus
                    />
                    <div className="space-y-2">
                        <Label htmlFor="time">Time</Label>
                        <Input
                            id="time"
                            type="time"
                            value={timeValue}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTimeChange(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => setOpen(false)}
                        className="w-full"
                    >
                        Set Date & Time
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

// ============================================================================
// Manager Component
// ============================================================================
const Manager: React.FC = () => {
    // Component State
    const [weeklyData, setWeeklyData] = useState<UserData[]>([]);
    const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());

    // Dialog States
    const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
    const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [showAddDialog, setShowAddDialog] = useState<boolean>(false);
    const [showHistoryDialog, setShowHistoryDialog] = useState<boolean>(false);

    // Add Entry Form State
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [newClockInTime, setNewClockInTime] = useState<string>('09:00'); // Just time now
    const [newClockOutTime, setNewClockOutTime] = useState<string>('17:00'); // Just time now
    const [newEntryReason, setNewEntryReason] = useState<string>('');
    const [newEntryNotes, setNewEntryNotes] = useState<string>('');
    const [addEntryLoading, setAddEntryLoading] = useState<boolean>(false);
    const [addEntryError, setAddEntryError] = useState<string>('');

    // Edit Entry Form State
    const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('time_correction');
    const [adjustedClockIn, setAdjustedClockIn] = useState<string>('');
    const [adjustedClockOut, setAdjustedClockOut] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [employeeNotes, setEmployeeNotes] = useState<string>('');
    const [submitLoading, setSubmitLoading] = useState<boolean>(false);
    const [submitError, setSubmitError] = useState<string>('');

    // Delete Entry Form State
    const [deleteReason, setDeleteReason] = useState<string>('');
    const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string>('');

    // History Dialog State
    const [historyLoading, setHistoryLoading] = useState<boolean>(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [adjustmentHistory, setAdjustmentHistory] = useState<EditHistoryItem[]>([]);

    // Data Fetching Effect
    useEffect(() => {
        fetchWeeklyData();
    }, [selectedWeek]);

    // Async Functions & Handlers
    const fetchWeeklyData = async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
            const formattedDate = format(weekStart, 'yyyy-MM-dd');
            const response = await fetch(`/api/timesheet/weekly-data?week_start=${formattedDate}`);
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            const data: WeeklyDataResponse = await response.json();
            if (!data.users_data || !Array.isArray(data.users_data)) {
                throw new Error('Invalid data format received from server');
            }
            setWeeklyData(data.users_data);
            setWeekInfo(data.week_info || null);
        } catch (err) {
            console.error('Error fetching weekly data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load timesheet data');
            setWeeklyData([]);
            setWeekInfo(null);
        } finally {
            setLoading(false);
        }
    };

    const navigateWeek = (direction: number): void => {
        const newDate = direction > 0 ? addWeeks(selectedWeek, 1) : subWeeks(selectedWeek, 1);
        setSelectedWeek(newDate);
    };

    const handleAddEntry = (userData: UserData): void => {
        setSelectedUser(userData.user);
        if (userData.daily_data && userData.daily_data.length > 0) {
            const firstWorkableDay = userData.daily_data.find(d => !d.is_weekend)?.date || userData.daily_data[0].date;
            setSelectedDate(firstWorkableDay);
        } else {
            setSelectedDate('');
        }
        setNewClockInTime('09:00');
        setNewClockOutTime('17:00');
        setNewEntryReason('');
        setNewEntryNotes('');
        setAddEntryError('');
        setAddEntryLoading(false);
        setShowAddDialog(true);
    };

    // Helper function to combine date and time
    const combineDateAndTime = (date: string, time: string): string => {
        if (!date || !time) return '';
        return `${date}T${time}:00`;
    };

    const handleSubmitAddEntry = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        setAddEntryError('');

        if (!selectedUser) { setAddEntryError('User is required'); return; }
        if (!selectedDate) { setAddEntryError('Date is required'); return; }
        if (!newClockInTime) { setAddEntryError('Clock in time is required'); return; }

        const clockInDateTime = combineDateAndTime(selectedDate, newClockInTime);
        const clockOutDateTime = newClockOutTime ? combineDateAndTime(selectedDate, newClockOutTime) : null;

        if (clockOutDateTime && parseISO(clockInDateTime) >= parseISO(clockOutDateTime)) {
            setAddEntryError('Clock out time must be after clock in time');
            return;
        }
        if (!newEntryReason.trim()) { setAddEntryError('Reason is required'); return; }

        setAddEntryLoading(true);
        const newEntryData = {
            user_id: selectedUser.id,
            date: selectedDate,
            clock_in_time: clockInDateTime,
            clock_out_time: clockOutDateTime,
            reason: newEntryReason.trim(),
            notes: newEntryNotes.trim()
        };

        router.post('/api/time-entries', newEntryData, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowAddDialog(false);
                fetchWeeklyData();
            },
            onError: (errors: Record<string, string>) => {
                setAddEntryError(errors.message || 'Failed to add time entry');
            },
            onFinish: () => {
                setAddEntryLoading(false);
            }
        });
    };

    const handleEditEntry = (entry: TimeEntry, userData: UserData): void => {
        const entryWithContext: EditingEntry = { ...entry, user: userData.user };
        setEditingEntry(entryWithContext);

        setSubmitError('');
        setAdjustmentType('time_correction');
        setReason('');
        setEmployeeNotes('');

        setAdjustedClockIn(entry.clock_in_time ? format(parseISO(entry.clock_in_time), "yyyy-MM-dd'T'HH:mm") : '');
        setAdjustedClockOut(entry.clock_out_time ? format(parseISO(entry.clock_out_time), "yyyy-MM-dd'T'HH:mm") : '');

        setShowEditDialog(true);
    };

    const handleSubmitEdit = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        setSubmitError('');

        if (!editingEntry) { setSubmitError('No entry selected for editing'); return; }
        if (!reason.trim()) { setSubmitError('Reason for adjustment is required'); return; }
        if (!adjustedClockIn) { setSubmitError('Clock in time is required'); return; }
        if (adjustedClockOut && parseISO(adjustedClockIn) >= parseISO(adjustedClockOut)) {
            setSubmitError('Clock out time must be after clock in time');
            return;
        }

        setSubmitLoading(true);
        const adjustmentData: AdjustmentData = {
            time_entry_id: editingEntry.id,
            adjustment_type: adjustmentType,
            adjusted_clock_in: adjustedClockIn,
            adjusted_clock_out: adjustedClockOut || null,
            adjusted_hours: calculateHours(adjustedClockIn, adjustedClockOut || ''),
            reason: reason.trim(),
            employee_notes: employeeNotes.trim(),
            original_data: {
                clock_in_time: editingEntry.clock_in_time,
                clock_out_time: editingEntry.clock_out_time,
                total_hours: editingEntry.total_hours,
            },
        };

        router.post('/api/time-adjustments/manager/time-correction', adjustmentData as any, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowEditDialog(false);
                fetchWeeklyData();
            },
            onError: (errors: Record<string, string>) => {
                setSubmitError(errors.message || 'Failed to submit time adjustment');
            },
            onFinish: () => {
                setSubmitLoading(false);
            }
        });
    };

    const handleDeleteEntry = (entry: TimeEntry, userData: UserData): void => {
        setEditingEntry({ ...entry, user: userData.user });
        setDeleteReason('');
        setDeleteError('');
        setShowDeleteDialog(true);
    };

    const handleSubmitDelete = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        setDeleteError('');

        if (!editingEntry) { setDeleteError('No entry selected for deletion'); return; }
        if (!deleteReason.trim()) { setDeleteError('Reason is required'); return; }

        setDeleteLoading(true);
        router.delete(`/api/time-entries/${editingEntry.id}`, {
            data: { reason: deleteReason.trim() },
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowDeleteDialog(false);
                fetchWeeklyData();
            },
            onError: (errors: Record<string, string>) => {
                setDeleteError(errors.message || 'Failed to delete time entry');
            },
            onFinish: () => {
                setDeleteLoading(false);
            }
        });
    };

    const handleViewHistory = (entry: TimeEntry, userData: UserData): void => {
        setEditingEntry({ ...entry, user: userData.user });
        setHistoryLoading(true);
        setHistoryError(null);
        setAdjustmentHistory([]);
        setShowHistoryDialog(true);

        fetch(`/api/time-adjustments/history/${entry.id}`)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch adjustment history');
                return response.json();
            })
            .then(data => {
                setAdjustmentHistory(data.adjustments && Array.isArray(data.adjustments) ? data.adjustments : []);
            })
            .catch(err => {
                setHistoryError(err instanceof Error ? err.message : 'Failed to load history');
            })
            .finally(() => {
                setHistoryLoading(false);
            });
    };

    // Helper/Formatting Functions
    const formatTime = (dateTime: string | undefined): string => {
        if (!dateTime) return '--';
        try {
            return format(parseISO(dateTime), 'HH:mm');
        } catch (error) {
            return 'Invalid';
        }
    };

    const formatDateTime = (dateTimeString: string | undefined): string => {
        if (!dateTimeString) return 'Not set';
        try {
            return format(parseISO(dateTimeString), 'EEE, MMM d \'at\' HH:mm');
        } catch (error) {
            return 'Invalid date';
        }
    };

    const getDayAbbrev = (dayName: string): string => dayName.substring(0, 3);
    const formatHours = (hours: number | undefined, decimals: number = 1): string => {
        const num = Number(hours);
        return !isNaN(num) && num > 0 ? num.toFixed(decimals) : '0.0';
    };

    const calculateHours = (clockIn: string, clockOut: string): number => {
        if (!clockIn || !clockOut) return 0;
        try {
            const start = parseISO(clockIn);
            const end = parseISO(clockOut);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;
            const diffMs = end.getTime() - start.getTime();
            return diffMs / (1000 * 60 * 60);
        } catch (error) {
            return 0;
        }
    };

    // Calculate hours for time-only inputs
    const calculateHoursFromTimes = (clockInTime: string, clockOutTime: string): number => {
        if (!clockInTime || !clockOutTime || !selectedDate) return 0;

        const clockIn = combineDateAndTime(selectedDate, clockInTime);
        const clockOut = combineDateAndTime(selectedDate, clockOutTime);

        return calculateHours(clockIn, clockOut);
    };

    const adjustmentTypes: Record<AdjustmentType, string> = {
        'time_correction': 'Time Correction',
        'missed_punch': 'Missed Punch',
        'break_adjustment': 'Break Adjustment',
        'manual_entry': 'Manual Entry',
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'approved': return 'default';
            case 'pending': return 'secondary';
            case 'rejected': return 'destructive';
            default: return 'outline';
        }
    };

    const formatAdjustmentType = (type: string) => {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Render Logic
    if (loading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}><Head title="Timesheet Manager" /><div className="p-6">Loading...</div></AppLayout>
        );
    }

    if (error) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}><Head title="Timesheet Manager" /><div className="p-6"><Alert variant="destructive">{error}</Alert></div></AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Timesheet Manager" />
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header & Week Navigation */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-6 w-6 text-blue-600" />
                            <h1 className="text-2xl font-bold text-gray-900">Timesheet Manager</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-md border">
                                <CalendarIcon className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-sm">{weekInfo?.display || format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    {/* Team Overview Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Team Overview</CardTitle>
                            <CardDescription>Manage timesheets for {weeklyData.length} team member{weeklyData.length !== 1 ? 's' : ''}</CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Timesheet Data */}
                    <div className="space-y-4">
                        {weeklyData.map((userData) => (
                            <Card key={userData.user.id}>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                                        <div>
                                            <CardTitle className="text-lg">{userData.user.name}</CardTitle>
                                            <CardDescription className="flex items-center gap-4 mt-1">
                                                <span>{userData.user.email}</span>
                                                {userData.user.position && <Badge variant="secondary">{userData.user.position}</Badge>}
                                            </CardDescription>
                                        </div>
                                        <div className="text-right"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /><span className="font-semibold">{formatHours(userData.weekly_totals?.total_hours || 0, 2)}h</span></div></div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {userData.daily_data.map((day) => (<TableHead key={day.date} className="text-center"><div className="font-medium">{getDayAbbrev(day.day_name)}</div><div className="text-xs text-gray-500">{format(parseISO(day.date), 'd')}</div></TableHead>))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    {userData.daily_data.map((day) => (
                                                        <TableCell key={day.date} className="text-center p-2 align-top">
                                                            {day.entries.length === 0 ? (<div className="text-gray-400 text-sm mt-2">{day.is_weekend ? 'Weekend' : 'No punches'}</div>) : (
                                                                <div className="space-y-2">
                                                                    {day.entries.map((entry) => (
                                                                        <div key={entry.id} className="flex text-xs bg-gray-50 p-1 rounded-md">
                                                                            <div className="flex-1 items-center justify-center gap-1"><span className="text-green-600">{formatTime(entry.clock_in_time)}</span>-<span className="text-red-600">{formatTime(entry.clock_out_time)}</span>{entry.is_edited && <span className="text-amber-500 font-bold" title="Edited">*</span>}</div>
                                                                            {entry.total_hours !== undefined && <div className="font-semibold text-blue-700">{formatHours(entry.total_hours)}h</div>}
                                                                            <div className="flex-1 items-center justify-center gap-1 mt-1">
                                                                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEditEntry(entry, userData)}><Edit3 className="h-3 w-3" /></Button>
                                                                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleViewHistory(entry, userData)}><Eye className="h-3 w-3 text-blue-500" /></Button>
                                                                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDeleteEntry(entry, userData)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="mt-4 flex justify-end"><Button variant="outline" size="sm" className="text-xs" onClick={() => handleAddEntry(userData)}><Plus className="h-3 w-3 mr-1" /> Add Time Entry</Button></div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* DIALOGS */}
                    <Dialog open={showAddDialog} onOpenChange={(open) => !open && setShowAddDialog(false)}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Time Entry</DialogTitle><DialogDescription>Adding new time entry for {selectedUser?.name}</DialogDescription></DialogHeader>
                            {selectedUser && (
                                <form onSubmit={handleSubmitAddEntry} className="space-y-4">
                                    {addEntryError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{addEntryError}</AlertDescription></Alert>}

                                    <div className="space-y-2">
                                        <Label htmlFor="date">Date</Label>
                                        <Select value={selectedDate} onValueChange={setSelectedDate}>
                                            <SelectTrigger><SelectValue placeholder="Select date" /></SelectTrigger>
                                            <SelectContent>
                                                {weeklyData.find(data => data.user.id === selectedUser.id)?.daily_data.map((day) => (
                                                    <SelectItem key={day.date} value={day.date} disabled={day.is_weekend}>
                                                        {format(parseISO(day.date), 'EEE, MMM d, yyyy')} {day.is_weekend ? ' (Weekend)' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="new_clock_in_time">Clock In Time *</Label>
                                            <Input
                                                id="new_clock_in_time"
                                                type="time"
                                                value={newClockInTime}
                                                onChange={(e) => setNewClockInTime(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new_clock_out_time">Clock Out Time</Label>
                                            <Input
                                                id="new_clock_out_time"
                                                type="time"
                                                value={newClockOutTime}
                                                onChange={(e) => setNewClockOutTime(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {newClockInTime && newClockOutTime && selectedDate && (
                                        <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700">
                                            <strong>Calculated Hours: </strong>
                                            {calculateHoursFromTimes(newClockInTime, newClockOutTime).toFixed(2)} hours
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="new_reason">Reason for Manual Entry *</Label>
                                        <Textarea
                                            id="new_reason"
                                            value={newEntryReason}
                                            onChange={(e) => setNewEntryReason(e.target.value)}
                                            placeholder="Explain why this manual entry is needed..."
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="new_notes">Additional Notes</Label>
                                        <Textarea
                                            id="new_notes"
                                            value={newEntryNotes}
                                            onChange={(e) => setNewEntryNotes(e.target.value)}
                                            placeholder="Any additional context..."
                                        />
                                    </div>

                                    <DialogFooter className="gap-2">
                                        <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} disabled={addEntryLoading}>
                                            <X className="h-4 w-4 mr-2" />Cancel
                                        </Button>
                                        <Button type="submit" disabled={addEntryLoading}>
                                            <Save className="h-4 w-4 mr-2" />
                                            {addEntryLoading ? 'Adding...' : 'Add Entry'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            )}
                        </DialogContent>
                    </Dialog>

                    <Dialog open={showEditDialog} onOpenChange={(open) => !open && setShowEditDialog(false)}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit3 className="h-4 w-4" /> Edit Time Entry</DialogTitle><DialogDescription>Editing entry for {editingEntry?.user?.name} on {formatDateTime(editingEntry?.clock_in_time)}</DialogDescription></DialogHeader>
                            {editingEntry && (<form onSubmit={handleSubmitEdit} className="space-y-4">{submitError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{submitError}</AlertDescription></Alert>}<div className="space-y-2"><Label htmlFor="adjustment_type">Adjustment Type</Label><Select value={adjustmentType} onValueChange={(value) => setAdjustmentType(value as AdjustmentType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(adjustmentTypes).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="clock_in">Clock In Time *</Label><DateTimePicker value={adjustedClockIn} onChange={setAdjustedClockIn} placeholder="Select clock in time" /></div><div className="space-y-2"><Label htmlFor="clock_out">Clock Out Time</Label><DateTimePicker value={adjustedClockOut} onChange={setAdjustedClockOut} placeholder="Select clock out time" /></div></div>{adjustedClockIn && adjustedClockOut && <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700"><strong>Calculated Hours: </strong>{calculateHours(adjustedClockIn, adjustedClockOut).toFixed(2)} hours</div>}<div className="space-y-2"><Label htmlFor="reason">Reason for Adjustment *</Label><Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this adjustment is needed..." required /></div><div className="space-y-2"><Label htmlFor="employee_notes">Additional Notes</Label><Textarea id="employee_notes" value={employeeNotes} onChange={(e) => setEmployeeNotes(e.target.value)} placeholder="Any additional context..." /></div><DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} disabled={submitLoading}><X className="h-4 w-4 mr-2" />Cancel</Button><Button type="submit" disabled={submitLoading}><Save className="h-4 w-4 mr-2" />{submitLoading ? 'Saving...' : 'Save Changes'}</Button></DialogFooter></form>)}
                        </DialogContent>
                    </Dialog>

                    <Dialog open={showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-4 w-4" /> Delete Time Entry</DialogTitle><DialogDescription>Are you sure you want to delete the time entry for {editingEntry?.user?.name} on {formatDateTime(editingEntry?.clock_in_time)}?</DialogDescription></DialogHeader>
                            <form onSubmit={handleSubmitDelete} className="space-y-4">{deleteError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{deleteError}</AlertDescription></Alert>}<div className="space-y-2"><Label htmlFor="delete_reason">Reason for Deletion *</Label><Textarea id="delete_reason" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Explain why this entry needs to be deleted..." required /></div><DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleteLoading}>Cancel</Button><Button type="submit" variant="destructive" disabled={deleteLoading}>{deleteLoading ? 'Deleting...' : 'Delete Entry'}</Button></DialogFooter></form>
                        </DialogContent>
                    </Dialog>

                    {/* === History View Dialog (IMPROVED) === */}
                    <Dialog open={showHistoryDialog} onOpenChange={(open) => !open && setShowHistoryDialog(false)}>
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Time Entry History</DialogTitle>
                                <DialogDescription>Viewing adjustment history for {editingEntry?.user?.name}</DialogDescription>
                            </DialogHeader>
                            {historyLoading ? (
                                <div className="py-8 text-center">Loading history...</div>
                            ) : historyError ? (
                                <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{historyError}</AlertDescription></Alert>
                            ) : (
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1 pr-3">
                                    {editingEntry && (
                                        <div className="bg-gray-50 p-3 rounded-lg mb-4 border">
                                            <h4 className="text-sm font-semibold mb-2 text-gray-800">Current Entry Details</h4>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                                <div><span className="text-gray-500">Clock In:</span> <span className="font-medium">{formatDateTime(editingEntry.clock_in_time)}</span></div>
                                                <div><span className="text-gray-500">Clock Out:</span> <span className="font-medium">{editingEntry.clock_out_time ? formatDateTime(editingEntry.clock_out_time) : 'Active'}</span></div>
                                                <div><span className="text-gray-500">Total Hours:</span> <span className="font-medium">{formatHours(editingEntry.total_hours, 2)}h</span></div>
                                                <div><span className="text-gray-500">Status:</span> <Badge variant={editingEntry.is_edited ? 'outline' : 'secondary'} className="capitalize">{editingEntry.status}{editingEntry.is_edited ? ' (Edited)' : ''}</Badge></div>
                                            </div>
                                        </div>
                                    )}
                                    {adjustmentHistory.length === 0 ? (
                                        <div className="py-6 text-center text-gray-500">No adjustment history found for this time entry.</div>
                                    ) : (
                                        <div className="relative pl-6">
                                            <div className="absolute left-9 top-0 h-full w-0.5 bg-gray-200"></div>
                                            {adjustmentHistory.map((adj) => (
                                                <div key={adj.id} className="relative mb-6">
                                                    <div className="absolute left-9 top-1 w-3 h-3 bg-gray-400 rounded-full transform -translate-x-1/2"></div>
                                                    <div className="ml-12">
                                                        <div className="p-4 border rounded-lg bg-white shadow-sm">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <h5 className="font-semibold text-md text-gray-800">{formatAdjustmentType(adj.adjustment_type)}</h5>
                                                                    <p className="text-xs text-gray-500">Requested by {adj.requestedBy?.name || 'System'} on {format(parseISO(adj.created_at), 'MMM d, yyyy @ HH:mm')}</p>
                                                                </div>
                                                                <Badge variant={getStatusBadgeVariant(adj.status)} className="capitalize">{adj.status}</Badge>
                                                            </div>
                                                            <div className="space-y-3 text-sm">
                                                                <div><p className="font-medium text-gray-700">Reason:</p><p className="text-gray-600 pl-2 border-l-2 border-gray-200 ml-1">{adj.reason}</p></div>
                                                                {adj.employee_notes && <div><p className="font-medium text-gray-700">Notes:</p><p className="text-gray-600 pl-2 border-l-2 border-gray-200 ml-1">{adj.employee_notes}</p></div>}
                                                                {(adj.original_data || adj.adjusted_clock_in) && (
                                                                    <div className="mt-3"><p className="font-medium text-gray-700 mb-1">Changes:</p>
                                                                        <Table className="text-xs"><TableHeader><TableRow><TableHead>Field</TableHead><TableHead>Original</TableHead><TableHead>Adjusted</TableHead></TableRow></TableHeader>
                                                                            <TableBody>
                                                                                <TableRow><TableCell>Clock In</TableCell><TableCell>{adj.original_data?.clock_in_time ? formatDateTime(adj.original_data.clock_in_time) : 'N/A'}</TableCell><TableCell className="text-green-600 font-medium">{adj.adjusted_clock_in ? formatDateTime(adj.adjusted_clock_in) : 'No Change'}</TableCell></TableRow>
                                                                                <TableRow><TableCell>Clock Out</TableCell><TableCell>{adj.original_data?.clock_out_time ? formatDateTime(adj.original_data.clock_out_time) : 'N/A'}</TableCell><TableCell className="text-red-600 font-medium">{adj.adjusted_clock_out ? formatDateTime(adj.adjusted_clock_out) : 'No Change'}</TableCell></TableRow>
                                                                                <TableRow><TableCell>Total Hours</TableCell><TableCell>{formatHours(adj.original_data?.total_hours, 2)}h</TableCell><TableCell className="font-medium">{formatHours(adj.adjusted_hours, 2)}h</TableCell></TableRow>
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>
                                                                )}
                                                                {adj.status === 'approved' && adj.approvedBy && adj.approved_at && (<div className="mt-3 pt-3 border-t bg-green-50 p-2 rounded-md"><p className="font-medium text-green-800">Approved by {adj.approvedBy.name} on {format(parseISO(adj.approved_at), 'MMM d, yyyy @ HH:mm')}</p>{adj.approval_notes && <p className="text-green-700 mt-1">Notes: {adj.approval_notes}</p>}</div>)}
                                                                {adj.status === 'rejected' && adj.rejectedBy && adj.rejected_at && (<div className="mt-3 pt-3 border-t bg-red-50 p-2 rounded-md"><p className="font-medium text-red-800">Rejected by {adj.rejectedBy.name} on {format(parseISO(adj.rejected_at), 'MMM d, yyyy @ HH:mm')}</p>{adj.rejection_reason && <p className="text-red-700 mt-1">Reason: {adj.rejection_reason}</p>}</div>)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowHistoryDialog(false)}>Close</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
};

export default Manager;
