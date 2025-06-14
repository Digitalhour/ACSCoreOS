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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    CloudUpload,
    MoreHorizontal,
    Pencil,
    Trash2,
    XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import EditDataDialog from './EditDataDialog';

interface ImportedDataRow {
    import_id: number;
    file_name: string;
    row_identifier_key: string | null;
    row_identifier_value: string | null;
    row_data_json: Record<string, any>;
    import_timestamp: string;
}

interface PaginatedResponse {
    data: ImportedDataRow[];
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

const ImportedDataTable: React.FC = () => {
    const [data, setData] = useState<ImportedDataRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [pagination, setPagination] = useState<Omit<PaginatedResponse, 'data' | 'links'>>({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
        first_page_url: null,
        last_page_url: null,
        next_page_url: null,
        prev_page_url: null,
        path: '',
        from: 0,
        to: 0,
    });
    const [links, setLinks] = useState<Array<{ url: string | null; label: string; active: boolean }>>([]);

    const [availableFileNames, setAvailableFileNames] = useState<string[]>([]);
    const [selectedFileName, setSelectedFileName] = useState<string>('');

    const [editingItem, setEditingItem] = useState<ImportedDataRow | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);

    const [itemToDelete, setItemToDelete] = useState<ImportedDataRow | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

    // State for deleting entire dataset by filename
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    // MODIFIED: This state will now control the "Delete All" AlertDialog
    const [isDeleteDatasetDialogOpen, setIsDeleteDatasetDialogOpen] = useState<boolean>(false);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'import_timestamp',
        direction: 'desc',
    });

    const fetchFileNames = useCallback(async () => {
        try {
            const response = await axios.get<string[]>('/api/imported-data/filenames');
            setAvailableFileNames(response.data);
        } catch (err) {
            console.error('Failed to fetch filenames for filter:', err);
            toast.error('Could not load filenames for filter.');
        }
    }, []);

    useEffect(() => {
        fetchFileNames();
    }, [fetchFileNames]);

    const fetchData = useCallback(
        async (page = 1, fileNameToFilter = selectedFileName, currentSortConfig = sortConfig) => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get<PaginatedResponse>('/api/imported-data', {
                    params: {
                        page,
                        file_name: fileNameToFilter || null,
                        per_page: pagination.per_page,
                        sort_by: currentSortConfig.key,
                        sort_direction: currentSortConfig.direction,
                    },
                });
                setData(response.data.data);
                const { data: responseBodyData, links: responseLinks, ...restPagination } = response.data;
                setPagination(restPagination);
                setLinks(responseLinks);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch data.');
                toast.error('Failed to fetch data: ' + (err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        },
        [pagination.per_page, selectedFileName, sortConfig],
    );

    useEffect(() => {
        fetchData(1, selectedFileName, sortConfig);
    }, [selectedFileName, sortConfig, fetchData]);

    const handleFileNameSelectChange = (value: string) => {
        setSelectedFileName(value === 'all' ? '' : value);
        setPagination((prev) => ({ ...prev, current_page: 1 }));
    };

    const clearFilter = () => {
        setSelectedFileName('');
        setPagination((prev) => ({ ...prev, current_page: 1 }));
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= pagination.last_page) {
            fetchData(page, selectedFileName, sortConfig);
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleEdit = (item: ImportedDataRow) => {
        setEditingItem(item);
        setIsEditDialogOpen(true);
    };

    const handleDeleteSingleItem = (item: ImportedDataRow) => {
        setItemToDelete(item);
        setIsDeleteDialogOpen(true); // Open the single delete dialog
    };

    const confirmDeleteSingleItem = async () => {
        if (!itemToDelete) return;
        try {
            await axios.delete(`/api/imported-data/${itemToDelete.import_id}`);
            toast.success(`Record ID ${itemToDelete.import_id} from file '${itemToDelete.file_name}' deleted successfully.`);
            if (data.length === 1 && pagination.current_page > 1) {
                fetchData(pagination.current_page - 1, selectedFileName, sortConfig);
            } else {
                fetchData(pagination.current_page, selectedFileName, sortConfig);
            }
        } catch (err: any) {
            toast.error('Failed to delete record: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsDeleteDialogOpen(false); // Close the single delete dialog
            setItemToDelete(null);
        }
    };

    // MODIFIED: Handler for opening the "Delete All" dialog
    const handleDeleteDataset = () => {
        if (!selectedFileName) {
            toast.warning('Please select a file to delete its dataset.');
            return;
        }
        setFileToDelete(selectedFileName);
        setIsDeleteDatasetDialogOpen(true); // Open the "Delete All" dialog
    };

    const confirmDeleteDataset = async () => {
        if (!fileToDelete) return;
        try {
            const response = await axios.delete(`/api/imported-data-batch`, {
                data: { file_name: fileToDelete },
            });
            toast.success(response.data.message || `All records for file '${fileToDelete}' deleted successfully.`);
            setSelectedFileName(''); // Clear the filter
            await fetchFileNames(); // Refresh the list of available filenames
            await fetchData(1, '', sortConfig); // Refetch all data from page 1
        } catch (err: any) {
            toast.error('Failed to delete dataset: ' + (err.response?.data?.message || err.response?.data?.errors?.file_name?.[0] || err.message));
        } finally {
            setIsDeleteDatasetDialogOpen(false); // Close the "Delete All" dialog
            setFileToDelete(null);
        }
    };

    const handleUpdateSuccess = (updatedItem: ImportedDataRow) => {
        fetchData(pagination.current_page, selectedFileName, sortConfig);
        setIsEditDialogOpen(false);
        setEditingItem(null);
    };

    const displayableJsonKeys = (jsonData: Record<string, any>): string[] => {
        if (!jsonData) return [];
        const priorityKeys = ['Part_Number', 'SKU', 'Name', 'Description', 'Identifier'];
        let keys = priorityKeys.filter((k) => jsonData.hasOwnProperty(k));
        Object.keys(jsonData).forEach((k) => {
            if (!keys.includes(k) && keys.length < 5) {
                keys.push(k);
            }
        });
        return keys;
    };

    if (loading && data.length === 0) {
        return <div className="py-10 text-center">Loading data...</div>;
    }
    if (error && data.length === 0) {
        return <div className="py-10 text-center text-red-500">Error: {error}</div>;
    }
    interface UploadButtonProps {
        route: (name: 'csv.uploader') => string;
        className?: string;
    }

    const UploadButton: React.FC<UploadButtonProps> = ({ route, className }) => (
        <a href={route('csv.uploader')} aria-label="Upload CSV to dataset">
            <Button className={`upload-button ${className || ''}`} variant="link">
                <CloudUpload aria-hidden="true" />
                <span>Add To Dataset</span>
            </Button>
        </a>
    );

    return (
        <div className="space-y-4">
            <div className="bg-card flex flex-col items-center gap-2 rounded-lg border p-4 shadow sm:flex-row sm:justify-between">
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <UploadButton route={route} />
                    </div>
                    <Select value={selectedFileName} onValueChange={handleFileNameSelectChange}>
                        <SelectTrigger className="w-full sm:w-[280px]">
                            <SelectValue placeholder="Filter by filename..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Files</SelectItem>
                            {availableFileNames.map((name) => (
                                <SelectItem key={name} value={name}>
                                    {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedFileName && (
                        <Button onClick={clearFilter} variant="ghost" size="sm" className="text-muted-foreground w-full sm:w-auto">
                            <XCircle className="mr-1 h-4 w-4" /> Clear Filter
                        </Button>
                    )}
                </div>

                {selectedFileName && (
                    // MODIFIED: Control the "Delete All" AlertDialog with state
                    <AlertDialog open={isDeleteDatasetDialogOpen} onOpenChange={setIsDeleteDatasetDialogOpen}>
                        <AlertDialogTrigger asChild>
                            {/* Call the handler to open the dialog */}
                            <Button
                                variant="destructive"
                                size="sm"
                                className="mt-2 w-full sm:mt-0 sm:w-auto"
                                disabled={!selectedFileName}
                                onClick={handleDeleteDataset} // Call the handler here
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete All from '{selectedFileName}'
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center">
                                    <AlertTriangle className="text-destructive mr-2 h-6 w-6" /> Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete <strong>ALL</strong> records associated with the file:
                                    <br />
                                    <strong className="text-lg font-semibold">'{selectedFileName}'</strong>.
                                    <br />
                                    This will remove the entire dataset imported from this file.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDeleteDataset} className="bg-red-600 hover:bg-red-700">
                                    Yes, delete entire dataset
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>

            <div className="overflow-hidden rounded-md border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead onClick={() => handleSort('import_id')} className="hover:bg-muted/50 cursor-pointer">
                                ID <ArrowUpDown className="ml-1 inline-block h-3 w-3" />
                            </TableHead>
                            <TableHead onClick={() => handleSort('file_name')} className="hover:bg-muted/50 cursor-pointer">
                                File Name <ArrowUpDown className="ml-1 inline-block h-3 w-3" />
                            </TableHead>
                            <TableHead>Unique Key</TableHead>
                            <TableHead>Data Preview (First 5 fields)</TableHead>
                            <TableHead onClick={() => handleSort('import_timestamp')} className="hover:bg-muted/50 cursor-pointer">
                                Imported <ArrowUpDown className="ml-1 inline-block h-3 w-3" />
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? (
                            data.map((item) => (
                                <TableRow key={item.import_id}>
                                    <TableCell className="font-medium">{item.import_id}</TableCell>
                                    <TableCell>{item.file_name}</TableCell>
                                    <TableCell className="text-xs">
                                        {item.row_identifier_key ? (
                                            `${item.row_identifier_key}: ${item.row_identifier_value}`
                                        ) : (
                                            <span className="text-muted-foreground italic">N/A</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-md overflow-hidden text-xs text-ellipsis whitespace-nowrap">
                                        {displayableJsonKeys(item.row_data_json)
                                            .map(
                                                (key) =>
                                                    `${key}: ${String(item.row_data_json[key]).substring(0, 20)}${String(item.row_data_json[key]).length > 20 ? '...' : ''}`,
                                            )
                                            .join('; ') || 'No data'}
                                    </TableCell>
                                    <TableCell className="text-xs">{new Date(item.import_timestamp).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(item)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteSingleItem(item)}
                                                    className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/50"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No data found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-muted-foreground text-sm">
                    Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total} records.
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

            {/* Single item delete AlertDialog (controlled by state) */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the record for
                            <span className="font-semibold"> ID {itemToDelete?.import_id}</span> from file
                            <span className="font-semibold"> '{itemToDelete?.file_name}'</span>.
                            {itemToDelete?.row_identifier_key && (
                                <span>
                                    {' '}
                                    (Unique ID: {itemToDelete.row_identifier_key}: {itemToDelete.row_identifier_value})
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteSingleItem} className="bg-red-600 hover:bg-red-700">
                            Yes, delete record
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Dialog */}
            {editingItem && (
                <EditDataDialog
                    isOpen={isEditDialogOpen}
                    onClose={() => {
                        setIsEditDialogOpen(false);
                        setEditingItem(null);
                    }}
                    item={editingItem}
                    onSuccess={handleUpdateSuccess}
                />
            )}
        </div>
    );
};
export default ImportedDataTable;
