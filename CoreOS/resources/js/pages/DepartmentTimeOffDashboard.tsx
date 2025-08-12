import PtoStatusCards from '@/components/pto/PtoStatusCards';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Textarea} from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, useForm} from '@inertiajs/react';
import {AlertTriangle, CheckCircle, Loader2, Shield, ThumbsDown, ThumbsUp, Users, X} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';
import {Calendar, momentLocalizer, Views} from 'react-big-calendar';
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
    // New blackout-related fields
    has_blackout_conflicts?: boolean;
    has_blackout_warnings?: boolean;
    has_emergency_override?: boolean;
    override_approved?: boolean;
    // New field for current user approval capability
    current_user_can_approve?: boolean;
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
    // Modal state
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PtoRequest | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'deny'>('approve');

    // Filter state
    const [activeTab, setActiveTab] = useState('pending');
    const [filteredRequests, setFilteredRequests] = useState<PtoRequest[]>([]);

    // Inertia forms
    const { data: actionData, setData: setActionData, post: postAction, processing: actionProcessing, reset: resetAction } = useForm({
        comments: '',
    });

    const { post: postOverride, processing: overrideProcessing, setData: setOverrideData } = useForm({
        approved: false as boolean,
        reason: '',
    });

    // Filter requests by tab
    useEffect(() => {
        if (!requests) {
            console.log('No requests data available');
            return;
        }

        const filtered = requests.filter((request) => {
            switch (activeTab) {
                case 'pending':
                    // Show all pending requests regardless of approval chain
                    return request.status === 'pending';
                case 'approved':
                    return request.status === 'approved';
                case 'denied':
                    return request.status === 'denied';
                case 'blackout_issues':
                    return request.has_blackout_conflicts || request.has_blackout_warnings;
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
                const startDate = new Date(request.start_date);
                const endDate = new Date(request.end_date);
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
        resetAction();
        setShowActionModal(true);
    }, [resetAction]);

    // Submit approval action using Inertia - following the new pattern
    const submitAction = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedRequest) return;

        if (actionType === 'deny' && !actionData.comments.trim()) {
            toast.error('Comments are required when denying a request.');
            return;
        }

        if (actionType === 'approve') {
            postAction(route('departments.pto.approve', selectedRequest.id), {
                onSuccess: () => {
                    toast.success('Request approved successfully!');
                    setShowActionModal(false);
                    resetAction();
                },
                onError: (errors) => {
                    const errorMessage = Object.values(errors)[0] as string || 'Failed to approve request.';
                    toast.error(errorMessage);
                },
            });
        } else {
            postAction(route('departments.pto.deny', selectedRequest.id), {
                onSuccess: () => {
                    toast.success('Request denied successfully!');
                    setShowActionModal(false);
                    resetAction();
                },
                onError: (errors) => {
                    const errorMessage = Object.values(errors)[0] as string || 'Failed to deny request.';
                    toast.error(errorMessage);
                },
            });
        }
    };

    // Handle emergency override approval using Inertia
    const handleOverrideApproval = useCallback((request: PtoRequest, approved: boolean) => {
        setOverrideData({
            approved,
            reason: approved ? 'Override approved by manager' : 'Override denied by manager'
        });

        postOverride(route('departments.pto.approve-override', request.id), {
            onSuccess: () => {
                toast.success(`Emergency override ${approved ? 'approved' : 'denied'} successfully!`);
            },
            onError: (errors) => {
                const errorMessage = Object.values(errors)[0] as string || 'Failed to process emergency override';
                toast.error(errorMessage);
            },
        });
    }, [postOverride, setOverrideData]);

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

    // Check if current user can act on request - updated logic
    const canApprove = useCallback((request: PtoRequest) => {
        // Use the backend-provided flag if available
        if (request.current_user_can_approve !== undefined) {
            return request.current_user_can_approve;
        }

        // Fallback to checking approvals array
        return request.status === 'pending' && request.approvals.some(
            (approval) => approval.status === 'pending'
        );
    }, []);

    // Get blackout status indicator
    const getBlackoutStatusIndicator = useCallback((request: PtoRequest) => {
        if (request.has_blackout_conflicts) {
            return (
                <div className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-xs">Conflicts</span>
                    {request.has_emergency_override && (
                        <Shield className="h-3 w-3"  />
                    )}
                </div>
            );
        }

        if (request.has_blackout_warnings) {
            return (
                <div className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-xs">Warnings</span>
                </div>
            );
        }

        return null;
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Department PTO Dashboard" />

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
                                <TabsTrigger value="pending">
                                    Pending ({requests.filter((r) => r.status === 'pending').length})
                                </TabsTrigger>
                                <TabsTrigger value="approved">
                                    Approved ({requests.filter((r) => r.status === 'approved').length})
                                </TabsTrigger>
                                <TabsTrigger value="denied">
                                    Denied ({requests.filter((r) => r.status === 'denied').length})
                                </TabsTrigger>
                                <TabsTrigger value="blackout_issues" className="text-orange-600">
                                    Blackout Issues ({requests.filter((r) => r.has_blackout_conflicts || r.has_blackout_warnings).length})
                                </TabsTrigger>
                                <TabsTrigger value="all">
                                    All ({requests.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value={activeTab} className="mt-4">
                                {filteredRequests.length === 0 ? (
                                    <div className="text-muted-foreground py-8 text-center">
                                        No {activeTab === 'all' ? '' : activeTab.replace('_', ' ')} requests found.
                                    </div>
                                ) : (
                                    <div className="rounded-md border overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request #</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blackout</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Chain</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredRequests.map((request) => (
                                                <tr key={request.id}>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {request.request_number}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <div>
                                                            <div className="font-medium">{request.user.name}</div>
                                                            <div className="text-gray-500 text-xs">{request.user.email}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="h-3 w-3 rounded-full"
                                                                style={{ backgroundColor: request.pto_type.color }}
                                                            />
                                                            {request.pto_type.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <div>
                                                            <div>{formatDate(request.start_date)}</div>
                                                            <div className="text-gray-500 text-xs">to {formatDate(request.end_date)}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {request.total_days}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <Badge className={getStatusColor(request.status)}>
                                                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {getBlackoutStatusIndicator(request)}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="flex flex-col gap-1">
                                                            {request.approvals.map((approval) => (
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
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatDate(request.submitted_at)}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="space-y-2">
                                                            {canApprove(request) && (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleAction(request, 'approve')}
                                                                        className="text-green-600 hover:text-green-700"
                                                                        disabled={actionProcessing}
                                                                    >
                                                                        <ThumbsUp className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleAction(request, 'deny')}
                                                                        className="text-red-600 hover:text-red-700"
                                                                        disabled={actionProcessing}
                                                                    >
                                                                        <ThumbsDown className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )}

                                                            {request.has_emergency_override && !request.override_approved && (
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <Badge variant="outline" className="text-xs text-orange-600 whitespace-nowrap">
                                                                        Emergency Override Pending
                                                                    </Badge>
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleOverrideApproval(request, true)}
                                                                            className="text-green-600 hover:text-green-700 text-xs px-2 py-1"
                                                                            disabled={overrideProcessing}
                                                                        >
                                                                            {overrideProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleOverrideApproval(request, false)}
                                                                            className="text-red-600 hover:text-red-700 text-xs px-2 py-1"
                                                                            disabled={overrideProcessing}
                                                                        >
                                                                            {overrideProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Deny'}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
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
                                <div className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 text-red-500" />
                                    <span>Blackout Conflicts</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                    <span>Blackout Warnings</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Shield className="h-3 w-3 text-orange-500" />
                                    <span>Emergency Override</span>
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

                        <form onSubmit={submitAction}>
                            <div className="space-y-4">
                                {/* Show blackout warning if present */}
                                {selectedRequest && (selectedRequest.has_blackout_conflicts || selectedRequest.has_blackout_warnings) && (
                                    <div className="bg-amber-50 border border-amber-200 rounded p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            <span className="text-sm font-medium text-amber-800">Blackout Period Notice</span>
                                        </div>
                                        <p className="text-sm text-amber-700">
                                            This request {selectedRequest.has_blackout_conflicts ? 'conflicts with' : 'has warnings for'} blackout periods.
                                            {selectedRequest.has_emergency_override ? ' Employee has requested emergency override.' : ''}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="comments">Comments {actionType === 'deny' && <span className="text-red-500">*</span>}</Label>
                                    <Textarea
                                        id="comments"
                                        value={actionData.comments}
                                        onChange={(e) => setActionData('comments', e.target.value)}
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

                            <DialogFooter className="mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowActionModal(false)}
                                    disabled={actionProcessing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={actionProcessing}
                                    className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                                >
                                    {actionProcessing ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : actionType === 'approve' ? (
                                        <ThumbsUp className="mr-2 h-4 w-4" />
                                    ) : (
                                        <ThumbsDown className="mr-2 h-4 w-4" />
                                    )}
                                    {actionType === 'approve' ? 'Approve' : 'Deny'} Request
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
