import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Loader2, Save,  Users, X } from 'lucide-react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const localizer = momentLocalizer(moment);

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'My PTO',
        href: '/pto',
    },
];

interface PtoType {
    id: number;
    name: string;
    description?: string;
    color: string;
    code: string;
    current_balance: number;
    policy: {
        initial_days: number;
        annual_accrual_amount: number;
        rollover_enabled: boolean;
        max_rollover_days?: number;
    };
}

interface PtoRequest {
    id: number;
    request_number: string;
    pto_type: {
        id: number;
        name: string;
        color: string;
        code: string;
    };
    start_date: string;
    end_date: string;
    total_days: number;
    reason?: string;
    status: 'pending' | 'approved' | 'denied' | 'cancelled';
    submitted_at: string;
    created_at: string;
    can_be_cancelled?: boolean;
    cancellation_reason?: string;
    denial_reason?: string;
}

interface DepartmentPtoRequest {
    id: number;
    user: {
        id: number;
        name: string;
    };
    pto_type: {
        id: number;
        name: string;
        color: string;
        code: string;
    };
    start_date: string;
    end_date: string;
    total_days: number;
    status: 'pending' | 'approved' | 'denied' | 'cancelled';
}

interface PtoDataItem {
    policy: any;
    balance: number;
    pending_balance: number;
    available_balance: number;
    pto_type: {
        id: number;
        name: string;
        description?: string;
        color: string;
        code: string;
    };
    can_request: boolean;
    has_balance_record: boolean;
}

interface PageProps {
    pto_data: PtoDataItem[];
    recent_requests: PtoRequest[];
    pending_requests_count: number;
    user: {
        id: number;
        name: string;
        email: string;
    };
    department_pto_requests: DepartmentPtoRequest[];
    pto_types: PtoType[];
    [key: string]: any;
}

interface DayOption {
    date: Date;
    type: 'full' | 'half';
}

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource: {
        user: string;
        type: string;
        status: 'pending' | 'approved' | 'denied' | 'cancelled';
        color: string;
        days: number;
    };
}

