import HistoricalPtoModal from '@/components/HistoricalPtoModal';
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
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Textarea} from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router, useForm, usePage} from '@inertiajs/react';
import {Calendar, CheckCircle, Clock, Download, Eye, Filter, Loader2, X, XCircle} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {toast} from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'PTO Dashboard',
        href: '/admin/pto',
    },
    {
        title: 'ADMIN PTO REQUESTS VIEW',
        href: '/admin/pto-requests',
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

interface PtoApproval {
    id: number;
    approver: User;
    status: 'pending' | 'approved' | 'denied';
    comments?: string;
    responded_at?: string;
}

interface PtoRequest {
    id: number;
    request_number: string;
    user: User;
    pto_type: PtoType;
    start_date: string;
    end_date: string;
    start_time: 'full_day' | 'morning' | 'afternoon';
    end_time: 'full_day' | 'morning' | 'afternoon';
    total_days: number;
    reason?: string;
    status: 'pending' | 'approved' | 'denied' | 'cancelled' | 'withdrawn';
    denial_reason?: string;
    submitted_at: string;
    approved_at?: string;
    denied_at?: string;
    approved_by?: { name: string };
    denied_by?: { name: string };
    approvals: PtoApproval[];
}

interface PaginatedData {
    data: PtoRequest[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface PageProps {
    [key: string]: any;
    title: string;
    ptoRequests: PaginatedData;
    users: User[];
    allPtoTypes: PtoType[];
    filteredPtoTypes: PtoType[];
    filters: {
        search?: string;
        status?: string;
        pto_type?: string;
        user?: string;
        pending_only?: boolean;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function AdminPtoRequestsView() {
    const { ptoRequests, users, allPtoTypes, filteredPtoTypes, filters, flash } = usePage<PageProps>().props;

    const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState<boolean>(false);

    const {
        data: filterData,
        setData: setFilterData,
        processing: filterProcessing,
    } = useForm({
        search: filters.search || '',
        status: filters.status || '',
        pto_type: filters.pto_type || '',
        user: filters.user || '',
        pending_only: filters.pending_only || false,
    });

    const {
        data: approvalData,
        setData: setApprovalData,
        post: approvalPost,
        processing: approvalProcessing,
        reset: approvalReset,
    } = useForm({
        comments: '',
    });

    const {
        data: denialData,
        setData: setDenialData,
        post: denialPost,
        processing: denialProcessing,
        reset: denialReset,
    } = useForm({
        comments: '',
    });

    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showDenialModal, setShowDenialModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PtoRequest | null>(null);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleFilterChange = useCallback(
        (field: keyof typeof filterData, value: any) => {
            const formValue = value === undefined ? '' : value;
            setFilterData(field, formValue);

            if (field === 'user') {
                setFilterData('pto_type', '');
            }

            setTimeout(() => {
                router.get(
                    '/admin/pto-requests',
                    {
                        ...filterData,
                        [field]: formValue,
                        ...(field === 'user' ? { pto_type: '' } : {}),
                    },
                    {
                        preserveState: true,
                        preserveScroll: true,
                    },
                );
            }, 300);
        },
        [filterData, setFilterData],
    );

    const clearFilters = useCallback(() => {
        router.get(
            '/admin/pto-requests',
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    }, []);

    const handleHistoricalPtoSuccess = () => {
        toast.success('Historical PTO submitted successfully');
        setIsHistoricalModalOpen(false);
        router.reload({ only: ['ptoRequests'] });
    };

    const handleApprove = useCallback(
        (request: PtoRequest) => {
            setSelectedRequest(request);
            approvalReset();
            setShowApprovalModal(true);
        },
        [approvalReset],
    );

    const handleDeny = useCallback(
        (request: PtoRequest) => {
            setSelectedRequest(request);
            denialReset();
            setShowDenialModal(true);
        },
        [denialReset],
    );

    const submitApproval = useCallback(() => {
        if (!selectedRequest) return;

        approvalPost(`/admin/pto-requests/${selectedRequest.id}/approve`, {
            onSuccess: () => {
                setShowApprovalModal(false);
                approvalReset();
            },
        });
    }, [selectedRequest, approvalPost, approvalReset]);

    const submitDenial = useCallback(() => {
        if (!selectedRequest) return;

        denialPost(`/admin/pto-requests/${selectedRequest.id}/deny`, {
            onSuccess: () => {
                setShowDenialModal(false);
                denialReset();
            },
        });
    }, [selectedRequest, denialPost, denialReset]);

    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }, []);

    const getStatusBadge = (status: string) => {
        const variants: { [key: string]: string } = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            denied: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800',
            withdrawn: 'bg-gray-100 text-gray-800',
        };
        return <Badge className={variants[status] || variants.pending}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'denied':
                return <XCircle className="h-4 w-4 text-red-600" />;
            case 'cancelled':
            case 'withdrawn':
                return <X className="h-4 w-4 text-gray-600" />;
            default:
                return <Clock className="h-4 w-4 text-yellow-600" />;
        }
    };

    const getApprovalStatusIcon = (status: PtoApproval['status']) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />;
            case 'pending':
                return <Clock className="h-4 w-4 flex-shrink-0 text-yellow-500" />;
            case 'denied':
                return <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />;
            default:
                return null;
        }
    };

    const handlePageChange = (page: number) => {
        router.get(
            '/admin/pto-requests',
            {
                ...filterData,
                page,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const pendingCount = ptoRequests.data.filter((r) => r.status === 'pending').length;
    const hasActiveFilters = filterData.search || filterData.status || filterData.pto_type || filterData.user || filterData.pending_only;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage PTO Requests" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Manage PTO Requests</h1>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setIsHistoricalModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                            <Calendar className="mr-2 h-4 w-4" />
                            Submit Historical PTO
                        </Button>
                        <Button variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">{/* Filters remain the same */}</CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            PTO Requests ({ptoRequests.total})
                            {pendingCount > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {pendingCount} pending
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filterProcessing ? (
                            <div className="flex items-center justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : ptoRequests.data.length === 0 ? (
                            <div className="text-muted-foreground p-8 text-center">
                                {hasActiveFilters ? 'No requests match your filters.' : 'No PTO requests found.'}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Request #</TableHead>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>PTO Type</TableHead>
                                                <TableHead>Dates</TableHead>
                                                <TableHead>Status</TableHead>
                                                {/* MODIFIED COLUMN */}
                                                <TableHead>Approvers</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ptoRequests.data.map((request) => (
                                                <TableRow key={request.id}>
                                                    <TableCell className="font-mono text-sm">{request.request_number}</TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{request.user.name}</div>
                                                            <div className="text-muted-foreground text-sm">{request.user.email}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="h-3 w-3 rounded border"
                                                                style={{ backgroundColor: request.pto_type.color }}
                                                            />
                                                            <span>{request.pto_type.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            <div>{formatDate(request.start_date)}</div>
                                                            <div className="text-muted-foreground">to {formatDate(request.end_date)}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(request.status)}
                                                            {getStatusBadge(request.status)}
                                                        </div>
                                                    </TableCell>
                                                    {/* MODIFIED CELL */}
                                                    <TableCell>
                                                        {request.approvals && request.approvals.length > 0 ? (
                                                            <div className="flex flex-col space-y-1">
                                                                {request.approvals.map((approval) => (
                                                                    <div key={approval.id} className="flex items-center gap-2 text-sm">
                                                                        {getApprovalStatusIcon(approval.status)}
                                                                        <span className="truncate">{approval.approver.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {request.status === 'pending' && (
                                                                <>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleApprove(request)}
                                                                        className="text-green-600 hover:text-green-700"
                                                                    >
                                                                        Approve
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleDeny(request)}
                                                                        className="text-red-600 hover:text-red-700"
                                                                    >
                                                                        Deny
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <Button variant="ghost" size="sm">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {/* Pagination remains the same */}
                                {ptoRequests.last_page > 1 && (
                                    <div className="flex items-center justify-between">
                                        <div className="text-muted-foreground text-sm">
                                            Showing {ptoRequests.from} to {ptoRequests.to} of {ptoRequests.total} requests
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(ptoRequests.current_page - 1)}
                                                disabled={ptoRequests.current_page === 1}
                                            >
                                                Previous
                                            </Button>
                                            <span className="text-sm">
                                                Page {ptoRequests.current_page} of {ptoRequests.last_page}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(ptoRequests.current_page + 1)}
                                                disabled={ptoRequests.current_page === ptoRequests.last_page}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Approve PTO Request</DialogTitle>
                            <DialogDescription>Are you sure you want to approve this PTO request?</DialogDescription>
                        </DialogHeader>
                        {selectedRequest && (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <strong>Employee:</strong> {selectedRequest.user.name}
                                        </div>
                                        <div>
                                            <strong>PTO Type:</strong> {selectedRequest.pto_type.name}
                                        </div>
                                        <div>
                                            <strong>Dates:</strong> {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
                                        </div>
                                        <div>
                                            <strong>Days:</strong> {selectedRequest.total_days}
                                        </div>
                                        {selectedRequest.reason && (
                                            <div className="col-span-2">
                                                <strong>Reason:</strong> {selectedRequest.reason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="approval-comments">Comments (Optional)</Label>
                                    <Textarea
                                        id="approval-comments"
                                        value={approvalData.comments}
                                        onChange={(e) => setApprovalData('comments', e.target.value)}
                                        placeholder="Add any comments about this approval..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowApprovalModal(false)} disabled={approvalProcessing}>
                                Cancel
                            </Button>
                            <Button onClick={submitApproval} disabled={approvalProcessing} className="bg-green-600 hover:bg-green-700">
                                {approvalProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Approve Request
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={showDenialModal} onOpenChange={setShowDenialModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Deny PTO Request</DialogTitle>
                            <DialogDescription>Please provide a reason for denying this PTO request.</DialogDescription>
                        </DialogHeader>
                        {selectedRequest && (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <strong>Employee:</strong> {selectedRequest.user.name}
                                        </div>
                                        <div>
                                            <strong>PTO Type:</strong> {selectedRequest.pto_type.name}
                                        </div>
                                        <div>
                                            <strong>Dates:</strong> {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
                                        </div>
                                        <div>
                                            <strong>Days:</strong> {selectedRequest.total_days}
                                        </div>
                                        {selectedRequest.reason && (
                                            <div className="col-span-2">
                                                <strong>Reason:</strong> {selectedRequest.reason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="denial-comments">
                                        Reason for Denial <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        id="denial-comments"
                                        value={denialData.comments}
                                        onChange={(e) => setDenialData('comments', e.target.value)}
                                        placeholder="Provide a clear reason for denying this request..."
                                        rows={3}
                                        required
                                    />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDenialModal(false)} disabled={denialProcessing}>
                                Cancel
                            </Button>
                            <Button
                                onClick={submitDenial}
                                disabled={denialProcessing || !denialData.comments.trim()}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {denialProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Deny Request
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <HistoricalPtoModal
                isOpen={isHistoricalModalOpen}
                onClose={() => setIsHistoricalModalOpen(false)}
                users={users}
                ptoTypes={allPtoTypes}
                onSuccess={handleHistoricalPtoSuccess}
            />
        </AppLayout>
    );
}
