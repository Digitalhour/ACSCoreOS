import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Progress} from '@/components/ui/progress';
import axios from 'axios';
import {
    Activity,
    AlertTriangle,
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
    X,
    Zap
} from 'lucide-react';
import React, {useCallback, useEffect, useState} from 'react';
import {toast} from 'sonner';

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
}

interface UploadProgress {
    upload_id: number;
    status: string;
    filename: string;
    total_parts: number;
    processed_parts: number;
    processing_method: 'chunked' | 'standard';
    processing_type: 'chunked' | 'standard';
    overall_progress_percentage: number;
    started_at: string;
    completed_at?: string;
    chunks?: {
        total: number;
        completed: number;
        failed: number;
        processing: number;
        pending: number;
    };
    performance?: {
        avg_processing_time_per_chunk?: number;
        estimated_time_remaining?: string;
        total_processing_time: number;
        chunks_per_minute?: number;
    };
    chunk_details?: ChunkDetail[];
    summary?: {
        total_created_parts: number;
        total_updated_parts: number;
        total_failed_rows: number;
    };
    processing_logs: string[];
}

interface ChunkDetail {
    chunk_number: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    start_row: number;
    end_row: number;
    total_rows: number;
    processed_rows: number;
    created_parts: number;
    updated_parts: number;
    failed_rows: number;
    progress_percentage: number;
    processing_time?: number;
    started_at?: string;
    completed_at?: string;
    error_details?: any;
}

interface QueueStatusDetailed {
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
    processing_uploads: {
        id: number;
        filename: string;
        status: string;
        progress_percentage: number;
        chunks_total: number;
        chunks_completed: number;
        chunks_failed: number;
        started_at: string;
        is_stuck: boolean;
    }[];
    issues: {
        stuck_processing: number;
        recent_failures: number;
    };
    status: 'idle' | 'busy' | 'degraded' | 'warning';
    last_updated: string;
}