// Donut chart component for PTO visualization
const DonutChart = ({ data, size = 120 }: { data: Array<{ label: string; value: number; color: string; description?: string }>, size?: number }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let cumulativePercentage = 0;

    return (
        <div className="flex items-center gap-4">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#f3f4f6"
                        strokeWidth={strokeWidth}
                    />
                    {data.map((segment, index) => {
                        const percentage = (segment.value / total) * 100;
                        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -((cumulativePercentage / 100) * circumference);

                        cumulativePercentage += percentage;

                        return (
                            <circle
                                key={index}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-2xl font-bold">{total}</div>
                        <div className="text-xs text-muted-foreground">days total</div>
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <div>
                            <div className="font-medium">{item.value} days {item.label}</div>
                            {item.description && (
                                <div className="text-xs text-muted-foreground">{item.description}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function EmployeePtoDashboard() {
    const { pto_data, recent_requests, department_pto_requests } = usePage<PageProps>().props;

    // Flash messages


    // Request form state
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [requestedDays, setRequestedDays] = useState<number | null>(null);
    const [dayOptions, setDayOptions] = useState<DayOption[]>([]);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [requestToCancel, setRequestToCancel] = useState<PtoRequest | null>(null);
    // Inertia form for PTO requests
    const { data, setData, post, processing, errors, reset } = useForm({
        pto_type_id: '',
        start_date: '',
        end_date: '',
        reason: '',
        total_days: 0,
        day_options: [] as Array<{ date: string; type: 'full' | 'half' }>,
    });

    // Inertia form for cancellation
    const { post: postCancel, processing: cancelProcessing } = useForm();
    const handleCancelRequest = useCallback((request: PtoRequest) => {
        setRequestToCancel(request);
        setShowCancelDialog(true);
    }, []);

    const confirmCancelRequest = useCallback(() => {
        if (requestToCancel) {
            postCancel(route('pto.requests.cancel', { ptoRequest: requestToCancel.id }), {
                onSuccess: () => {
                    toast.success('PTO request cancelled successfully!');
                    setShowCancelDialog(false);
                    setRequestToCancel(null);
                },
                onError: () => {
                    toast.error('Failed to cancel PTO request.');
                    setShowCancelDialog(false);
                    setRequestToCancel(null);
                },
            });
        }
    }, [postCancel, requestToCancel]);


    // Convert PTO requests to calendar events
    const calendarEvents = useMemo((): CalendarEvent[] => {
        if (!department_pto_requests) return [];

        return department_pto_requests
            .filter((request) => request.status === 'approved' || request.status === 'pending')
            .map((request) => {
                const startDate = moment(request.start_date).hour(12).minute(0).second(0).millisecond(0).toDate();
                const endDate = moment(request.end_date).hour(12).minute(0).second(0).millisecond(0).toDate();

                return {
                    id: `pto-${request.id}`,
                    title: `${request.user.name} - ${request.pto_type.code}${request.status === 'pending' ? ' *' : ''}`,
                    start: startDate,
                    end: endDate,
                    allDay: true,
                    resource: {
                        user: request.user.name,
                        type: request.pto_type.name,
                        status: request.status,
                        color: request.pto_type.color,
                        days: request.total_days,
                    },
                };
            });
    }, [department_pto_requests]);

    // Custom event style
    const eventStyleGetter = useCallback((event: CalendarEvent) => {
        const isPending = event.resource.status === 'pending';

        return {
            style: {
                backgroundColor: isPending ? '#fef3c7' : event.resource.color + '80',
                borderColor: isPending ? '#d97706' : '#22c55e',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: '#333',
                borderRadius: '3px',
                fontSize: '12px',
                padding: '1px 3px',
                lineHeight: '1.2',
            },
        };
    }, []);

    // Custom event component
    const EventComponent = useCallback(({ event }: { event: CalendarEvent }) => (
        <div className="overflow-hidden">
            <div className="truncate font-medium text-xs leading-tight">
                {event.resource.user} - {event.resource.type} {event.resource.status === 'pending' && ' * Pending'}
            </div>
        </div>
    ), []);

    // Calculate business days and generate day options
    const generateDayOptions = useCallback((startDate: string, endDate: string): DayOption[] => {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const businessDays: Date[] = [];
        const curDate = new Date(start.getTime());

        while (curDate <= end) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                businessDays.push(new Date(curDate.getTime()));
            }
            curDate.setDate(curDate.getDate() + 1);
        }

        return businessDays.map((date) => ({
            date,
            type: 'full' as const,
        }));
    }, []);

    // Update day options and requested days when dates change
    useEffect(() => {
        if (data.start_date && data.end_date) {
            const start = new Date(data.start_date);
            const end = new Date(data.end_date);

            if (start <= end) {
                const newDayOptions = generateDayOptions(data.start_date, data.end_date);
                setDayOptions(newDayOptions);

                const totalDays = newDayOptions.reduce((sum, day) => sum + (day.type === 'full' ? 1.0 : 0.5), 0);
                setRequestedDays(totalDays);
                setData('total_days', totalDays);
                setData('day_options', newDayOptions.map(option => ({
                    date: option.date.toISOString().split('T')[0],
                    type: option.type,
                })));
            } else {
                setDayOptions([]);
                setRequestedDays(null);
                setData('total_days', 0);
                setData('day_options', []);
            }
        } else {
            setDayOptions([]);
            setRequestedDays(null);
            setData('total_days', 0);
            setData('day_options', []);
        }
    }, [data.start_date, data.end_date, generateDayOptions, setData]);

    // Handle day option change
    const handleDayOptionChange = useCallback((date: Date, type: 'full' | 'half') => {
        const updatedOptions = dayOptions.map((option) => {
            if (option.date.getTime() === date.getTime()) {
                return { ...option, type };
            }
            return option;
        });

        setDayOptions(updatedOptions);

        const totalDays = updatedOptions.reduce((sum, day) => sum + (day.type === 'full' ? 1.0 : 0.5), 0);
        setRequestedDays(totalDays);
        setData('total_days', totalDays);
        setData('day_options', updatedOptions.map(option => ({
            date: option.date.toISOString().split('T')[0],
            type: option.type,
        })));
    }, [dayOptions, setData]);

    // Handle date input changes with weekend validation
    const handleDateChange = useCallback((field: 'start_date' | 'end_date', value: string) => {
        if (!value) {
            setData(field, '');
            return;
        }

        const selectedDate = new Date(value + 'T00:00:00');
        const dayOfWeek = selectedDate.getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            toast.error('Weekends are not valid for PTO requests. Please select a weekday.');
        } else {
            setData(field, value);
        }
    }, [setData]);

    // Reset form
    const resetForm = useCallback(() => {
        reset();
        setRequestedDays(null);
        setDayOptions([]);
        setShowRequestForm(false);
    }, [reset]);

    // Handle form submission
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();

        if (!data.pto_type_id || !data.start_date || !data.end_date) {
            toast.error('Please fill in all required fields.');
            return;
        }

        if (requestedDays === null || requestedDays <= 0) {
            toast.error('Please select valid business days.');
            return;
        }

        // Check balance
        const selectedType = pto_data.find((item) => item.pto_type.id === parseInt(data.pto_type_id));
        if (selectedType && requestedDays > selectedType.available_balance) {
            toast.error(`You don't have enough PTO balance (${selectedType.available_balance} days available).`);
            return;
        }

        post(route('pto.requests.store'), {
            onSuccess: () => {
                resetForm();
                toast.success('PTO request submitted successfully!');
            },
            onError: () => {
                toast.error('Failed to submit PTO request.');
            },
        });
    }, [data, requestedDays, pto_data, post, resetForm]);



    // Helper function to check if request can be cancelled
    const canCancelRequest = useCallback((request: PtoRequest) => {
        if (request.status === 'pending') {
            return true;
        }

        if (request.status === 'approved') {
            const startDateTime = new Date(request.start_date);
            const now = new Date();
            const hoursUntilStart = (startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            return hoursUntilStart >= 24;
        }

        return false;
    }, []);

    // Format date
    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }, []);

    // Get status color
    const getStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'denied':
                return 'bg-red-100 text-red-800';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    }, []);

    const getApprovedDaysForType = useCallback((ptoTypeId: number) => {
        return recent_requests
            .filter(request =>
                request.pto_type.id === ptoTypeId &&
                request.status === 'approved'
            )
            .reduce((total, request) => total + request.total_days, 0);
    }, [recent_requests]);

    // Prepare donut chart data for each PTO type
    const getPtoChartData = (ptoItem: PtoDataItem) => {
        const totalBalance = ptoItem.balance;
        const pendingBalance = ptoItem.pending_balance || 0;
        const usedBalance = totalBalance - ptoItem.available_balance - pendingBalance;
        const remainingBalance = ptoItem.available_balance;
        const approvedDays = getApprovedDaysForType(ptoItem.pto_type.id);

        const data = [];
        if (approvedDays > 0) {
            data.push({
                label: 'approved',
                value: approvedDays,
                color: 'rgba(40,40,40,0.38)',
                description: `${approvedDays} days approved`
            });
        }

        if (usedBalance > 0) {
            data.push({
                label: 'taken',
                value: usedBalance,
                color: '#ef4444',
                description: `${usedBalance} days taken`
            });
        }

        if (pendingBalance > 0) {
            data.push({
                label: 'scheduled',
                value: pendingBalance,
                color: '#f59e0b',
                description: `${pendingBalance} days scheduled`
            });
        }

        if (remainingBalance > 0) {
            data.push({
                label: 'remaining',
                value: remainingBalance,
                color: ptoItem.pto_type.color,
                description: `${remainingBalance} days remaining`
            });
        }

        return data;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PTO Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-600">PTO Dashboard</h1>
                    <Button onClick={() => setShowRequestForm(true)} className="gap-2 bg-green-600 hover:bg-green-700">
                        Request Time Off
                    </Button>
                </div>

                {/* Time Off Policy Overview */}
                <div className="flex flex-col w-sm gap-2 justify-between">
                    {pto_data.map((item) => (
                        <Card key={item.pto_type.id}>
                            <CardHeader className="pb-4">
                                <div className="flex justify-between gap-2">
                                    <CardTitle className="text-gray-600">Your Time Off Overview</CardTitle>
                                    <Badge variant="outline" style={{ backgroundColor: item.pto_type.color }}>
                                        <p className="text-md font-semibold text-gray-700 uppercase">{item.pto_type.name}</p>
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col">
                                <div>
                                    <div className="space-y-4">
                                        <DonutChart data={getPtoChartData(item)} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Upcoming Requests */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-gray-600">Upcoming Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500">
                                    <div>Date</div>
                                    <div>Type</div>
                                    <div>Status</div>
                                    <div>Action</div>
                                </div>
                                {recent_requests
                                    .filter(request => request.status === 'approved' || request.status === 'pending')
                                    .slice(0, 5)
                                    .map((request) => {
                                        const canCancel = canCancelRequest(request);
                                        const startDateTime = new Date(request.start_date);
                                        const now = new Date();
                                        const hoursUntilStart = (startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                                        return (
                                            <div key={request.id} className="grid grid-cols-4 gap-4 items-center py-2 border-b last:border-b-0">
                                                <div className="text-blue-500 text-sm">
                                                    {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: request.pto_type.color }} />
                                                    <span className="text-xs">{request.pto_type.code}</span>
                                                </div>
                                                <div>
                                                    <Badge className={getStatusColor(request.status)}>
                                                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {canCancel ? (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleCancelRequest(request)}
                                                            disabled={cancelProcessing}
                                                            className="text-xs px-2 py-1 h-auto"
                                                        >
                                                            {cancelProcessing ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <X className="h-3 w-3" />
                                                            )}
                                                            Cancel
                                                        </Button>
                                                    ) : (
                                                        <div className="text-xs text-gray-500">
                                                            {request.status === 'approved' && hoursUntilStart < 24
                                                                ? `Cannot cancel (${Math.ceil(hoursUntilStart)}h left)`
                                                                : request.status === 'denied' || request.status === 'cancelled'
                                                                    ? 'Not cancellable'
                                                                    : ''
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                {recent_requests.filter(r => r.status === 'approved' || r.status === 'pending').length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No upcoming requests
                                    </div>
                                )}
                            </div>
                        </CardContent>

                    </Card>
                    <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Cancel PTO Request</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to cancel this PTO request?
                                </DialogDescription>
                                {requestToCancel && requestToCancel.pto_type && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                        <div className="text-sm">
                                            <div><strong>Date:</strong> {formatDate(requestToCancel.start_date)} - {formatDate(requestToCancel.end_date)}</div>
                                            <div><strong>Type:</strong> {requestToCancel.pto_type.name}</div>
                                            <div><strong>Days:</strong> {requestToCancel.total_days}</div>
                                            <div><strong>Status:</strong> {requestToCancel.status}</div>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-2 text-sm text-gray-600">
                                    This action cannot be undone. The days will be returned to your balance.
                                </div>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCancelDialog(false)}
                                    disabled={cancelProcessing}
                                >
                                    Keep Request
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={confirmCancelRequest}
                                    disabled={cancelProcessing}
                                >
                                    {cancelProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Cancelling...
                                        </>
                                    ) : (
                                        <>
                                            <X className="mr-2 h-4 w-4" />
                                            Cancel Request
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Company Holidays */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-gray-600">2025 Company Holidays</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-500">
                                    <div>Date</div>
                                    <div>Holiday</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 items-center py-2 border-b">
                                    <div>01/01/2025</div>
                                    <div>New Year's Day</div>
                                </div>
                                <div className="text-center py-8 text-gray-500">
                                    More holidays will be added here
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Taken Time Off */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-600">Taken Time Off</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-500">
                                <div>Date</div>
                                <div>Type</div>
                                <div>Days</div>
                            </div>
                            {recent_requests
                                .filter(request => request.status === 'approved')
                                .slice(0, 5)
                                .map((request) => (
                                    <div key={request.id} className="grid grid-cols-3 gap-4 items-center py-2 border-b last:border-b-0">
                                        <div className="text-blue-500">
                                            {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: request.pto_type.color }} />
                                            {request.pto_type.name}
                                        </div>
                                        <div>{request.total_days}</div>
                                    </div>
                                ))}
                            {recent_requests.filter(r => r.status === 'approved').length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    No time off taken yet
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Department PTO Calendar */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            <CardTitle>Department PTO Calendar</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className='h-dvh'>
                            <Calendar
                                localizer={localizer}
                                events={calendarEvents}
                                startAccessor="start"
                                endAccessor="end"
                                titleAccessor="title"
                                allDayAccessor="allDay"
                                views={['month', 'week', 'day']}
                                defaultView={Views.MONTH}
                                eventPropGetter={eventStyleGetter}
                                components={{
                                    event: EventComponent,
                                }}
                                popup
                                showMultiDayTimes
                                step={60}
                                showAllEvents
                                onSelectEvent={(event) => {
                                    toast.info(
                                        `${event.resource.user} - ${event.resource.type} (${event.resource.status}) - ${event.resource.days} days`
                                    );
                                }}
                            />
                        </div>

                        {/* Legend */}
                        <div className="mt-4 border-t pt-4">
                            <div className="text-muted-foreground mb-2 text-sm">Legend:</div>
                            <div className="flex flex-wrap gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                    <div className="h-3 w-3 border-2 border-orange-600 bg-yellow-200"></div>
                                    <span>Pending (*)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="h-3 w-3 border-2 border-green-500 bg-green-200"></div>
                                    <span>Approved</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Request PTO Dialog */}
                <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
                    <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Request PTO</DialogTitle>
                            <DialogDescription>Submit a new paid time off request.</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="pto_type_id">
                                    PTO Type <span className="text-red-500">*</span>
                                </Label>
                                <Select value={data.pto_type_id} onValueChange={(value) => setData('pto_type_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select PTO type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pto_data.map((item) => (
                                            <SelectItem key={item.pto_type.id} value={item.pto_type.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.pto_type.color }} />
                                                    {item.pto_type.name} ({item.available_balance} days available)
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.pto_type_id && <div className="text-red-500 text-sm">{errors.pto_type_id}</div>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">
                                        Start Date <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={data.start_date}
                                        onChange={(e) => handleDateChange('start_date', e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    {errors.start_date && <div className="text-red-500 text-sm">{errors.start_date}</div>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="end_date">
                                        End Date <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="end_date"
                                        type="date"
                                        value={data.end_date}
                                        onChange={(e) => handleDateChange('end_date', e.target.value)}
                                        min={data.start_date || new Date().toISOString().split('T')[0]}
                                    />
                                    {errors.end_date && <div className="text-red-500 text-sm">{errors.end_date}</div>}
                                </div>
                            </div>

                            {requestedDays !== null && (
                                <div className="rounded-md bg-gray-50 p-3">
                                    <p className="text-sm">
                                        <strong>Business days requested:</strong> {requestedDays}
                                        {requestedDays !== Math.floor(requestedDays) && (
                                            <span className="text-muted-foreground ml-1">(includes half days)</span>
                                        )}
                                    </p>
                                </div>
                            )}

                            {/* Day Options */}
                            {dayOptions.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Day Options</Label>
                                    <div className="max-h-60 space-y-3 overflow-y-auto rounded-md border p-4">
                                        {dayOptions.map((dayOption, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="text-sm font-medium">
                                                    {dayOption.date.toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </div>
                                                <div className="flex space-x-4">
                                                    <label className="flex items-center text-sm">
                                                        <input
                                                            type="radio"
                                                            name={`day-option-${index}`}
                                                            checked={dayOption.type === 'full'}
                                                            onChange={() => handleDayOptionChange(dayOption.date, 'full')}
                                                            className="mr-2"
                                                        />
                                                        Full Day (-1.0)
                                                    </label>
                                                    <label className="flex items-center text-sm">
                                                        <input
                                                            type="radio"
                                                            name={`day-option-${index}`}
                                                            checked={dayOption.type === 'half'}
                                                            onChange={() => handleDayOptionChange(dayOption.date, 'half')}
                                                            className="mr-2"
                                                        />
                                                        Half Day (-0.5)
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="reason">Reason (Optional)</Label>
                                <Textarea
                                    id="reason"
                                    value={data.reason}
                                    onChange={(e) => setData('reason', e.target.value)}
                                    placeholder="Optional reason for your request..."
                                    rows={3}
                                />
                                {errors.reason && <div className="text-red-500 text-sm">{errors.reason}</div>}
                            </div>

                            {errors.total_days && <div className="text-red-500 text-sm">{errors.total_days}</div>}

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={resetForm} disabled={processing}>
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Submit Request
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
