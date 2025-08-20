import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Progress} from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Head, router} from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Archive,
    BarChart3,
    ChevronDown,
    ChevronRight,
    Clock,
    ExternalLink,
    Eye,
    FileText,
    Package,
    Play,
    RefreshCw,
    ShoppingCart,
    Trash2,
    Upload,
    Zap
} from 'lucide-react';
import React, {useCallback, useEffect, useState} from 'react';
import {toast} from 'sonner';
import PartsUploadModal from './PartsUploadModal';

interface Upload {
    id: number;
    filename: string;
    original_filename: string;
    upload_type: string;
    batch_id: string;
    total_parts: number;
    processed_parts: number;
    status: 'pending' | 'analyzing' | 'chunked' | 'processing' | 'completed' | 'completed_with_errors' | 'failed';
    uploaded_at: string;
    completed_at?: string;
    shopify_synced_count: number;
    shopify_sync_percentage: number;
    is_stuck?: boolean;
    children?: Upload[];
}

interface Part {
    id: number;
    part_number: string;
    description?: string;
    manufacturer?: string;
    upload: {
        filename: string;
    };
    shopify_data?: {
        shopify_id: string;
        storefront_url?: string;
    };
}

interface Statistics {
    total_uploads: number;
    total_parts: number;
    parts_with_shopify: number;
    unique_manufacturers: number;
}

interface QueueStatus {
    queues: {
        file_processing: number;
        chunk_processing: number;
        aggregation: number;
        shopify_sync: number;
        default: number;
        total: number;
    };
    uploads: {
        pending: number;
        analyzing: number;
        chunked: number;
        processing: number;
        completed: number;
        completed_with_errors: number;
        failed: number;
    };
    processing_uploads: unknown[];
    shopify_progress: unknown[];
    issues: {
        stuck_processing: number;
        recent_failures: number;
    };
    status: 'idle' | 'busy' | 'degraded' | 'warning';
    last_updated: string;
}

interface Props {
    uploads: {
        data: Upload[];
        current_page: number;
        last_page: number;
    };
    parts?: {
        data: Part[];
        current_page: number;
        last_page: number;
    };
    statistics?: Statistics;
    queueStatus?: QueueStatus;
    filters: {
        uploadsPage: number;
        partsPage: number;
        uploadsSearch: string;
        partsSearch: string;
        statusFilter: string;
        shopifyFilter: string;
        selectedUploadId: string;
        activeTab: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Parts Dataset',
        href: '/parts',
    },
];

