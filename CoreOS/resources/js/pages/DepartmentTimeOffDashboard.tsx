import PtoStatusCards from '@/components/pto/PtoStatusCards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { CheckCircle, Loader2, ThumbsDown, ThumbsUp, X, Users } from 'lucide-react';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Department Time Off Dashboard',
        href: '/department-pto',
    },
];

interface User {
    id: number;
    name: string;
    email: string;
}

interface PtoType {
    id: number;
    name: string;
    code: string;
    color: string;
}

interface PtoRequest {
    id: number;
    request_number: string;
    user: User;
    pto_type: PtoType;
    start_date: string;
    end_date: string;
    total_days: number;
    reason?: string;
    status: 'pending' | 'approved' | 'denied' | 'cancelled';
    submitted_at: string;
    requires_multi_level_approval: boolean;
    approvals: PtoApproval[];
}

interface PtoApproval {
    id: number;
    approver: User;
    status: 'pending' | 'approved' | 'denied';
    comments?: string;
    level: number;
    sequence: number;
    responded_at?: string;
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

interface PageProps {
    requests: PtoRequest[];
    department_pto_requests: DepartmentPtoRequest[];
}

export default function DepartmentTimeOffDashboard({ requests, department_pto_requests }: PageProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Modal state
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PtoRequest | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'deny'>('approve');
    const [comments, setComments] = useState('');

    // Filter state
    const [activeTab, setActiveTab] = useState('pending');
    const [filteredRequests, setFilteredRequests] = useState<PtoRequest[]>([]);

    // Filter requests by tab
    useEffect(() => {
        if (!requests) {
            console.log('No requests data available');
            return;
        }

        console.log('Total requests:', requests.length);
        console.log('Requests data:', requests);

        const filtered = requests.filter((request) => {
            switch (activeTab) {
                case 'pending':
                    return request.status === 'pending' && request.approvals.some((approval) => approval.status === 'pending');
                case 'approved':
                    return request.status === 'approved';
                case 'denied':
                    return request.status === 'denied';
                case 'all':
                default:
                    return true;
            }
        });
        setFilteredRequests(filtered);
    }, [requests, activeTab]);

    // Convert PTO requests to calendar events
    const calendarEvents = useMemo((): CalendarEvent[] => {
        if (!department_pto_requests) return [];

        return department_pto_requests
            .filter((request) => request.status === 'approved' || request.status === 'pending')
            .map((request) => {
                // Parse database dates correctly (they come as YYYY-MM-DD from Laravel)
                const startDate = new Date(request.start_date);
                const endDate = new Date(request.end_date);

                // For React Big Calendar all-day events, end needs to be next day
                const calendarEndDate = new Date(endDate);
                calendarEndDate.setDate(calendarEndDate.getDate() + 1);

                return {
                    id: `pto-${request.id}`,
                    title: `${request.user.name} - ${request.pto_type.code}${request.status === 'pending' ? ' *' : ''}`,
                    start: startDate,
                    end: calendarEndDate,
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

    // Handle approval action
    const handleAction = useCallback((request: PtoRequest, action: 'approve' | 'deny') => {
        setSelectedRequest(request);
        setActionType(action);
        setComments('');
        setShowActionModal(true);
    }, []);

    // Submit approval action
    const submitAction = useCallback(async () => {
        if (!selectedRequest) return;

        if (actionType === 'deny' && !comments.trim()) {
            toast.error('Comments are required when denying a request.');
            return;
        }

        try {
            setSubmitting(true);

            const endpoint =
                actionType === 'approve' ? `/pto-requests/${selectedRequest.id}/approve` : `/pto-requests/${selectedRequest.id}/deny`;

            await axios.post(endpoint, {
                comments: comments.trim(),
            });

            toast.success(`Request ${actionType === 'approve' ? 'approved' : 'denied'} successfully!`);

            // Refresh page to get updated data
            window.location.reload();
        } catch (error: any) {
            console.error('Error processing approval:', error);
            const errorMessage = error.response?.data?.error || `Failed to ${actionType} request.`;
            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    }, [selectedRequest, actionType, comments]);

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

    // Check if current user can act on request
    const canApprove = useCallback((request: PtoRequest) => {
        return request.approvals.some(
            (approval) => approval.status === 'pending', // && approval.approver.id === currentUser.id
        );
    }, []);

    if (loading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="PTO Approvals" />
                <div className="flex h-full flex-1 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PTO Approvals" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Department Time Off Dashboard</h1>
                </div>

                {/* Stats Cards */}
                <PtoStatusCards requests={requests} />

                {/* Request Tabs */}
                <Card>
                    <CardHeader>
                        <CardTitle>PTO Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList>
                                <TabsTrigger value="pending">Pending ({requests.filter((r) => r.status === 'pending').length})</TabsTrigger>
                                <TabsTrigger value="approved">Approved ({requests.filter((r) => r.status === 'approved').length})</TabsTrigger>
                                <TabsTrigger value="denied">Denied ({requests.filter((r) => r.status === 'denied').length})</TabsTrigger>
                                <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
                            </TabsList>

                            <TabsContent value={activeTab} className="mt-4">
                                {filteredRequests.length === 0 ? (
                                    <div className="text-muted-foreground py-8 text-center">
                                        No {activeTab === 'all' ? '' : activeTab} requests found.
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Request #</TableHead>
                                                    <TableHead>Employee</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Dates</TableHead>
                                                    <TableHead>Days</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Approval Chain</TableHead>
                                                    <TableHead>Submitted</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredRequests.map((request) => (
                                                    <TableRow key={request.id}>
                                                        <TableCell className="font-medium">{request.request_number}</TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">{request.user.name}</div>
                                                                <div className="text-muted-foreground text-sm">{request.user.email}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="h-3 w-3 rounded-full"
                                                                    style={{ backgroundColor: request.pto_type.color }}
                                                                />
                                                                {request.pto_type.name}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">
                                                                <div>{formatDate(request.start_date)}</div>
                                                                <div className="text-muted-foreground">to {formatDate(request.end_date)}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{request.total_days}</TableCell>
                                                        <TableCell>
                                                            <Badge className={getStatusColor(request.status)}>
                                                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1">
                                                                {request.approvals.map((approval, index) => (
                                                                    <div key={approval.id} className="flex items-center gap-2 text-xs">
                                                                        <Badge variant="outline" className={getStatusColor(approval.status)}>
                                                                            L{approval.level}
                                                                        </Badge>
                                                                        <span>{approval.approver.name}</span>
                                                                        {approval.status === 'approved' && (
                                                                            <CheckCircle className="h-3 w-3 text-green-600" />
                                                                        )}
                                                                        {approval.status === 'denied' && <X className="h-3 w-3 text-red-600" />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{formatDate(request.submitted_at)}</TableCell>
                                                        <TableCell className="text-right">
                                                            {request.status === 'pending' && canApprove(request) && (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleAction(request, 'approve')}
                                                                        className="text-green-600 hover:text-green-700"
                                                                    >
                                                                        <ThumbsUp className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleAction(request, 'deny')}
                                                                        className="text-red-600 hover:text-red-700"
                                                                    >
                                                                        <ThumbsDown className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
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

                {/* Approval Action Modal */}
                <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{actionType === 'approve' ? 'Approve' : 'Deny'} PTO Request</DialogTitle>
                            <DialogDescription>
                                {selectedRequest && (
                                    <>
                                        {actionType === 'approve' ? 'Approve' : 'Deny'} PTO request from <strong>{selectedRequest.user.name}</strong>{' '}
                                        for <strong>{selectedRequest.total_days} days</strong> from {formatDate(selectedRequest.start_date)} to{' '}
                                        {formatDate(selectedRequest.end_date)}.
                                    </>
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="comments">Comments {actionType === 'deny' && <span className="text-red-500">*</span>}</Label>
                                <Textarea
                                    id="comments"
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder={actionType === 'approve' ? 'Optional comments...' : 'Please provide a reason for denial...'}
                                    rows={3}
                                />
                            </div>

                            {selectedRequest?.reason && (
                                <div className="space-y-2">
                                    <Label>Employee's Reason</Label>
                                    <div className="text-muted-foreground bg-muted rounded p-3 text-sm">{selectedRequest.reason}</div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowActionModal(false)} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={submitAction}
                                disabled={submitting}
                                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                            >
                                {submitting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : actionType === 'approve' ? (
                                    <ThumbsUp className="mr-2 h-4 w-4" />
                                ) : (
                                    <ThumbsDown className="mr-2 h-4 w-4" />
                                )}
                                {actionType === 'approve' ? 'Approve' : 'Deny'} Request
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
