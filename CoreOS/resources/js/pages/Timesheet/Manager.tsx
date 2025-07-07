import React, {useEffect, useState} from 'react';
import {
    AlertTriangle,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Coffee,
    Download,
    Eye,
    List,
    RotateCcw,
    Search,
    TableIcon,
    Users,
    X
} from 'lucide-react';
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';

interface User {
    id: number;
    name: string;
    email: string;
    departments?: string[];
    position?: string;
}

interface TimeEntry {
    id: number;
    user: User;
    clock_in_time: string;
    clock_out_time?: string;
    total_hours?: number;
    regular_hours?: number;
    overtime_hours?: number;
    status: string;
    break_count: number;
    total_break_minutes: number;
    adjustment_reason?: string;
    submission_status?: string;
    submission_id?: number;
}

interface DailySummary {
    user: User;
    date: string;
    day_name: string;
    entries_count: number;
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    total_break_minutes: number;
    first_clock_in: string;
    last_clock_out?: string;
    has_incomplete: boolean;
    submission_status?: string;
    submission_id?: number;
}

interface Summary {
    total_entries: number;
    total_hours: number;
    total_regular: number;
    total_overtime: number;
    active_entries: number;
    completed_entries: number;
    adjusted_entries: number;
    unique_employees: number;
}

interface Submission {
    id: number;
    user: User;
    week_start_date: string;
    week_end_date: string;
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    break_hours: number;
    status: string;
    submitted_at: string;
    self_submitted: boolean;
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface ApprovalForm {
    approval_notes: string;
}

interface RejectionForm {
    rejection_reason: string;
}

interface TimesheetData {
    user: User;
    week_info: {
        start_date: string;
        end_date: string;
        display: string;
    };
    submission?: {
        id: number;
        status: string;
    };
    weekly_totals: {
        total_hours: number;
        regular_hours: number;
        overtime_hours: number;
        break_hours: number;
    };
    daily_data: Array<{
        date: string;
        day_name: string;
        total_hours: number;
        break_minutes: number;
        entries: Array<{
            clock_in_time: string;
            clock_out_time?: string;
        }>;
    }>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Team Time Management',
        href: '/timesheet/manage',
    },
];

