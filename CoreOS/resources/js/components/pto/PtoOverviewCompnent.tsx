import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { router } from '@inertiajs/react';
import { AlertTriangle, Loader2, Calendar } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// Interface for a single PTO balance record
interface PTOData {
    type_id: number;
    type_name: string;
    balance: number | string;
    used_balance: number | string;
    pending_balance: number | string;
    available_balance: number | string;
}

// Interface for a single User, including start_date
interface User {
    id: number;
    name: string;
    email: string;
    department: string;
    start_date: string;
    pto_data: PTOData[];
}

// Interface for a PTO Type
interface PTOType {
    id: number;
    name: string;
}

// Interface for a single PTO request item, for the details view
interface PtoRequestItem {
    id: number;
    start_date: string;
    end_date: string;
    total_days: number;
    status: 'approved' | 'pending' | 'denied' | 'cancelled' | 'withdrawn';
    pto_type: {
        name: string;
    };
}

// Props interface - component should receive data as props
interface PtoOverviewProps {
    users?: User[];
    ptoTypes?: PTOType[];
    currentYear?: number;
    availableYears?: number[];
    department?: string;
}

export default function PtoOverviewComponent({
                                                 users = [],
                                                 ptoTypes = [],
                                                 currentYear = new Date().getFullYear(),
                                                 availableYears = [new Date().getFullYear()]
                                             }: PtoOverviewProps) {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // State to hold detailed information (requests) for the selected user
    const [details, setDetails] = useState<{
        requests: PtoRequestItem[];
        loading: boolean;
        error: string | null;
    }>({ requests: [], loading: false, error: null });

    // Effect to fetch detailed PTO requests when a user is selected
    useEffect(() => {
        if (selectedUser) {
            setDetails({ requests: [], loading: true, error: null });

            // Use Inertia router to fetch user details
            router.get(
                route('api.pto-requests.user-details'),
                {
                    user_id: selectedUser.id,
                    year: currentYear
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['userRequests'],
                    onSuccess: (page: any) => {
                        const requests = page.props.userRequests || [];
                        setDetails({ requests, loading: false, error: null });
                    },
                    onError: (errors: any) => {
                        console.error('Error fetching user PTO requests:', errors);
                        setDetails({
                            requests: [],
                            loading: false,
                            error: 'Could not load recent requests. Please try again.',
                        });
                    }
                }
            );
        }
    }, [selectedUser, currentYear]);

    const handleYearChange = useCallback((year: string) => {
        setSelectedUser(null);
        router.get(
            route('pto.overview'),
            { year },
            {
                preserveState: true,
                preserveScroll: true
            }
        );
    }, []);

    // Helper to format dates
    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
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
            <Badge variant="secondary" className={`${variants[status]} text-xs`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">PTO Overview</h2>
                    <p className="text-sm text-gray-600 mt-1">View employee PTO balances and usage</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main Overview Table */}
            <Card className="border border-gray-200">
                <CardHeader className="border-b border-gray-200 bg-gray-50/50">
                    <CardTitle className="text-lg font-medium">Employee PTO Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {users.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            No employee data found for {currentYear}.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-gray-200">
                                    <TableHead className="font-medium text-gray-900">Employee</TableHead>
                                    <TableHead className="font-medium text-gray-900">Department</TableHead>
                                    {ptoTypes.map((type) => (
                                        <TableHead key={type.id} className="text-center font-medium text-gray-900">
                                            {type.name}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className="hover:bg-gray-50/50 cursor-pointer transition-colors border-b border-gray-100"
                                    >
                                        <TableCell>
                                            <div className="font-medium text-gray-900">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </TableCell>
                                        <TableCell className="text-gray-900">{user.department}</TableCell>
                                        {ptoTypes.map((type) => {
                                            const ptoData = user.pto_data.find((p) => p.type_id === type.id);
                                            return (
                                                <TableCell key={type.id} className="text-center">
                                                    {ptoData ? (
                                                        <div>
                                                            <div className="text-gray-900">
                                                                {Number(ptoData.available_balance).toFixed(1)}{' '}
                                                                <span className="text-xs text-gray-500">avail</span>
                                                            </div>
                                                            <Badge variant="secondary" className="mt-1 font-normal text-xs bg-gray-100 text-gray-700 hover:bg-gray-100">
                                                                {Number(ptoData.used_balance).toFixed(1)} used
                                                            </Badge>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500">-</span>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* User Details Modal */}
            <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <DialogContent className="max-w-11/12 min-w-8/12 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-medium">
                            Details for {selectedUser?.name}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Left Column: Employee Info and Balances */}
                            <div className="space-y-6">
                                {/* Employee Information */}
                                <div className="space-y-4">
                                    <h3 className="font-medium text-gray-900">Employee Information</h3>
                                    <div className="rounded-lg border border-gray-200 p-4">

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="text-gray-500">Department</div>
                                            <div className="text-gray-900">{selectedUser.department}</div>
                                            <div className="text-gray-500">Email</div>
                                            <div className="text-gray-900">{selectedUser.email}</div>
                                            <div className="text-gray-500">Start Date</div>
                                            <div className="text-gray-900">{formatDate(selectedUser.start_date)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* PTO Balances */}
                                <div className="space-y-4">
                                    <h3 className="font-medium text-gray-900">PTO Balances ({currentYear})</h3>
                                    <div className="rounded-lg border border-gray-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-b border-gray-200">
                                                    <TableHead className="font-medium text-gray-900">Type</TableHead>
                                                    <TableHead className="text-right font-medium text-gray-900">Allotted</TableHead>
                                                    <TableHead className="text-right font-medium text-gray-900">Used</TableHead>
                                                    <TableHead className="text-right font-medium text-gray-900">Pending</TableHead>
                                                    <TableHead className="text-right font-medium text-gray-900">Available</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedUser.pto_data.map((pto) => (
                                                    <TableRow key={pto.type_id} className="border-b border-gray-100">
                                                        <TableCell className="font-medium text-gray-900">{pto.type_name}</TableCell>
                                                        <TableCell className="text-right text-gray-900">
                                                            {Number(pto.available_balance).toFixed(1)}{' '}
                                                        </TableCell>
                                                        <TableCell className="text-right text-gray-900">
                                                            {(Number(pto.used_balance) || 0).toFixed(1)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-gray-500">
                                                            {(Number(pto.pending_balance) || 0).toFixed(1)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-gray-900">
                                                            {(Number(pto.available_balance) || 0).toFixed(1)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Recent Requests */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-gray-900">Recent Requests ({currentYear})</h3>
                                <div className="rounded-lg border border-gray-200">
                                    {details.loading && (
                                        <div className="flex items-center justify-center p-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                        </div>
                                    )}
                                    {details.error && (
                                        <div className="flex flex-col items-center justify-center p-8 text-center">
                                            <AlertTriangle className="h-8 w-8 text-red-500" />
                                            <p className="mt-2 text-sm text-red-600">{details.error}</p>
                                        </div>
                                    )}
                                    {!details.loading && !details.error && (
                                        <>
                                            {details.requests.length > 0 ? (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="border-b border-gray-200">
                                                            <TableHead className="font-medium text-gray-900">Type</TableHead>
                                                            <TableHead className="font-medium text-gray-900">Dates</TableHead>
                                                            <TableHead className="text-center font-medium text-gray-900">Days</TableHead>
                                                            <TableHead className="text-right font-medium text-gray-900">Status</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {details.requests.map((req) => (
                                                            <TableRow key={req.id} className="border-b border-gray-100">
                                                                <TableCell className="font-medium text-gray-900">
                                                                    {req.pto_type.name}
                                                                </TableCell>
                                                                <TableCell className="text-sm text-gray-900">
                                                                    {formatDate(req.start_date)} - {formatDate(req.end_date)}
                                                                </TableCell>
                                                                <TableCell className="text-center text-gray-900">
                                                                    {req.total_days}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {getStatusBadge(req.status)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            ) : (
                                                <div className="p-8 text-center text-gray-500">
                                                    No requests found for {currentYear}.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
