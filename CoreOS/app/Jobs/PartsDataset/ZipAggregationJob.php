<?php

// app/Jobs/PartsDataset/ZipAggregationJob.php (Updated)

namespace App\Jobs\PartsDataset;

use App\Models\PartsDataset\PartsUpload;
use App\Services\PartsDataset\UploadProcessingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Jobs\PartsDataset\SyncPartsWithShopifyJob;

class ZipAggregationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $parentUploadId;
    protected ?string $zipFilePath;

    public int $timeout = 300; // Increased for image processing
    public int $tries = 3;

    public function __construct(int $parentUploadId, ?string $zipFilePath = null)
    {
        $this->parentUploadId = $parentUploadId;
        $this->zipFilePath = $zipFilePath;
        $this->onQueue('aggregation');
    }

    public function handle(): void
    {
        try {
            $parentUpload = PartsUpload::findOrFail($this->parentUploadId);

            Log::info("[ZipAggregationJob] Checking aggregation status for ZIP upload {$this->parentUploadId}");

            // Get all child uploads
            $childUploads = PartsUpload::where('parent_upload_id', $this->parentUploadId)->get();

            if ($childUploads->isEmpty()) {
                Log::warning("[ZipAggregationJob] No child uploads found for parent {$this->parentUploadId}");
                $this->finalizeZipUpload($parentUpload, [], false);
                return;
            }

            // For any child uploads not yet in a terminal state, infer completion from chunk statuses
            foreach ($childUploads as $child) {
                if (!in_array($child->status, ['completed', 'completed_with_errors', 'failed'])) {
                    $chunks = $child->chunks;
                    if ($chunks->isNotEmpty()) {
                        $pending = $chunks->whereIn('status', ['pending', 'processing'])->count();
                        if ($pending === 0) {
                            $completedChunks = $chunks->where('status', 'completed');
                            $failedChunks = $chunks->where('status', 'failed');

                            $totalCreated = $completedChunks->sum('created_parts');
                            $totalUpdated = $completedChunks->sum('updated_parts');
                            $totalProcessed = ($totalCreated ?? 0) + ($totalUpdated ?? 0);
                            $totalTime = $completedChunks->sum('processing_time_seconds');

                            $logs = $child->processing_logs ?? [];
                            if ($failedChunks->count() > 0) {
                                $logs[] = sprintf(
                                    "Processing completed with %d failed chunks. Created: %d, Updated: %d, Total: %d parts in %.2fs",
                                    $failedChunks->count(),
                                    $totalCreated,
                                    $totalUpdated,
                                    $totalProcessed,
                                    $totalTime
                                );

                                $child->update([
                                    'status' => 'completed_with_errors',
                                    'total_parts' => $totalProcessed,
                                    'processed_parts' => $totalProcessed,
                                    'completed_at' => now(),
                                    'processing_logs' => $logs,
                                ]);
                            } else {
                                $logs[] = sprintf(
                                    "Processing completed successfully. Created: %d, Updated: %d, Total: %d parts in %.2fs",
                                    $totalCreated,
                                    $totalUpdated,
                                    $totalProcessed,
                                    $totalTime
                                );

                                $child->update([
                                    'status' => 'completed',
                                    'total_parts' => $totalProcessed,
                                    'processed_parts' => $totalProcessed,
                                    'completed_at' => now(),
                                    'processing_logs' => $logs,
                                ]);
                            }

                            // Refresh the model instance within the collection to reflect new status
                            $child->refresh();
                        }
                    }
                }
            }

            // Before we decide on rescheduling or aggregation, ensure Shopify sync is dispatched for any completed child
            foreach ($childUploads as $child) {
                if (in_array($child->status, ['completed', 'completed_with_errors'])) {
                    $logs = $child->processing_logs ?? [];
                    $alreadyDispatched = false;
                    foreach ($logs as $logLine) {
                        if (is_string($logLine) && str_contains($logLine, 'Shopify sync job dispatched')) {
                            $alreadyDispatched = true;
                            break;
                        }
                    }

                    if (!$alreadyDispatched) {
                        $partIds = $child->parts()->pluck('id')->toArray();
                        if (!empty($partIds)) {
                            Log::info("[ZipAggregationJob] Dispatching Shopify sync for child upload {$child->id} with " . count($partIds) . " parts");
                            SyncPartsWithShopifyJob::dispatch($partIds, $child->id);
                            $logs[] = "Shopify sync job dispatched for " . count($partIds) . " parts";
                            $child->update(['processing_logs' => $logs]);
                        } else {
                            Log::warning("[ZipAggregationJob] No parts found to sync for child upload {$child->id}");
                        }
                    }
                }
            }

            // Check if all child uploads are completed (after potential status inference)
            $totalChildren = $childUploads->count();
            $completedChildren = $childUploads->whereIn('status', ['completed', 'completed_with_errors', 'failed'])->count();
            $successfulChildren = $childUploads->where('status', 'completed')->count();
            $partiallySuccessfulChildren = $childUploads->where('status', 'completed_with_errors')->count();
            $failedChildren = $childUploads->where('status', 'failed')->count();

            Log::info("[ZipAggregationJob] Child upload status: {$completedChildren}/{$totalChildren} completed ({$successfulChildren} successful, {$partiallySuccessfulChildren} partial, {$failedChildren} failed)");

            if ($completedChildren < $totalChildren) {
                // Not all children are complete yet, reschedule
                Log::info("[ZipAggregationJob] Not all child uploads complete, rescheduling check");

                static::dispatch($this->parentUploadId, $this->zipFilePath)
                    ->delay(now()->addMinutes(1));
                return;
            }

            // All children are complete, aggregate results and process images
            $this->aggregateResults($parentUpload, $childUploads);

        } catch (\Exception $e) {
            Log::error("[ZipAggregationJob] Failed to aggregate ZIP upload {$this->parentUploadId}: " . $e->getMessage());

            $parentUpload = PartsUpload::find($this->parentUploadId);
            if ($parentUpload) {
                $parentUpload->update([
                    'status' => 'failed',
                    'processing_logs' => array_merge($parentUpload->processing_logs ?? [], [
                        "Aggregation failed: " . $e->getMessage()
                    ])
                ]);
            }

            throw $e;
        }
    }

    private function aggregateResults(PartsUpload $parentUpload, $childUploads): void
    {
        $totalParts = 0;
        $processedParts = 0;
        $aggregatedLogs = $parentUpload->processing_logs ?? [];
        $hasFailures = false;
        $processedExcelFiles = [];

        foreach ($childUploads as $child) {
            $totalParts += $child->total_parts ?? 0;
            $processedParts += $child->processed_parts ?? 0;

            if ($child->status === 'failed') {
                $hasFailures = true;
                $childLogs = $child->processing_logs ?? [];
                $lastLog = is_array($childLogs) && !empty($childLogs) ? end($childLogs) : null;
                $aggregatedLogs[] = "Child file '{$child->filename}' failed: " . ($lastLog ?: 'Unknown error');
            } else {
                $aggregatedLogs[] = "Child file '{$child->filename}' completed: {$child->total_parts} parts";
                if ($child->status === 'completed' || $child->status === 'completed_with_errors') {
                    $processedExcelFiles[] = $child->filename;
                }
            }
        }

        // Now process images if we have successful Excel files
        $imageResults = null;
        if (!empty($processedExcelFiles) && $this->zipFilePath) {
            try {
                $imageResults = $this->processZipImages($parentUpload, $processedExcelFiles);
                if ($imageResults) {
                    $aggregatedLogs[] = "Images processed: {$imageResults['matched']} matched, {$imageResults['uploaded']} uploaded";
                }
            } catch (\Exception $e) {
                Log::error("[ZipAggregationJob] Image processing failed: " . $e->getMessage());
                $aggregatedLogs[] = "Image processing failed: " . $e->getMessage();
            }
        }

        // Determine final status
        $finalStatus = $hasFailures ?
            ($processedParts > 0 ? 'completed_with_errors' : 'failed') :
            'completed';

        $aggregatedLogs[] = "ZIP aggregation completed";
        $aggregatedLogs[] = "Total parts across all files: {$totalParts}";
        $aggregatedLogs[] = "Successfully processed: {$processedParts}";

        if ($hasFailures) {
            $failedCount = $childUploads->where('status', 'failed')->count();
            $aggregatedLogs[] = "Files with errors: {$failedCount}";
        }

        $this->finalizeZipUpload($parentUpload, $aggregatedLogs, true, $finalStatus, $totalParts, $processedParts);

        Log::info("[ZipAggregationJob] ZIP upload {$this->parentUploadId} aggregation completed: {$finalStatus}");
        Log::info("[ZipAggregationJob] Final counts - Total: {$totalParts}, Processed: {$processedParts}");
    }

    private function processZipImages(PartsUpload $parentUpload, array $processedExcelFiles): ?array
    {
        if (!$this->zipFilePath || !Storage::exists($this->zipFilePath)) {
            Log::warning("[ZipAggregationJob] ZIP file path not available for image processing");
            return null;
        }

        $tempDir = storage_path('app/temp/' . Str::uuid());
        mkdir($tempDir, 0755, true);

        try {
            Log::info("[ZipAggregationJob] Processing images from ZIP for upload {$this->parentUploadId}");

            // Extract ZIP file again for image processing
            $zipFilePath = Storage::path($this->zipFilePath);
            $zip = new \ZipArchive();

            if ($zip->open($zipFilePath) !== true) {
                throw new \Exception('Failed to open ZIP file for image processing');
            }

            $zip->extractTo($tempDir);
            $zip->close();

            // Find images in the extracted ZIP
            $imagePaths = [];
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($tempDir)
            );

            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $filename = $file->getFilename();
                    $extension = strtolower($file->getExtension());

                    // Skip system files
                    if ($this->shouldSkipFile($filename)) {
                        continue;
                    }

                    // Collect images
                    if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                        $imagePaths[$file->getPathname()] = $filename;
                    }
                }
            }

            if (empty($imagePaths)) {
                Log::info("[ZipAggregationJob] No images found in ZIP");
                return ['matched' => 0, 'uploaded' => 0];
            }

            Log::info("[ZipAggregationJob] Found " . count($imagePaths) . " images in ZIP");

            // Get child uploads that correspond to the processed Excel files
            $childUploads = PartsUpload::where('parent_upload_id', $this->parentUploadId)
                ->whereIn('filename', $processedExcelFiles)
                ->whereIn('status', ['completed', 'completed_with_errors'])
                ->get();

            if ($childUploads->isEmpty()) {
                Log::warning("[ZipAggregationJob] No child uploads found for image processing");
                return ['matched' => 0, 'uploaded' => 0];
            }

            $totalMatched = 0;
            $totalUploaded = 0;
            $processingService = app(UploadProcessingService::class);

            // Process images for each child upload (Excel file)
            foreach ($childUploads as $childUpload) {
                try {
                    Log::info("[ZipAggregationJob] Processing images for child upload {$childUpload->id} (file: {$childUpload->filename})");

                    // Process images against this specific child upload where the parts were created
                    $processingService->processImagesForUploadWithDebug($childUpload, $imagePaths, $childUpload->filename);

                    // Log that we processed this file
                    $logs = $childUpload->processing_logs ?? [];
                    $logs[] = "Images processed from ZIP archive";
                    $childUpload->update(['processing_logs' => $logs]);

                } catch (\Exception $e) {
                    Log::error("[ZipAggregationJob] Failed to process images for child upload {$childUpload->id}: " . $e->getMessage());
                }
            }

            // Get some statistics - count how many parts actually got images
            $partsWithImages = 0;
            foreach ($childUploads as $childUpload) {
                $partsWithImages += $childUpload->parts()->whereNotNull('image_url')->count();
            }

            Log::info("[ZipAggregationJob] Image processing completed: {$partsWithImages} parts now have images");

            return [
                'matched' => count($imagePaths),
                'uploaded' => $partsWithImages, // Actual count of parts that got images
                'images_found' => count($imagePaths),
                'excel_files_processed' => $childUploads->count()
            ];

        } finally {
            $this->deleteDirectory($tempDir);

            // Clean up the ZIP file
            if ($this->zipFilePath) {
                Storage::delete($this->zipFilePath);
            }
        }
    }

    private function finalizeZipUpload(PartsUpload $parentUpload, array $logs, bool $hasChildren, string $status = 'completed', int $totalParts = 0, int $processedParts = 0): void
    {
        // Update parts count from database if we have children
        if ($hasChildren) {
            // Sum processed parts from all child uploads instead of checking parent's own parts
            $actualPartsCount = PartsUpload::where('parent_upload_id', $parentUpload->id)->sum('processed_parts');
            if ($actualPartsCount !== $totalParts) {
                Log::info("[ZipAggregationJob] Adjusting parts count from {$totalParts} to {$actualPartsCount} based on child uploads");
                $processedParts = $actualPartsCount;
                $totalParts = $actualPartsCount;
            }
        }

        $finalLogs = array_merge($logs, [
            "ZIP processing finalized at " . now()->format('H:i:s')
        ]);

        $parentUpload->update([
            'status' => $status,
            'total_parts' => $totalParts,
            'processed_parts' => $processedParts,
            'completed_at' => now(),
            'processing_logs' => $finalLogs
        ]);

        Log::info("[ZipAggregationJob] ZIP upload {$this->parentUploadId} finalized with status: {$status}");
    }

    private function shouldSkipFile(string $filename): bool
    {
        // Skip macOS resource fork files
        if (str_starts_with($filename, '._')) {
            return true;
        }

        // Skip hidden files
        if (str_starts_with($filename, '.')) {
            return true;
        }

        // Skip common system files
        $systemFiles = ['__MACOSX', 'Thumbs.db', 'Desktop.ini', '.DS_Store'];

        foreach ($systemFiles as $systemFile) {
            if (str_contains($filename, $systemFile)) {
                return true;
            }
        }

        return false;
    }

    private function deleteDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            is_dir($path) ? $this->deleteDirectory($path) : unlink($path);
        }
        rmdir($dir);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("[ZipAggregationJob] Job failed for parent upload {$this->parentUploadId}: " . $exception->getMessage());

        $parentUpload = PartsUpload::find($this->parentUploadId);
        if ($parentUpload) {
            $parentUpload->update([
                'status' => 'failed',
                'processing_logs' => array_merge($parentUpload->processing_logs ?? [], [
                    "ZIP aggregation job failed: " . $exception->getMessage()
                ])
            ]);
        }

        // Clean up ZIP file on failure
        if ($this->zipFilePath) {
            Storage::delete($this->zipFilePath);
        }
    }

    public function tags(): array
    {
        return ['zip-aggregation', 'parts-dataset', "parent-upload-{$this->parentUploadId}"];
    }
}