export default function ManagerTimesheetView() {
    // State for pending submissions (existing functionality)
    const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<string>(new Date().toISOString().split('T')[0]);
    const [timesheetData, setTimesheetData] = useState<TimesheetData | null>(null);

    // State for time entries view (new functionality)
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
    const [manageableUsers, setManageableUsers] = useState<User[]>([]);
    const [currentlyActive, setCurrentlyActive] = useState<TimeEntry[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [pagination, setPagination] = useState<Pagination | null>(null);

    // Common state
    const [loading, setLoading] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>('time-entries');

    // Filter state
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        user_id: '',
        department: 'all',
        status: 'all',
        search: '',
        view_type: 'entries', // 'entries' or 'daily'
        per_page: 20
    });

    // Modal state
    const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
    const [showRejectionModal, setShowRejectionModal] = useState<boolean>(false);
    const [approvalForm, setApprovalForm] = useState<ApprovalForm>({ approval_notes: '' });
    const [rejectionForm, setRejectionForm] = useState<RejectionForm>({ rejection_reason: '' });

    useEffect(() => {
        if (activeTab === 'pending') {
            fetchPendingSubmissions();
        } else if (activeTab === 'time-entries') {
            fetchManageableUsers();
            fetchTimeEntries();
            fetchCurrentlyActive();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'time-entries') {
            fetchTimeEntries();
        }
    }, [filters]);

    // Auto-refresh currently active entries every 30 seconds
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeTab === 'time-entries') {
            interval = setInterval(() => {
                fetchCurrentlyActive();
            }, 30000); // 30 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab]);

    useEffect(() => {
        if (selectedUser && activeTab === 'individual') {
            fetchUserTimesheet();
        }
    }, [selectedUser, selectedWeek, activeTab]);

    const fetchPendingSubmissions = async (): Promise<void> => {
        setLoading(true);
        try {
            const response = await fetch('/api/timesheet/pending-submissions');
            const data = await response.json();
            setPendingSubmissions(data.submissions || []);
        } catch (error) {
            console.error('Failed to fetch pending submissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchManageableUsers = async (): Promise<void> => {
        try {
            const response = await fetch('/api/timeclock/manageable-users');
            const data = await response.json();
            setManageableUsers(data.users || []);
        } catch (error) {
            console.error('Failed to fetch manageable users:', error);
        }
    };

    const fetchTimeEntries = async (): Promise<void> => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value !== 'all') {
                    // Handle special "currently_active" filter
                    if (key === 'status' && value === 'currently_active') {
                        params.append('status', 'active');
                    } else {
                        params.append(key, value.toString());
                    }
                }
            });

            const response = await fetch(`/api/timeclock/manager/time-entries?${params}`);
            const data = await response.json();

            if (filters.view_type === 'daily') {
                setDailySummaries(data.data || []);
            } else {
                setTimeEntries(data.data || []);
            }

            setPagination(data.pagination);
            setSummary(data.summary);
        } catch (error) {
            console.error('Failed to fetch time entries:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentlyActive = async (): Promise<void> => {
        try {
            const response = await fetch('/api/timeclock/manager/time-entries?status=active&view_type=entries&per_page=100');
            const data = await response.json();
            setCurrentlyActive(data.data || []);
        } catch (error) {
            console.error('Failed to fetch currently active entries:', error);
        }
    };

    const fetchUserTimesheet = async (): Promise<void> => {
        if (!selectedUser) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/timesheet/${selectedUser.id}?week_start=${selectedWeek}`);
            const data = await response.json();
            setTimesheetData(data);
        } catch (error) {
            console.error('Failed to fetch user timesheet:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = (): void => {
        if (!selectedSubmission) return;

        setLoading(true);
        router.post(`/api/timesheet/approve/${selectedSubmission.id}`, approvalForm, {
            onSuccess: () => {
                setShowApprovalModal(false);
                setApprovalForm({ approval_notes: '' });
                fetchPendingSubmissions();
                showNotification('Timesheet approved successfully!', 'success');
            },
            onError: (errors) => {
                const errorMessage = Object.values(errors)[0] as string || 'Failed to approve timesheet';
                showNotification(errorMessage, 'error');
            },
            onFinish: () => {
                setLoading(false);
            },
            preserveScroll: true
        });
    };

    const handleReject = (): void => {
        if (!selectedSubmission || !rejectionForm.rejection_reason.trim()) {
            showNotification('Please provide a reason for rejection', 'error');
            return;
        }

        setLoading(true);
        router.post(`/api/timesheet/reject/${selectedSubmission.id}`, rejectionForm, {
            onSuccess: () => {
                setShowRejectionModal(false);
                setRejectionForm({ rejection_reason: '' });
                fetchPendingSubmissions();
                showNotification('Timesheet rejected successfully!', 'success');
            },
            onError: (errors) => {
                const errorMessage = Object.values(errors)[0] as string || 'Failed to reject timesheet';
                showNotification(errorMessage, 'error');
            },
            onFinish: () => {
                setLoading(false);
            },
            preserveScroll: true
        });
    };

    const resetFilters = (): void => {
        setFilters({
            start_date: '',
            end_date: '',
            user_id: '',
            department: 'all',
            status: 'all',
            search: '',
            view_type: 'entries',
            per_page: 20
        });
    };

    const exportTimeEntries = async (): Promise<void> => {
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value !== 'all') {
                    params.append(key, value.toString());
                }
            });

            const link = document.createElement('a');
            link.href = `/api/timeclock/export?${params}`;
            link.download = `time_entries_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showNotification('Export completed successfully!', 'success');
        } catch (error) {
            showNotification('Export failed. Please try again.', 'error');
        }
    };

    const showNotification = (message: string, type: 'success' | 'error'): void => {
        console.log(`${type}: ${message}`);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (timeString: string): string => {
        if (!timeString) return '--:--';
        return new Date(timeString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatHours = (hours: number | null): string => {
        if (!hours) return '0.00';
        return parseFloat(hours.toString()).toFixed(2);
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            active: { color: 'bg-green-100 text-green-800', text: 'Active' },
            completed: { color: 'bg-blue-100 text-blue-800', text: 'Completed' },
            adjusted: { color: 'bg-purple-100 text-purple-800', text: 'Adjusted' },
            draft: { color: 'bg-gray-100 text-gray-800', text: 'Draft' },
            submitted: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
            approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
            rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
            locked: { color: 'bg-blue-100 text-blue-800', text: 'Locked' }
        };

        const badge = badges[status as keyof typeof badges] || badges.completed;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.text}
            </span>
        );
    };

    const navigateWeek = (direction: number) => {
        const currentWeek = new Date(selectedWeek);
        currentWeek.setDate(currentWeek.getDate() + (direction * 7));
        setSelectedWeek(currentWeek.toISOString().split('T')[0]);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Team Time Management" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Team Time Management</h1>
                        <p className="text-muted-foreground">
                            Manage employee time tracking and timesheet approvals
                        </p>
                    </div>

                    {activeTab === 'time-entries' && (
                        <Button onClick={exportTimeEntries} variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    )}
                </div>

                {/* Summary Stats for Time Entries */}
                {activeTab === 'time-entries' && summary && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center">
                                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                        <div className="w-5 h-5 bg-green-500 rounded-full animate-pulse" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-muted-foreground">Currently Active</p>
                                        <p className="text-lg font-semibold text-green-600">{currentlyActive.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-muted-foreground">Employees</p>
                                        <p className="text-lg font-semibold">{summary.unique_employees}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
                                        <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                                        <p className="text-lg font-semibold">{formatHours(summary.total_hours)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-muted-foreground">Overtime</p>
                                        <p className="text-lg font-semibold">{formatHours(summary.total_overtime)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                        <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
                                        <p className="text-lg font-semibold">{summary.total_entries}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-fit grid-cols-3">
                        <TabsTrigger value="time-entries" className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>Time Entries</span>
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>Pending ({pendingSubmissions.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="individual" className="flex items-center space-x-2">
                            <Eye className="w-4 h-4" />
                            <span>Individual View</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Time Entries Tab */}
                    <TabsContent value="time-entries" className="space-y-4">
                        {/* Currently Active Section */}
                        {currentlyActive.length > 0 && (
                            <Card className="border-l-4 border-l-green-500">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center">
                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                            Currently Clocked In ({currentlyActive.length})
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={fetchCurrentlyActive}
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {currentlyActive.map((entry) => (
                                            <div key={entry.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border">
                                                <div>
                                                    <div className="font-medium text-sm">{entry.user.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Since {formatTime(entry.clock_in_time)}
                                                    </div>
                                                    <div className="text-xs text-green-600 font-medium">
                                                        {(() => {
                                                            const now = new Date();
                                                            const clockIn = new Date(entry.clock_in_time);
                                                            const diffMs = now.getTime() - clockIn.getTime();
                                                            const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                                            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                                            return `${hours}:${minutes.toString().padStart(2, '0')} elapsed`;
                                                        })()}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                                        Active
                                                    </Badge>
                                                    {entry.is_on_break && (
                                                        <div className="flex items-center text-xs text-amber-600 mt-1 font-medium">
                                                            <Coffee className="w-3 h-3 mr-1" />
                                                            On {entry.current_break_type} break
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Filters */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                    <div>
                                        <Label>Start Date</Label>
                                        <Input
                                            type="date"
                                            value={filters.start_date}
                                            onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <Label>End Date</Label>
                                        <Input
                                            type="date"
                                            value={filters.end_date}
                                            onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <Label>Employee</Label>
                                        <Select
                                            value={filters.user_id || "all"}
                                            onValueChange={(value) => setFilters({...filters, user_id: value === "all" ? "" : value})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All employees" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All employees</SelectItem>
                                                {manageableUsers.map((user) => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Status</Label>
                                        <Select
                                            value={filters.status}
                                            onValueChange={(value) => setFilters({...filters, status: value})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="currently_active">Currently Clocked In</SelectItem>
                                                <SelectItem value="active">Active (Incomplete)</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="adjusted">Adjusted</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>View Type</Label>
                                        <Select
                                            value={filters.view_type}
                                            onValueChange={(value) => setFilters({...filters, view_type: value})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="entries">
                                                    <div className="flex items-center">
                                                        <List className="w-4 h-4 mr-2" />
                                                        Time Entries
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="daily">
                                                    <div className="flex items-center">
                                                        <TableIcon className="w-4 h-4 mr-2" />
                                                        Daily Summary
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>&nbsp;</Label>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={resetFilters}
                                            >
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                Reset
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    fetchTimeEntries();
                                                    fetchCurrentlyActive();
                                                }}
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                        <Input
                                            type="text"
                                            placeholder="Search employees..."
                                            value={filters.search}
                                            onChange={(e) => setFilters({...filters, search: e.target.value})}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Time Entries List */}
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {filters.view_type === 'daily' ? 'Daily Summaries' : 'Time Entries'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (filters.view_type === 'daily' ? dailySummaries : timeEntries).length === 0 ? (
                                    <div className="text-center py-8">
                                        <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="mt-2 text-sm font-medium">No data found</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            No time entries match your current filters.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Employee</TableHead>
                                                    {filters.view_type === 'daily' ? (
                                                        <>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Hours</TableHead>
                                                            <TableHead>Entries</TableHead>
                                                            <TableHead>Times</TableHead>
                                                            <TableHead>Status</TableHead>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableHead>Clock In/Out</TableHead>
                                                            <TableHead>Hours</TableHead>
                                                            <TableHead>Breaks</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Submission</TableHead>
                                                        </>
                                                    )}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filters.view_type === 'daily'
                                                    ? dailySummaries.map((summary, index) => (
                                                        <TableRow key={index} className={summary.has_incomplete ? 'bg-amber-50 dark:bg-amber-900/20' : ''}>
                                                            <TableCell>
                                                                <div className="flex items-center">
                                                                    {summary.has_incomplete && (
                                                                        <div className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
                                                                    )}
                                                                    <div>
                                                                        <div className="font-medium">{summary.user.name}</div>
                                                                        <div className="text-sm text-muted-foreground">{summary.user.email}</div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div>
                                                                    <div className="font-medium">{formatDate(summary.date)}</div>
                                                                    <div className="text-sm text-muted-foreground">{summary.day_name}</div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div>
                                                                    <div>Total: {formatHours(summary.total_hours)}h</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Regular: {formatHours(summary.regular_hours)}h •
                                                                        OT: {formatHours(summary.overtime_hours)}h
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-sm">
                                                                    {summary.entries_count} entries
                                                                    {summary.has_incomplete && (
                                                                        <Badge variant="default" className="ml-2 text-xs bg-amber-100 text-amber-800">
                                                                            <div className="w-2 h-2 bg-amber-500 rounded-full mr-1 animate-pulse"></div>
                                                                            Incomplete
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-sm">
                                                                    <div>{formatTime(summary.first_clock_in)}</div>
                                                                    {summary.last_clock_out && (
                                                                        <div>- {formatTime(summary.last_clock_out)}</div>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {summary.submission_status ? (
                                                                    getStatusBadge(summary.submission_status)
                                                                ) : (
                                                                    <span className="text-sm text-muted-foreground">Not submitted</span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                    : timeEntries.map((entry) => (
                                                        <TableRow key={entry.id} className={entry.status === 'active' ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                                                            <TableCell>
                                                                <div className="flex items-center">
                                                                    {entry.status === 'active' && (
                                                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                                                    )}
                                                                    <div>
                                                                        <div className="font-medium">{entry.user.name}</div>
                                                                        <div className="text-sm text-muted-foreground">{entry.user.email}</div>
                                                                        {entry.user.departments && entry.user.departments.length > 0 && (
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {entry.user.departments.join(', ')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-sm">
                                                                    <div className="flex items-center">
                                                                        <Clock className="w-3 h-3 mr-1" />
                                                                        {formatTime(entry.clock_in_time)}
                                                                    </div>
                                                                    <div className="flex items-center">
                                                                        {entry.status === 'active' ? (
                                                                            <span className="text-green-600 font-medium">Still Active</span>
                                                                        ) : (
                                                                            <>- {formatTime(entry.clock_out_time || '')}</>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {formatDate(entry.clock_in_time)}
                                                                        {entry.status === 'active' && (
                                                                            <span className="ml-2 text-green-600">
                                                                                ({(() => {
                                                                                const now = new Date();
                                                                                const clockIn = new Date(entry.clock_in_time);
                                                                                const diffMs = now.getTime() - clockIn.getTime();
                                                                                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                                                                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                                                                return `${hours}:${minutes.toString().padStart(2, '0')} ago`;
                                                                            })()})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div>
                                                                    <div className="font-medium">{formatHours(entry.total_hours)}h</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {formatHours(entry.regular_hours)}h + {formatHours(entry.overtime_hours)}h OT
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-sm">
                                                                    {entry.break_count > 0 ? (
                                                                        <div>
                                                                            <div className="flex items-center">
                                                                                <Coffee className="w-3 h-3 mr-1" />
                                                                                {entry.break_count} ({Math.round(entry.total_break_minutes)}m)
                                                                            </div>
                                                                            {entry.is_on_break && (
                                                                                <div className="text-xs text-amber-600 font-medium">
                                                                                    Currently on {entry.current_break_type} break
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">None</span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    {entry.status === 'active' ? (
                                                                        <Badge variant="default" className="bg-green-100 text-green-800">
                                                                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                                                                            Clocked In
                                                                        </Badge>
                                                                    ) : (
                                                                        getStatusBadge(entry.status)
                                                                    )}
                                                                    {entry.adjustment_reason && (
                                                                        <div className="text-xs text-muted-foreground">
                                                                            Adjusted
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {entry.submission_status ? (
                                                                    getStatusBadge(entry.submission_status)
                                                                ) : (
                                                                    <span className="text-sm text-muted-foreground">Not submitted</span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                }
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Pagination */}
                        {pagination && pagination.total > 0 && (
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                    Showing {pagination.from} to {pagination.to} of {pagination.total} results
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFilters({...filters, per_page: pagination.current_page - 1})}
                                        disabled={pagination.current_page <= 1}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm">
                                        Page {pagination.current_page} of {pagination.last_page}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFilters({...filters, per_page: pagination.current_page + 1})}
                                        disabled={pagination.current_page >= pagination.last_page}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* Pending Submissions Tab (existing functionality) */}
                    <TabsContent value="pending" className="space-y-4">
                        <Card>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : pendingSubmissions.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="mt-2 text-sm font-medium">No pending submissions</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            No pending timesheet submissions found
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Employee</TableHead>
                                                    <TableHead>Week</TableHead>
                                                    <TableHead>Total Hours</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Submitted</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pendingSubmissions.map((submission) => (
                                                    <TableRow key={submission.id}>
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">
                                                                    {submission.user.name}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {submission.user.email}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {formatDate(submission.week_start_date)} - {formatDate(submission.week_end_date)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <div>Total: {formatHours(submission.total_hours)}h</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Regular: {formatHours(submission.regular_hours)}h •
                                                                    OT: {formatHours(submission.overtime_hours)}h
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                {getStatusBadge(submission.status)}
                                                                {!submission.self_submitted && (
                                                                    <div className="flex items-center text-xs text-amber-600">
                                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                                        Manager submitted
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {formatDate(submission.submitted_at)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex space-x-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedUser(submission.user);
                                                                        setSelectedWeek(submission.week_start_date);
                                                                        setActiveTab('individual');
                                                                    }}
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                                {submission.status === 'submitted' && (
                                                                    <>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setSelectedSubmission(submission);
                                                                                setShowApprovalModal(true);
                                                                            }}
                                                                            className="text-green-600 hover:text-green-700"
                                                                        >
                                                                            <Check className="w-4 h-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setSelectedSubmission(submission);
                                                                                setShowRejectionModal(true);
                                                                            }}
                                                                            className="text-red-600 hover:text-red-700"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Individual View Tab (existing functionality with minor updates) */}
                    <TabsContent value="individual" className="space-y-4">
                        {/* User Selection */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-end space-x-4">
                                    <div className="flex-1">
                                        <Label>Select Employee</Label>
                                        <Select
                                            value={selectedUser?.id?.toString() || "none"}
                                            onValueChange={(value) => {
                                                if (value && value !== "none") {
                                                    const user = manageableUsers.find(u => u.id.toString() === value);
                                                    setSelectedUser(user || null);
                                                } else {
                                                    setSelectedUser(null);
                                                }
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an employee..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Select an employee...</SelectItem>
                                                {manageableUsers.map((user) => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.name} ({user.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigateWeek(-1)}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <div>
                                            <Label>Week Starting</Label>
                                            <Input
                                                type="date"
                                                value={selectedWeek}
                                                onChange={(e) => setSelectedWeek(e.target.value)}
                                                className="w-auto"
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigateWeek(1)}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Individual Timesheet Display - Same as before */}
                        {selectedUser && timesheetData && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>{timesheetData.user.name}'s Timesheet</CardTitle>
                                            <p className="text-muted-foreground">
                                                Week of {timesheetData.week_info.display}
                                            </p>
                                        </div>
                                        {timesheetData.submission && timesheetData.submission.status === 'submitted' && (
                                            <div className="flex space-x-2">
                                                <Button
                                                    onClick={() => {
                                                        setSelectedSubmission({
                                                            id: timesheetData.submission!.id,
                                                            user: timesheetData.user,
                                                            week_start_date: timesheetData.week_info.start_date,
                                                            week_end_date: timesheetData.week_info.end_date,
                                                            total_hours: timesheetData.weekly_totals.total_hours,
                                                            regular_hours: timesheetData.weekly_totals.regular_hours,
                                                            overtime_hours: timesheetData.weekly_totals.overtime_hours,
                                                            break_hours: timesheetData.weekly_totals.break_hours,
                                                            status: timesheetData.submission!.status,
                                                            submitted_at: new Date().toISOString(),
                                                            self_submitted: true
                                                        });
                                                        setShowApprovalModal(true);
                                                    }}
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    <Check className="w-4 h-4 mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setSelectedSubmission({
                                                            id: timesheetData.submission!.id,
                                                            user: timesheetData.user,
                                                            week_start_date: timesheetData.week_info.start_date,
                                                            week_end_date: timesheetData.week_info.end_date,
                                                            total_hours: timesheetData.weekly_totals.total_hours,
                                                            regular_hours: timesheetData.weekly_totals.regular_hours,
                                                            overtime_hours: timesheetData.weekly_totals.overtime_hours,
                                                            break_hours: timesheetData.weekly_totals.break_hours,
                                                            status: timesheetData.submission!.status,
                                                            submitted_at: new Date().toISOString(),
                                                            self_submitted: true
                                                        });
                                                        setShowRejectionModal(true);
                                                    }}
                                                    size="sm"
                                                    variant="destructive"
                                                >
                                                    <X className="w-4 h-4 mr-1" />
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                {/* Rest of individual timesheet display - same as existing code */}
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Approval Modal */}
                <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Approve Timesheet</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                You are about to approve the timesheet for <strong>{selectedSubmission?.user?.name}</strong>.
                            </p>

                            <div>
                                <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                                <Textarea
                                    id="approval-notes"
                                    value={approvalForm.approval_notes}
                                    onChange={(e) => setApprovalForm({...approvalForm, approval_notes: e.target.value})}
                                    rows={3}
                                    placeholder="Any notes about the approval..."
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700">
                                {loading ? 'Approving...' : 'Approve'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Rejection Modal */}
                <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reject Timesheet</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                You are about to reject the timesheet for <strong>{selectedSubmission?.user?.name}</strong>.
                            </p>

                            <div>
                                <Label htmlFor="rejection-reason">
                                    Rejection Reason <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="rejection-reason"
                                    value={rejectionForm.rejection_reason}
                                    onChange={(e) => setRejectionForm({...rejectionForm, rejection_reason: e.target.value})}
                                    rows={3}
                                    placeholder="Please explain why this timesheet is being rejected..."
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowRejectionModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleReject}
                                disabled={loading || !rejectionForm.rejection_reason.trim()}
                                variant="destructive"
                            >
                                {loading ? 'Rejecting...' : 'Reject'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
