import D3OrgChartWrapper from '@/components/OrgChart/D3OrgChartWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import AppLayout from '@/layouts/app-layout'; // Adjust path if necessary
import { type BreadcrumbItem } from '@/types'; // Adjust path if necessary
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

export interface RawUser {
    id: string | number;
    name: string;
    position?: string;
    avatar?: string;
    reports_to_user_id?: string | number | null;
    // Optional: Add a field for color-coding, e.g., 'roleType' or 'level'
    roleType?: string;
}

// This interface will be used for the data passed to D3OrgChartWrapper
export interface ProcessedUser {
    id: string;
    parentId: string | null;
    name: string;
    position?: string;
    avatar?: string;
    roleType?: string; // For color coding
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: route('dashboard'),
    },
    {
        title: 'ACS Origination',
        href: route('acs-origination'), // Ensure you have a 'data.management' named route
    },
];
export default function OrganizationChartPage() {
    const [chartData, setChartData] = useState<ProcessedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        axios
            .get('/api/users/hierarchy')
            .then((response) => {
                const rawUsers: RawUser[] = response.data;

                if (!Array.isArray(rawUsers)) {
                    console.error('API did not return an array:', rawUsers);
                    setError('Received invalid data format from server.');
                    setChartData([]);
                    return;
                }

                const ids = new Set(rawUsers.map((u) => String(u.id)));
                let selfReportingCount = 0;
                let invalidParentCount = 0;

                const processedData: ProcessedUser[] = rawUsers
                    .filter((user) => {
                        if (String(user.id) === (user.reports_to_user_id ? String(user.reports_to_user_id) : null)) {
                            console.warn(`User ${user.id} (${user.name}) reports to themselves. Excluding from chart.`);
                            selfReportingCount++;
                            return false;
                        }
                        return true;
                    })
                    .map((user, index) => {
                        // Added index for simple color cycling
                        let parentId = user.reports_to_user_id ? String(user.reports_to_user_id) : null;

                        if (parentId && !ids.has(parentId)) {
                            console.warn(`User ${user.id} (${user.name}) reports to a non-existent parentId ${parentId}. Converting to a root node.`);
                            invalidParentCount++;
                            parentId = null; // Treat as a root node
                        }

                        // Example roleType for color cycling - replace with actual data
                        const roleTypes = ['management', 'tech', 'sales', 'marketing', 'operations'];

                        return {
                            id: String(user.id),
                            parentId: parentId,
                            name: user.name,
                            position: user.position,
                            avatar:
                                user.avatar ||
                                `https://placehold.co/64x64/e2e8f0/4a5568?text=${encodeURIComponent(
                                    user.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase(),
                                )}`,
                            roleType: user.roleType || roleTypes[index % roleTypes.length], // Assign a roleType for styling
                        };
                    });

                if (selfReportingCount > 0) {
                    console.warn(`Total users excluded due to self-reporting: ${selfReportingCount}`);
                }
                if (invalidParentCount > 0) {
                    console.warn(`Total users with invalid parentId (converted to root): ${invalidParentCount}`);
                }

                const rootNodes = processedData.filter((p) => p.parentId === null);
                console.log(`Processed Data: ${processedData.length} users. Number of root nodes found: ${rootNodes.length}`);
                if (rootNodes.length === 0 && processedData.length > 0) {
                    console.error(
                        'No root nodes found after processing, but data is present. This will likely cause issues. Check data for circular dependencies not caught or other structural problems.',
                    );
                    setError('Chart data is malformed (no root nodes). Please check data integrity.');
                } else if (rootNodes.length > 1) {
                    console.log(
                        'Multiple root nodes details:',
                        rootNodes.map((n) => ({ id: n.id, name: n.name })),
                    );
                }

                setChartData(processedData);
            })
            .catch((err) => {
                console.error('Error fetching organization data:', err);
                if (err.response) {
                    setError(`Failed to load data: ${err.response.status} ${err.response.statusText}. Check console for more details.`);
                } else if (err.request) {
                    setError('Failed to load data: No response from server. Check network and API endpoint.');
                } else {
                    setError(`Failed to load data: ${err.message}`);
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const memoizedChartData = useMemo(() => chartData, [chartData]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Organization Chart" />
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="mb-6 text-center sm:text-left">
                    <h1 className="text-foreground text-2xl font-bold sm:text-3xl">Organization Chart</h1>
                    <p className="text-muted-foreground mt-1">Visualize your company's reporting structure.</p>
                </div>

                {loading && (
                    <div className="flex h-[500px] items-center justify-center">
                        <Skeleton className="h-full w-full rounded-xl" />
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-destructive/10 border-destructive text-destructive my-4 rounded-md border p-4 text-center">
                        <p className="font-semibold">Error Loading Chart</p>
                        <p>{error}</p>
                    </div>
                )}

                {!loading && !error && memoizedChartData.length > 0 && (
                    <div className="bg-background border-border rounded-lg border p-1 shadow-sm sm:p-2">
                        <D3OrgChartWrapper data={memoizedChartData} />
                    </div>
                )}

                {!loading && !error && memoizedChartData.length === 0 && (
                    <p className="text-muted-foreground py-10 text-center">No organization data to display.</p>
                )}
            </div>
        </AppLayout>
    );
}
