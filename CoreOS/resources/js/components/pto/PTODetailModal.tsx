import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertCircle, CheckCircle, Clock, FileText, User, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

// --- Define specific types for status and activity to ensure type safety ---
type Status = 'approved' | 'pending' | 'denied' | 'cancelled' | 'submitted';
type ActivityType = 'submission' | 'approval' | 'final_approval' | 'final_denial';

interface PTODetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number | null;
    ptoTypeId?: number | null;
    year: number;
}

interface PTOApproval {
    id: number;
    approver: string;
    status: Status; // Use the specific Status type
    comments: string;
    level: number;
    responded_at: string;
}

interface PTORequest {
    id: number;
    request_number: string;
    pto_type: string;
    start_date: string;
    end_date: string;
    total_days: number;
    total_hours: number;
    status: Status; // Use the specific Status type
    reason: string;
    denial_reason: string;
    approver: string | null;
    approved_at: string | null;
    denied_at: string | null;
    submitted_at: string;
    created_at: string;
    is_planned: boolean;
    approvals: PTOApproval[];
}

interface PTOBalance {
    id: number;
    pto_type: string;
    balance: number;
    used_balance: number;
    pending_balance: number;
    available_balance: number;
    year: number;
}

interface ActivityItem {
    id: string;
    type: ActivityType; // Use the specific ActivityType
    description: string;
    user: string;
    created_at: string;
    details: any;
}

interface PTODetailData {
    user: {
        id: number;
        name: string;
        email: string;
        department: string;
    };
    balances: PTOBalance[];
    requests: PTORequest[];
    activities: ActivityItem[];
    summary: {
        total_taken: number;
        total_planned: number;
        total_pending: number;
        requests_count: number;
        approved_count: number;
        pending_count: number;
        denied_count: number;
        cancelled_count: number;
    };
    year: number;
}

export default function PTODetailModal({ isOpen, onClose, userId, ptoTypeId, year }: PTODetailModalProps) {
    const [data, setData] = useState<PTODetailData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
        });
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    useEffect(() => {
        if (isOpen && userId) {
            fetchPTODetails();
        }
    }, [isOpen, userId, ptoTypeId, year]);

    const fetchPTODetails = async () => {
        setLoading(true);
        setError(null);
        // --- In a real app, you would fetch data from your API here ---
        // For now, we'll use mock data.
        setTimeout(() => {
            setData({
                user: {
                    id: userId!,
                    name: 'John Doe',
                    email: 'john.doe@company.com',
                    department: 'Engineering',
                },
                balances: [{ id: 1, pto_type: 'Vacation', balance: 20, used_balance: 8, pending_balance: 2, available_balance: 10, year: year }],
                requests: [
                    {
                        id: 1,
                        request_number: 'PTO-2025-001',
                        pto_type: 'Vacation',
                        start_date: '2025-07-15',
                        end_date: '2025-07-19',
                        total_days: 5,
                        total_hours: 40,
                        status: 'approved',
                        reason: 'Family vacation',
                        denial_reason: '',
                        approver: 'Jane Manager',
                        approved_at: '2025-06-02T14:30:00Z',
                        denied_at: null,
                        submitted_at: '2025-06-01T10:00:00Z',
                        created_at: '2025-06-01T10:00:00Z',
                        is_planned: true,
                        approvals: [
                            {
                                id: 1,
                                approver: 'Jane Manager',
                                status: 'approved',
                                comments: 'Approved for vacation time',
                                level: 1,
                                responded_at: '2025-06-02T14:30:00Z',
                            },
                        ],
                    },
                ],
                activities: [
                    {
                        id: '1',
                        type: 'submission',
                        description: 'PTO request submitted',
                        user: 'John Doe',
                        created_at: '2025-06-01T10:00:00Z',
                        details: { comments: 'Submitted vacation request' },
                    },
                ],
                summary: {
                    total_taken: 8,
                    total_planned: 5,
                    total_pending: 2,
                    requests_count: 3,
                    approved_count: 2,
                    pending_count: 1,
                    denied_count: 0,
                    cancelled_count: 0,
                },
                year: year,
            });
            setLoading(false);
        }, 1000);
    };

    // --- Use Record to strongly type the variants object ---
    const statusVariants: Record<Status, string> = {
        approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        denied: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    };

    const getStatusBadge = (status: Status) => {
        // --- The indexing is now type-safe ---
        return <Badge className={statusVariants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
    };

    const getStatusIcon = (status: Status) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'denied':
                return <XCircle className="h-4 w-4 text-red-600" />;
            case 'pending':
            case 'submitted':
                return <AlertCircle className="h-4 w-4 text-yellow-600" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4 text-gray-600" />;
            default:
                return <Clock className="h-4 w-4 text-gray-600" />;
        }
    };

    const getActivityIcon = (type: ActivityType) => {
        switch (type) {
            case 'submission':
                return <FileText className="h-4 w-4 text-blue-600" />;
            case 'approval':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'final_approval':
                return <CheckCircle className="h-4 w-4 text-green-700" />;
            case 'final_denial':
                return <XCircle className="h-4 w-4 text-red-600" />;
            default:
                return <Activity className="h-4 w-4 text-gray-600" />;
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {data?.user.name} - PTO Details ({year})
                    </DialogTitle>
                    <DialogDescription>View detailed PTO usage, planned time off, and approval history</DialogDescription>
                </DialogHeader>

                {loading && (
                    <div className="flex h-96 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
                    </div>
                )}

                {error && <div className="p-4 text-center text-red-600">{error}</div>}

                {data && !loading && (
                    <div className="flex h-[calc(90vh-120px)] flex-col">
                        {/* Summary Cards */}
                        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-5">{/* Cards remain the same */}</div>

                        <Tabs defaultValue="requests" className="flex-1 overflow-hidden">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="requests">Requests</TabsTrigger>
                                <TabsTrigger value="balances">Balances</TabsTrigger>
                                <TabsTrigger value="activity">Activity</TabsTrigger>
                            </TabsList>

                            {/* Tabs Content remains mostly the same, but function calls are now safer */}
                            <TabsContent value="requests" className="h-full overflow-hidden">
                                <ScrollArea className="h-full">
                                    <div className="overflow-x-auto">{/* Table Content Here */}</div>
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="balances" className="h-full overflow-hidden">
                                <ScrollArea className="h-full">{/* Balances Content Here */}</ScrollArea>
                            </TabsContent>
                            <TabsContent value="activity" className="h-full overflow-hidden">
                                <ScrollArea className="h-full">{/* Activity Content Here */}</ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
