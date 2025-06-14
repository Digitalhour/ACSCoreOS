import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';
import { AlertTriangle, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Interface for the summarized dataset/file information
interface DatasetSummaryRow {
    file_name: string;
    row_count: number;
    max_import_timestamp: string; // Or Date object if you parse it
}

// Interface for the paginated response of summaries
interface PaginatedSummaryResponse {
    data: DatasetSummaryRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    first_page_url: string | null;
    last_page_url: string | null;
    next_page_url: string | null;
    prev_page_url: string | null;
    path: string;
    from: number;
    to: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

// This component will now display a summary of uploaded datasets
const DatasetSummaryTable: React.FC = () => {
    const [datasets, setDatasets] = useState<DatasetSummaryRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [pagination, setPagination] = useState<Omit<PaginatedSummaryResponse, 'data' | 'links'>>({
        current_page: 1,
        last_page: 1,
        per_page: 15, // Default per page for datasets
        total: 0,
        first_page_url: null,
        last_page_url: null,
        next_page_url: null,
        prev_page_url: null,
        path: '',
        from: 0,
        to: 0,
    });
    // Links for pagination (not strictly needed if using button-based page changes)
    // const [links, setLinks] = useState<Array<{ url: string | null; label: string; active: boolean }>>([]);

    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    const [isDeleteDatasetDialogOpen, setIsDeleteDatasetDialogOpen] = useState<boolean>(false);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'last_imported_at', // Default sort for datasets
        direction: 'desc',
    });

    const fetchDatasetSummaries = useCallback(
        async (page = 1, currentSortConfig = sortConfig) => {
            setLoading(true);
            setError(null);
            try {
                // Call the new endpoint for file summaries
                const response = await axios.get<PaginatedSummaryResponse>('/api/imported-data/summaries', {
                    params: {
                        page,
                        per_page: pagination.per_page,
                        sort_by: currentSortConfig.key,
                        sort_direction: currentSortConfig.direction,
                    },
                });
                setDatasets(response.data.data);
                const { data: responseBodyData, links: responseLinks, ...restPagination } = response.data;
                setPagination(restPagination);
                // setLinks(responseLinks);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch dataset summaries.');
                toast.error('Failed to fetch dataset summaries: ' + (err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        },
        [pagination.per_page, sortConfig],
    );

    useEffect(() => {
        fetchDatasetSummaries(1, sortConfig);
    }, [sortConfig, fetchDatasetSummaries]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= pagination.last_page) {
            fetchDatasetSummaries(page, sortConfig);
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        // Fetch data with new sort config, resetting to page 1
        fetchDatasetSummaries(1, { key, direction });
    };

    const handleDeleteDataset = (fileName: string) => {
        setFileToDelete(fileName);
        setIsDeleteDatasetDialogOpen(true);
    };

    const confirmDeleteDataset = async () => {
        if (!fileToDelete) return;
        try {
            const response = await axios.delete(`/api/imported-data/by-filename`, {
                data: { file_name: fileToDelete },
            });
            toast.success(response.data.message || `All records for file '${fileToDelete}' deleted successfully.`);
            // Refetch dataset summaries. If on last page and it becomes empty, go to prev page.
            if (datasets?.length === 1 && pagination.current_page > 1) {
                fetchDatasetSummaries(pagination.current_page - 1, sortConfig);
            } else {
                fetchDatasetSummaries(pagination.current_page, sortConfig);
            }
        } catch (err: any) {
            toast.error('Failed to delete dataset: ' + (err.response?.data?.message || err.response?.data?.errors?.file_name?.[0] || err.message));
        } finally {
            setIsDeleteDatasetDialogOpen(false);
            setFileToDelete(null);
        }
    };

    if (loading && datasets?.length === 0) {
        return <div className="py-10 text-center">Loading dataset summaries...</div>;
    }
    if (error && datasets?.length === 0) {
        return <div className="py-10 text-center text-red-500">Error: {error}</div>;
    }

    return (
        <div className="space-y-4">
            {/* Filter bar is removed as we are listing all unique files by default.
                If you want to filter this list of summaries, you'd add a text input filter here.
                The existing getUniqueFileNames can still be used if you want a dropdown to JUMP to a file,
                but this table now lists those files.
            */}

            <div className="overflow-hidden rounded-md border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead onClick={() => handleSort('file_name')} className="hover:bg-muted/50 cursor-pointer">
                                File Name / Dataset <ArrowUpDown className="ml-1 inline-block h-3 w-3" />
                            </TableHead>
                            <TableHead onClick={() => handleSort('total_rows')} className="hover:bg-muted/50 cursor-pointer text-center">
                                Records <ArrowUpDown className="ml-1 inline-block h-3 w-3" />
                            </TableHead>
                            <TableHead onClick={() => handleSort('last_imported_at')} className="hover:bg-muted/50 cursor-pointer">
                                Last Imported <ArrowUpDown className="ml-1 inline-block h-3 w-3" />
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {datasets?.length > 0 ? (
                            datasets.map((dataset) => (
                                <TableRow key={dataset.file_name}>
                                    <TableCell className="font-medium">{dataset.file_name}</TableCell>
                                    <TableCell className="text-center">{dataset.row_count}</TableCell>
                                    <TableCell className="text-xs">
                                        {dataset.max_import_timestamp ? new Date(dataset.max_import_timestamp).toLocaleString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline">Delete Dataset</Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="flex items-center">
                                                                <AlertTriangle className="text-destructive mr-2 h-6 w-6" /> Are you absolutely sure?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete <strong>ALL</strong>{' '}
                                                                records associated with the file:
                                                                <br />
                                                                <strong className="text-lg font-semibold">'{fileToDelete}'</strong>.
                                                                <br />
                                                                This will remove the entire dataset imported from this file.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel onClick={() => setFileToDelete(null)}>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={confirmDeleteDataset} className="bg-red-600 hover:bg-red-700">
                                                                Yes, delete entire dataset
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                                {/*<DropdownMenuItem*/}
                                                {/*    onClick={() => {*/}
                                                {/*        // Navigate to a page that shows individual rows for this file_name*/}
                                                {/*        // This assumes your Inertia route for data.management can accept a file_name filter*/}
                                                {/*        // Or you create a new route/page for viewing a specific dataset's rows.*/}
                                                {/*        // For now, we'll just log. You'd replace this with Inertia.get(...)*/}
                                                {/*        // Example: InertiaLink href={route('data.management.file', dataset.file_name)}*/}
                                                {/*        // Or, if your existing ImportedDataTable can be filtered by prop:*/}
                                                {/*        // You might set a state that causes the main DataManagementPage to render*/}
                                                {/*        // ImportedDataTable with a specific file_name prop.*/}
                                                {/*        console.log('View details for:', dataset.file_name);*/}
                                                {/*        toast.info(`Add route dumbass! `);*/}
                                                {/*        // Example of navigating if you have a route like 'data.management.view'*/}
                                                {/*        // Inertia.get(route('data.management.view', { file: dataset.file_name }));*/}
                                                {/*    }}*/}
                                                {/*>*/}
                                                {/*    <Eye className="mr-2 h-4 w-4" /> View Rows*/}
                                                {/*</DropdownMenuItem>*/}
                                                {/*<DropdownMenuItem*/}
                                                {/*    onClick={() => handleDeleteDataset(dataset.file_name)}*/}
                                                {/*    className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/50"*/}
                                                {/*>*/}
                                                {/*    <Trash2 className="mr-2 h-4 w-4" /> Delete Dataset*/}
                                                {/*</DropdownMenuItem>*/}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No datasets found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-muted-foreground text-sm">
                    Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total} datasets.
                </div>
                <div className="space-x-1">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={pagination.current_page === 1}>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={!pagination.prev_page_url}
                    >
                        <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <span className="p-2 text-sm">
                        Page {pagination.current_page} of {pagination.last_page}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                        disabled={!pagination.next_page_url}
                    >
                        Next <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.last_page)}
                        disabled={pagination.current_page === pagination.last_page}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
export default DatasetSummaryTable; // Renamed for clarity
