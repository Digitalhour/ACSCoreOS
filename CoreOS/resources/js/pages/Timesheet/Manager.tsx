import React, {useEffect, useState} from 'react';
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible';
import {
    AlertTriangle,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Edit3,
    Eye,
    MoreHorizontal,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import {addWeeks, format, parseISO, startOfWeek, subWeeks} from 'date-fns';

// ============================================================================
// Type Definitions
// ============================================================================
interface User {
    id: number;
    name: string;
    email: string;
    position?: string;
    departments?: string[];
    avatar?: string;
    project_name?: string;
    project_description?: string;
}

interface EditHistoryItem {
    id: number;
    adjustment_type: string;
    reason: string;
    employee_notes?: string;
    status: string;
    created_at: string;
    requestedBy?: { id: number; name: string; };
}

interface TimeEntry {
    id: number;
    clock_in_time: string;
    clock_out_time?: string;
    total_hours?: number;
    status: string;
    is_edited?: boolean;
    edit_history?: EditHistoryItem[];
}

interface DayData {
    date: string;
    day_name: string;
    is_weekend: boolean;
    total_hours: number;
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
    approval_status?: 'approved' | 'rejected' | 'pending';
}

interface UserData {
    user: User;
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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Timesheet', href: '/timesheet' },
    { title: 'Manager', href: '/timesheet/manager' },
];

// ============================================================================
// Manager Component
// ============================================================================
const Manager: React.FC = () => {
    // Core State
    const [weeklyData, setWeeklyData] = useState<UserData[]>([]);
    const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [expandedEmployees, setExpandedEmployees] = useState<Set<number>>(new Set());

    // Dialog States
    const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
    const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [showAddDialog, setShowAddDialog] = useState<boolean>(false);
    const [showHistoryDialog, setShowHistoryDialog] = useState<boolean>(false);

    // Add Entry Form State
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [newClockInTime, setNewClockInTime] = useState<string>('09:00');
    const [newClockOutTime, setNewClockOutTime] = useState<string>('17:00');
    const [newEntryReason, setNewEntryReason] = useState<string>('');
    const [addEntryLoading, setAddEntryLoading] = useState<boolean>(false);
    const [addEntryError, setAddEntryError] = useState<string>('');

    // Edit Entry Form State
    const [adjustedClockIn, setAdjustedClockIn] = useState<string>('');
    const [adjustedClockOut, setAdjustedClockOut] = useState<string>('');
    const [reason, setReason] = useState<string>('');
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

    // Filter data based on search and status
    const filteredData = weeklyData.filter(userData => {
        const matchesSearch = userData.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userData.user.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'approved' && userData.submission?.approval_status === 'approved') ||
            (statusFilter === 'rejected' && userData.submission?.approval_status === 'rejected') ||
            (statusFilter === 'pending' && (!userData.submission?.approval_status || userData.submission?.approval_status === 'pending'));

        return matchesSearch && matchesStatus;
    });

    // Get week days for display
    const weekDays = weekInfo ?
        Array.from({ length: 7 }, (_, i) => {
            const date = new Date(parseISO(weekInfo.start_date));
            date.setDate(date.getDate() + i);
            return {
                date: format(date, 'yyyy-MM-dd'),
                label: format(date, 'EEE'),
                dayNumber: format(date, 'd'),
                isWeekend: date.getDay() === 0 || date.getDay() === 6
            };
        }) : [];

    // Data Fetching Effect
    useEffect(() => {
        fetchWeeklyData();
    }, [selectedWeek]);

    // Toggle employee expansion
    const toggleEmployeeExpansion = (userId: number): void => {
        const newExpanded = new Set(expandedEmployees);
        if (newExpanded.has(userId)) {
            newExpanded.delete(userId);
        } else {
            newExpanded.add(userId);
        }
        setExpandedEmployees(newExpanded);
    };

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
            setWeeklyData(data.users_data || []);
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

    const handleApproveTimesheet = (userData: UserData): void => {
        router.post(`/api/timesheet/approve/${userData.user.id}`, {
            week_start: weekInfo?.start_date,
            status: 'approved'
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                fetchWeeklyData();
            },
            onError: (errors) => {
                console.error('Failed to approve timesheet:', errors);
            }
        });
    };

    const handleRejectTimesheet = (userData: UserData): void => {
        router.post(`/api/timesheet/approve/${userData.user.id}`, {
            week_start: weekInfo?.start_date,
            status: 'rejected'
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                fetchWeeklyData();
            },
            onError: (errors) => {
                console.error('Failed to reject timesheet:', errors);
            }
        });
    };

    const handleAddEntry = (): void => {
        setSelectedUser(null);
        setSelectedDate('');
        setNewClockInTime('09:00');
        setNewClockOutTime('17:00');
        setNewEntryReason('');
        setAddEntryError('');
        setAddEntryLoading(false);
        setShowAddDialog(true);
    };

    const combineDateAndTime = (date: string, time: string): string => {
        if (!date || !time) return '';
        return `${date}T${time}:00`;
    };

    const handleSubmitAddEntry = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        setAddEntryError('');

        if (!selectedUser || !selectedDate || !newClockInTime || !newEntryReason.trim()) {
            setAddEntryError('Please fill in all required fields');
            return;
        }

        const clockInDateTime = combineDateAndTime(selectedDate, newClockInTime);
        const clockOutDateTime = newClockOutTime ? combineDateAndTime(selectedDate, newClockOutTime) : null;

        if (clockOutDateTime && parseISO(clockInDateTime) >= parseISO(clockOutDateTime)) {
            setAddEntryError('Clock out time must be after clock in time');
            return;
        }

        setAddEntryLoading(true);
        const newEntryData = {
            user_id: selectedUser.id,
            date: selectedDate,
            clock_in_time: clockInDateTime,
            clock_out_time: clockOutDateTime,
            reason: newEntryReason.trim()
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
        setReason('');
        setAdjustedClockIn(entry.clock_in_time ? format(parseISO(entry.clock_in_time), "yyyy-MM-dd'T'HH:mm") : '');
        setAdjustedClockOut(entry.clock_out_time ? format(parseISO(entry.clock_out_time), "yyyy-MM-dd'T'HH:mm") : '');
        setShowEditDialog(true);
    };

    const handleSubmitEdit = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        setSubmitError('');

        if (!editingEntry || !reason.trim() || !adjustedClockIn) {
            setSubmitError('Please fill in all required fields');
            return;
        }

        if (adjustedClockOut && parseISO(adjustedClockIn) >= parseISO(adjustedClockOut)) {
            setSubmitError('Clock out time must be after clock in time');
            return;
        }

        setSubmitLoading(true);
        const adjustmentData = {
            time_entry_id: editingEntry.id,
            adjustment_type: 'time_correction',
            adjusted_clock_in: adjustedClockIn,
            adjusted_clock_out: adjustedClockOut || null,
            reason: reason.trim(),
            original_data: {
                clock_in_time: editingEntry.clock_in_time,
                clock_out_time: editingEntry.clock_out_time,
                total_hours: editingEntry.total_hours,
            },
        };

        router.post('/api/time-adjustments/manager/time-correction', adjustmentData, {
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

        if (!editingEntry || !deleteReason.trim()) {
            setDeleteError('Reason is required');
            return;
        }

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
                setAdjustmentHistory(data.adjustments || []);
            })
            .catch(err => {
                setHistoryError(err instanceof Error ? err.message : 'Failed to load history');
            })
            .finally(() => {
                setHistoryLoading(false);
            });
    };

    // Helper Functions
    const formatTime = (dateTime: string | undefined): string => {
        if (!dateTime) return '--';
        try {
            return format(parseISO(dateTime), 'HH:mm');
        } catch (error) {
            return '--';
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

    const formatHours = (hours: number | undefined): string => {
        const num = Number(hours);
        if (isNaN(num) || num <= 0) return '--';

        const wholeHours = Math.floor(num);
        const minutes = Math.round((num - wholeHours) * 60);

        if (minutes === 0) {
            return `${wholeHours}h`;
        } else if (minutes < 10) {
            return `${wholeHours}h 0${minutes}m`;
        } else {
            return `${wholeHours}h ${minutes}m`;
        }
    };

    const formatHoursDecimal = (hours: number | undefined): string => {
        const num = Number(hours);
        return !isNaN(num) && num > 0 ? `${num.toFixed(1)}h` : '--';
    };

    const getDayData = (userData: UserData, date: string): DayData | null => {
        return userData.daily_data.find(day => day.date === date) || null;
    };

    const getFirstEntry = (dayData: DayData): TimeEntry | null => {
        return dayData.entries.length > 0 ? dayData.entries[0] : null;
    };

    const getAvatarUrl = (user: User): string => {
        return user.avatar || `/avatar/${user.id}`;
    };

    const getApprovalStatusBadge = (status?: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
            case 'rejected':
                return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
            default:
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Pending</Badge>;
        }
    };

    // Render Logic
    if (loading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Team Timesheet" />
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                        <p className="mt-2 text-sm">Loading timesheet data...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (error) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Team Timesheet" />
                <div className="p-6">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Team Timesheet" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Team Timesheet</h1>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">MEMBERS:</span>
                                <span className="text-sm font-medium">All</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">STATUS:</span>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-24 h-7 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm font-medium">Current Week</div>
                        <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Week Header */}
                <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                        <h2 className="text-lg font-medium">This Week</h2>
                    </div>
                    <div className="grid grid-cols-8 gap-4 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-600">
                        <div></div>
                        {weekDays.map(day => (
                            <div key={day.date} className="text-center">
                                <div>{day.label}</div>
                                <div className="text-xs text-gray-500">{format(parseISO(day.date), 'MMM d')}</div>
                            </div>
                        ))}
                    </div>

                    {/* Employee Rows */}
                    {filteredData.map((userData) => (
                        <div key={userData.user.id} className="border-b last:border-b-0">
                            <Collapsible>
                                <div className="grid grid-cols-8 gap-4 px-4 py-3 hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <CollapsibleTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => toggleEmployeeExpansion(userData.user.id)}
                                            >
                                                {expandedEmployees.has(userData.user.id) ?
                                                    <ChevronUp className="h-4 w-4" /> :
                                                    <ChevronDown className="h-4 w-4" />
                                                }
                                            </Button>
                                        </CollapsibleTrigger>
                                        <img
                                            src={getAvatarUrl(userData.user)}
                                            alt={userData.user.name}
                                            className="h-8 w-8 rounded-full"
                                        />
                                        <div>
                                            <div className="font-medium">{userData.user.name}</div>
                                            <div className="text-sm text-gray-500">{userData.user.position}</div>
                                        </div>
                                    </div>
                                    {weekDays.map(day => {
                                        const dayData = getDayData(userData, day.date);
                                        const totalHours = dayData?.total_hours || 0;

                                        return (
                                            <div key={day.date} className="text-center text-sm">
                                                {totalHours > 0 ? (
                                                    <div className="font-medium">{formatHours(totalHours)}</div>
                                                ) : (
                                                    <div className="text-gray-400">--</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <CollapsibleContent>
                                    {expandedEmployees.has(userData.user.id) && (
                                        <div className="bg-gray-50 px-4 py-3">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <div className="font-medium text-sm">{userData.user.project_name || 'Default Project'}</div>
                                                    <div className="text-xs text-gray-500">{userData.user.project_description || 'Project work'}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {getApprovalStatusBadge(userData.submission?.approval_status)}
                                                    <div className="text-sm font-medium">{formatHours(userData.weekly_totals?.total_hours)}</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-8 gap-4 items-center">
                                                <div></div>
                                                {weekDays.map(day => {
                                                    const dayData = getDayData(userData, day.date);
                                                    const entry = dayData ? getFirstEntry(dayData) : null;

                                                    return (
                                                        <div key={day.date} className="text-center">
                                                            {entry ? (
                                                                <div className="relative group">
                                                                    <div className="text-sm font-medium">{formatHours(entry.total_hours)}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {formatTime(entry.clock_in_time)} - {formatTime(entry.clock_out_time)}
                                                                    </div>
                                                                    {entry.is_edited && (
                                                                        <div className="text-xs text-orange-600">Edited</div>
                                                                    )}
                                                                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                                    <MoreHorizontal className="h-3 w-3" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuItem onClick={() => handleEditEntry(entry, userData)}>
                                                                                    <Edit3 className="mr-2 h-4 w-4" />
                                                                                    Edit
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => handleViewHistory(entry, userData)}>
                                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                                    History
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={() => handleDeleteEntry(entry, userData)}>
                                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                                    Delete
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm text-gray-400">--</div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleApproveTimesheet(userData)}
                                                        disabled={userData.submission?.approval_status === 'approved'}
                                                    >
                                                        <Check className="h-4 w-4 mr-1" />
                                                        Approve time
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleRejectTimesheet(userData)}
                                                        disabled={userData.submission?.approval_status === 'rejected'}
                                                    >
                                                        <X className="h-4 w-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Weekly total: {formatHoursDecimal(userData.weekly_totals?.total_hours)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                    ))}
                </div>

                {/* Floating Action Button */}
                <div className="fixed bottom-6 right-6">
                    <Button onClick={handleAddEntry} className="rounded-full h-12 w-12 p-0">
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            {/* Add Entry Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Time Entry</DialogTitle>
                        <DialogDescription>Add a new time entry for an employee</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitAddEntry} className="space-y-4">
                        {addEntryError && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{addEntryError}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label>Employee *</Label>
                            <Select onValueChange={(value) => setSelectedUser(weeklyData.find(u => u.user.id === parseInt(value))?.user || null)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {weeklyData.map(userData => (
                                        <SelectItem key={userData.user.id} value={userData.user.id.toString()}>
                                            {userData.user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Date *</Label>
                            <Select value={selectedDate} onValueChange={setSelectedDate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select date" />
                                </SelectTrigger>
                                <SelectContent>
                                    {weekDays.map(day => (
                                        <SelectItem key={day.date} value={day.date}>
                                            {format(parseISO(day.date), 'EEE, MMM d, yyyy')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Clock In Time *</Label>
                                <Input
                                    type="time"
                                    value={newClockInTime}
                                    onChange={(e) => setNewClockInTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Clock Out Time</Label>
                                <Input
                                    type="time"
                                    value={newClockOutTime}
                                    onChange={(e) => setNewClockOutTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Reason *</Label>
                            <Textarea
                                value={newEntryReason}
                                onChange={(e) => setNewEntryReason(e.target.value)}
                                placeholder="Reason for manual entry..."
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={addEntryLoading}>
                                {addEntryLoading ? 'Adding...' : 'Add Entry'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Entry Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Time Entry</DialogTitle>
                        <DialogDescription>
                            Editing entry for {editingEntry?.user?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitEdit} className="space-y-4">
                        {submitError && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{submitError}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Clock In Time *</Label>
                                <Input
                                    type="datetime-local"
                                    value={adjustedClockIn}
                                    onChange={(e) => setAdjustedClockIn(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Clock Out Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={adjustedClockOut}
                                    onChange={(e) => setAdjustedClockOut(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Reason for Change *</Label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Reason for adjustment..."
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitLoading}>
                                {submitLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Entry Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Time Entry</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this entry for {editingEntry?.user?.name}?
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitDelete} className="space-y-4">
                        {deleteError && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{deleteError}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label>Reason for Deletion *</Label>
                            <Textarea
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder="Reason for deletion..."
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" disabled={deleteLoading}>
                                {deleteLoading ? 'Deleting...' : 'Delete Entry'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Time Entry History</DialogTitle>
                        <DialogDescription>
                            Adjustment history for {editingEntry?.user?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {historyLoading ? (
                            <div className="text-center py-4">Loading history...</div>
                        ) : historyError ? (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{historyError}</AlertDescription>
                            </Alert>
                        ) : adjustmentHistory.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">No adjustment history found.</div>
                        ) : (
                            <div className="space-y-3">
                                {adjustmentHistory.map((adj) => (
                                    <div key={adj.id} className="p-3 border rounded">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h5 className="font-medium">{adj.adjustment_type.replace(/_/g, ' ')}</h5>
                                                <p className="text-sm text-gray-500">
                                                    By {adj.requestedBy?.name} on {format(parseISO(adj.created_at), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                            <span className="text-sm">{adj.status}</span>
                                        </div>
                                        <p className="text-sm">{adj.reason}</p>
                                        {adj.employee_notes && (
                                            <p className="text-sm text-gray-600 mt-1">Notes: {adj.employee_notes}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowHistoryDialog(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
};

export default Manager;
