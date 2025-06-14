import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Calendar, ChevronLeft, ChevronRight, Clock, FileText, Loader2, Plus, Save, Trash2, Users, X } from 'lucide-react';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import DepartmentPtoCalendar from "@/components/DepartmentPtoCalendar";

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

interface DashboardData {
    pto_data: Array<{
        policy: any;
        balance: number;
        pending_balance: number;
        available_balance: number;
        pto_type: PtoType;
        can_request: boolean;
        has_balance_record: boolean;
    }>;
    recent_requests: PtoRequest[];
    pending_requests_count: number;
    user: {
        id: number;
        name: string;
        email: string;
    };
    department_pto_requests: DepartmentPtoRequest[];
}

interface DayOption {
    date: Date;
    type: 'full' | 'half';
}

interface RequestFormData {
    pto_type_id: string;
    start_date: string;
    end_date: string;
    reason: string;
}

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    ptoRequests: DepartmentPtoRequest[];
}

const initialFormData: RequestFormData = {
    pto_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
};

export default function UserPtoDashboard() {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [ptoTypes, setPtoTypes] = useState<PtoType[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cancelling, setCancelling] = useState<number | null>(null);

    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

    // Request form state
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [formData, setFormData] = useState<RequestFormData>(initialFormData);
    const [requestedDays, setRequestedDays] = useState<number | null>(null);
    const [dayOptions, setDayOptions] = useState<DayOption[]>([]);

    // Fetch dashboard data
    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);

            const [dashboardResponse, summaryResponse] = await Promise.all([
                axios.get('/api/user-pto/dashboard'),
                axios.get('/api/user-pto/summary'),
            ]);

            setDashboardData(dashboardResponse.data.data);
            setPtoTypes(summaryResponse.data.data.pto_types);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load PTO data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Generate calendar days when current date or department PTO requests change
    useEffect(() => {
        if (dashboardData?.department_pto_requests) {
            generateCalendarDays();
        }
    }, [currentDate, dashboardData?.department_pto_requests]);

    // Generate calendar days
    const generateCalendarDays = useCallback(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);

        // First day to show (might be from previous month)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Last day to show (might be from next month)
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

        const days: CalendarDay[] = [];
        const currentDateLoop = new Date(startDate);
        const today = new Date();

        while (currentDateLoop <= endDate) {
            const isCurrentMonth = currentDateLoop.getMonth() === month;
            const isToday = currentDateLoop.toDateString() === today.toDateString();

            // Find PTO requests for this day
            const ptoRequests =
                dashboardData?.department_pto_requests?.filter((request) => {
                    if (request.status !== 'approved' && request.status !== 'pending') return false;

                    // Add 'T00:00:00' to parse the dates in the user's local timezone,
                    // avoiding off-by-one errors caused by UTC conversion.
                    const requestStart = new Date(request.start_date + 'T00:00:00');
                    const requestEnd = new Date(request.end_date + 'T00:00:00');

                    return currentDateLoop >= requestStart && currentDateLoop <= requestEnd;
                }) || [];

            days.push({
                date: new Date(currentDateLoop),
                isCurrentMonth,
                isToday,
                ptoRequests,
            });

            currentDateLoop.setDate(currentDateLoop.getDate() + 1);
        }

        setCalendarDays(days);
    }, [currentDate, dashboardData?.department_pto_requests]);

    // Navigate calendar
    const navigateMonth = useCallback((direction: 'prev' | 'next') => {
        setCurrentDate((prev) => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    }, []);

    // Go to today
    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    // Debug: Log the dashboard data when it changes
    useEffect(() => {
        if (dashboardData) {
            console.log('Dashboard Data:', dashboardData);
            console.log('PTO Types for request:', ptoTypes);
        }
    }, [dashboardData, ptoTypes]);

    // Calculate business days and generate day options
    const generateDayOptions = useCallback((startDate: string, endDate: string): DayOption[] => {
        // Parse dates properly to avoid timezone issues
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const businessDays: Date[] = [];
        const curDate = new Date(start.getTime());

        // Include the end date in the loop
        while (curDate <= end) {
            const dayOfWeek = curDate.getDay();

            // Skip weekends (0 = Sunday, 6 = Saturday)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                businessDays.push(new Date(curDate.getTime()));
            }
            curDate.setDate(curDate.getDate() + 1);
        }

        // Initialize all days as full days
        return businessDays.map((date) => ({
            date,
            type: 'full' as const,
        }));
    }, []);

    // Update day options and requested days when dates change
    useEffect(() => {
        if (formData.start_date && formData.end_date) {
            const start = new Date(formData.start_date);
            const end = new Date(formData.end_date);

            if (start <= end) {
                const newDayOptions = generateDayOptions(formData.start_date, formData.end_date);
                setDayOptions(newDayOptions);

                // Calculate total days based on full/half day selections
                const totalDays = newDayOptions.reduce((sum, day) => sum + (day.type === 'full' ? 1.0 : 0.5), 0);
                setRequestedDays(totalDays);
            } else {
                setDayOptions([]);
                setRequestedDays(null);
            }
        } else {
            setDayOptions([]);
            setRequestedDays(null);
        }
    }, [formData.start_date, formData.end_date, generateDayOptions]);

    // Handle day option change (full day or half day)
    const handleDayOptionChange = useCallback(
        (date: Date, type: 'full' | 'half') => {
            const updatedOptions = dayOptions.map((option) => {
                if (option.date.getTime() === date.getTime()) {
                    return { ...option, type };
                }
                return option;
            });

            setDayOptions(updatedOptions);

            // Recalculate total days
            const totalDays = updatedOptions.reduce((sum, day) => sum + (day.type === 'full' ? 1.0 : 0.5), 0);
            setRequestedDays(totalDays);
        },
        [dayOptions],
    );

    // Handle form input changes
    const handleChange = useCallback((field: keyof RequestFormData, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    }, []);

    // Handle date input changes with weekend validation
    const handleDateChange = useCallback(
        (field: 'start_date' | 'end_date', value: string) => {
            if (!value) {
                // Allow clearing the date
                handleChange(field, '');
                return;
            }

            // Use T00:00:00 to avoid timezone issues and treat the date as local
            const selectedDate = new Date(value + 'T00:00:00');
            const dayOfWeek = selectedDate.getDay();

            // 0 is Sunday, 6 is Saturday
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                toast.error('Weekends are not valid for PTO requests. Please select a weekday.');
                // Do not update the form state, effectively rejecting the selection
            } else {
                handleChange(field, value);
            }
        },
        [handleChange],
    );

    // Reset form
    const resetForm = useCallback(() => {
        setFormData(initialFormData);
        setRequestedDays(null);
        setDayOptions([]);
        setShowRequestForm(false);
    }, []);

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

    // Get cancellation reason text
    const getCancellationReason = useCallback((request: PtoRequest) => {
        if (request.status === 'pending') {
            return 'Cancel pending request';
        }

        if (request.status === 'approved') {
            const startDateTime = new Date(request.start_date);
            const now = new Date();
            const hoursUntilStart = Math.floor((startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));

            if (hoursUntilStart >= 24) {
                return `Cancel (${hoursUntilStart}h notice)`;
            } else {
                return `Cannot cancel (${hoursUntilStart}h notice)`;
            }
        }

        return 'Cannot cancel';
    }, []);

    const handleCancelRequest = useCallback(
        async (requestId: number) => {
            try {
                setCancelling(requestId);

                await axios.post(`/api/pto-requests/${requestId}/cancel-own`);

                toast.success('PTO request cancelled successfully!');

                // Refresh data
                await fetchDashboardData();
            } catch (error: any) {
                console.error('Error cancelling request:', error);

                if (error.response?.data?.error) {
                    toast.error(error.response.data.error);
                } else {
                    toast.error('Failed to cancel PTO request.');
                }
            } finally {
                setCancelling(null);
            }
        },
        [fetchDashboardData],
    );

    // Handle form submission
    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();

            if (!formData.pto_type_id || !formData.start_date || !formData.end_date) {
                toast.error('Please fill in all required fields.');
                return;
            }

            if (requestedDays === null || requestedDays <= 0) {
                toast.error('Please select valid business days.');
                return;
            }

            // Check balance
            const selectedType = ptoTypes.find((t) => t.id === parseInt(formData.pto_type_id));
            if (selectedType && requestedDays > selectedType.current_balance) {
                toast.error(`You don't have enough PTO balance (${selectedType.current_balance} days available).`);
                return;
            }

            try {
                setSubmitting(true);

                await axios.post('/api/pto-requests', {
                    pto_type_id: parseInt(formData.pto_type_id),
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    start_time: 'full_day',
                    end_time: 'full_day',
                    total_days: requestedDays,
                    reason: formData.reason,
                    day_options: dayOptions.map((option) => ({
                        date: option.date.toISOString().split('T')[0],
                        type: option.type,
                    })),
                });

                toast.success('PTO request submitted successfully!');
                resetForm();
                fetchDashboardData();
            } catch (error: any) {
                console.error('Error submitting request:', error);

                // Show specific validation errors if available
                if (error.response?.data?.errors) {
                    const errorMessages = Object.values(error.response.data.errors).flat().join(', ');
                    toast.error(`Validation errors: ${errorMessages}`);
                } else if (error.response?.data?.error) {
                    toast.error(error.response.data.error);
                } else {
                    toast.error('Failed to submit PTO request.');
                }
            } finally {
                setSubmitting(false);
            }
        },
        [formData, requestedDays, ptoTypes, resetForm, fetchDashboardData],
    );

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

    if (loading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="My PTO" />
                <div className="flex h-full flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </AppLayout>
        );
    }

    if (!dashboardData) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="My PTO" />
                <div className="flex h-full flex-1 items-center justify-center">
                    <p className="text-muted-foreground">Failed to load PTO data.</p>
                </div>
            </AppLayout>
        );
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My PTO" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">My PTO Dashboard</h1>
                    <Button onClick={() => setShowRequestForm(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Request PTO
                    </Button>
                </div>

                {/* PTO Balances */}
                {/* Quick Stats */}
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-yellow-600" />
                                    <div>
                                        <p className="text-sm font-medium">Pending Requests</p>
                                        <p className="text-2xl font-bold">{dashboardData.pending_requests_count}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center space-x-2">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <div>
                                        <p className="text-sm font-medium">Total Requests</p>
                                        <p className="text-2xl font-bold">{dashboardData.recent_requests.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-green-600" />
                                    <div>
                                        <p className="text-sm font-medium">Total PTO Types</p>
                                        <p className="text-2xl font-bold">{dashboardData.pto_data.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                    {dashboardData.pto_data.map((item) => {
                        // Use available balance (total minus pending)
                        const availableDays = item.available_balance !== undefined ? item.available_balance : item.balance;
                        const totalDays = item.balance;
                        const pendingDays = item.pending_balance || 0;

                        return (
                            <Card key={item.pto_type.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium">{item.pto_type.name}</CardTitle>
                                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.pto_type.color }} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="text-2xl font-bold">{availableDays}</div>
                                        <p className="text-muted-foreground text-xs">
                                            days available
                                            {!item.has_balance_record && <span className="ml-1 text-orange-600">(from policy)</span>}
                                        </p>

                                        {pendingDays > 0 && <div className="text-xs text-orange-600">{pendingDays} days pending approval</div>}

                                        {totalDays !== availableDays && <div className="text-muted-foreground text-xs">Total: {totalDays} days</div>}

                                        {item.policy && (
                                            <div className="text-muted-foreground space-y-1 text-xs">
                                                <div>Annual: {item.policy.annual_accrual_amount} days</div>
                                                {item.policy.rollover_enabled && (
                                                    <div>
                                                        Rollover:{' '}
                                                        {item.policy.max_rollover_days ? `${item.policy.max_rollover_days} max` : 'Unlimited'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>


                    {/* Department PTO Calendar */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Department PTO Calendar */}
                    <DepartmentPtoCalendar
                        departmentPtoRequests={dashboardData?.department_pto_requests || []}
                        title="Department PTO Calendar"
                        showHeader={true}
                        maxRequestsPerDay={3}
                        onDateClick={(date, requests) => {
                            console.log('Clicked date:', date, 'Requests:', requests);
                        }}
                    />
                </div>


                {/* Recent Requests */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent PTO Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dashboardData.recent_requests.length === 0 ? (
                            <p className="text-muted-foreground py-8 text-center">No PTO requests yet. Click "Request PTO" to get started.</p>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Request #</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Dates</TableHead>
                                            <TableHead>Days</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Submitted</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dashboardData.recent_requests.map((request) => (
                                            <TableRow key={request.id}>
                                                <TableCell className="font-medium">{request.request_number}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: request.pto_type.color }} />
                                                        {request.pto_type.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                                </TableCell>
                                                <TableCell>{request.total_days}</TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusColor(request.status)}>
                                                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                    </Badge>
                                                    {request.status === 'denied' && request.denial_reason && (
                                                        <div className="mt-1 text-xs text-red-600">{request.denial_reason}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>{formatDate(request.submitted_at)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {canCancelRequest(request) ? (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="text-red-600 hover:text-red-700"
                                                                        disabled={cancelling === request.id}
                                                                        title={getCancellationReason(request)}
                                                                    >
                                                                        {cancelling === request.id ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Cancel PTO Request</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Are you sure you want to cancel this PTO request? This action cannot be
                                                                            undone.
                                                                            <br />
                                                                            <br />
                                                                            <strong>Request #:</strong> {request.request_number}
                                                                            <br />
                                                                            <strong>Type:</strong> {request.pto_type.name}
                                                                            <br />
                                                                            <strong>Status:</strong>{' '}
                                                                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                                            <br />
                                                                            <strong>Dates:</strong> {formatDate(request.start_date)} -{' '}
                                                                            {formatDate(request.end_date)}
                                                                            <br />
                                                                            <strong>Days:</strong> {request.total_days}
                                                                            {request.status === 'approved' && (
                                                                                <>
                                                                                    <br />
                                                                                    <br />
                                                                                    <em>
                                                                                        Note: Cancelling an approved request will return the days to
                                                                                        your balance.
                                                                                    </em>
                                                                                </>
                                                                            )}
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Keep Request</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleCancelRequest(request.id)}
                                                                            className="bg-red-600 hover:bg-red-700"
                                                                        >
                                                                            Cancel Request
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">{getCancellationReason(request)}</span>
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
                                <Select value={formData.pto_type_id} onValueChange={(value) => handleChange('pto_type_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select PTO type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ptoTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
                                                    {type.name} ({type.current_balance} days available)
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">
                                        Start Date <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => handleDateChange('start_date', e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="end_date">
                                        End Date <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="end_date"
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => handleDateChange('end_date', e.target.value)}
                                        min={formData.start_date || new Date().toISOString().split('T')[0]}
                                    />
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
                                    value={formData.reason}
                                    onChange={(e) => handleChange('reason', e.target.value)}
                                    placeholder="Optional reason for your request..."
                                    rows={3}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