const PartsIndex: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>('uploads');
    const [uploads, setUploads] = useState<any>(null);
    const [parts, setParts] = useState<any>(null);
    const [statistics, setStatistics] = useState<any>(null);
    const [queueStatus, setQueueStatus] = useState<QueueStatusDetailed | null>(null);
    const [uploadProgresses, setUploadProgresses] = useState<Record<number, UploadProgress>>({});
    const [expandedUploads, setExpandedUploads] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Filters and pagination
    const [uploadsPage, setUploadsPage] = useState<number>(1);
    const [partsPage, setPartsPage] = useState<number>(1);
    const [uploadsSearch, setUploadsSearch] = useState<string>('');
    const [partsSearch, setPartsSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [shopifyFilter, setShopifyFilter] = useState<string>('all');
    const [selectedUploadId, setSelectedUploadId] = useState<string>('all');

    // Poll for updates every 5 seconds for processing uploads
    useEffect(() => {
        const interval = setInterval(() => {
            loadQueueStatusDetailed();
            refreshProgressForProcessingUploads();
        }, 5000);
        return () => clearInterval(interval);
    }, [uploads]);

    useEffect(() => {
        loadStatistics();
        loadUploads();
        loadQueueStatusDetailed();
    }, []);

    useEffect(() => {
        if (activeTab === 'uploads') {
            loadUploads();
        } else if (activeTab === 'parts') {
            loadParts();
        }
    }, [activeTab, uploadsPage, partsPage, uploadsSearch, partsSearch, statusFilter, shopifyFilter, selectedUploadId]);

    const loadQueueStatusDetailed = useCallback(async () => {
        try {
            const response = await axios.get<QueueStatusDetailed>('/api/parts/queue-status-detailed');
            setQueueStatus(response.data);
        } catch (error) {
            console.error('Failed to load detailed queue status:', error);
        }
    }, []);

    const refreshProgressForProcessingUploads = useCallback(async () => {
        if (!uploads?.data) return;

        const processingUploads = uploads.data.filter((upload: Upload) =>
            ['analyzing', 'chunked', 'processing'].includes(upload.status)
        );

        if (processingUploads.length === 0) return;

        try {
            for (const upload of processingUploads) {
                const response = await axios.get<UploadProgress>(`/api/parts/uploads/${upload.id}/progress`);
                setUploadProgresses(prev => ({
                    ...prev,
                    [upload.id]: response.data
                }));
            }
        } catch (error) {
            console.error('Failed to refresh upload progress:', error);
        }
    }, [uploads]);

    const loadStatistics = async () => {
        try {
            const response = await axios.get('/api/parts/statistics');
            setStatistics(response.data);
        } catch (error) {
            console.error('Failed to load statistics:', error);
            toast.error('Failed to load statistics');
        }
    };

    const loadUploads = async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams({
                page: uploadsPage.toString(),
                per_page: '10',
                ...(uploadsSearch && { search: uploadsSearch }),
                ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
            });

            const response = await axios.get(`/api/parts/uploads?${params}`);
            setUploads(response.data);
        } catch (error) {
            console.error('Failed to load uploads:', error);
            toast.error('Failed to load uploads');
        } finally {
            setIsLoading(false);
        }
    };

    const loadParts = async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams({
                page: partsPage.toString(),
                per_page: '20',
                ...(partsSearch && { search: partsSearch }),
                ...(shopifyFilter && shopifyFilter !== 'all' && { has_shopify: shopifyFilter }),
                ...(selectedUploadId && selectedUploadId !== 'all' && { upload_id: selectedUploadId }),
            });

            const response = await axios.get(`/api/parts/parts?${params}`);
            setParts(response.data);
        } catch (error) {
            console.error('Failed to load parts:', error);
            toast.error('Failed to load parts');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleUploadExpansion = (uploadId: number) => {
        setExpandedUploads(prev => {
            const newSet = new Set(prev);
            if (newSet.has(uploadId)) {
                newSet.delete(uploadId);
            } else {
                newSet.add(uploadId);
                // Load progress data if not already loaded
                if (!uploadProgresses[uploadId]) {
                    loadUploadProgress(uploadId);
                }
            }
            return newSet;
        });
    };

    const loadUploadProgress = async (uploadId: number) => {
        try {
            const response = await axios.get<UploadProgress>(`/api/parts/uploads/${uploadId}/progress`);
            setUploadProgresses(prev => ({
                ...prev,
                [uploadId]: response.data
            }));
        } catch (error) {
            console.error(`Failed to load progress for upload ${uploadId}:`, error);
        }
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

    const getProgressColor = (status: string): string => {
        switch (status) {
            case 'completed': return 'bg-green-500';
            case 'failed': return 'bg-red-500';
            case 'processing': return 'bg-blue-500';
            default: return 'bg-gray-500';
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

    const renderUploadProgress = (upload: Upload) => {
        const progress = uploadProgresses[upload.id];
        const isExpanded = expandedUploads.has(upload.id);

        if (!progress) {
            return (
                <div className="text-sm text-gray-500">
                    {upload.processed_parts}/{upload.total_parts} parts
                </div>
            );
        }

        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span>Overall Progress</span>
                    <span className="font-medium">{progress.overall_progress_percentage}%</span>
                </div>
                <Progress value={progress.overall_progress_percentage} className="h-2" />

                {progress.processing_type === 'chunked' && progress.chunks && (
                    <div className="text-xs text-gray-600 flex gap-4">
                        <span>Chunks: {progress.chunks.completed}/{progress.chunks.total}</span>
                        {progress.performance?.estimated_time_remaining && (
                            <span>ETA: {progress.performance.estimated_time_remaining}</span>
                        )}
                        {progress.chunks.failed > 0 && (
                            <span className="text-red-600">Failed: {progress.chunks.failed}</span>
                        )}
                    </div>
                )}

                {isExpanded && progress.chunk_details && (
                    <div className="mt-4 space-y-2">
                        <h4 className="font-medium text-sm">Chunk Details</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                            {progress.chunk_details.map((chunk) => (
                                <div key={chunk.chunk_number} className="flex items-center gap-2 text-xs">
                                    <span className="w-12">#{chunk.chunk_number}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className={`px-1 rounded text-white ${getProgressColor(chunk.status)}`}>
                                                {chunk.status}
                                            </span>
                                            <span>{chunk.progress_percentage}%</span>
                                        </div>
                                        <Progress value={chunk.progress_percentage} className="h-1" />
                                    </div>
                                    <span className="w-16 text-right">
                                        {chunk.created_parts + chunk.updated_parts} parts
                                    </span>
                                    {chunk.processing_time && (
                                        <span className="w-12 text-right">{chunk.processing_time.toFixed(1)}s</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {progress.summary && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                <div>Created: {progress.summary.total_created_parts}</div>
                                <div>Updated: {progress.summary.total_updated_parts}</div>
                                {progress.summary.total_failed_rows > 0 && (
                                    <div className="text-red-600">Failed rows: {progress.summary.total_failed_rows}</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Rest of the component methods (deleteUpload, retryUpload, etc.) remain the same...
    const deleteUpload = async (uploadId: number) => {
        if (!confirm('Are you sure you want to delete this upload and all its parts? This action cannot be undone.')) {
            return;
        }

        try {
            await axios.delete(`/api/parts/uploads/${uploadId}`);
            toast.success('Upload deleted successfully');
            loadUploads();
            loadStatistics();
        } catch (error) {
            console.error('Failed to delete upload:', error);
            toast.error('Failed to delete upload');
        }
    };

    const retryUpload = async (uploadId: number) => {
        try {
            await axios.post(`/api/parts/uploads/${uploadId}/retry`);
            toast.success('Upload retry initiated');
            loadUploads();
            loadQueueStatusDetailed();
        } catch (error: any) {
            console.error('Failed to retry upload:', error);
            toast.error(error.response?.data?.error || 'Failed to retry upload');
        }
    };

    const cancelUpload = async (uploadId: number) => {
        if (!confirm('Are you sure you want to cancel this upload?')) {
            return;
        }

        try {
            await axios.post(`/api/parts/uploads/${uploadId}/cancel`);
            toast.success('Upload cancelled successfully');
            loadUploads();
            loadQueueStatusDetailed();
        } catch (error: any) {
            console.error('Failed to cancel upload:', error);
            toast.error(error.response?.data?.error || 'Failed to cancel upload');
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Parts Dataset</h1>
                    <p className="text-muted-foreground">Manage uploaded parts data and Shopify integration</p>
                </div>
                <Button asChild>
                    <a href="/parts/upload">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Parts
                    </a>
                </Button>
            </div>

            {/* Enhanced System Status Alert */}
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
                            {queueStatus.processing_uploads.length > 0 && (
                                <div className="text-blue-600">
                                    Currently processing: {queueStatus.processing_uploads.length} uploads
                                </div>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Enhanced Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {statistics && (
                    <>
                        <Card>
                            <CardContent className="flex items-center p-6">
                                <FileText className="h-8 w-8 text-blue-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-muted-foreground">Total Uploads</p>
                                    <p className="text-2xl font-bold">{statistics.total_uploads}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="flex items-center p-6">
                                <Package className="h-8 w-8 text-green-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-muted-foreground">Total Parts</p>
                                    <p className="text-2xl font-bold">{statistics.total_parts}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="flex items-center p-6">
                                <ShoppingCart className="h-8 w-8 text-purple-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-muted-foreground">Shopify Synced</p>
                                    <p className="text-2xl font-bold">{statistics.parts_with_shopify}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="flex items-center p-6">
                                <BarChart3 className="h-8 w-8 text-orange-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-muted-foreground">Manufacturers</p>
                                    <p className="text-2xl font-bold">{statistics.unique_manufacturers}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="flex items-center p-6">
                                <div className="text-center w-full">
                                    <p className="text-sm font-medium text-muted-foreground">Shopify Match Rate</p>
                                    <p className="text-2xl font-bold">
                                        {statistics.total_parts > 0
                                            ? Math.round((statistics.parts_with_shopify / statistics.total_parts) * 100)
                                            : 0}%
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Enhanced Queue Status Card */}
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

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="uploads">Uploads</TabsTrigger>
                    <TabsTrigger value="parts">Parts</TabsTrigger>
                    {queueStatus && (
                        <TabsTrigger value="queue">
                            Queue ({queueStatus.queues.total})
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Enhanced Uploads Tab */}
                <TabsContent value="uploads" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Uploads</CardTitle>
                            <CardDescription>View and manage uploaded files with real-time progress</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Search uploads..."
                                        value={uploadsSearch}
                                        onChange={(e) => setUploadsSearch(e.target.value)}
                                        className="max-w-sm"
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                                <Button variant="outline" onClick={loadUploads} disabled={isLoading}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>

                            {/* Enhanced Uploads Table */}
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
                                    {uploads?.data.map((upload: Upload) => (
                                        <React.Fragment key={upload.id}>
                                            <TableRow>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
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
                                                                setSelectedUploadId(upload.id.toString());
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
                                                                title="Retry Upload"
                                                            >
                                                                <Play className="h-4 w-4" />
                                                            </Button>
                                                        )}

                                                        {upload.is_stuck && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => cancelUpload(upload.id)}
                                                                title="Cancel Upload"
                                                            >
                                                                <X className="h-4 w-4" />
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
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {uploads && uploads.last_page > 1 && (
                                <div className="flex items-center justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        disabled={uploads.current_page === 1}
                                        onClick={() => setUploadsPage(prev => prev - 1)}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm">
                                        Page {uploads.current_page} of {uploads.last_page}
                                    </span>
                                    <Button
                                        variant="outline"
                                        disabled={uploads.current_page === uploads.last_page}
                                        onClick={() => setUploadsPage(prev => prev + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Enhanced Queue Tab */}
                <TabsContent value="queue" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Queue Management</CardTitle>
                            <CardDescription>Monitor background job queues and processing status</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {queueStatus && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

                                    {/* Currently Processing Uploads */}
                                    {queueStatus.processing_uploads.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Currently Processing</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    {queueStatus.processing_uploads.map((upload) => (
                                                        <div key={upload.id} className="flex items-center justify-between p-3 border rounded">
                                                            <div className="flex-1">
                                                                <div className="font-medium">{upload.filename}</div>
                                                                <div className="text-sm text-gray-600">
                                                                    Status: {upload.status} | Chunks: {upload.chunks_completed}/{upload.chunks_total}
                                                                    {upload.chunks_failed > 0 && (
                                                                        <span className="text-red-600"> | Failed: {upload.chunks_failed}</span>
                                                                    )}
                                                                </div>
                                                                <Progress value={upload.progress_percentage} className="mt-2 h-2" />
                                                            </div>
                                                            <div className="ml-4 text-right">
                                                                <div className="font-bold">{upload.progress_percentage}%</div>
                                                                {upload.is_stuck && (
                                                                    <Badge variant="destructive" className="text-xs">Stuck</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </>
                            )}

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={loadQueueStatusDetailed}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh Status
                                </Button>
                                <Button variant="outline" onClick={loadUploads}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh Uploads
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Parts Tab */}
                <TabsContent value="parts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Parts</CardTitle>
                            <CardDescription>View and manage individual parts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Search parts..."
                                        value={partsSearch}
                                        onChange={(e) => setPartsSearch(e.target.value)}
                                        className="max-w-sm"
                                    />
                                </div>
                                <Select value={selectedUploadId} onValueChange={setSelectedUploadId}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Filter by upload" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All uploads</SelectItem>
                                        {uploads?.data.map((upload) => (
                                            <SelectItem key={upload.id} value={upload.id.toString()}>
                                                {upload.original_filename}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={shopifyFilter} onValueChange={setShopifyFilter}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Shopify status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All parts</SelectItem>
                                        <SelectItem value="true">With Shopify data</SelectItem>
                                        <SelectItem value="false">Without Shopify data</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={loadParts} disabled={isLoading}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>

                            {/* Parts Table */}
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
                                    {parts?.data.map((part) => (
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
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => syncShopifyData([part.id])}
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {parts && parts.last_page > 1 && (
                                <div className="flex items-center justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        disabled={parts.current_page === 1}
                                        onClick={() => setPartsPage(prev => prev - 1)}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm">
                                        Page {parts.current_page} of {parts.last_page}
                                    </span>
                                    <Button
                                        variant="outline"
                                        disabled={parts.current_page === parts.last_page}
                                        onClick={() => setPartsPage(prev => prev + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PartsIndex;
