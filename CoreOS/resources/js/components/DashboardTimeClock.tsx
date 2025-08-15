import {useEffect, useState} from 'react';
import {router} from '@inertiajs/react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {Clock, LogOut, Pause, Play, Timer,} from 'lucide-react';

interface User {
    id: number;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    avatar: string;
    is_active: boolean;
}

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

interface CurrentStatus {
    is_clocked_in: boolean;
    is_on_break: boolean;
    current_work_punch: TimeClock | null;
    current_break_punch: TimeClock | null;
    last_punch: TimeClock | null;
}

interface Props {
    currentStatus?: CurrentStatus;
    breakTypes?: BreakType[];
    User?: User;
}

export default function DashboardTimeClock({
                                               currentStatus: initialStatus,
                                               breakTypes = [],
                                               User
                                           }: Props) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [currentStatus, setCurrentStatus] = useState(initialStatus || {
        is_clocked_in: false,
        is_on_break: false,
        current_work_punch: null,
        current_break_punch: null,
        last_punch: null,
    });
    const [liveWorkingHours, setLiveWorkingHours] = useState(0);
    const [liveBreakDuration, setLiveBreakDuration] = useState(0);

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Poll for status updates every 30 seconds
    useEffect(() => {
        const pollStatus = async () => {
            try {
                const response = await fetch('/time-clock/status', {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setCurrentStatus(data || {
                        is_clocked_in: false,
                        is_on_break: false,
                        current_work_punch: null,
                        current_break_punch: null,
                        last_punch: null,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch status:', error);
            }
        };

        // Poll every 30 seconds
        const interval = setInterval(pollStatus, 30000);

        return () => clearInterval(interval);
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
            const elapsedMilliseconds = now - clockInTime;
            const elapsedHours = elapsedMilliseconds / (1000 * 60 * 60);

            setLiveWorkingHours(elapsedHours);
        };

        calculateLiveHours();
        const interval = setInterval(calculateLiveHours, 1000);

        return () => clearInterval(interval);
    }, [currentStatus]);

    // Calculate live break duration
    useEffect(() => {
        if (!currentStatus.is_on_break || !currentStatus.current_break_punch) {
            setLiveBreakDuration(0);
            return;
        }

        const calculateBreakDuration = () => {
            const breakPunch = currentStatus.current_break_punch;
            if (!breakPunch) return;

            const breakStart = new Date(breakPunch.clock_in_at).getTime();
            const now = new Date().getTime();
            const elapsedMilliseconds = now - breakStart;
            const elapsedHours = elapsedMilliseconds / (1000 * 60 * 60);

            setLiveBreakDuration(elapsedHours);
        };

        calculateBreakDuration();
        const interval = setInterval(calculateBreakDuration, 1000);

        return () => clearInterval(interval);
    }, [currentStatus]);

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
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

    const handleClockIn = () => {
        router.post('/time-clock/clock-in', {}, {
            preserveScroll: true,
            onSuccess: () => {
                // Refresh status after successful clock in
                fetch('/time-clock/status')
                    .then(response => response.json())
                    .then(data => setCurrentStatus(data || currentStatus))
                    .catch(console.error);
            },
        });
    };

    const handleClockOut = () => {
        router.post('/time-clock/clock-out', {}, {
            preserveScroll: true,
            onSuccess: () => {
                // Refresh status after successful clock out
                fetch('/time-clock/status')
                    .then(response => response.json())
                    .then(data => setCurrentStatus(data || currentStatus))
                    .catch(console.error);
            },
        });
    };

    const handleStartBreak = () => {
        console.log('Break types:', breakTypes); // Debug log

        const lunchBreak = breakTypes.find(bt => bt.label.toLowerCase() === 'lunch break') || (breakTypes.length > 0 ? breakTypes[0] : null);

        if (!lunchBreak) {
            console.error('No break types available:', breakTypes);
            alert("No break types are available. Please contact support.");
            return;
        }

        console.log('Selected break type:', lunchBreak); // Debug log

        router.post('/time-clock/start-break', {
            break_type_id: lunchBreak.id,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // Refresh status after successful break start
                fetch('/time-clock/status')
                    .then(response => response.json())
                    .then(data => setCurrentStatus(data || currentStatus))
                    .catch(console.error);
            },
        });
    };

    const handleEndBreak = () => {
        router.post('/time-clock/end-break', {}, {
            preserveScroll: true,
            onSuccess: () => {
                // Refresh status after successful break end
                fetch('/time-clock/status')
                    .then(response => response.json())
                    .then(data => setCurrentStatus(data || currentStatus))
                    .catch(console.error);
            },
        });
    };

    const canStartBreak = currentStatus.is_clocked_in && !currentStatus.is_on_break;
    const canEndBreak = currentStatus.is_on_break;

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">Time Clock</CardTitle>
                    <div className="text-right">
                        <p className="text-sm font-mono">{formatTime(currentTime)}</p>
                        <Badge
                            variant={currentStatus.is_on_break ? "destructive" : "default"}
                            className="text-xs"
                        >
                            {currentStatus.is_on_break ? "On Break" :
                                currentStatus.is_clocked_in ? "Working" :
                                    "Clocked Out"}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Action Buttons */}
                <div className="space-y-2">
                    {!currentStatus.is_clocked_in && !currentStatus.is_on_break ? (
                        <Button
                            onClick={handleClockIn}
                            className="bg-green-600 hover:bg-green-700 w-full"
                            size="sm"
                        >
                            <Clock className="w-4 h-4 mr-2" />
                            Clock In
                        </Button>
                    ) : (
                        <Button
                            onClick={handleClockOut}
                            variant="destructive"
                            className="w-full"
                            size="sm"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Clock Out
                        </Button>
                    )}

                    {canStartBreak && (
                        <Button
                            onClick={handleStartBreak}
                            variant="outline"
                            size="sm"
                            className="w-full"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Start Lunch Break
                        </Button>
                    )}

                    {canEndBreak && (
                        <Button
                            onClick={handleEndBreak}
                            className="bg-orange-600 hover:bg-orange-700 w-full"
                            size="sm"
                        >
                            <Pause className="w-4 h-4 mr-2" />
                            End Break
                        </Button>
                    )}
                </div>

                {/* Current Status Display */}
                {currentStatus.is_clocked_in && currentStatus.current_work_punch && (
                    <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs text-muted-foreground">Clock In</p>
                                <p className="font-semibold">
                                    {formatTime(new Date(currentStatus.current_work_punch.clock_in_at))}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Working Hours</p>
                                <p className="font-semibold">
                                    {formatHours(liveWorkingHours)}
                                </p>
                            </div>
                        </div>

                        {currentStatus.is_on_break && currentStatus.current_break_punch && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Timer className="w-4 h-4 text-orange-600" />
                                    <p className="text-sm font-medium text-orange-800">
                                        {currentStatus.current_break_punch.breakType?.label || 'Break'} in Progress
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-xs text-orange-600">Break Started</p>
                                        <p className="font-semibold text-orange-800">
                                            {formatTime(new Date(currentStatus.current_break_punch.clock_in_at))}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-orange-600">Duration</p>
                                        <p className="font-semibold text-orange-800">
                                            {formatBreakDuration(liveBreakDuration)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {!currentStatus.is_clocked_in && (
                    <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                            Welcome back{User?.first_name ? `, ${User.first_name}` : ''}!
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Click "Clock In" to start tracking time
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
