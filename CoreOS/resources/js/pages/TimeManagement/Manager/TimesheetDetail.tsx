import {useState} from 'react';
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    Coffee,
    FileText,
    MapPin,
    Pause,
    Play,
    User,
    XCircle
} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    current_position?: {
        title: string;
    };
}

interface BreakType {
    id: number;
    name: string;
    label: string;
    is_paid: boolean;
}

interface TimeClockAudit {
    id: number;
    action: string;
    action_timestamp: string;
    ip_address: string;
    user_agent: string;
}

interface TimeClock {
    id: number;
    user_id: number;
    clock_in_at: string;
    clock_out_at: string | null;
    break_start_at: string | null;
    break_end_at: string | null;
    regular_hours: number;
    overtime_hours: number;
    break_duration: number;
    notes: string | null;
    status: 'active' | 'completed' | 'pending_approval';
    location_data: any;
    break_type?: BreakType;
    audits?: TimeClockAudit[];
}

interface Timesheet {
    id: number;
    user_id: number;
    week_start_date: string;
    week_end_date: string;
    status: 'draft' | 'submitted' | 'approved' | 'processed';
    submitted_at: string | null;
    approved_at: string | null;
    processed_at: string | null;
    withdrawn_at: string | null;
    withdrawal_reason: string | null;
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    break_hours: number;
    notes: string | null;
    manager_notes: string | null;
    legal_acknowledgment: boolean;
    user: User;
    submitted_by?: User;
    approved_by?: User;
    processed_by?: User;
}

interface Props {
    timesheet: Timesheet;
    timeEntries: TimeClock[];
}

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
        title: 'Timesheet Details',
        href: '#',
    },
];

