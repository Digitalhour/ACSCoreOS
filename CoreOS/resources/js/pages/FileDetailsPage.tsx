import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { AlertCircle, ArrowLeft, Database, Download, FileText, RefreshCw, ShoppingCart } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import EditablePartDetailsModal from './parts_pages/components/EditablePartDetailsModal';

interface FileDetailsPageProps {
    fileName: string;
}

interface FileStatistics {
    total_parts: number;
    active_parts: number;
    inactive_parts: number;
    parts_with_shopify: number;
    parts_with_images: number;
    shopify_match_rate: number;
    image_match_rate: number;
    unique_manufacturers: number;
    unique_categories: number;
    unique_batches: number;
    first_imported_at: string;
    last_imported_at: string;
}

interface BatchInfo {
    import_batch_id: string;
    parts_count: number;
    batch_imported_at: string;
}

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

interface FileDetailsResponse {
    file_name: string;
    statistics: FileStatistics;
    batches: BatchInfo[];
    parts: {
        current_page: number;
        data: SamplePart[];
        from: number;
        last_page: number;
        per_page: number;
        to: number;
        total: number;
    };
}

export default function FileDetailsPage({ fileName }: FileDetailsPageProps) {
    const [fileDetails, setFileDetails] = useState<FileDetailsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [selectedPart, setSelectedPart] = useState<SamplePart | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [updatingPartId, setUpdatingPartId] = useState<number | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Parts Database',
            href: route('parts.catalog'),
        },
        {
            title: 'Data Management',
            href: route('data.management'),
        },
        {
            title: fileName,
            href: route('data.file.details', { fileName }),
        },
    ];

    useEffect(() => {
        loadFileDetails();
    }, [fileName, currentPage, perPage]);

    const loadFileDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('Loading file details...');
            // Add a timestamp to prevent caching
            const timestamp = new Date().getTime();
            const response = await axios.get<FileDetailsResponse>(`/api/imported-data/statistics/${encodeURIComponent(fileName)}`, {
                params: {
                    page: currentPage,
                    per_page: perPage,
                    _t: timestamp, // Cache-busting parameter
                },
            });
            console.log('File details loaded:', response.data);
            setFileDetails(response.data);
        } catch (error: any) {
            console.error('Error loading file details:', error);
            setError(error.response?.data?.error || 'Failed to load file details');
            toast.error('Failed to load file details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        await loadFileDetails();
        toast.success('Data refreshed successfully');
    };

    const handleExport = () => {
        window.location.href = `/api/imported-data/export/${encodeURIComponent(fileName)}`;
    };

    const handleToggleActive = async (partId: number, isActive: boolean) => {
        console.log(`Toggling part ${partId} to ${isActive ? 'active' : 'inactive'}`);
        setUpdatingPartId(partId);
        try {
            const response = await axios.put(`/api/imported-data/${partId}`, {
                is_active: isActive,
            });
            console.log('Toggle response:', response.data);

            // Update the local state to reflect the change
            if (fileDetails) {
                console.log('Updating local state with new active status');
                const updatedParts = fileDetails.parts.data.map((part) => (part.id === partId ? { ...part, is_active: isActive } : part));

                // Calculate new active/inactive counts
                const newActiveParts = isActive ? fileDetails.statistics.active_parts + 1 : fileDetails.statistics.active_parts - 1;

                const newInactiveParts = isActive ? fileDetails.statistics.inactive_parts - 1 : fileDetails.statistics.inactive_parts + 1;

                console.log(`New counts - Active: ${newActiveParts}, Inactive: ${newInactiveParts}`);

                setFileDetails({
                    ...fileDetails,
                    parts: {
                        ...fileDetails.parts,
                        data: updatedParts,
                    },
                    statistics: {
                        ...fileDetails.statistics,
                        active_parts: newActiveParts,
                        inactive_parts: newInactiveParts,
                    },
                });
            }

            toast.success(`Part ${isActive ? 'activated' : 'deactivated'} successfully`);
        } catch (error) {
            console.error('Error updating part status:', error);
            toast.error('Failed to update part status');
        } finally {
            setUpdatingPartId(null);
        }
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
            <Head title={`File Details: ${fileName}`} />
            <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center space-x-4">
                        <Button variant="outline" onClick={() => window.history.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{fileName}</h1>
                            <p className="text-muted-foreground mt-1 text-sm">Detailed information about parts imported from this file.</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mb-6 flex space-x-4">
                    <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="default" onClick={handleExport} disabled={isLoading}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
                        <span>Loading file details...</span>
                    </div>
                ) : error ? (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                    </Alert>
                ) : fileDetails ? (
                    <>
                        {/* Statistics Overview */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Database className="h-5 w-5" />
                                    <span>File Statistics</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {/* Parts Statistics */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium">Parts</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {fileDetails.statistics.total_parts.toLocaleString()}
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">Total Parts</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                    {fileDetails.statistics.active_parts.toLocaleString()}
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">Active Parts</div>
                                            </div>
                                            {fileDetails.statistics.inactive_parts > 0 && (
                                                <div>
                                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                        {fileDetails.statistics.inactive_parts.toLocaleString()}
                                                    </div>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">Inactive Parts</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Shopify Statistics */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium">Shopify Integration</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                    {fileDetails.statistics.parts_with_shopify.toLocaleString()}
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">Matched</div>
                                            </div>
                                            <div>
                                                <div
                                                    className={`text-2xl font-bold ${getMatchStatusColor(fileDetails.statistics.shopify_match_rate)}`}
                                                >
                                                    {fileDetails.statistics.shopify_match_rate}%
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">Match Rate</div>
                                                <div className="mt-1">{getMatchStatusBadge(fileDetails.statistics.shopify_match_rate)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Images Statistics */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium">Images</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                    {fileDetails.statistics.parts_with_images.toLocaleString()}
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">With Images</div>
                                            </div>
                                            <div>
                                                <div className={`text-2xl font-bold ${getMatchStatusColor(fileDetails.statistics.image_match_rate)}`}>
                                                    {fileDetails.statistics.image_match_rate}%
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">Image Rate</div>
                                                <div className="mt-1">{getMatchStatusBadge(fileDetails.statistics.image_match_rate)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium">Metadata</h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            <div>
                                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Unique Manufacturers</div>
                                                <div className="text-lg font-semibold">{fileDetails.statistics.unique_manufacturers}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Unique Categories</div>
                                                <div className="text-lg font-semibold">{fileDetails.statistics.unique_categories}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Import Information */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium">Import Information</h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            <div>
                                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">First Imported</div>
                                                <div className="text-lg font-semibold">
                                                    {fileDetails.statistics.first_imported_at
                                                        ? formatDate(fileDetails.statistics.first_imported_at)
                                                        : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Imported</div>
                                                <div className="text-lg font-semibold">
                                                    {fileDetails.statistics.last_imported_at
                                                        ? formatDate(fileDetails.statistics.last_imported_at)
                                                        : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Import Batches</div>
                                                <div className="text-lg font-semibold">{fileDetails.statistics.unique_batches}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Import Batches */}
                        {fileDetails.batches.length > 0 && (
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <FileText className="h-5 w-5" />
                                        <span>Import Batches</span>
                                        <Badge variant="secondary">{fileDetails.batches.length} batches</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Batch ID</TableHead>
                                                <TableHead>Parts Count</TableHead>
                                                <TableHead>Imported At</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fileDetails.batches.map((batch) => (
                                                <TableRow key={batch.import_batch_id}>
                                                    <TableCell className="font-medium">{batch.import_batch_id}</TableCell>
                                                    <TableCell>{batch.parts_count.toLocaleString()}</TableCell>
                                                    <TableCell>{formatDate(batch.batch_imported_at)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* All Parts */}
                        {fileDetails.parts.data.length > 0 && (
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <ShoppingCart className="h-5 w-5" />
                                        <span>All Parts</span>
                                        <Badge variant="secondary">{fileDetails.parts.total.toLocaleString()} parts</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
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
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fileDetails.parts.data.map((part) => (
                                                <TableRow
                                                    key={part.id}
                                                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                                    onClick={() => {
                                                        setSelectedPart(part);
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    <TableCell className="font-medium">{part.part_number}</TableCell>
                                                    <TableCell className="max-w-xs truncate">{part.description}</TableCell>
                                                    <TableCell>{part.manufacturer || 'N/A'}</TableCell>
                                                    <TableCell>{part.category || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                                            <Switch
                                                                checked={part.is_active}
                                                                onCheckedChange={(checked) => handleToggleActive(part.id, checked)}
                                                                disabled={updatingPartId === part.id}
                                                            />
                                                            <span className="text-sm">
                                                                {updatingPartId === part.id ? (
                                                                    <span className="text-gray-500">Updating...</span>
                                                                ) : part.is_active ? (
                                                                    <span className="text-green-600 dark:text-green-400">Active</span>
                                                                ) : (
                                                                    <span className="text-gray-500">Inactive</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {part.has_shopify_id ? (
                                                            <Badge
                                                                variant="default"
                                                                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                                            >
                                                                Yes
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive">No</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {part.has_image ? (
                                                            <Badge
                                                                variant="default"
                                                                className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                            >
                                                                Yes
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive">No</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {/* Pagination */}
                                    {fileDetails.parts.last_page > 1 && (
                                        <div className="flex items-center justify-between px-2 py-4">
                                            <div className="text-sm text-gray-500">
                                                Showing {fileDetails.parts.from} to {fileDetails.parts.to} of {fileDetails.parts.total} parts
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
                                                    Page {currentPage} of {fileDetails.parts.last_page}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(Math.min(fileDetails.parts.last_page, currentPage + 1))}
                                                    disabled={currentPage === fileDetails.parts.last_page}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 text-center">
                                        <Button variant="outline" onClick={handleExport}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Export All Parts
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : null}
            </div>
            <Toaster richColors position="top-right" />

            {/* Part Details Modal */}
            <EditablePartDetailsModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} part={selectedPart} onPartUpdated={loadFileDetails} />
        </AppLayout>
    );
}
