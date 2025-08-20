<?php

// app/Http/Controllers/PartsDataset/PartsController.php

namespace App\Http\Controllers\PartsDataset;

use App\Http\Controllers\Controller;
use App\Jobs\PartsDataset\ProcessUploadedFileJob;
use App\Jobs\PartsDataset\SyncPartsWithShopifyJob;
use App\Models\PartsDataset\Part;
use App\Models\PartsDataset\PartsUpload;
use App\Models\PartsDataset\UploadChunk;
use App\Services\PartsDataset\ProgressTrackingService;
use App\Services\PartsDataset\S3ImageService;
use App\Services\PartsDataset\ShopifyService;
use App\Services\PartsDataset\UploadProcessingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class PartsController extends Controller
{
    private UploadProcessingService $uploadService;

    private ShopifyService $shopifyService;

    private S3ImageService $imageService;

    public function __construct(
        UploadProcessingService $uploadService,
        ShopifyService $shopifyService,
        S3ImageService $imageService
    ) {
        $this->uploadService = $uploadService;
        $this->shopifyService = $shopifyService;
        $this->imageService = $imageService;
    }

    /**
     * Display the parts upload page
     */
    public function index(Request $request): Response
    {
        // Only load data for the active tab to improve initial load time
        $activeTab = $request->get('activeTab', 'uploads');

        $data = [
            'filters' => [
                'uploadsPage' => $request->get('uploadsPage', 1),
                'partsPage' => $request->get('partsPage', 1),
                'uploadsSearch' => $request->get('uploadsSearch', ''),
                'partsSearch' => $request->get('partsSearch', ''),
                'statusFilter' => $request->get('statusFilter', 'all'),
                'shopifyFilter' => $request->get('shopifyFilter', 'all'),
                'selectedUploadId' => $request->get('selectedUploadId', 'all'),
                'activeTab' => $activeTab,
            ],
        ];

        // Always load uploads and basic statistics (lightweight)
        $data['uploads'] = $this->uploadsOptimized($request)->getData();
        $data['statistics'] = $this->statisticsCached()->getData();

        // Only load heavy data when specifically requested
        if ($activeTab === 'parts') {
            $data['parts'] = $this->parts($request)->getData();
        } else {
            $data['parts'] = null;
        }

        // Load queue status only if there are active uploads
        $hasActiveUploads = collect($data['uploads']->data ?? [])->contains(function ($upload) {
            return in_array($upload->status ?? '', ['analyzing', 'chunked', 'processing']);
        });

        $data['queueStatus'] = $hasActiveUploads ? $this->queueStatusDetailed()->getData() : null;

        return Inertia::render('PartsDataset/PartsIndex', $data);
    }

    /**
     * Display the parts upload form
     */
    public function create(): Response
    {
        return Inertia::render('PartsDataset/PartsUpload');
    }

    /**
     * Handle file upload and processing
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,xlsx,xls,zip|max:50240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $file = $request->file('file');

            // Use the new service method that handles chunking automatically
            $result = $this->uploadService->processUpload($file);

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Upload failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper method to determine upload type
     */
    private function determineUploadType(string $extension): string
    {
        return match ($extension) {
            'zip' => 'zip',
            'xlsx', 'xls' => 'excel',
            'csv' => 'csv',
            default => 'unknown'
        };
    }

    /**
     * Get list of uploads with pagination - OPTIMIZED VERSION
     */
    public function uploadsOptimized(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'per_page' => 'nullable|integer|min:5|max:100',
            'page' => 'nullable|integer|min:1',
            'status' => 'nullable|string|in:pending,processing,completed,failed',
            'search' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Use withCount to avoid N+1 queries
        $query = PartsUpload::withCount([
            'parts',
            'parts as shopify_synced_count' => function ($query) {
                $query->whereHas('shopifyData', function ($q) {
                    $q->whereNotNull('shopify_id');
                });
            },
        ])
            ->whereNull('parent_upload_id')
            ->orderBy('uploaded_at', 'desc');

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('filename', 'like', "%{$search}%")
                    ->orWhere('original_filename', 'like', "%{$search}%")
                    ->orWhere('batch_id', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 15);
        $uploads = $query->paginate($perPage);

        // Get all children in one query to avoid N+1
        $uploadIds = $uploads->pluck('id')->toArray();
        $childrenByParent = PartsUpload::withCount([
            'parts',
            'parts as shopify_synced_count' => function ($query) {
                $query->whereHas('shopifyData', function ($q) {
                    $q->whereNotNull('shopify_id');
                });
            },
        ])
            ->whereIn('parent_upload_id', $uploadIds)
            ->get()
            ->groupBy('parent_upload_id');

        // Transform uploads with optimized data
        $uploads->getCollection()->transform(function ($upload) use ($childrenByParent) {
            $children = $childrenByParent->get($upload->id, collect());

            // Calculate Shopify sync percentage for children
            $children->each(function ($child) {
                $child->shopify_sync_percentage = $child->parts_count > 0
                    ? round(($child->shopify_synced_count / $child->parts_count) * 100, 1)
                    : 0;
            });

            // If ZIP file, aggregate children stats
            if ($upload->upload_type === 'zip' && $children->isNotEmpty()) {
                $upload->total_parts = $children->sum('parts_count');
                $upload->processed_parts = $children->sum('processed_parts');
                $upload->shopify_synced_count = $children->sum('shopify_synced_count');
                $upload->shopify_sync_percentage = $upload->total_parts > 0
                    ? round(($upload->shopify_synced_count / $upload->total_parts) * 100, 1)
                    : 0;
            } else {
                // Use the pre-calculated counts
                $upload->total_parts = $upload->parts_count;
                $upload->shopify_sync_percentage = $upload->parts_count > 0
                    ? round(($upload->shopify_synced_count / $upload->parts_count) * 100, 1)
                    : 0;
            }

            // Attach children to upload
            $upload->children = $children->toArray();

            return $upload;
        });

        return response()->json($uploads);
    }

    /**
     * Get list of uploads with pagination - LEGACY VERSION (kept for compatibility)
     */
    public function uploads(Request $request): JsonResponse
    {
        return $this->uploadsOptimized($request);
    }

    /**
     * Get parts list with pagination and filters - OPTIMIZED VERSION
     */
    public function parts(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'per_page' => 'nullable|integer|min:5|max:100',
            'page' => 'nullable|integer|min:1',
            'upload_id' => 'nullable|integer|exists:parts_database.parts_uploads,id',
            'has_shopify' => 'nullable|boolean',
            'search' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Use select to limit columns and improve performance
        $query = Part::select([
            'id', 'part_number', 'description', 'manufacturer',
            'upload_id', 'is_active', 'created_at', 'image_url',
        ])
            ->with([
                'upload:id,filename,original_filename',  // Only load necessary upload fields
                'shopifyData:part_id,shopify_id,storefront_url',  // Only load necessary Shopify fields
            ])
            ->where('is_active', true)
            ->orderBy('created_at', 'desc');

        // Apply filters
        if ($request->filled('upload_id')) {
            $query->where('upload_id', $request->input('upload_id'));
        }

        if ($request->filled('has_shopify')) {
            $hasShopify = $request->boolean('has_shopify');
            if ($hasShopify) {
                $query->whereHas('shopifyData', function ($q) {
                    $q->whereNotNull('shopify_id');
                });
            } else {
                $query->whereDoesntHave('shopifyData');
            }
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('part_number', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('manufacturer', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 20);
        $parts = $query->paginate($perPage);

        return response()->json($parts);
    }

    /**
     * Get detailed information about a specific upload
     */
    public function showUpload(int $uploadId): JsonResponse
    {
        $upload = PartsUpload::with(['parts.shopifyData', 'parts.additionalFields'])
            ->findOrFail($uploadId);

        // Calculate statistics
        $stats = [
            'total_parts' => $upload->parts()->count(),
            'active_parts' => $upload->parts()->where('is_active', true)->count(),
            'parts_with_shopify' => $upload->parts()->whereHas('shopifyData', function ($q) {
                $q->whereNotNull('shopify_id');
            })->count(),
            'unique_manufacturers' => $upload->parts()->whereNotNull('manufacturer')->distinct('manufacturer')->count(),
        ];

        return response()->json([
            'upload' => $upload,
            'statistics' => $stats,
        ]);
    }

    /**
     * Enhanced queue status monitoring
     */
    public function queueStatusDetailed(): JsonResponse
    {
        try {
            // Get queue sizes
            $fileProcessingQueue = Queue::size('file-processing');
            $chunkProcessingQueue = Queue::size('chunk-processing');
            $aggregationQueue = Queue::size('aggregation');
            $shopifySyncQueue = Queue::size('shopify-sync');
            $defaultQueue = Queue::size('default');

            // Get upload status breakdown
            $uploadStats = [
                'pending' => PartsUpload::where('status', PartsUpload::STATUS_PENDING)->count(),
                'analyzing' => PartsUpload::where('status', PartsUpload::STATUS_ANALYZING)->count(),
                'chunked' => PartsUpload::where('status', PartsUpload::STATUS_CHUNKED)->count(),
                'processing' => PartsUpload::where('status', PartsUpload::STATUS_PROCESSING)->count(),
                'completed' => PartsUpload::where('status', PartsUpload::STATUS_COMPLETED)->count(),
                'completed_with_errors' => PartsUpload::where('status', PartsUpload::STATUS_COMPLETED_WITH_ERRORS)->count(),
                'failed' => PartsUpload::where('status', PartsUpload::STATUS_FAILED)->count(),
            ];

            // Get hierarchical processing uploads (ZIP files with their children)
            $processingUploads = $this->getHierarchicalProcessingUploads();

            // Get stuck uploads
            $stuckUploads = PartsUpload::where('status', 'processing')
                ->where('updated_at', '<', now()->subHours(2))
                ->count();

            // Recent failures
            $recentFailures = PartsUpload::where('status', 'failed')
                ->where('updated_at', '>=', now()->subHours(24))
                ->count();

            // Get Shopify sync progress
            $shopifyProgress = $this->getShopifySyncProgress();

            return response()->json([
                'queues' => [
                    'file_processing' => $fileProcessingQueue,
                    'chunk_processing' => $chunkProcessingQueue,
                    'aggregation' => $aggregationQueue,
                    'shopify_sync' => $shopifySyncQueue,
                    'default' => $defaultQueue,
                    'total' => $fileProcessingQueue + $chunkProcessingQueue + $aggregationQueue + $shopifySyncQueue + $defaultQueue,
                ],
                'uploads' => $uploadStats,
                'processing_uploads' => $processingUploads,
                'shopify_progress' => $shopifyProgress,
                'issues' => [
                    'stuck_processing' => $stuckUploads,
                    'recent_failures' => $recentFailures,
                ],
                'status' => $this->getOverallSystemStatus($uploadStats, $stuckUploads),
                'last_updated' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get detailed queue status: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get hierarchical processing uploads (ZIP files with children)
     */
    private function getHierarchicalProcessingUploads(): array
    {
        $parentUploads = PartsUpload::with(['chunks'])
            ->whereIn('status', [PartsUpload::STATUS_ANALYZING, PartsUpload::STATUS_CHUNKED, PartsUpload::STATUS_PROCESSING])
            ->whereNull('parent_upload_id')
            ->get();

        $hierarchicalUploads = [];
        foreach ($parentUploads as $parent) {
            $parentData = $this->formatUploadForQueue($parent);

            $children = PartsUpload::with(['chunks'])
                ->where('parent_upload_id', $parent->id)
                ->get();

            $parentData['children'] = $children->map(function ($child) {
                return $this->formatUploadForQueue($child);
            })->toArray();

            $hierarchicalUploads[] = $parentData;
        }

        return $hierarchicalUploads;
    }

    /**
     * Format upload data for queue display
     */
    private function formatUploadForQueue($upload): array
    {
        $chunks = $upload->chunks;
        if ($chunks->isNotEmpty()) {
            $completed = $chunks->where('status', UploadChunk::STATUS_COMPLETED)->count();
            $total = $chunks->count();
            $progress = $total > 0 ? round(($completed / $total) * 100, 1) : 0;
        } else {
            $progress = $upload->progress_percentage ?? 0;
        }

        return [
            'id' => $upload->id,
            'filename' => $upload->original_filename,
            'upload_type' => $upload->upload_type,
            'status' => $upload->status,
            'progress_percentage' => $progress,
            'chunks_total' => $chunks->count(),
            'chunks_completed' => $chunks->where('status', UploadChunk::STATUS_COMPLETED)->count(),
            'chunks_failed' => $chunks->where('status', UploadChunk::STATUS_FAILED)->count(),
            'started_at' => $upload->uploaded_at,
            'is_stuck' => $upload->status === 'processing' && $upload->updated_at < now()->subHours(2),
            'is_parent' => $upload->upload_type === 'zip',
            'parent_id' => $upload->parent_upload_id,
        ];
    }

    /**
     * Get Shopify sync progress for recent uploads
     */
    private function getShopifySyncProgress(): array
    {
        $recentUploads = PartsUpload::whereIn('status', ['completed', 'completed_with_errors'])
            ->where('completed_at', '>=', now()->subHours(24))
            ->withCount(['parts', 'parts as synced_parts_count' => function ($query) {
                $query->whereHas('shopifyData', function ($q) {
                    $q->whereNotNull('shopify_id');
                });
            }])
            ->get();

        $syncProgress = [];
        foreach ($recentUploads as $upload) {
            if ($upload->parts_count > 0) {
                $syncPercentage = round(($upload->synced_parts_count / $upload->parts_count) * 100, 1);

                $syncProgress[] = [
                    'upload_id' => $upload->id,
                    'filename' => $upload->original_filename,
                    'total_parts' => $upload->parts_count,
                    'synced_parts' => $upload->synced_parts_count,
                    'sync_percentage' => $syncPercentage,
                    'completed_at' => $upload->completed_at,
                    'is_sync_complete' => $syncPercentage >= 95,
                ];
            }
        }

        return $syncProgress;
    }

    /**
     * Reset upload status and retry processing
     */
    public function retryUpload(Request $request, int $uploadId): JsonResponse
    {
        try {
            $upload = PartsUpload::findOrFail($uploadId);

            // Only allow retry for failed or stuck uploads
            if (! in_array($upload->status, ['failed', 'processing'])) {
                return response()->json([
                    'success' => false,
                    'error' => 'Can only retry failed or stuck uploads',
                ], 422);
            }

            // Reset status and add log
            $logs = $upload->processing_logs ?? [];
            $logs[] = 'Upload retry initiated by user at '.now()->toDateTimeString();

            $upload->update([
                'status' => 'pending',
                'processing_logs' => $logs,
            ]);

            // Check if file still exists, if not, require re-upload
            $storedFilePath = 'uploads/parts/'.$upload->batch_id.'_'.$upload->original_filename;

            if (\Illuminate\Support\Facades\Storage::disk('local')->exists($storedFilePath)) {
                // Dispatch new job
                ProcessUploadedFileJob::dispatch($upload->id, $storedFilePath);

                return response()->json([
                    'success' => true,
                    'message' => 'Upload retry job dispatched successfully',
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Original file no longer exists. Please re-upload the file.',
                ], 422);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retry upload: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel/fail a stuck upload
     */
    public function cancelUpload(Request $request, int $uploadId): JsonResponse
    {
        try {
            $upload = PartsUpload::findOrFail($uploadId);

            if ($upload->status !== 'processing') {
                return response()->json([
                    'success' => false,
                    'error' => 'Can only cancel processing uploads',
                ], 422);
            }

            $logs = $upload->processing_logs ?? [];
            $logs[] = 'Upload cancelled by user at '.now()->toDateTimeString();

            $upload->update([
                'status' => 'failed',
                'processing_logs' => $logs,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Upload cancelled successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to cancel upload: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get queue status message
     */
    private function getQueueStatusMessage(int $fileProcessing, int $shopifySync, int $stuck): string
    {
        if ($stuck > 0) {
            return "Warning: {$stuck} uploads stuck in processing";
        }

        if ($fileProcessing > 0) {
            return "Processing {$fileProcessing} file uploads";
        }

        if ($shopifySync > 0) {
            return "Syncing {$shopifySync} Shopify jobs";
        }

        return 'All queues idle';
    }

    /**
     * Sync Shopify data for specific parts (dispatch to queue)
     */
    public function syncShopify(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'part_ids' => 'required|array|min:1',
            'part_ids.*' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Manually check if parts exist in the parts_database connection
        $partIds = $request->input('part_ids');
        $existingParts = Part::whereIn('id', $partIds)->pluck('id')->toArray();
        $missingParts = array_diff($partIds, $existingParts);

        if (! empty($missingParts)) {
            return response()->json([
                'success' => false,
                'error' => 'Some parts not found: '.implode(', ', $missingParts),
            ], 422);
        }

        try {
            // Dispatch sync job to queue
            SyncPartsWithShopifyJob::dispatch($partIds);

            return response()->json([
                'success' => true,
                'message' => 'Shopify sync job dispatched for '.count($partIds).' parts. Check queue status for progress.',
                'dispatched_parts' => count($partIds),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to dispatch Shopify sync job: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update a part
     */
    public function updatePart(Request $request, int $partId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'part_number' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'manufacturer' => 'nullable|string|max:100',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $part = Part::findOrFail($partId);
            $part->update($validator->validated());

            // Reload with relationships
            $part->load(['shopifyData', 'additionalFields']);

            return response()->json([
                'success' => true,
                'message' => 'Part updated successfully',
                'part' => $part,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to update part: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete an upload and all its parts
     */
    public function destroyUpload(int $uploadId)
    {
        try {
            $upload = PartsUpload::findOrFail($uploadId);
            $partsCount = $upload->parts()->count();

            $upload->delete(); // Cascade will delete related parts

            //            return redirect()->route('your-resource.index')->with('message', 'Record deleted successfully');
            return redirect()->route('parts.index')->with(
                'message', "Upload and {$partsCount} parts deleted successfully",
            );

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to delete upload: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sync Shopify data for all parts in an upload (dispatch to queue)
     */
    public function syncUploadShopify(Request $request, int $uploadId): JsonResponse
    {
        try {
            $upload = PartsUpload::findOrFail($uploadId);

            $partIds = $upload->parts()
                ->where('is_active', true)
                ->whereNotNull('manufacturer')
                ->whereNotNull('part_number')
                ->pluck('id')
                ->toArray();

            if (empty($partIds)) {
                return response()->json([
                    'success' => false,
                    'error' => 'No valid parts found for Shopify sync in this upload.',
                ], 422);
            }

            // Dispatch sync job to queue
            SyncPartsWithShopifyJob::dispatch($partIds, $uploadId);

            return response()->json([
                'success' => true,
                'message' => "Shopify sync job dispatched for {$upload->original_filename} ({".count($partIds).'} parts)',
                'upload_id' => $uploadId,
                'dispatched_parts' => count($partIds),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to dispatch upload Shopify sync: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get statistics with caching for better performance
     */
    public function statisticsCached(): JsonResponse
    {
        try {
            // Cache statistics for 5 minutes to reduce database load
            $stats = Cache::remember('parts_statistics', 300, function () {
                // Use Eloquent models with proper database connections
                $totalUploads = PartsUpload::count();
                $completedUploads = PartsUpload::where('status', 'completed')->count();
                $totalParts = Part::where('is_active', true)->count();
                $partsWithShopify = Part::whereHas('shopifyData', function ($query) {
                    $query->whereNotNull('shopify_id');
                })->where('is_active', true)->count();
                $uniqueManufacturers = Part::where('is_active', true)
                    ->whereNotNull('manufacturer')
                    ->distinct('manufacturer')
                    ->count();

                return [
                    'total_uploads' => $totalUploads,
                    'completed_uploads' => $completedUploads,
                    'total_parts' => $totalParts,
                    'parts_with_shopify' => $partsWithShopify,
                    'unique_manufacturers' => $uniqueManufacturers,
                ];
            });

            // Get recent uploads separately (this changes more frequently)
            $recentUploads = Cache::remember('recent_uploads', 60, function () {
                return PartsUpload::orderBy('uploaded_at', 'desc')
                    ->limit(5)
                    ->select(['id', 'original_filename', 'status', 'uploaded_at', 'total_parts'])
                    ->get();
            });

            $stats['recent_uploads'] = $recentUploads;

            return response()->json($stats);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get statistics: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get statistics - LEGACY VERSION (kept for compatibility)
     */
    public function statistics(): JsonResponse
    {
        return $this->statisticsCached();
    }

    /**
     * Upload image for a specific part
     */
    public function uploadPartImage(Request $request, int $partId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $part = Part::findOrFail($partId);
            $image = $request->file('image');

            $success = $this->imageService->uploadImageForPart(
                $part,
                $image->getPathname(),
                $image->getClientOriginalName()
            );

            if ($success) {
                // Reload part to get updated image_url
                $part->refresh();

                return response()->json([
                    'success' => true,
                    'message' => 'Image uploaded successfully',
                    'image_url' => $part->image_url,
                    'part' => $part,
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to upload image',
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Upload failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete part image
     */
    public function deletePartImage(int $partId): JsonResponse
    {
        try {
            $part = Part::findOrFail($partId);

            if ($part->image_url) {
                $this->imageService->deleteImage($part->image_url);
                $part->update(['image_url' => null]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Image deleted successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Delete failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get detailed progress for a specific upload
     */
    public function uploadProgress(int $uploadId): JsonResponse
    {
        try {
            $progressService = app(ProgressTrackingService::class);
            $progress = $progressService->getCachedUploadProgress($uploadId);

            return response()->json($progress);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get upload progress: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get progress for multiple uploads (for dashboard)
     */
    public function uploadsProgressSummary(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'upload_ids' => 'required|array',
            'upload_ids.*' => 'integer|exists:parts_database.parts_uploads,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $progressService = app(ProgressTrackingService::class);
            $uploadIds = $request->input('upload_ids');
            $progress = $progressService->getUploadsProgressSummary($uploadIds);

            return response()->json($progress);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get uploads progress: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get overall system status
     */
    private function getOverallSystemStatus(array $uploadStats, int $stuckUploads): string
    {
        if ($stuckUploads > 0) {
            return 'degraded';
        }

        if ($uploadStats['processing'] > 0 || $uploadStats['analyzing'] > 0) {
            return 'busy';
        }

        if ($uploadStats['failed'] > 0) {
            return 'warning';
        }

        return 'idle';
    }

    /**
     * Force refresh cached progress for an upload
     */
    public function refreshUploadProgress(int $uploadId): JsonResponse
    {
        try {
            $progressService = app(ProgressTrackingService::class);
            $progress = $progressService->getCachedUploadProgress($uploadId, true); // Force fresh

            return response()->json([
                'success' => true,
                'progress' => $progress,
                'message' => 'Progress refreshed successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to refresh progress: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get chunk details for an upload
     */
    public function uploadChunks(int $uploadId): JsonResponse
    {
        try {
            $upload = PartsUpload::with([
                'chunks' => function ($query) {
                    $query->orderBy('chunk_number');
                },
            ])->findOrFail($uploadId);

            $chunks = $upload->chunks->map(function ($chunk) {
                return [
                    'id' => $chunk->id,
                    'chunk_number' => $chunk->chunk_number,
                    'status' => $chunk->status,
                    'start_row' => $chunk->start_row,
                    'end_row' => $chunk->end_row,
                    'total_rows' => $chunk->total_rows,
                    'processed_rows' => $chunk->processed_rows,
                    'created_parts' => $chunk->created_parts,
                    'updated_parts' => $chunk->updated_parts,
                    'failed_rows' => $chunk->failed_rows,
                    'progress_percentage' => $chunk->progress_percentage,
                    'processing_time_seconds' => $chunk->processing_time_seconds,
                    'started_at' => $chunk->started_at,
                    'completed_at' => $chunk->completed_at,
                    'error_details' => $chunk->error_details,
                ];
            });

            return response()->json([
                'upload_id' => $uploadId,
                'upload_status' => $upload->status,
                'chunks' => $chunks,
                'summary' => [
                    'total_chunks' => $chunks->count(),
                    'completed_chunks' => $chunks->where('status', UploadChunk::STATUS_COMPLETED)->count(),
                    'failed_chunks' => $chunks->where('status', UploadChunk::STATUS_FAILED)->count(),
                    'processing_chunks' => $chunks->where('status', UploadChunk::STATUS_PROCESSING)->count(),
                    'pending_chunks' => $chunks->where('status', UploadChunk::STATUS_PENDING)->count(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get chunk details: '.$e->getMessage(),
            ], 500);
        }
    }
}
