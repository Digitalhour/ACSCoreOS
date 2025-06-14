import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'My PTO 2',
        href: '/my-pto',
    },
];

interface PtoBalance {
    id: number;
    pto_type: {
        id: number;
        name: string;
        description: string;
    };
    current_balance: number; // This will still be a number from API
    last_accrual_date: string;
}

interface PtoRequest {
    id: number;
    pto_type: {
        id: number;
        name: string;
    };
    start_date: string;
    end_date: string;
    requested_days: number; // Assuming requests are also in 0.5 day increments
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    created_at: string;
}

export default function MyPtoView() {
    const [ptoBalances, setPtoBalances] = useState<PtoBalance[]>([]);
    const [ptoRequests, setPtoRequests] = useState<PtoRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPtoData = async () => {
            try {
                setLoading(true);
                setError(null); // Reset error on new fetch

                // Fetch PTO balances
                const balancesResponse = await axios.get('/api/pto-balances');
                setPtoBalances(balancesResponse.data.data);

                // Fetch PTO requests
                const requestsResponse = await axios.get('/api/pto-requests');
                setPtoRequests(requestsResponse.data.data);

                setLoading(false);
            } catch (err) {
                console.error('Error fetching PTO data:', err);
                setError('Failed to load PTO data. Please try again later.');
                setLoading(false);
            }
        };

        fetchPtoData();
    }, []);

    const cancelRequest = async (requestId: number) => {
        try {
            setError(null); // Reset error
            await axios.put(`/api/pto-requests/${requestId}/cancel`);

            setPtoRequests((prevRequests) =>
                prevRequests.map((request) => (request.id === requestId ? { ...request, status: 'cancelled' } : request)),
            );
        } catch (err) {
            console.error('Error cancelling request:', err);
            setError('Failed to cancel request. Please try again later.');
        }
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString || dateString === 'Never') return 'Never';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch (e) {
            return 'Invalid Date';
        }
    };

    /**
     * Formats a number to the nearest 0.5 and returns it as a string with one decimal place.
     * e.g., 10 -> "10.0", 10.23 -> "10.0", 10.58 -> "10.5"
     * @param balance The number to format.
     * @returns A string representation of the number, formatted to one decimal place.
     */
    const formatToHalfIncrement = (balance: number | null | undefined): string => {
        if (balance === null || balance === undefined) {
            return '0.0'; // Default for null or undefined balances
        }
        // Round to nearest 0.5
        const roundedBalance = Math.round(balance * 2) / 2;
        return roundedBalance.toFixed(1); // Ensures one decimal place, e.g., "10.0" or "10.5"
    };

    /**
     * Formats requested days, assuming they should also be in 0.5 increments.
     * @param days The number of days to format.
     * @returns A string representation of the days, formatted to one decimal place.
     */
    const formatRequestedDays = (days: number | null | undefined): string => {
        if (days === null || days === undefined) {
            return '0.0';
        }
        // If requested_days are already guaranteed to be .5 increments from backend/input,
        // just toFixed(1) might be enough. Rounding here makes it consistent.
        const roundedDays = Math.round(days * 2) / 2;
        return roundedDays.toFixed(1);
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            default: // pending
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My PTO" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My PTO Dashboard</h1>

                {error && (
                    <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300" role="alert">
                        <p className="font-medium">Error</p>
                        <p>{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-1 items-center justify-center p-8">
                        <div className="border-primary h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" role="status">
                            <span className="sr-only">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* PTO Balances Section */}
                        <div className="rounded-xl border bg-white p-4 shadow-sm md:p-6 dark:border-gray-700 dark:bg-gray-800">
                            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">PTO Balances</h2>
                            {ptoBalances.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400">No PTO balances found.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[600px] table-auto text-sm">
                                        <thead className="text-left text-gray-600 dark:text-gray-300">
                                            <tr className="border-b dark:border-gray-700">
                                                <th className="pr-3 pb-3 font-semibold">PTO Type</th>
                                                <th className="pr-3 pb-3 font-semibold">Description</th>
                                                <th className="pr-3 pb-3 font-semibold">Current Balance (Days)</th>
                                                <th className="pb-3 font-semibold">Last Accrual</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {ptoBalances.map((balance) => (
                                                <tr key={balance.id} className="text-gray-700 dark:text-gray-400">
                                                    <td className="py-3 pr-3">{balance.pto_type.name}</td>
                                                    <td className="py-3 pr-3">{balance.pto_type.description}</td>
                                                    <td className="py-3 pr-3 font-medium text-gray-900 dark:text-white">
                                                        {formatToHalfIncrement(balance.current_balance)}
                                                    </td>
                                                    <td className="py-3">{formatDate(balance.last_accrual_date)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* PTO Requests Section */}
                        <div className="rounded-xl border bg-white p-4 shadow-sm md:p-6 dark:border-gray-700 dark:bg-gray-800">
                            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">PTO Requests</h2>
                                <a
                                    href="/request-pto" // Ensure this route exists and is correct
                                    className="bg-primary hover:bg-primary/90 focus:ring-primary inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-800"
                                >
                                    Request PTO
                                </a>
                            </div>

                            {ptoRequests.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400">No PTO requests found.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[800px] table-auto text-sm">
                                        <thead className="text-left text-gray-600 dark:text-gray-300">
                                            <tr className="border-b dark:border-gray-700">
                                                <th className="pr-3 pb-3 font-semibold">PTO Type</th>
                                                <th className="pr-3 pb-3 font-semibold">Start Date</th>
                                                <th className="pr-3 pb-3 font-semibold">End Date</th>
                                                <th className="pr-3 pb-3 font-semibold">Days</th>
                                                <th className="pr-3 pb-3 font-semibold">Reason</th>
                                                <th className="pr-3 pb-3 font-semibold">Status</th>
                                                <th className="pr-3 pb-3 font-semibold">Requested On</th>
                                                <th className="pb-3 font-semibold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {ptoRequests.map((request) => (
                                                <tr key={request.id} className="text-gray-700 dark:text-gray-400">
                                                    <td className="py-3 pr-3">{request.pto_type.name}</td>
                                                    <td className="py-3 pr-3">{formatDate(request.start_date)}</td>
                                                    <td className="py-3 pr-3">{formatDate(request.end_date)}</td>
                                                    <td className="py-3 pr-3 font-medium text-gray-900 dark:text-white">
                                                        {formatRequestedDays(request.requested_days)}
                                                    </td>
                                                    <td className="py-3 pr-3">{request.reason}</td>
                                                    <td className="py-3 pr-3">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(request.status)}`}
                                                        >
                                                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 pr-3">{formatDate(request.created_at)}</td>
                                                    <td className="py-3">
                                                        {request.status === 'pending' && (
                                                            <button
                                                                onClick={() => cancelRequest(request.id)}
                                                                className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 dark:focus:ring-offset-gray-800"
                                                                aria-label={`Cancel PTO request for ${request.pto_type.name} from ${formatDate(request.start_date)}`}
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