const PartsIndex: React.FC<Props> = ({
                                         uploads,
                                         parts,
                                         statistics,
                                         queueStatus,
                                         filters
                                     }) => {
    const [activeTab, setActiveTab] = useState<string>(filters.activeTab || 'uploads');
    const [expandedUploads, setExpandedUploads] = useState<Set<number>>(new Set());
    const [uploadsSearch, setUploadsSearch] = useState<string>(filters.uploadsSearch || '');
    const [partsSearch, setPartsSearch] = useState<string>(filters.partsSearch || '');
    const [statusFilter, setStatusFilter] = useState<string>(filters.statusFilter || 'all');
    const [shopifyFilter, setShopifyFilter] = useState<string>(filters.shopifyFilter || 'all');
    const [selectedUploadId, setSelectedUploadId] = useState<string>(filters.selectedUploadId || 'all');
    const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);

    // Auto-refresh for processing uploads
    useEffect(() => {
        if (uploads.data.some(upload => ['analyzing', 'chunked', 'processing'].includes(upload.status))) {
            const interval = setInterval(() => {
                router.reload({ only: ['uploads', 'queueStatus'] });
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [uploads]);

    const handleFilterChange = useCallback((key: string, value: string) => {
        const newFilters: Record<string, string | number> = {
            uploadsPage: filters.uploadsPage,
            partsPage: filters.partsPage,
            uploadsSearch: filters.uploadsSearch,
            partsSearch: filters.partsSearch,
            statusFilter: filters.statusFilter,
            shopifyFilter: filters.shopifyFilter,
            selectedUploadId: filters.selectedUploadId,
            activeTab: filters.activeTab,
        };

        newFilters[key] = value;

        // Reset pagination only when non-page filters change
        if (key !== 'uploadsPage' && (key === 'uploadsSearch' || key === 'statusFilter')) {
            newFilters.uploadsPage = 1;
        }
        if (key !== 'partsPage' && (key === 'partsSearch' || key === 'shopifyFilter' || key === 'selectedUploadId')) {
            newFilters.partsPage = 1;
        }

        router.get('/parts', newFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    }, [filters]);

    const handleUploadSuccess = () => {
        // Refresh uploads, statistics, and queue status after successful upload
        router.reload({ only: ['uploads', 'statistics', 'queueStatus'] });
        toast.success('Upload successful! Data is being processed.');
    };

    const toggleUploadExpansion = (uploadId: number) => {
        setExpandedUploads(prev => {
            const newSet = new Set(prev);
            if (newSet.has(uploadId)) {
                newSet.delete(uploadId);
            } else {
                newSet.add(uploadId);
            }
            return newSet;
        });
    };

    const deleteUpload = (uploadId: number) => {
        if (!confirm('Are you sure you want to delete this upload and all its parts?')) return;

        router.delete(`/api/parts/uploads/${uploadId}`, {
            onSuccess: () => {
                toast.success('Upload deleted successfully');
                router.reload({ only: ['uploads', 'statistics'] });
            },
            onError: () => toast.error('Failed to delete upload'),
        });
    };

    const retryUpload = (uploadId: number) => {
        router.post(`/api/parts/uploads/${uploadId}/retry`, {}, {
            onSuccess: () => {
                toast.success('Upload retry initiated');
                router.reload({ only: ['uploads', 'queueStatus'] });
            },
            onError: () => toast.error('Failed to retry upload'),
        });
    };

    const syncShopifyData = (partIds: number[]) => {
        router.post('/api/parts/sync-shopify', { part_ids: partIds }, {
            onSuccess: () => {
                toast.success('Shopify sync job dispatched');
                router.reload({ only: ['queueStatus'] });
            },
            onError: () => toast.error('Failed to sync Shopify data'),
        });
    };

    const getStatusBadge = (status: string, isStuck?: boolean) => {
        if (isStuck) {
            return (
                <div className="flex items-center gap-1">
                    <Badge variant="destructive">Stuck</Badge>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
            );
        }

        const variants = {
            pending: 'secondary',
            analyzing: 'secondary',
            chunked: 'secondary',
            processing: 'secondary',
            completed: 'default',
            completed_with_errors: 'secondary',
            failed: 'destructive',
        } as const;

        return (
            <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
                {status.replace('_', ' ')}
            </Badge>
        );
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

    const renderUploadProgress = (upload: Upload) => {
        const isExpanded = expandedUploads.has(upload.id);
        const progressPercentage = upload.total_parts > 0
            ? Math.round((upload.processed_parts / upload.total_parts) * 100)
            : 0;

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />

                {isExpanded && (
                    <div className="mt-4 space-y-3">
                        <h4 className="font-medium text-sm">Shopify Sync Progress</h4>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Shopify: {upload.shopify_synced_count}/{upload.total_parts}</span>
                                <span className="font-medium">{upload.shopify_sync_percentage}%</span>
                            </div>
                            <Progress value={upload.shopify_sync_percentage} className="h-2" />

                            {upload.shopify_sync_percentage >= 95 || upload.status === 'completed' ? (
                                <Badge variant="default" className="text-xs">Sync Complete</Badge>
                            ) : upload.shopify_sync_percentage > 0 ? (
                                <Badge variant="secondary" className="text-xs">Syncing...</Badge>
                            ) : (
                                <Badge variant="outline" className="text-xs">Not Started</Badge>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Parts Dataset" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Parts Dataset</h1>
                        <p className="text-muted-foreground">Manage uploaded parts data and Shopify integration</p>
                    </div>
                    <Button onClick={() => setUploadModalOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Parts
                    </Button>
                </div>

                {/* System Status Alert */}
                {queueStatus && (queueStatus.status !== 'idle' || queueStatus.issues.stuck_processing > 0) && (
                    <Alert className={queueStatus.status === 'degraded' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            <div className="space-y-1">
                                {queueStatus.status === 'degraded' && (
                                    <div className="text-red-700 font-medium">System Performance Degraded</div>
                                )}
                                {queueStatus.issues.stuck_processing > 0 && (
                                    <div className="text-red-600">
                                        {queueStatus.issues.stuck_processing} uploads stuck in processing
                                    </div>
                                )}
                                {queueStatus.queues.total > 10 && (
                                    <div className="text-orange-600">
                                        High queue load: {queueStatus.queues.total} jobs pending
                                    </div>
                                )}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Statistics Cards */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-6">
                    <Card>
                        <CardContent className="flex items-center p-6">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-muted-foreground">Total Uploads</p>
                                <p className="text-2xl font-bold">{statistics?.total_uploads || 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex items-center p-6">
                            <Package className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-muted-foreground">Total Parts</p>
                                <p className="text-2xl font-bold">{statistics?.total_parts || 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex items-center p-6">
                            <ShoppingCart className="h-8 w-8 text-purple-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-muted-foreground">Shopify Synced</p>
                                <p className="text-2xl font-bold">{statistics?.parts_with_shopify || 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex items-center p-6">
                            <BarChart3 className="h-8 w-8 text-orange-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-muted-foreground">Manufacturers</p>
                                <p className="text-2xl font-bold">{statistics?.unique_manufacturers || 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex items-center p-6">
                            <div className="text-center w-full">
                                <p className="text-sm font-medium text-muted-foreground">Shopify Match Rate</p>
                                <p className="text-2xl font-bold">
                                    {(statistics?.total_parts || 0) > 0
                                        ? Math.round(((statistics?.parts_with_shopify || 0) / (statistics?.total_parts || 1)) * 100)
                                        : 0}%
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {queueStatus && (
                        <Card>
                            <CardContent className="flex items-center p-6">
                                <Activity className={`h-8 w-8 ${
                                    queueStatus.status === 'degraded' ? 'text-red-600' :
                                        queueStatus.status === 'busy' ? 'text-orange-600' : 'text-green-600'
                                }`} />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-muted-foreground">System Status</p>
                                    <p className="text-lg font-bold capitalize">{queueStatus.status}</p>
                                    <p className="text-xs text-muted-foreground">{queueStatus.queues.total} queued</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Main Content */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative flex-1 overflow-hidden rounded-xl border">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                        <div className="border-b px-4 py-2">
                            <TabsList>
                                <TabsTrigger value="uploads">Uploads</TabsTrigger>
                                <TabsTrigger value="parts">Parts</TabsTrigger>
                                {queueStatus && (
                                    <TabsTrigger value="queue">
                                        Queue ({queueStatus.queues.total})
                                    </TabsTrigger>
                                )}
                            </TabsList>
                        </div>

                        <div className="overflow-auto p-4 h-[calc(100%-60px)]">
                            {/* Uploads Tab */}
                            <TabsContent value="uploads" className="space-y-4 mt-0">
                                <div className="flex gap-4">
                                    <Input
                                        placeholder="Search uploads..."
                                        value={uploadsSearch}
                                        onChange={(e) => setUploadsSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleFilterChange('uploadsSearch', uploadsSearch)}
                                        className="max-w-sm"
                                    />
                                    <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); handleFilterChange('statusFilter', value); }}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder="Filter by status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All statuses</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="processing">Processing</SelectItem>
                                            <SelectItem value="failed">Failed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" onClick={() => router.reload()}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Refresh
                                    </Button>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Filename</TableHead>
                                            <TableHead>Status & Progress</TableHead>
                                            <TableHead>Parts</TableHead>
                                            <TableHead>Uploaded</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {uploads.data.map((upload) => (
                                            <React.Fragment key={upload.id}>
                                                {/* Parent Upload Row */}
                                                <TableRow>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {upload.children && upload.children.length > 0 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => toggleUploadExpansion(upload.id)}
                                                                    className="p-0 h-6 w-6"
                                                                >
                                                                    {expandedUploads.has(upload.id) ?
                                                                        <ChevronDown className="h-4 w-4" /> :
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    }
                                                                </Button>
                                                            )}
                                                            {upload.upload_type === 'zip' ? (
                                                                <Archive className="h-4 w-4 text-purple-600" />
                                                            ) : (
                                                                <FileText className="h-4 w-4 text-blue-600" />
                                                            )}
                                                            <div>
                                                                <div>{upload.original_filename}</div>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {upload.upload_type}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-2">
                                                            {getStatusBadge(upload.status, upload.is_stuck)}
                                                            {renderUploadProgress(upload)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{upload.total_parts}</div>
                                                            <div className="text-sm text-gray-500">
                                                                Shopify: {upload.shopify_synced_count} ({upload.shopify_sync_percentage}%)
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{formatDate(upload.uploaded_at)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    handleFilterChange('selectedUploadId', upload.id.toString());
                                                                    setActiveTab('parts');
                                                                }}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            {(upload.status === 'failed' || upload.is_stuck) && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => retryUpload(upload.id)}
                                                                >
                                                                    <Play className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => deleteUpload(upload.id)}
                                                                disabled={upload.status === 'processing' && !upload.is_stuck}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>

                                                {/* Child Upload Rows */}
                                                {expandedUploads.has(upload.id) && upload.children?.map((child) => (
                                                    <TableRow key={child.id} className="bg-blue-50">
                                                        <TableCell className="font-medium pl-12">
                                                            <div className="flex items-center gap-2">
                                                                <FileText className="h-4 w-4 text-blue-600" />
                                                                <div>
                                                                    <div>{child.original_filename}</div>
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {child.upload_type}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-2">
                                                                {getStatusBadge(child.status, child.is_stuck)}
                                                                {renderUploadProgress(child)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">{child.total_parts}</div>
                                                                <div className="text-sm text-gray-500">
                                                                    Shopify: {child.shopify_synced_count} ({child.shopify_sync_percentage}%)
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{formatDate(child.uploaded_at)}</TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    handleFilterChange('selectedUploadId', child.id.toString());
                                                                    setActiveTab('parts');
                                                                }}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>

                                {uploads.last_page > 1 && (
                                    <div className="flex items-center justify-center gap-2">
                                        <Button
                                            variant="outline"
                                            disabled={uploads.current_page === 1}
                                            onClick={() => handleFilterChange('uploadsPage', (uploads.current_page - 1).toString())}
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-sm">
                                            Page {uploads.current_page} of {uploads.last_page}
                                        </span>
                                        <Button
                                            variant="outline"
                                            disabled={uploads.current_page === uploads.last_page}
                                            onClick={() => handleFilterChange('uploadsPage', (uploads.current_page + 1).toString())}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Parts Tab */}
                            <TabsContent value="parts" className="space-y-4 mt-0">
                                {parts && (
                                    <>
                                        <div className="flex gap-4">
                                            <Input
                                                placeholder="Search parts..."
                                                value={partsSearch}
                                                onChange={(e) => setPartsSearch(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleFilterChange('partsSearch', partsSearch)}
                                                className="max-w-sm"
                                            />
                                            <Select value={selectedUploadId} onValueChange={(value) => { setSelectedUploadId(value); handleFilterChange('selectedUploadId', value); }}>
                                                <SelectTrigger className="w-48">
                                                    <SelectValue placeholder="Filter by upload" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All uploads</SelectItem>
                                                    {uploads.data.map((upload) => (
                                                        <SelectItem key={upload.id} value={upload.id.toString()}>
                                                            {upload.original_filename}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select value={shopifyFilter} onValueChange={(value) => { setShopifyFilter(value); handleFilterChange('shopifyFilter', value); }}>
                                                <SelectTrigger className="w-48">
                                                    <SelectValue placeholder="Shopify status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All parts</SelectItem>
                                                    <SelectItem value="true">With Shopify data</SelectItem>
                                                    <SelectItem value="false">Without Shopify data</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Part Number</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Manufacturer</TableHead>
                                                    <TableHead>Upload</TableHead>
                                                    <TableHead>Shopify</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {parts.data.map((part) => (
                                                    <TableRow key={part.id}>
                                                        <TableCell className="font-medium">
                                                            {part.part_number}
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate">
                                                            {part.description || '-'}
                                                        </TableCell>
                                                        <TableCell>{part.manufacturer || '-'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {part.upload.filename}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {part.shopify_data?.shopify_id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="default">Synced</Badge>
                                                                    {part.shopify_data.storefront_url && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            asChild
                                                                        >
                                                                            <a
                                                                                href={part.shopify_data.storefront_url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                            >
                                                                                <ExternalLink className="h-4 w-4" />
                                                                            </a>
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <Badge variant="secondary">Not synced</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => syncShopifyData([part.id])}
                                                            >
                                                                <RefreshCw className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>

                                        {parts.last_page > 1 && (
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    disabled={parts.current_page === 1}
                                                    onClick={() => handleFilterChange('partsPage', (parts.current_page - 1).toString())}
                                                >
                                                    Previous
                                                </Button>
                                                <span className="text-sm">
                                                    Page {parts.current_page} of {parts.last_page}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    disabled={parts.current_page === parts.last_page}
                                                    onClick={() => handleFilterChange('partsPage', (parts.current_page + 1).toString())}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </TabsContent>

                            {/* Queue Tab */}
                            <TabsContent value="queue" className="space-y-4 mt-0">
                                {queueStatus && (
                                    <div className="grid auto-rows-min gap-4 md:grid-cols-5">
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">File Processing</p>
                                                        <p className="text-2xl font-bold">{queueStatus.queues.file_processing}</p>
                                                    </div>
                                                    <Clock className="h-8 w-8 text-blue-600" />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Chunk Processing</p>
                                                        <p className="text-2xl font-bold">{queueStatus.queues.chunk_processing}</p>
                                                    </div>
                                                    <Zap className="h-8 w-8 text-green-600" />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Shopify Sync</p>
                                                        <p className="text-2xl font-bold">{queueStatus.queues.shopify_sync}</p>
                                                    </div>
                                                    <ShoppingCart className="h-8 w-8 text-purple-600" />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Aggregation</p>
                                                        <p className="text-2xl font-bold">{queueStatus.queues.aggregation}</p>
                                                    </div>
                                                    <BarChart3 className="h-8 w-8 text-orange-600" />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Issues</p>
                                                        <p className="text-2xl font-bold text-red-600">
                                                            {queueStatus.issues.stuck_processing}
                                                        </p>
                                                    </div>
                                                    <AlertTriangle className="h-8 w-8 text-red-600" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Upload Modal */}
                <PartsUploadModal
                    open={uploadModalOpen}
                    onOpenChange={setUploadModalOpen}
                    onUploadSuccess={handleUploadSuccess}
                />
            </div>
        </AppLayout>
    );
};

export default PartsIndex;

