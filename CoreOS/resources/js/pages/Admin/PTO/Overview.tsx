import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

// Simplified breadcrumbs
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'PTO Overview',
        href: '/pto/overview',
    },
];

// Interface for a single PTO balance record
interface PTOData {
    type_id: number;
    type_name: string;
    balance: number | string;
    used_balance: number | string;
    pending_balance: number | string;
    available_balance: number | string;
}

// Interface for a single User, now including start_date
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

// Props interface matching the data from PtoOverviewController
interface Props {
    users: User[];
    ptoTypes: PTOType[];
    currentYear: number;
    availableYears: number[];
}

// Helper to format dates
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export default function PTOOverview({ users, ptoTypes, currentYear, availableYears }: Props) {
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
            // This API endpoint is hypothetical. You would need to create it in your Laravel backend.
            // It should return a user's PTO requests for a given year.
            fetch(`/api/pto-requests?user_id=${selectedUser.id}&year=${currentYear}`)
                .then(async (res) => {
                    if (!res.ok) {
                        const errorText = await res.text();
                        throw new Error(`Failed to fetch details: ${res.status} ${errorText}`);
                    }
                    return res.json();
                })
                .then((data: PtoRequestItem[]) => {
                    setDetails({ requests: data, loading: false, error: null });
                })
                .catch((error) => {
                    console.error(error);
                    setDetails({
                        requests: [],
                        loading: false,
                        error: 'Could not load recent requests. Please ensure the API endpoint is configured correctly.',
                    });
                });
        }
    }, [selectedUser, currentYear]);

    const handleYearChange = (year: string) => {
        router.get(route('pto.overview'), { year }, { preserveState: true, preserveScroll: true });
        setSelectedUser(null);
    };

    const getStatusBadge = (status: string) => {
        const variants: { [key: string]: string } = {
            pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
            approved: 'bg-green-100 text-green-800 hover:bg-green-100',
            denied: 'bg-red-100 text-red-800 hover:bg-red-100',
            cancelled: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
            withdrawn: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
        };
        return (
            <Badge variant="secondary" className={variants[status]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="PTO Overview" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">PTO Overview</h1>
                    <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-36">
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

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Department</TableHead>
                                {ptoTypes.map((type) => (
                                    <TableHead key={type.id} className="text-center">
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
                                    className={`hover:bg-muted/50 cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-muted' : ''}`}
                                >
                                    <TableCell>
                                        <div className="font-medium">{user.name}</div>
                                        <div className="text-muted-foreground text-sm">{user.email}</div>
                                    </TableCell>
                                    <TableCell>{user.department}</TableCell>
                                    {ptoTypes.map((type) => {
                                        const ptoData = user.pto_data.find((p) => p.type_id === type.id);
                                        return (
                                            <TableCell key={type.id} className="text-center">
                                                {ptoData ? (
                                                    <div>
                                                        <div>
                                                            {Number(ptoData.available_balance).toFixed(1)}{' '}
                                                            <span className="text-muted-foreground text-xs">avail</span>
                                                        </div>
                                                        <Badge variant="secondary" className="mt-1 font-normal">
                                                            {Number(ptoData.used_balance).toFixed(1)} used
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {selectedUser && (
                    <div className="bg-card text-card-foreground relative mt-4 rounded-lg border p-4 shadow-sm">
                        <div className="flex items-start justify-between pb-4">
                            <h2 className="text-xl font-semibold">Details for {selectedUser.name}</h2>
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setSelectedUser(null)}>
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Left Column: Balances and User Info */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Employee Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="text-muted-foreground">Department</div>
                                            <div>{selectedUser.department}</div>
                                            <div className="text-muted-foreground">Email</div>
                                            <div>{selectedUser.email}</div>
                                            <div className="text-muted-foreground">Start Date</div>
                                            <div>{formatDate(selectedUser.start_date)}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">PTO Balances ({currentYear})</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead className="text-right">Allotted</TableHead>
                                                    <TableHead className="text-right">Used</TableHead>
                                                    <TableHead className="text-right">Pending</TableHead>
                                                    <TableHead className="text-right">Available</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedUser.pto_data.map((pto) => (
                                                    <TableRow key={pto.type_id}>
                                                        <TableCell className="font-medium">{pto.type_name}</TableCell>
                                                        <TableCell className="text-right">{(Number(pto.balance) || 0).toFixed(1)}</TableCell>
                                                        <TableCell className="text-right">{(Number(pto.used_balance) || 0).toFixed(1)}</TableCell>
                                                        <TableCell className="text-muted-foreground text-right">
                                                            {(Number(pto.pending_balance) || 0).toFixed(1)}
                                                        </TableCell>
                                                        <TableCell className="text-primary text-right font-medium">
                                                            {(Number(pto.available_balance) || 0).toFixed(1)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column: Recent Requests */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Recent Requests ({currentYear})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {details.loading && (
                                        <div className="flex items-center justify-center p-8">
                                            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                                        </div>
                                    )}
                                    {details.error && (
                                        <div className="text-destructive flex flex-col items-center justify-center p-8 text-center">
                                            <AlertTriangle className="h-8 w-8" />
                                            <p className="mt-2 text-sm">{details.error}</p>
                                        </div>
                                    )}
                                    {!details.loading &&
                                        !details.error &&
                                        (details.requests.length > 0 ? (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Dates</TableHead>
                                                        <TableHead className="text-center">Days</TableHead>
                                                        <TableHead className="text-right">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {details.requests.map((req) => (
                                                        <TableRow key={req.id}>
                                                            <TableCell className="font-medium">{req.pto_type.name}</TableCell>
                                                            <TableCell className="text-sm">
                                                                {formatDate(req.start_date)} - {formatDate(req.end_date)}
                                                            </TableCell>
                                                            <TableCell className="text-center">{req.total_days}</TableCell>
                                                            <TableCell className="text-right">{getStatusBadge(req.status)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <div className="text-muted-foreground p-8 text-center">No requests found for {currentYear}.</div>
                                        ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
