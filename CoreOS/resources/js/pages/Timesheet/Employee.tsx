import React, {useEffect, useState} from 'react';
import {
    AlertTriangle,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Coffee,
    Edit,
    FileText,
    Send,
    XCircle
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import {Head, router} from '@inertiajs/react';
import type {BreadcrumbItem} from "@/types";
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Input} from '@/components/ui/input';
import TimeClock from "@/pages/TimeClock";

interface TimesheetEntry {
    clock_in_time: string;
    clock_out_time: string;
    status: string;
    breaks: {
        break_type: string;
        duration_minutes: number;
    }[];
}

interface DayData {
    date: string;
    day_name: string;
    is_weekend: boolean;
    entries: TimesheetEntry[];
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    break_minutes: number;
    pto: {
        type: string;
        hours: number;
    }[];
}

interface WeeklyTotals {
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    break_hours: number;
}

interface Submission {
    status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked';
    submitted_at: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    approved_by: string | null;
    rejected_by: string | null;
    submitted_by: string | null;
    rejection_reason: string | null;
    self_submitted: boolean;
}

interface TimesheetData {
    week_info: {
        display: string;
    };
    can_submit: boolean;
    submission: Submission | null;
    weekly_totals: WeeklyTotals;
    daily_data: DayData[];
}

interface TimeClockStatus {
    is_clocked_in: boolean;
    current_entry: {
        id: number;
        clock_in_time: string;
    } | null;
    current_break: {
        id: number;
        break_start: string;
    } | null;
}

interface Props {
    initialWeekStart?: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Your Timesheet',
        href: '/timesheet',
    },
];

