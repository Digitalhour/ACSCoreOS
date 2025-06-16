import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Clock, Download, Eye, Filter, Loader2, Search, X, XCircle, User, Calendar, FileText, AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';

// Interface Definitions
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

interface FilterData {
    search: string;
    status: string;
    pto_type: string;
    user: string;
    pending_only: boolean;
}

interface ApprovalData {
    comments: string;
}

export default function PtoRequestsComponent() {
    // State
    const [ptoRequests, setPtoRequests] = useState<PaginatedData>({
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
        from: 0,
        to: 0,
    });
    const [users, setUsers] = useState<User[]>([]);
    const [ptoTypes, setPtoTypes] = useState<PtoType[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterProcessing, setFilterProcessing] = useState(false);

    // Filter state
    const [filterData, setFilterData] = useState<FilterData>({
        search: '',
        status: 'all',
        pto_type: 'all',
        user: 'all',
        pending_only: false,
    });

    // Modal state
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showDenialModal, setShowDenialModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PtoRequest | null>(null);
    const [approvalProcessing, setApprovalProcessing] = useState(false);
    const [denialProcessing, setDenialProcessing] = useState(false);

    // Form data
    const [approvalData, setApprovalData] = useState<ApprovalData>({ comments: '' });
    const [denialData, setDenialData] = useState<ApprovalData>({ comments: '' });

    // Fetch data functions
    const fetchPtoRequests = useCallback(async (filters: FilterData = filterData, page: number = 1) => {
        try {
            setFilterProcessing(true);
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.status && filters.status !== 'all') params.append('status', filters.status);
            if (filters.pto_type && filters.pto_type !== 'all') params.append('pto_type', filters.pto_type);
            if (filters.user && filters.user !== 'all') params.append('user', filters.user);
            if (filters.pending_only) params.append('pending_only', '1');
            params.append('page', page.toString());

            const response = await axios.get(`/api/pto-requests?${params.toString()}`);
            const responseData = response.data;

            setPtoRequests({
                data: responseData.data || [],
                current_page: responseData.current_page || 1,
                last_page: responseData.last_page || 1,
                per_page: responseData.per_page || 10,
                total: responseData.total || 0,
                from: responseData.from || 0,
                to: responseData.to || 0,
            });
        } catch (error) {
            console.error('Error fetching PTO requests:', error);
            toast.error('Failed to load PTO requests. Please try again.');
        } finally {
            setFilterProcessing(false);
        }
    }, [filterData]);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await axios.get('/api/users/list');
            setUsers(response.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users.');
        }
    }, []);

    const fetchPtoTypes = useCallback(async () => {
        try {
            const response = await axios.get('/api/pto-types');
            const responseData = response.data.data || response.data;
            setPtoTypes(Array.isArray(responseData) ? responseData : []);
        } catch (error) {
            console.error('Error fetching PTO types:', error);
            toast.error('Failed to load PTO types.');
        }
    }, []);

    // Initial data loading
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchPtoRequests(),
                fetchUsers(),
                fetchPtoTypes()
            ]);
            setLoading(false);
        };
        loadData();
    }, []);

    // Filter handlers
    const handleFilterChange = useCallback((field: keyof FilterData, value: any) => {
        const newFilterData = { ...filterData, [field]: value };
        if (field === 'user') {
            newFilterData.pto_type = 'all';
        }
        setFilterData(newFilterData);

        // Debounce the API call
        setTimeout(() => {
            fetchPtoRequests(newFilterData, 1);
        }, 300);
    }, [filterData, fetchPtoRequests]);

    const clearFilters = useCallback(() => {
        const clearedFilters = {
            search: '',
            status: 'all',
            pto_type: 'all',
            user: 'all',
            pending_only: false,
        };
        setFilterData(clearedFilters);
        fetchPtoRequests(clearedFilters, 1);
    }, [fetchPtoRequests]);

    // Modal handlers
    const handleViewDetails = useCallback((request: PtoRequest) => {
        setSelectedRequest(request);
        setShowDetailModal(true);
    }, []);

    const handleApprove = useCallback((request: PtoRequest) => {
        setSelectedRequest(request);
        setApprovalData({ comments: '' });
        setShowApprovalModal(true);
    }, []);

    const handleDeny = useCallback((request: PtoRequest) => {
        setSelectedRequest(request);
        setDenialData({ comments: '' });
        setShowDenialModal(true);
    }, []);

    const submitApproval = useCallback(async () => {
        if (!selectedRequest) return;

        try {
            setApprovalProcessing(true);
            await axios.post(`/api/pto-requests/${selectedRequest.id}/approve`, approvalData);
            toast.success('Request approved successfully');
            setShowApprovalModal(false);
            fetchPtoRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to approve request');
        } finally {
            setApprovalProcessing(false);
        }
    }, [selectedRequest, approvalData, fetchPtoRequests]);

    const submitDenial = useCallback(async () => {
        if (!selectedRequest) return;

        try {
            setDenialProcessing(true);
            await axios.post(`/api/pto-requests/${selectedRequest.id}/deny`, denialData);
            toast.success('Request denied successfully');
            setShowDenialModal(false);
            fetchPtoRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to deny request');
        } finally {
            setDenialProcessing(false);
        }
    }, [selectedRequest, denialData, fetchPtoRequests]);

    // Pagination handler
    const handlePageChange = (page: number) => {
        fetchPtoRequests(filterData, page);
    };

    // Utility functions
    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }, []);

    const formatDateTime = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    const formatTimeOption = useCallback((time: string) => {
        switch (time) {
            case 'full_day':
                return 'Full Day';
            case 'morning':
                return 'Morning';
            case 'afternoon':
                return 'Afternoon';
            default:
                return time;
        }
    }, []);

    const getStatusBadge = (status: string) => {
        const variants: { [key: string]: string } = {
            pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
            approved: 'bg-green-100 text-green-800 hover:bg-green-100',
            denied: 'bg-red-100 text-red-800 hover:bg-red-100',
            cancelled: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
            withdrawn: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
        };
        return (
            <Badge className={`${variants[status] || variants.pending} text-xs`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
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

    const pendingCount = ptoRequests.data ? ptoRequests.data.filter((r) => r.status === 'pending').length : 0;
    const hasActiveFilters = filterData.search ||
        (filterData.status && filterData.status !== 'all') ||
        (filterData.pto_type && filterData.pto_type !== 'all') ||
        (filterData.user && filterData.user !== 'all') ||
        filterData.pending_only;

    if (loading || !ptoRequests.data) {
        return (
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">PTO Requests</h2>
                        <p className="text-sm text-gray-600 mt-1">Manage employee time off requests</p>
                    </div>
                </div>
                <Card className="border border-gray-200">
                    <CardContent className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">PTO Requests</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage employee time off requests</p>
                </div>
                <Button variant="outline" className="bg-gray-900 hover:bg-gray-800 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                </Button>
            </div>

            {/* Filters */}
            <Card className="border border-gray-200">

                <CardContent className="p-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-1">
                        <div className="space-y-2">
                            <Label htmlFor="search">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    id="search"
                                    placeholder="Search by employee, request #..."
                                    value={filterData.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={filterData.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="denied">Denied</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="employee">Employee</Label>
                            <Select value={filterData.user} onValueChange={(value) => handleFilterChange('user', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All employees" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All employees</SelectItem>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pto-type">PTO Type</Label>
                            <Select value={filterData.pto_type} onValueChange={(value) => handleFilterChange('pto_type', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All types</SelectItem>
                                    {ptoTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id.toString()}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2 mt-6">
                            <Switch
                                id="pending-only"
                                checked={filterData.pending_only}
                                onCheckedChange={(checked) => handleFilterChange('pending_only', checked)}
                            />
                            <Label htmlFor="pending-only" className="text-sm">
                                Pending only
                            </Label>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                                Active filters applied
                            </p>
                            <Button variant="outline" size="sm" onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Requests Table */}
            <Card className="border border-gray-200">
                <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                    <CardTitle className="text-lg font-medium">
                        PTO Requests ({ptoRequests.total})
                        {pendingCount > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {pendingCount} pending
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {filterProcessing ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (ptoRequests.data && ptoRequests.data.length === 0) ? (
                        <div className="py-12 text-center text-gray-500">
                            {hasActiveFilters ? 'No requests match your filters.' : 'No PTO requests found.'}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-gray-200">
                                        <TableHead className="font-medium text-gray-900">Request #</TableHead>
                                        <TableHead className="font-medium text-gray-900">Employee</TableHead>
                                        <TableHead className="font-medium text-gray-900">PTO Type</TableHead>
                                        <TableHead className="font-medium text-gray-900">Dates</TableHead>
                                        <TableHead className="font-medium text-gray-900">Status</TableHead>
                                        <TableHead className="font-medium text-gray-900">Approvers</TableHead>
                                        <TableHead className="text-right font-medium text-gray-900">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ptoRequests.data && ptoRequests.data.map((request) => (
                                        <TableRow key={request.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                            <TableCell className="font-mono text-sm">{request.request_number}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium text-gray-900">{request.user.name}</div>
                                                    <div className="text-sm text-gray-500">{request.user.email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-3 w-3 rounded border border-gray-300"
                                                        style={{ backgroundColor: request.pto_type.color }}
                                                    />
                                                    <span className="text-gray-900">{request.pto_type.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div className="text-gray-900">{formatDate(request.start_date)}</div>
                                                    <div className="text-gray-500">to {formatDate(request.end_date)}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(request.status)}
                                                    {getStatusBadge(request.status)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {request.approvals && request.approvals.length > 0 ? (
                                                    <div className="flex flex-col space-y-1">
                                                        {request.approvals.map((approval) => (
                                                            <div key={approval.id} className="flex items-center gap-2 text-sm">
                                                                {getApprovalStatusIcon(approval.status)}
                                                                <span className="truncate text-gray-700">{approval.approver.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-500">-</span>
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
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewDetails(request)}
                                                        className="text-gray-500 hover:text-gray-700"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {ptoRequests.last_page > 1 && (
                                <div className="flex items-center justify-between p-4 border-t border-gray-200">
                                    <div className="text-sm text-gray-500">
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
                                        <span className="text-sm text-gray-700">
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

            {/* Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className=" max-w-11/12 min-w-8/12 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            PTO Request Details
                        </DialogTitle>
                        <DialogDescription>
                            <div className="flex items-center gap-2 mt-1">

                                Information for request #{selectedRequest?.request_number}
                            </div>


                        </DialogDescription>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-6">
                            {/* Status & Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <Card className="border border-gray-200">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            Employee Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div>
                                            <Label className="text-sm font-medium text-gray-600">Name</Label>
                                            <p className="text-sm text-gray-900">{selectedRequest.user.name}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-gray-600">Email</Label>
                                            <p className="text-sm text-gray-900">{selectedRequest.user.email}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-gray-600">Request Number</Label>
                                            <p className="text-sm font-mono text-gray-900">{selectedRequest.request_number}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-gray-200">
                                    <CardHeader className="pb-1">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Request Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div>
                                            <Label className="text-sm font-medium text-gray-600">PTO Type</Label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div
                                                    className="h-3 w-3 rounded border border-gray-300"
                                                    style={{ backgroundColor: selectedRequest.pto_type.color }}
                                                />
                                                <span className="text-sm text-gray-900">{selectedRequest.pto_type.name}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-gray-600">Status</Label>
                                            <div className="flex items-center gap-2 mt-1">
                                                {getStatusIcon(selectedRequest.status)}
                                                {getStatusBadge(selectedRequest.status)}
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-gray-600">Total Days</Label>
                                            <p className="text-sm text-gray-900">{selectedRequest.total_days} days</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Date Information */}
                            <Card className="border border-gray-200">
                                <CardHeader className="pb-1">
                                    <CardTitle className="text-base">Date & Time Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-gray-600">Start Date</Label>
                                            <p className="text-sm text-gray-900">{formatDate(selectedRequest.start_date)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-gray-600">End Date</Label>
                                            <p className="text-sm text-gray-900">{formatDate(selectedRequest.end_date)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-gray-600">Start Time</Label>
                                            <p className="text-sm text-gray-900">{formatTimeOption(selectedRequest.start_time)}</p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-gray-600">End Time</Label>
                                            <p className="text-sm text-gray-900">{formatTimeOption(selectedRequest.end_time)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Request Reason */}
                            {selectedRequest.reason && (
                                <Card className="border border-gray-200">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Request Reason</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedRequest.reason}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Denial/Cancellation Reason */}
                            {(selectedRequest.status === 'denied' && selectedRequest.denial_reason) && (
                                <Card className="border border-red-200 bg-red-50/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base text-red-800 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            Denial Reason
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-red-700 whitespace-pre-wrap">{selectedRequest.denial_reason}</p>
                                        {selectedRequest.denied_by && (
                                            <div className="mt-2 pt-2 border-t border-red-200">
                                                <Label className="text-xs font-medium text-red-600">Denied by</Label>
                                                <p className="text-xs text-red-700">{selectedRequest.denied_by.name}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {(selectedRequest.status === 'cancelled' && selectedRequest.reason && selectedRequest.reason.includes('Cancelled by')) && (
                                <Card className="border border-gray-200 bg-gray-50/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base text-gray-800 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            Cancellation Reason
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedRequest.reason}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Approval Chain */}
                            {selectedRequest.approvals && selectedRequest.approvals.length > 0 && (
                                <Card className="border border-gray-200">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Approval Chain</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {selectedRequest.approvals.map((approval, index) => (
                                                <div key={approval.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                                                    <div className="flex-shrink-0 mt-0.5">
                                                        {getApprovalStatusIcon(approval.status)}
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-gray-900">{approval.approver.name}</span>
                                                            <Badge
                                                                className={`text-xs ${
                                                                    approval.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                                        approval.status === 'denied' ? 'bg-red-100 text-red-800' :
                                                                            'bg-yellow-100 text-yellow-800'
                                                                }`}
                                                            >
                                                                {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                                                            </Badge>
                                                        </div>
                                                        {approval.comments && (
                                                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{approval.comments}</p>
                                                        )}
                                                        {approval.responded_at && (
                                                            <p className="text-xs text-gray-500">
                                                                Responded on {formatDateTime(approval.responded_at)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Timeline */}
                            <Card className="border border-gray-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Timeline</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Request Submitted</p>
                                                <p className="text-xs text-gray-500">{formatDateTime(selectedRequest.submitted_at)}</p>
                                            </div>
                                        </div>
                                        {selectedRequest.approved_at && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Request Approved</p>
                                                    <p className="text-xs text-gray-500">{formatDateTime(selectedRequest.approved_at)}</p>
                                                    {selectedRequest.approved_by && (
                                                        <p className="text-xs text-gray-600">by {selectedRequest.approved_by.name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {selectedRequest.denied_at && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-2 w-2 rounded-full bg-red-500 mt-2"></div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Request Denied</p>
                                                    <p className="text-xs text-gray-500">{formatDateTime(selectedRequest.denied_at)}</p>
                                                    {selectedRequest.denied_by && (
                                                        <p className="text-xs text-gray-600">by {selectedRequest.denied_by.name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approval Modal */}
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
                                    onChange={(e) => setApprovalData({ comments: e.target.value })}
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

            {/* Denial Modal */}
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
                                    onChange={(e) => setDenialData({ comments: e.target.value })}
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
    );
}
