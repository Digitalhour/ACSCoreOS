import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { AlertCircle, Database, Download, Eye, FileText, MoreHorizontal, RefreshCw, Search, ShoppingCart, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Import the working modal from the parts catalog
import EditablePartDetailsModal from '@/pages/parts_pages/components/EditablePartDetailsModal';
import { Part } from '@/pages/parts_pages/components/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Parts Database',
        href: route('parts.catalog'),
    },
    {
        title: 'Data Management',
        href: route('data.management'),
    },
];

interface FileSummary {
    file_name: string;
    total_parts: number;
    active_parts: number;
    parts_with_shopify: number;
    shopify_match_rate: number;
    parts_without_shopify: number;
    batch_count: number;
    max_import_timestamp: string;
    min_import_timestamp: string;
}

interface FileSummariesResponse {
    data: FileSummary[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface ShopifyMatchStats {
    total_parts: number;
    parts_with_shopify_id: number;
    parts_without_shopify_id: number;
    match_percentage: number;
    batch_id?: string;
}

// Sample part interface for the file details (matches the working structure from EditablePartDetailsModal)
interface SamplePart {
    id: number;
    part_number: string;
    description: string;
    manufacturer: string;
    category: string;
    has_shopify_id: boolean;
    has_image: boolean;
    is_active: boolean;
    imported_at: string;
}

interface FileDetailResponse {
    file_name: string;
    total_parts: number;
    active_parts: number;
    parts_with_shopify: number;
    shopify_match_rate: number;
    sample_parts: SamplePart[];
}

export default function DataManagementPage() {
    const [fileSummaries, setFileSummaries] = useState<FileSummariesResponse | null>(null);
    const [shopifyStats, setShopifyStats] = useState<ShopifyMatchStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('last_imported_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    // Add modal state for part details
    const [selectedPart, setSelectedPart] = useState<SamplePart | Part | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fileDetails, setFileDetails] = useState<FileDetailResponse | null>(null);
    const [isLoadingFileDetails, setIsLoadingFileDetails] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentPage, perPage, sortBy, sortDirection]);

    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            if (currentPage === 1) {
                loadData();
            } else {
                setCurrentPage(1);
            }
        }, 500);

        return () => clearTimeout(delayedSearch);
    }, [searchTerm]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([loadFileSummaries(), loadShopifyStats()]);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const loadFileSummaries = async () => {
        try {
            const response = await axios.get<FileSummariesResponse>('/api/imported-data/file-summaries', {
                params: {
                    page: currentPage,
                    per_page: perPage,
                    sort_by: sortBy,
                    sort_direction: sortDirection,
                    search: searchTerm || undefined,
                },
            });
            setFileSummaries(response.data);
        } catch (error) {
            console.error('Error loading file summaries:', error);
            throw error;
        }
    };

    const loadShopifyStats = async () => {
        try {
            const response = await axios.get('/admin/shopify/stats');
            if (response.data.success) {
                setShopifyStats(response.data.stats);
            }
        } catch (error: any) {
            console.warn('Shopify stats not available:', error.response?.status);
            if (error.response?.status !== 404) {
                console.error('Error loading Shopify stats:', error);
            }
        }
    };

    // New function to load file details with sample parts
    const loadFileDetails = async (fileName: string) => {
        setIsLoadingFileDetails(true);
        try {
            const response = await axios.get<FileDetailResponse>(`/api/imported-data/file-details/${encodeURIComponent(fileName)}`);
            setFileDetails(response.data);
        } catch (error) {
            console.error('Error loading file details:', error);
            toast.error('Failed to load file details');
        } finally {
            setIsLoadingFileDetails(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await loadData();
            toast.success('Data refreshed successfully');
        } catch (error) {
            toast.error('Failed to refresh data');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleDeleteFile = async (fileName: string) => {
        if (showDeleteConfirm !== fileName) {
            setShowDeleteConfirm(fileName);
            return;
        }

        setIsDeleting(fileName);
        try {
            await axios.delete('/api/imported-data/by-filename', {
                data: { file_name: fileName },
            });

            toast.success(`Successfully deleted all data for "${fileName}"`);
            setShowDeleteConfirm(null);
            await loadData(); // Refresh the data
        } catch (error: any) {
            console.error('Error deleting file:', error);
            toast.error(error.response?.data?.message || 'Failed to delete file data');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDirection('desc');
        }
        setCurrentPage(1);
    };

    const handleViewFileDetails = async (fileName: string) => {
        await loadFileDetails(fileName);
    };

    const handleShowPartDetails = (part: SamplePart) => {
        setSelectedPart(part);
        setIsModalOpen(true);
    };

    // Function to refresh data after part update
    const handlePartUpdated = () => {
        if (fileDetails) {
            loadFileDetails(fileDetails.file_name);
        }
        loadData(); // Also refresh the main summaries
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getMatchStatusColor = (percentage: number) => {
        if (percentage >= 80) return 'text-green-600 dark:text-green-400';
        if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getMatchStatusBadge = (percentage: number) => {
        if (percentage >= 80)
            return (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Excellent
                </Badge>
            );
        if (percentage >= 50)
            return (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Good
                </Badge>
            );
        return <Badge variant="destructive">Needs Work</Badge>;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Imported Data Management" />
            <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Manage Imported Parts Data</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        View, manage, and delete imported parts data from CSV files. Monitor Shopify product matching status.
                    </p>
                </div>

                {/* Shopify Statistics Card */}
                {shopifyStats && (
                    <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2 text-blue-900 dark:text-blue-100">
                                <ShoppingCart className="h-5 w-5" />
                                <span>Shopify Product Matching Overview</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {shopifyStats.total_parts.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Parts</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {shopifyStats.parts_with_shopify_id.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Matched</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                        {shopifyStats.parts_without_shopify_id.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Unmatched</div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-2xl font-bold ${getMatchStatusColor(shopifyStats.match_percentage)}`}>
                                        {shopifyStats.match_percentage}%
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Match Rate</div>
                                    <div className="mt-1">{getMatchStatusBadge(shopifyStats.match_percentage)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* File Details Card - Shows when a file is selected */}
                {fileDetails && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <FileText className="h-5 w-5" />
                                    <span>File Details: {fileDetails.file_name}</span>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setFileDetails(null)}>
                                    ✕ Close
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="text-center">
                                    <div className="text-xl font-bold">{fileDetails.total_parts}</div>
                                    <div className="text-sm text-gray-600">Total Parts</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-bold text-green-600">{fileDetails.active_parts}</div>
                                    <div className="text-sm text-gray-600">Active Parts</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-bold text-blue-600">{fileDetails.parts_with_shopify}</div>
                                    <div className="text-sm text-gray-600">Shopify Matched</div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-xl font-bold ${getMatchStatusColor(fileDetails.shopify_match_rate)}`}>
                                        {fileDetails.shopify_match_rate}%
                                    </div>
                                    <div className="text-sm text-gray-600">Match Rate</div>
                                </div>
                            </div>

                            {/* Sample Parts Table */}
                            <div>
                                <h4 className="mb-3 font-semibold">Sample Parts from this file:</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Part Number</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Manufacturer</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Shopify</TableHead>
                                            <TableHead>Image</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fileDetails.sample_parts.map((part) => (
                                            <TableRow key={part.id}>
                                                <TableCell className="font-medium">{part.part_number}</TableCell>
                                                <TableCell>{part.description?.slice(0, 50)}...</TableCell>
                                                <TableCell>{part.manufacturer}</TableCell>
                                                <TableCell>{part.category}</TableCell>
                                                <TableCell>
                                                    {part.is_active ? (
                                                        <Badge variant="default" className="bg-green-100 text-green-800">
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Inactive</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {part.has_shopify_id ? (
                                                        <Badge variant="outline" className="text-green-600">
                                                            <ShoppingCart className="mr-1 h-3 w-3" />
                                                            Yes
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-gray-500">
                                                            No
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {part.has_image ? (
                                                        <Badge variant="outline" className="text-blue-600">
                                                            ✓ Image
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-gray-500">
                                                            No Image
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="outline" size="sm" onClick={() => handleShowPartDetails(part)}>
                                                        <Eye className="h-4 w-4" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Controls */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                            <div className="flex flex-1 items-center space-x-4">
                                <div className="relative max-w-sm flex-1">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        placeholder="Search file names..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Select
                                    value={`${sortBy}-${sortDirection}`}
                                    onValueChange={(value) => {
                                        const [column, direction] = value.split('-');
                                        setSortBy(column);
                                        setSortDirection(direction as 'asc' | 'desc');
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="last_imported_at-desc">Latest First</SelectItem>
                                        <SelectItem value="last_imported_at-asc">Oldest First</SelectItem>
                                        <SelectItem value="file_name-asc">Name A-Z</SelectItem>
                                        <SelectItem value="file_name-desc">Name Z-A</SelectItem>
                                        <SelectItem value="total_parts-desc">Most Parts</SelectItem>
                                        <SelectItem value="total_parts-asc">Least Parts</SelectItem>
                                        <SelectItem value="active_parts-desc">Most Active</SelectItem>
                                        <SelectItem value="active_parts-asc">Least Active</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Database className="h-5 w-5" />
                            <span>Imported Data Files</span>
                            {fileSummaries && <Badge variant="secondary">{fileSummaries.total} files</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
                                <span>Loading data...</span>
                            </div>
                        ) : fileSummaries?.data?.length ? (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead
                                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                                onClick={() => handleSort('file_name')}
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <FileText className="h-4 w-4" />
                                                    <span>File Name</span>
                                                    {sortBy === 'file_name' && <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                                onClick={() => handleSort('total_parts')}
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <span>Total Parts</span>
                                                    {sortBy === 'total_parts' && (
                                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                                    )}
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                                onClick={() => handleSort('active_parts')}
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <span>Active Parts</span>
                                                    {sortBy === 'active_parts' && (
                                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                                    )}
                                                </div>
                                            </TableHead>
                                            <TableHead>
                                                <div className="flex items-center space-x-1">
                                                    <ShoppingCart className="h-4 w-4" />
                                                    <span>Shopify Match</span>
                                                </div>
                                            </TableHead>
                                            <TableHead
                                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                                onClick={() => handleSort('last_imported_at')}
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <Upload className="h-4 w-4" />
                                                    <span>Last Imported</span>
                                                    {sortBy === 'last_imported_at' && (
                                                        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                                    )}
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fileSummaries.data.map((file) => (
                                            <TableRow key={file.file_name}>
                                                <TableCell>
                                                    <div className="font-medium">{file.file_name}</div>
                                                    {file.batch_count > 1 && <div className="text-xs text-gray-500">{file.batch_count} batches</div>}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{file.total_parts.toLocaleString()}</Badge>
                                                    {file.total_parts !== file.active_parts && (
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            {file.total_parts - file.active_parts} inactive
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{file.active_parts.toLocaleString()}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        <Badge
                                                            variant={
                                                                file.shopify_match_rate >= 80
                                                                    ? 'default'
                                                                    : file.shopify_match_rate >= 50
                                                                      ? 'secondary'
                                                                      : 'destructive'
                                                            }
                                                            className={
                                                                file.shopify_match_rate >= 80
                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                    : file.shopify_match_rate >= 50
                                                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                                      : ''
                                                            }
                                                        >
                                                            {file.shopify_match_rate}%
                                                        </Badge>
                                                        <span className="text-xs text-gray-500">
                                                            ({file.parts_with_shopify}/{file.active_parts})
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{formatDate(file.max_import_timestamp)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => handleViewFileDetails(file.file_name)}
                                                                disabled={isLoadingFileDetails}
                                                            >
                                                                {isLoadingFileDetails ? (
                                                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                )}
                                                                View Sample Parts
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    // Navigate to detailed view
                                                                    window.location.href = `/data-management/file/${encodeURIComponent(file.file_name)}`;
                                                                }}
                                                            >
                                                                <FileText className="mr-2 h-4 w-4" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    // Export file data
                                                                    window.location.href = `/api/imported-data/export/${encodeURIComponent(file.file_name)}`;
                                                                }}
                                                            >
                                                                <Download className="mr-2 h-4 w-4" />
                                                                Export Data
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteFile(file.file_name)}
                                                                className="text-red-600 dark:text-red-400"
                                                                disabled={isDeleting === file.file_name}
                                                            >
                                                                {isDeleting === file.file_name ? (
                                                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                )}
                                                                {showDeleteConfirm === file.file_name ? 'Confirm Delete' : 'Delete File Data'}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {fileSummaries.last_page > 1 && (
                                    <div className="flex items-center justify-between px-2 py-4">
                                        <div className="text-sm text-gray-500">
                                            Showing {fileSummaries.from} to {fileSummaries.to} of {fileSummaries.total} files
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                Previous
                                            </Button>
                                            <span className="text-sm">
                                                Page {currentPage} of {fileSummaries.last_page}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(Math.min(fileSummaries.last_page, currentPage + 1))}
                                                disabled={currentPage === fileSummaries.last_page}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-8 text-center">
                                <Database className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">No imported parts found</h3>
                                <p className="mb-4 text-gray-500 dark:text-gray-400">
                                    {searchTerm ? 'No files match your search criteria.' : 'Start by importing some CSV parts data.'}
                                </p>
                                {!searchTerm && (
                                    <Button variant="outline" onClick={() => (window.location.href = '/csv-uploader')}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Import Data
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Delete Confirmation Alert */}
                {showDeleteConfirm && (
                    <Alert className="mt-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertDescription className="text-red-800 dark:text-red-200">
                            <strong>Warning:</strong> You are about to delete all data for "{showDeleteConfirm}". This action cannot be undone. Click
                            "Confirm Delete" in the actions menu to proceed, or click elsewhere to cancel.
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            {/* Part Details Modal - Using the working modal from parts catalog */}
            <EditablePartDetailsModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} part={selectedPart} onPartUpdated={handlePartUpdated} />

            <Toaster richColors position="top-right" />
        </AppLayout>
    );
}
