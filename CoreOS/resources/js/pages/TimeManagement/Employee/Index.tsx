import {useEffect, useState} from 'react';
import {Head, router} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {Button} from '@/components/ui/button';
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {AlertCircle, Calendar, Clock, FileText, Filter, LogOut, Pause, Play, Send} from 'lucide-react';
import {Separator} from "@/components/ui/separator";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Checkbox} from "@/components/ui/checkbox";

interface TimeClock {
    id: number;
    user_id: number;
    punch_type: 'work' | 'break';
    break_type_id?: number;
    clock_in_at: string;
    clock_out_at: string | null;
    regular_hours: number;
    overtime_hours: number;
    notes: string | null;
    status: 'active' | 'completed' | 'pending_approval';
    location_data?: any;
    breakType?: BreakType;
}

interface BreakType {
    id: number;
    name: string;
    label: string;
    description: string;
    is_paid: boolean;
    max_duration_minutes: number | null;
    is_active: boolean;
}

interface WeeklyStats {
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    break_hours: number;
    entries_count: number;
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
    legal_acknowledgment: boolean;
}

interface WeekOption {
    week_start: string;
    week_end: string;
    timesheet: Timesheet | null;
    label: string;
    is_current: boolean;
}

interface CurrentStatus {
    is_clocked_in: boolean;
    is_on_break: boolean;
    current_work_punch: TimeClock | null;
    current_break_punch: TimeClock | null;
    last_punch: TimeClock | null;
}

interface Props {
    currentStatus: CurrentStatus;
    todayEntries: TimeClock[];
    weekEntries: TimeClock[];
    weeklyStats: WeeklyStats;
    breakTypes: BreakType[];
    currentTimesheet: Timesheet;
    availableWeeks: WeekOption[];
    currentDate: string;
    weekStart: string;
    weekEnd: string;
}

const breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'TimeSheet',
        href: '/time-clock/employee',
    },
];

