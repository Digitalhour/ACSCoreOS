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
import { Head, router } from '@inertiajs/react';
import { CheckCircle, Loader2, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'PTO Approvals',
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

interface Props {
    requests: PtoRequest[];
}

export default function PtoMangerDashboard({ requests: initialRequests }: Props) {
    const [requests, setRequests] = useState<PtoRequest[]>(initialRequests);
    const [submitting, setSubmitting] = useState(false);

    // Modal state
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PtoRequest | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'deny'>('approve');
    const [comments, setComments] = useState('');

    // Filter state
    const [activeTab, setActiveTab] = useState('pending');
    const [filteredRequests, setFilteredRequests] = useState<PtoRequest[]>([]);

    // Update requests when prop changes
    useEffect(() => {
        setRequests(initialRequests);
    }, [initialRequests]);

    // Filter requests by tab
    useEffect(() => {
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

            const routeName = actionType === 'approve' ? 'pto.requests.approve' : 'pto.requests.deny';

            router.post(
                route(routeName, selectedRequest.id),
                {
                    comments: comments.trim(),
                },
                {
                    onSuccess: () => {
                        toast.success(`Request ${actionType === 'approve' ? 'approved' : 'denied'} successfully!`);
                        setShowActionModal(false);
                        setSelectedRequest(null);
                        setComments('');
                    },
                    onError: (errors) => {
                        const errorMessage = errors.error || `Failed to ${actionType} request.`;
                        toast.error(errorMessage);
                    },
                    onFinish: () => {
                        setSubmitting(false);
                    },
                }
            );
        } catch (error) {
            console.error('Error processing approval:', error);
            toast.error(`Failed to ${actionType} request.`);
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
            (approval) => approval.status === 'pending'
        );
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PTO Approvals" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">PTO Approval Dashboard</h1>
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
                                                                        disabled={submitting}
                                                                    >
                                                                        <ThumbsUp className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleAction(request, 'deny')}
                                                                        className="text-red-600 hover:text-red-700"
                                                                        disabled={submitting}
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