export default function EmployeeTimesheetView({ initialWeekStart = null }: Props) {
    const [weekStart, setWeekStart] = useState(
        initialWeekStart || new Date().toISOString().split('T')[0]
    );
    const [timesheetData, setTimesheetData] = useState<TimesheetData | null>(null);
    const [timeClockStatus, setTimeClockStatus] = useState<TimeClockStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [submissionForm, setSubmissionForm] = useState({
        submission_notes: '',
        legal_acknowledgment: ''
    });
    const [legalText, setLegalText] = useState('');

    useEffect(() => {
        fetchTimesheetData();
        fetchTimeClockStatus();
    }, [weekStart]);

    useEffect(() => {
        fetchLegalText();
    }, []);

    const fetchTimesheetData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/timesheet?week_start=${weekStart}`);
            const data = await response.json();
            setTimesheetData(data);
        } catch (error) {
            console.error('Failed to fetch timesheet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTimeClockStatus = async () => {
        try {
            const response = await fetch('/api/timeclock/status');
            const data = await response.json();
            setTimeClockStatus(data);
        } catch (error) {
            console.error('Failed to fetch time clock status:', error);
        }
    };

    const fetchLegalText = async () => {
        try {
            const response = await fetch('/api/timesheet/legal-acknowledgment');
            const data = await response.json();
            setLegalText(data.legal_text);
            setSubmissionForm(prev => ({ ...prev, legal_acknowledgment: data.legal_text }));
        } catch (error) {
            console.error('Failed to fetch legal text:', error);
        }
    };

    const handleSubmit = () => {
        if (!submissionForm.legal_acknowledgment) {
            alert('Please acknowledge the legal statement');
            return;
        }

        setLoading(true);

        router.post('api/timesheet/submit', {
            week_start_date: weekStart,
            ...submissionForm
        }, {
            onSuccess: (page) => {
                setShowSubmissionModal(false);
                setSubmissionForm({ submission_notes: '', legal_acknowledgment: legalText });
                fetchTimesheetData();
                // Flash message will be available in page.props.flash
                // if (page.props.flash?.success) {
                //     showNotification(page.props.flash.success, 'success');
                // }
            },
            onError: (errors) => {
                const errorMessage = Object.values(errors)[0] as string || 'Failed to submit timesheet';
                showNotification(errorMessage, 'error');
            },
            onFinish: () => {
                setLoading(false);
            },
            preserveScroll: true
        });
    };

    const showNotification = (message: string, type: string) => {
        console.log(`${type}: ${message}`);
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return '--:--';
        const date = new Date(timeString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatHours = (hours: number) => {
        if (!hours) return '0.00';
        return parseFloat(hours.toString()).toFixed(2);
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            draft: { variant: 'secondary' as const, icon: Edit, text: 'Draft' },
            submitted: { variant: 'default' as const, icon: Clock, text: 'Submitted' },
            approved: { variant: 'default' as const, icon: CheckCircle, text: 'Approved', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
            rejected: { variant: 'destructive' as const, icon: XCircle, text: 'Rejected' },
            locked: { variant: 'default' as const, icon: FileText, text: 'Locked', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' }
        };

        const badge = badges[status as keyof typeof badges] || badges.draft;
        const Icon = badge.icon;

        return (
            <Badge variant={badge.variant} >
                <Icon className="w-3 h-3 mr-1" />
                {badge.text}
            </Badge>
        );
    };

    const navigateWeek = (direction: number) => {
        const currentWeek = new Date(weekStart);
        currentWeek.setDate(currentWeek.getDate() + (direction * 7));
        setWeekStart(currentWeek.toISOString().split('T')[0]);
    };

    // Check if user has incomplete time entries for the week
    const hasIncompleteTimeEntries = () => {
        if (!timesheetData) return false;

        return timesheetData.daily_data.some(day =>
            day.entries.some(entry =>
                !entry.clock_out_time || entry.status === 'active'
            )
        );
    };

    // Check if the week being viewed is the current week
    const isCurrentWeek = () => {
        const today = new Date();
        const startOfCurrentWeek = new Date(today);
        startOfCurrentWeek.setDate(today.getDate() - today.getDay()); // Sunday
        startOfCurrentWeek.setHours(0, 0, 0, 0);

        const viewedWeekStart = new Date(weekStart);
        viewedWeekStart.setHours(0, 0, 0, 0);

        return startOfCurrentWeek.getTime() === viewedWeekStart.getTime();
    };

    // Check if submission should be blocked
    const isSubmissionBlocked = () => {
        // Only block for clock status if viewing the current week
        if (isCurrentWeek() && timeClockStatus?.is_clocked_in) {
            return {
                blocked: true,
                reason: 'You must clock out before submitting your current week timesheet.'
            };
        }

        // Block if user has incomplete time entries for the week being viewed
        if (hasIncompleteTimeEntries()) {
            return {
                blocked: true,
                reason: 'You have incomplete time entries for this week. Please complete all entries before submitting.'
            };
        }

        // Block if timesheet is already submitted (and not rejected/draft)
        if (timesheetData?.submission &&
            !['draft', 'rejected'].includes(timesheetData.submission.status)) {
            return {
                blocked: true,
                reason: `Timesheet has already been ${timesheetData.submission.status}.`
            };
        }

        return { blocked: false, reason: '' };
    };

    const submissionStatus = isSubmissionBlocked();

    if (loading && !timesheetData) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="My Timesheet" />
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </AppLayout>
        );
    }

    if (!timesheetData) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="My Timesheet" />
                <div className="text-center py-8">
                    <p className="text-muted-foreground">No timesheet data available</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Timesheet" />
            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">My Timesheet</h1>
                        <p className="text-muted-foreground">
                            Week of {timesheetData.week_info.display}
                        </p>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Week Navigation */}
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateWeek(-1)}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Previous
                            </Button>
                            <Input
                                type="date"
                                value={weekStart}
                                onChange={(e) => setWeekStart(e.target.value)}
                                className="w-auto"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateWeek(1)}
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>

                        {/* Submit Button Logic */}
                        {!submissionStatus.blocked && timesheetData.can_submit && (
                            <>
                                {!timesheetData.submission?.status ? (
                                    <Button onClick={() => setShowSubmissionModal(true)}>
                                        <Send className="w-4 h-4 mr-2" />
                                        Submit Timesheet
                                    </Button>
                                ) : timesheetData.submission.status === 'draft' ? (
                                    <Button onClick={() => setShowSubmissionModal(true)}>
                                        <Send className="w-4 h-4 mr-2" />
                                        Resubmit Timesheet
                                    </Button>
                                ) : timesheetData.submission.status === 'rejected' ? (
                                    <Button onClick={() => setShowSubmissionModal(true)}>
                                        <Send className="w-4 h-4 mr-2" />
                                        Resubmit Timesheet
                                    </Button>
                                ) : null}
                            </>
                        )}

                        {/* Show status when submission is blocked or already processed */}
                        {submissionStatus.blocked ? (
                            <Button disabled variant="secondary" title={submissionStatus.reason}>
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Cannot Submit
                            </Button>
                        ) : timesheetData.submission?.status === 'submitted' ? (
                            <Button disabled variant="secondary">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Already Submitted
                            </Button>
                        ) : timesheetData.submission?.status === 'approved' ? (
                            <Button disabled variant="secondary">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approved
                            </Button>
                        ) : timesheetData.submission?.status === 'locked' ? (
                            <Button disabled variant="secondary">
                                <FileText className="w-4 h-4 mr-2" />
                                Locked
                            </Button>
                        ) : null}
                    </div>
                </div>

                {/* Status Alerts */}
                {submissionStatus.blocked && (
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {submissionStatus.reason}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Current Clock Status - Only show for current week */}
                {isCurrentWeek() && timeClockStatus?.is_clocked_in && (
                    <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between gap-2">
                                    <span>
                                        You are currently clocked in since {timeClockStatus.current_entry ? formatTime(timeClockStatus.current_entry.clock_in_time) : 'unknown time'}.
                                        {timeClockStatus.current_break && (
                                            <> Currently on break since {formatTime(timeClockStatus.current_break.break_start)}.</>
                                        )}
                                    </span>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <Clock className="w-4 h-4 mr-1" />
                                            Go to Time Clock
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[725px]">
                                        <DialogHeader>
                                            <DialogTitle>Correct your open punch</DialogTitle>
                                            <DialogDescription>
                                                Please correct your open punch before submitting your timesheet.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <TimeClock />
                                        <DialogFooter>


                                        </DialogFooter>
                                    </DialogContent>

                                </Dialog>
                                {/*<Button*/}
                                {/*    variant="outline"*/}
                                {/*    size="sm"*/}
                                {/*    onClick={() => window.open('/timeclock', '_blank')}*/}
                                {/*>*/}
                                {/*    <Clock className="w-4 h-4 mr-1" />*/}
                                {/*    Go to Time Clock*/}
                                {/*</Button>*/}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Previous Week Clock Status - Only show info for previous weeks */}
                {!isCurrentWeek() && timeClockStatus?.is_clocked_in && (
                    <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between">
                                <span>
                                    You are currently clocked in for today's work. You can still submit previous week timesheets.
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open('/timeclock', '_blank')}
                                >
                                    <Clock className="w-4 h-4 mr-1" />
                                    Go to Time Clock
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Submission Status Card */}
                {timesheetData.submission && (
                    <Alert>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-4">
                                {getStatusBadge(timesheetData.submission.status)}
                                <div>
                                    <AlertDescription>
                                        {timesheetData.submission.submitted_at && (
                                            <>Submitted on {new Date(timesheetData.submission.submitted_at).toLocaleDateString()}</>
                                        )}
                                        {timesheetData.submission.approved_at && (
                                            <> • Approved by {timesheetData.submission.approved_by}</>
                                        )}
                                        {timesheetData.submission.rejected_at && (
                                            <> • Rejected by {timesheetData.submission.rejected_by}</>
                                        )}
                                    </AlertDescription>
                                    {timesheetData.submission.rejection_reason && (
                                        <p className="text-sm text-destructive mt-1">
                                            Reason: {timesheetData.submission.rejection_reason}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {!timesheetData.submission.self_submitted && (
                                <div className="text-sm text-amber-600 flex items-center">
                                    <AlertTriangle className="w-4 h-4 mr-1" />
                                    Submitted by {timesheetData.submission.submitted_by}
                                </div>
                            )}
                        </div>
                    </Alert>
                )}

                {/* Weekly Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold">
                                    {formatHours(timesheetData.weekly_totals.total_hours)}
                                </p>
                                <p className="text-sm text-muted-foreground">Total Hours</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">
                                    {formatHours(timesheetData.weekly_totals.regular_hours)}
                                </p>
                                <p className="text-sm text-muted-foreground">Regular Hours</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-amber-600">
                                    {formatHours(timesheetData.weekly_totals.overtime_hours)}
                                </p>
                                <p className="text-sm text-muted-foreground">Overtime Hours</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatHours(timesheetData.weekly_totals.break_hours)}
                                </p>
                                <p className="text-sm text-muted-foreground">Break Hours</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Daily Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Clock In/Out</TableHead>
                                        <TableHead>Total Hours</TableHead>
                                        <TableHead>Regular</TableHead>
                                        <TableHead>Overtime</TableHead>
                                        <TableHead>Breaks</TableHead>
                                        <TableHead>PTO</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {timesheetData.daily_data.map((day, index) => (
                                        <TableRow key={index} className={day.is_weekend ? 'bg-muted/50' : ''}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">
                                                        {new Date(day.date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {day.day_name}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {day.entries.map((entry, entryIndex) => (
                                                        <div key={entryIndex} className="text-sm">
                                                            <div className="flex items-center space-x-2">
                                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                                <span>
                                                                    {formatTime(entry.clock_in_time)} - {formatTime(entry.clock_out_time)}
                                                                </span>
                                                                {entry.status === 'adjusted' && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        Adjusted
                                                                    </Badge>
                                                                )}
                                                                {entry.status === 'active' && (
                                                                    <Badge variant="destructive" className="text-xs">
                                                                        Incomplete
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {day.entries.length === 0 && !day.pto.length && (
                                                        <span className="text-sm text-muted-foreground">No entries</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {formatHours(day.total_hours)}
                                            </TableCell>
                                            <TableCell className="text-green-600">
                                                {formatHours(day.regular_hours)}
                                            </TableCell>
                                            <TableCell className="text-amber-600">
                                                {formatHours(day.overtime_hours)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {day.entries.map((entry, entryIndex) => (
                                                        <div key={entryIndex}>
                                                            {entry.breaks.map((breakEntry, breakIndex) => (
                                                                <div key={breakIndex} className="text-xs text-muted-foreground flex items-center">
                                                                    <Coffee className="w-3 h-3 mr-1" />
                                                                    {breakEntry.break_type} ({Math.round(breakEntry.duration_minutes)}m)
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                    {day.break_minutes > 0 && (
                                                        <div className="text-sm font-medium text-blue-600">
                                                            Total: {Math.round(day.break_minutes)}m
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {day.pto.map((pto, ptoIndex) => (
                                                    <div key={ptoIndex} className="text-sm text-purple-600">
                                                        {pto.type} ({pto.hours}h)
                                                    </div>
                                                ))}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Submission Modal */}
                <Dialog open={showSubmissionModal} onOpenChange={setShowSubmissionModal}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Submit Timesheet</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    value={submissionForm.submission_notes}
                                    onChange={(e) => setSubmissionForm({...submissionForm, submission_notes: e.target.value})}
                                    placeholder="Any additional notes about your timesheet..."
                                    rows={3}
                                />
                            </div>

                            <div>
                                <Label>Legal Acknowledgment</Label>
                                <Card className="mt-2">
                                    <CardContent className="p-4">
                                        <p className="text-sm mb-3">
                                            {legalText}
                                        </p>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="legal"
                                                checked={!!submissionForm.legal_acknowledgment}
                                                onCheckedChange={(checked) => setSubmissionForm({
                                                    ...submissionForm,
                                                    legal_acknowledgment: checked ? legalText : ''
                                                })}
                                            />
                                            <Label htmlFor="legal" className="text-sm">
                                                I acknowledge and agree to the statement above
                                            </Label>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowSubmissionModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !submissionForm.legal_acknowledgment}
                            >
                                {loading ? 'Submitting...' : 'Submit Timesheet'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