export default function TimesheetDetail({ timesheet, timeEntries }: Props) {
    const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
    const [managerNotes, setManagerNotes] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);

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
            hour12: true,
        });
    };

    const formatDateTime = (dateString: string): string => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatHours = (hours: number): string => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const formatBreakDuration = (hours: number): string => {
        const totalMinutes = Math.round(hours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return h > 0 ? `${h}:${m.toString().padStart(2, '0')} hrs` : `${m} mins`;
    };

    const getWeekLabel = (startDate: string, endDate: string): string => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
            submitted: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800' },
            approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
            processed: { label: 'Processed', className: 'bg-purple-100 text-purple-800' },
        };

        const config = statusConfig[status] || statusConfig.draft;
        return (
            <Badge className={config.className}>
                {config.label}
            </Badge>
        );
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

    const getDayOfWeek = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Timesheet Details - ${timesheet.user.name}`} />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.get('/time-clock/manager/dashboard')}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Timesheet Details</h1>
                            <p className="text-muted-foreground">
                                {timesheet.user.name} - {getWeekLabel(timesheet.week_start_date, timesheet.week_end_date)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(timesheet.status)}
                        {timesheet.status === 'submitted' && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleApprovalAction('approve')}
                                    className="bg-green-600 hover:bg-green-700"
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
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="font-medium">{timesheet.user.name}</p>
                                    <p className="text-sm text-muted-foreground">{timesheet.user.email}</p>
                                    {timesheet.user.current_position && (
                                        <p className="text-sm text-muted-foreground">{timesheet.user.current_position.title}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Timesheet Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Hours Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{formatHours(timesheet.total_hours)}</p>
                                        <p className="text-sm text-muted-foreground">Total Hours</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{formatHours(timesheet.regular_hours)}</p>
                                        <p className="text-sm text-muted-foreground">Regular</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-orange-600">{formatHours(timesheet.overtime_hours)}</p>
                                        <p className="text-sm text-muted-foreground">Overtime</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{formatHours(timesheet.break_hours)}</p>
                                        <p className="text-sm text-muted-foreground">Breaks</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submission Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Timeline
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    {timesheet.submitted_at && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <div>
                                                <p className="text-sm font-medium">Submitted</p>
                                                <p className="text-xs text-muted-foreground">{formatDateTime(timesheet.submitted_at)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {timesheet.approved_at && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <div>
                                                <p className="text-sm font-medium">Approved</p>
                                                <p className="text-xs text-muted-foreground">{formatDateTime(timesheet.approved_at)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {timesheet.processed_at && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                            <div>
                                                <p className="text-sm font-medium">Processed</p>
                                                <p className="text-xs text-muted-foreground">{formatDateTime(timesheet.processed_at)}</p>
                                            </div>
                                        </div>
                                    )}
                                    {timesheet.withdrawn_at && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <div>
                                                <p className="text-sm font-medium">Withdrawn</p>
                                                <p className="text-xs text-muted-foreground">{formatDateTime(timesheet.withdrawn_at)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notes */}
                        {(timesheet.notes || timesheet.manager_notes || timesheet.withdrawal_reason) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Notes</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {timesheet.notes && (
                                        <div>
                                            <p className="text-sm font-medium mb-1">Employee Notes:</p>
                                            <p className="text-sm text-muted-foreground">{timesheet.notes}</p>
                                        </div>
                                    )}
                                    {timesheet.manager_notes && (
                                        <div>
                                            <p className="text-sm font-medium mb-1">Manager Notes:</p>
                                            <p className="text-sm text-muted-foreground">{timesheet.manager_notes}</p>
                                        </div>
                                    )}
                                    {timesheet.withdrawal_reason && (
                                        <div>
                                            <p className="text-sm font-medium mb-1">Withdrawal Reason:</p>
                                            <p className="text-sm text-muted-foreground">{timesheet.withdrawal_reason}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column - Time Entries */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Daily Time Entries
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {timeEntries.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No Time Entries</h3>
                                        <p className="text-muted-foreground">
                                            No time entries found for this timesheet.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {timeEntries.map((entry) => (
                                            <div key={entry.id} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h4 className="font-medium">{getDayOfWeek(entry.clock_in_at)}</h4>
                                                        <p className="text-sm text-muted-foreground">{formatDate(entry.clock_in_at)}</p>
                                                    </div>
                                                    <Badge variant={entry.status === 'completed' ? 'default' : 'secondary'}>
                                                        {entry.status === 'completed' ? 'Completed' : 'Active'}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <Play className="w-4 h-4 text-green-600" />
                                                        <div>
                                                            <p className="text-sm font-medium">Clock In</p>
                                                            <p className="text-sm text-muted-foreground">{formatTime(entry.clock_in_at)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Pause className="w-4 h-4 text-red-600" />
                                                        <div>
                                                            <p className="text-sm font-medium">Clock Out</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {entry.clock_out_at ? formatTime(entry.clock_out_at) : '--'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Coffee className="w-4 h-4 text-orange-600" />
                                                        <div>
                                                            <p className="text-sm font-medium">Break</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {entry.break_duration > 0 ? formatBreakDuration(entry.break_duration) : '--'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-blue-600" />
                                                        <div>
                                                            <p className="text-sm font-medium">Total</p>
                                                            <p className="text-sm text-muted-foreground">{formatHours(entry.regular_hours + entry.overtime_hours)}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Hours Breakdown */}
                                                <div className="grid grid-cols-3 gap-4 py-3 border-t">
                                                    <div className="text-center">
                                                        <p className="text-lg font-bold">{formatHours(entry.regular_hours)}</p>
                                                        <p className="text-xs text-muted-foreground">Regular</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-lg font-bold text-orange-600">{formatHours(entry.overtime_hours)}</p>
                                                        <p className="text-xs text-muted-foreground">Overtime</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-lg font-bold">{formatBreakDuration(entry.break_duration)}</p>
                                                        <p className="text-xs text-muted-foreground">Breaks</p>
                                                    </div>
                                                </div>

                                                {/* Break Type & Notes */}
                                                {(entry.break_type || entry.notes) && (
                                                    <div className="pt-3 border-t space-y-2">
                                                        {entry.break_type && (
                                                            <div className="flex items-center gap-2">
                                                                <Coffee className="w-4 h-4" />
                                                                <span className="text-sm">
                                                                    {entry.break_type.label}
                                                                    {entry.break_type.is_paid ? ' (Paid)' : ' (Unpaid)'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {entry.notes && (
                                                            <div>
                                                                <p className="text-sm font-medium">Notes:</p>
                                                                <p className="text-sm text-muted-foreground">{entry.notes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Location Data */}
                                                {entry.location_data && (
                                                    <div className="pt-3 border-t">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-4 h-4" />
                                                            <span className="text-sm text-muted-foreground">
                                                                Location data available
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Approval Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {approvalAction === 'approve' ? 'Approve Timesheet' : 'Reject Timesheet'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="bg-gray-50 border rounded-lg p-4">
                                <div className="space-y-2">
                                    <p><strong>Employee:</strong> {timesheet.user.name}</p>
                                    <p><strong>Week:</strong> {getWeekLabel(timesheet.week_start_date, timesheet.week_end_date)}</p>
                                    <p><strong>Total Hours:</strong> {formatHours(timesheet.total_hours)}</p>
                                    {timesheet.overtime_hours > 0 && (
                                        <p><strong>Overtime:</strong> {formatHours(timesheet.overtime_hours)}</p>
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
                                    className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
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