export default function EmployeeTimeClock({
                                              currentStatus,
                                              weekEntries,
                                              weeklyStats,
                                              breakTypes,
                                              currentTimesheet,
                                          }: Props) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
    const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
    const [legalAcknowledgment, setLegalAcknowledgment] = useState(false);
    const [submissionNotes, setSubmissionNotes] = useState('');
    const [withdrawalReason, setWithdrawalReason] = useState('');
    const [liveWorkingHours, setLiveWorkingHours] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Calculate live working hours
    useEffect(() => {
        if (!currentStatus.is_clocked_in || !currentStatus.current_work_punch) {
            setLiveWorkingHours(0);
            return;
        }

        const calculateLiveHours = () => {
            const workPunch = currentStatus.current_work_punch;
            if (!workPunch) return;

            const clockInTime = new Date(workPunch.clock_in_at).getTime();
            const now = new Date().getTime();

            // Calculate elapsed time since clock-in
            const elapsedMilliseconds = now - clockInTime;
            const elapsedHours = elapsedMilliseconds / (1000 * 60 * 60);

            setLiveWorkingHours(elapsedHours);
        };

        calculateLiveHours();
        const interval = setInterval(calculateLiveHours, 1000);

        return () => clearInterval(interval);
    }, [currentStatus]);

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatHours = (hours: number): string => {
        if (isNaN(hours) || hours < 0) {
            return '0:00';
        }
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

    // Get current break duration
    const getCurrentBreakDuration = (): number => {
        if (!currentStatus.current_break_punch) return 0;

        const breakStart = new Date(currentStatus.current_break_punch.clock_in_at).getTime();
        const now = new Date().getTime();
        return (now - breakStart) / (1000 * 60 * 60); // Convert to hours
    };

    // Get total break hours for current work session
    const getTotalBreakHours = (): number => {
        if (!currentStatus.current_work_punch) return 0;

        // Get today's break entries for current work session
        const today = new Date().toDateString();
        const workPunchDate = new Date(currentStatus.current_work_punch.clock_in_at).toDateString();

        if (today !== workPunchDate) return 0;

        const breakEntries = weekEntries.filter(entry =>
            entry.punch_type === 'break' &&
            new Date(entry.clock_in_at).toDateString() === today
        );

        let totalBreakHours = 0;

        breakEntries.forEach(breakEntry => {
            if (breakEntry.status === 'completed' && breakEntry.clock_out_at) {
                const breakStart = new Date(breakEntry.clock_in_at).getTime();
                const breakEnd = new Date(breakEntry.clock_out_at).getTime();
                totalBreakHours += (breakEnd - breakStart) / (1000 * 60 * 60);
            } else if (breakEntry.status === 'active') {
                // This is the current break
                totalBreakHours += getCurrentBreakDuration();
            }
        });

        return totalBreakHours;
    };

    const getCurrentMonth = (): string => {
        return currentTime.toLocaleDateString('en-US', { month: 'short' });
    };

    const getCurrentMonthLong = (): string => {
        return currentTime.toLocaleDateString('en-US', { month: 'long' });
    };

    const getCurrentDay = (): string => {
        const day = currentTime.getDate();
        return day.toString().padStart(2, '0');
    };

    const getCurrentYearLong = (): string => {
        return currentTime.toLocaleDateString('en-US', { year: 'numeric' });
    };

    const handleClockIn = () => {
        router.post('/time-clock/clock-in', {}, {
            preserveScroll: true,
        });
    };

    const handleClockOut = () => {
        router.post('/time-clock/clock-out', {}, {
            preserveScroll: true,
        });
    };

    const handleStartBreak = () => {
        const lunchBreak = breakTypes.find(bt => bt.label.toLowerCase() === 'lunch break') || (breakTypes.length > 0 ? breakTypes[0] : null);

        if (!lunchBreak) {
            alert("No break types are available. Please contact support.");
            return;
        }

        router.post('/time-clock/start-break', {
            break_type_id: lunchBreak.id,
        }, {
            preserveScroll: true,
        });
    };

    const handleEndBreak = () => {
        router.post('/time-clock/end-break', {}, {
            preserveScroll: true,
        });
    };

    const handleSubmitTimesheet = () => {
        if (!legalAcknowledgment) {
            return;
        }

        router.post('/time-clock/submit-timesheet', {
            timesheet_id: currentTimesheet.id,
            legal_acknowledgment: legalAcknowledgment,
            notes: submissionNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSubmissionDialogOpen(false);
                setLegalAcknowledgment(false);
                setSubmissionNotes('');
            },
        });
    };

    const handleWithdrawTimesheet = () => {
        if (!withdrawalReason.trim() || withdrawalReason.length < 10) {
            return;
        }

        router.post('/time-clock/withdraw-timesheet', {
            timesheet_id: currentTimesheet.id,
            withdrawal_reason: withdrawalReason,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setWithdrawalDialogOpen(false);
                setWithdrawalReason('');
            },
        });
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            draft: { label: 'Open', className: 'bg-gray-100 text-gray-800' },
            submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-800' },
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

    // Group entries into work sessions
    const getWorkSessions = () => {
        const workEntries = weekEntries
            .filter(entry => entry.punch_type === 'work')
            .sort((a, b) => new Date(a.clock_in_at).getTime() - new Date(b.clock_in_at).getTime());

        const sessions: Array<{
            date: string;
            sessionStart: string;
            sessionEnd: string | null;
            workPunches: TimeClock[];
            breaks: TimeClock[];
            totalWorkHours: number;
            totalOvertimeHours: number;
            totalBreakHours: number;
            isActive: boolean;
        }> = [];

        workEntries.forEach(workEntry => {
            const workDate = new Date(workEntry.clock_in_at).toDateString();

            // Check if we already have a session for this date
            let session = sessions.find(s => s.date === workDate);

            if (!session) {
                // Create new session
                session = {
                    date: workDate,
                    sessionStart: workEntry.clock_in_at,
                    sessionEnd: workEntry.clock_out_at,
                    workPunches: [workEntry],
                    breaks: [],
                    totalWorkHours: workEntry.regular_hours || 0,
                    totalOvertimeHours: workEntry.overtime_hours || 0,
                    totalBreakHours: 0,
                    isActive: workEntry.status === 'active',
                };
                sessions.push(session);
            } else {
                // Add to existing session
                session.workPunches.push(workEntry);
                session.totalWorkHours += (workEntry.regular_hours || 0);
                session.totalOvertimeHours += (workEntry.overtime_hours || 0);

                // Update session end time if this punch ended later
                if (workEntry.clock_out_at && (!session.sessionEnd || new Date(workEntry.clock_out_at) > new Date(session.sessionEnd))) {
                    session.sessionEnd = workEntry.clock_out_at;
                }

                if (workEntry.status === 'active') {
                    session.isActive = true;
                    session.sessionEnd = null;
                }
            }
        });

        // Add breaks to sessions and calculate actual working hours
        const breakEntries = weekEntries.filter(entry => entry.punch_type === 'break');
        sessions.forEach(session => {
            // Add breaks to this session
            const sessionBreaks = breakEntries.filter(breakEntry =>
                new Date(breakEntry.clock_in_at).toDateString() === session.date
            );
            session.breaks = sessionBreaks;

            // Calculate break duration
            sessionBreaks.forEach(breakEntry => {
                if (breakEntry.status === 'completed' && breakEntry.clock_out_at) {
                    const breakStart = new Date(breakEntry.clock_in_at).getTime();
                    const breakEnd = new Date(breakEntry.clock_out_at).getTime();
                    session.totalBreakHours += (breakEnd - breakStart) / (1000 * 60 * 60);
                }
            });

            // Recalculate working hours properly
            session.totalWorkHours = 0;
            session.totalOvertimeHours = 0;

            session.workPunches.forEach(workPunch => {
                if (workPunch.clock_out_at) {
                    // Calculate hours manually for all punches (completed or not)
                    const clockInTime = new Date(workPunch.clock_in_at).getTime();
                    const clockOutTime = new Date(workPunch.clock_out_at).getTime();
                    const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
                    session.totalWorkHours += totalHours;
                } else if (workPunch.status === 'active') {
                    // Calculate live hours for active punches
                    const clockInTime = new Date(workPunch.clock_in_at).getTime();
                    const now = new Date().getTime();
                    const elapsedHours = (now - clockInTime) / (1000 * 60 * 60);
                    session.totalWorkHours += elapsedHours;
                }
            });

            // Subtract total break time from working hours
            session.totalWorkHours = Math.max(0, session.totalWorkHours - session.totalBreakHours);
        });

        return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const canStartBreak = currentStatus.is_clocked_in && !currentStatus.is_on_break;
    const canEndBreak = currentStatus.is_on_break;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="TimeSheet - Employee" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">TimeSheet</h1>
                        <p className="text-muted-foreground">
                            Track your time and manage your schedule
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl">{getCurrentMonthLong()} {getCurrentDay()}, {getCurrentYearLong()}</p>
                        <div className="flex justify-end gap-2">
                            <p className="text-2xl font-mono">{formatTime(currentTime)}</p>
                        </div>
                    </div>
                </div>

                {/* Time Tracking Content */}
                <div className="space-y-6">
                    {/* Clock Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Date Display */}
                        <Card className="col-span-2">
                            <CardHeader>
                                <CardTitle className="my-6">
                                    <div className="flex h-5 items-center space-x-4 text-sm">
                                        <div className="flex flex-col">
                                            <div className="font-semibold text-lg">
                                                {getCurrentMonth().toUpperCase()}
                                            </div>
                                            <Separator/>
                                            <div className="font-bold text-2xl">
                                                {getCurrentDay()}
                                            </div>
                                        </div>
                                        <Separator orientation="vertical" />
                                        <div>
                                            {!currentStatus.is_clocked_in && !currentStatus.is_on_break ? (
                                                <Button
                                                    onClick={handleClockIn}
                                                    size="lg"
                                                    className="w-full bg-green-600 hover:bg-green-700"
                                                >
                                                    <Clock className="w-5 h-5 mr-2" />
                                                    Clock In
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={handleClockOut}
                                                    size="lg"
                                                    variant="destructive"
                                                    className="w-full"
                                                >
                                                    <LogOut className="w-5 h-5 mr-2" />
                                                    Clock Out
                                                </Button>
                                            )}
                                        </div>
                                        <Separator orientation="vertical"/>
                                        <div>
                                            {canStartBreak && (
                                                <Button
                                                    onClick={handleStartBreak}
                                                    size="lg"
                                                    variant="outline"
                                                    className="w-full"
                                                >
                                                    <Play className="w-5 h-5 mr-2" />
                                                    Start Lunch Break
                                                </Button>
                                            )}

                                            {canEndBreak && (
                                                <Button
                                                    onClick={handleEndBreak}
                                                    size="lg"
                                                    className="w-full bg-orange-600 hover:bg-orange-700"
                                                >
                                                    <Pause className="w-5 h-5 mr-2" />
                                                    End Break
                                                </Button>
                                            )}

                                            {/*{currentStatus.is_clocked_in && (*/}
                                            {/*    <p className="text-sm text-muted-foreground text-center">*/}
                                            {/*        Clock in to start a break*/}
                                            {/*    </p>*/}
                                            {/*)}*/}
                                        </div>
                                    </div>
                                </CardTitle>
                                <CardAction>
                                    <Badge variant={currentStatus.is_on_break ? "destructive" : "default"}>
                                        {currentStatus.is_on_break ? "On Break" : currentStatus.is_clocked_in ? "Working" : "Clocked Out"}
                                    </Badge>
                                </CardAction>
                            </CardHeader>
                            <CardContent className="p-6">
                                <Separator className="my-2.5" />
                                {/* Current Status */}
                                {currentStatus.is_clocked_in && currentStatus.current_work_punch && (
                                    <div className="flex justify-between gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Clock In</p>
                                            <p className="text-xl font-bold">
                                                {formatTime(new Date(currentStatus.current_work_punch.clock_in_at))}
                                            </p>
                                        </div>
                                        <Separator orientation="vertical"/>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Breaks</p>
                                            <p className="text-xl font-bold">
                                                {formatBreakDuration(currentStatus.is_on_break ? getCurrentBreakDuration() : getTotalBreakHours())}
                                            </p>
                                        </div>
                                        <Separator orientation="vertical"/>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Working Hours</p>
                                            <p className="text-xl font-bold">
                                                {formatHours(liveWorkingHours)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!currentStatus.is_clocked_in && (
                                    <p className="text-sm text-muted-foreground text-center">
                                        Welcome! Clock in to start tracking time
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Timesheet Submission */}
                        <Card className="col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Timesheet Submission
                                </CardTitle>
                                <CardAction>
                                    {currentTimesheet.status === 'draft' && (
                                        <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="secondary">
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Submit Timesheet
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Submit Timesheet</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                        <div className="flex items-start gap-3">
                                                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                                            <div className="text-sm">
                                                                <p className="font-medium text-yellow-800 mb-1">
                                                                    Legal Acknowledgment Required
                                                                </p>
                                                                <div className="text-yellow-700">
                                                                    <p>I hereby certify that the time recorded on this timesheet is true and accurate to the best of my knowledge.</p>
                                                                    <p>I understand that any false statements or misrepresentation of time worked may result in disciplinary action, up to and including termination of employment.</p>
                                                                    <p>I acknowledge that I have reviewed all time entries, break periods, and any adjustments made during this pay period.</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="notes">Notes (Optional)</Label>
                                                        <Textarea
                                                            id="notes"
                                                            placeholder="Add any notes about your timesheet..."
                                                            value={submissionNotes}
                                                            onChange={(e) => setSubmissionNotes(e.target.value)}
                                                            rows={3}
                                                        />
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id="legal-acknowledgment"
                                                            checked={legalAcknowledgment}
                                                            onCheckedChange={(checked) => setLegalAcknowledgment(checked === true)}
                                                        />
                                                        <Label htmlFor="legal-acknowledgment" className="text-sm">
                                                            I acknowledge and agree to the above statement.
                                                        </Label>
                                                    </div>

                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setSubmissionDialogOpen(false)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            onClick={handleSubmitTimesheet}
                                                            disabled={!legalAcknowledgment}
                                                            className="bg-blue-600 hover:bg-blue-700"
                                                        >
                                                            Submit Timesheet
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}

                                    {currentTimesheet.status === 'submitted' && (
                                        <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="border-red-200 text-red-600 hover:bg-red-50"
                                                >
                                                    Withdraw Submission
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Withdraw Timesheet Submission</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                        <div className="flex items-start gap-3">
                                                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                                            <div className="text-sm">
                                                                <p className="font-medium text-red-800 mb-1">
                                                                    Withdrawal Reason Required
                                                                </p>
                                                                <p className="text-red-700">
                                                                    Please provide a reason for withdrawing your timesheet submission. This information will be recorded for audit purposes.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="withdrawal-reason">Withdrawal Reason *</Label>
                                                        <Textarea
                                                            id="withdrawal-reason"
                                                            placeholder="Please explain why you need to withdraw this timesheet..."
                                                            value={withdrawalReason}
                                                            onChange={(e) => setWithdrawalReason(e.target.value)}
                                                            rows={4}
                                                            className="resize-none"
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            Minimum 10 characters required ({withdrawalReason.length}/10)
                                                        </p>
                                                    </div>

                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setWithdrawalDialogOpen(false);
                                                                setWithdrawalReason('');
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            onClick={handleWithdrawTimesheet}
                                                            disabled={!withdrawalReason.trim() || withdrawalReason.length < 10}
                                                            variant="destructive"
                                                        >
                                                            Withdraw Timesheet
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </CardAction>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">
                                                Week: {new Date(currentTimesheet.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(currentTimesheet.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Status: {getStatusBadge(currentTimesheet.status)}
                                            </p>
                                        </div>
                                    </div>

                                    {currentTimesheet.status === 'submitted' && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <p className="text-sm text-blue-800">
                                                <strong>Submitted:</strong> {currentTimesheet.submitted_at ? new Date(currentTimesheet.submitted_at).toLocaleString() : 'N/A'}
                                            </p>
                                            <p className="text-sm text-blue-700 mt-1">
                                                Your timesheet has been submitted and is awaiting manager approval.
                                            </p>
                                        </div>
                                    )}

                                    {currentTimesheet.status === 'approved' && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <p className="text-sm text-green-800">
                                                <strong>Approved:</strong> {currentTimesheet.approved_at ? new Date(currentTimesheet.approved_at).toLocaleString() : 'N/A'}
                                            </p>
                                            <p className="text-sm text-green-700 mt-1">
                                                Your timesheet has been approved and is being processed by payroll.
                                            </p>
                                        </div>
                                    )}

                                    {currentTimesheet.status === 'processed' && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                            <p className="text-sm text-purple-800">
                                                <strong>Processed:</strong> {currentTimesheet.processed_at ? new Date(currentTimesheet.processed_at).toLocaleString() : 'N/A'}
                                            </p>
                                            <p className="text-sm text-purple-700 mt-1">
                                                Your timesheet has been processed and is complete.
                                            </p>
                                        </div>
                                    )}

                                    {currentTimesheet.withdrawal_reason && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <p className="text-sm text-yellow-800">
                                                <strong>Previous Withdrawal:</strong> {currentTimesheet.withdrawn_at ? new Date(currentTimesheet.withdrawn_at).toLocaleString() : 'N/A'}
                                            </p>
                                            <p className="text-sm text-yellow-700 mt-1">
                                                <strong>Reason:</strong> {currentTimesheet.withdrawal_reason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stats Cards */}
                        <Card>
                            <CardHeader>
                                <CardDescription>Total Hours</CardDescription>
                                <CardTitle className="text-2xl font-semibold tabular-nums">
                                    {formatHours(weeklyStats.total_hours)}
                                </CardTitle>
                                <CardAction>
                                    <Badge variant="outline">
                                        {formatHours(liveWorkingHours)}
                                    </Badge>
                                </CardAction>
                            </CardHeader>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardDescription>Regular Hours</CardDescription>
                                <CardTitle className="text-2xl font-semibold tabular-nums">
                                    {formatHours(weeklyStats.regular_hours)}
                                </CardTitle>
                            </CardHeader>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardDescription>Overtime Hours</CardDescription>
                                <CardTitle className="text-2xl font-semibold tabular-nums">
                                    {formatHours(weeklyStats.overtime_hours)}
                                </CardTitle>
                            </CardHeader>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardDescription>Total Breaks</CardDescription>
                                <CardTitle className="text-2xl font-semibold tabular-nums">
                                    {formatHours(weeklyStats.break_hours)}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Time Entries Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Work Sessions</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm">
                                        <Filter className="w-4 h-4 mr-2" />
                                        Filter by Date
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Session Start</TableHead>
                                        <TableHead>Session End</TableHead>
                                        <TableHead>Breaks</TableHead>
                                        <TableHead>Working Hours</TableHead>
                                        <TableHead>Overtime</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {getWorkSessions().map((session, index) => (
                                        <TableRow key={`${session.date}-${index}`}>
                                            <TableCell>
                                                {formatDate(session.sessionStart)}
                                            </TableCell>
                                            <TableCell>
                                                {formatTime(new Date(session.sessionStart))}
                                            </TableCell>
                                            <TableCell>
                                                {session.sessionEnd ? formatTime(new Date(session.sessionEnd)) : '--'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {session.breaks.length > 0 ? (
                                                        session.breaks.map((breakEntry, breakIndex) => (
                                                            <div key={breakEntry.id} className="text-xs">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {breakEntry.breakType?.label || 'Break'}: {' '}
                                                                    {formatTime(new Date(breakEntry.clock_in_at))}
                                                                    {breakEntry.clock_out_at && (
                                                                        ` - ${formatTime(new Date(breakEntry.clock_out_at))}`
                                                                    )}
                                                                    {breakEntry.status === 'active' && (
                                                                        <span className="text-orange-600 ml-1">(Active)</span>
                                                                    )}
                                                                </Badge>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">No breaks</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {formatHours(session.totalWorkHours)}
                                            </TableCell>
                                            <TableCell>
                                                {session.totalOvertimeHours > 0 ? formatHours(session.totalOvertimeHours) : '--'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={session.isActive ? "default" : "secondary"}>
                                                    {session.isActive ? "Active" : "Completed"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {getWorkSessions().length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8">
                                                <div className="text-muted-foreground">
                                                    <Calendar className="w-8 h-8 mx-auto mb-2" />
                                                    No work sessions found for this week
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
