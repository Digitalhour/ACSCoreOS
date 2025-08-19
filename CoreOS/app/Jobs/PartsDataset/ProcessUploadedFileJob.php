<?php

// app/Jobs/PartsDataset/ProcessUploadedFileJob.php

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

class ProcessUploadedFileJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $uploadId;
    protected string $storedFilePath;

    /**
     * Job timeout in seconds
     */
    public int $timeout = 600; // 10 minutes for large files

    /**
     * Number of times the job may be attempted
     */
    public int $tries = 3;

    /**
     * Create a new job instance
     */
    public function __construct(int $uploadId, string $storedFilePath)
    {
        $this->uploadId = $uploadId;
        $this->storedFilePath = $storedFilePath;

        // Use a specific queue for file processing
        $this->onQueue('file-processing');
    }

    /**
     * Execute the job
     */
    public function handle(UploadProcessingService $processingService): void
    {
        $startTime = microtime(true);

        Log::info("[ProcessUploadedFileJob] Starting file processing for upload {$this->uploadId}");

        try {
            // Get the upload record
            $upload = PartsUpload::findOrFail($this->uploadId);

            // Update status to processing
            $upload->update([
                'status' => 'processing',
                'processing_logs' => array_merge($upload->processing_logs ?? [], ["Started background file processing"])
            ]);

            // Get the stored file path
            $filePath = Storage::path($this->storedFilePath);

            if (!file_exists($filePath)) {
                throw new \Exception("Uploaded file not found at: {$filePath}");
            }

            Log::info("[ProcessUploadedFileJob] Processing file: {$filePath}");

            // Determine file type and process accordingly
            $extension = strtolower(pathinfo($upload->original_filename, PATHINFO_EXTENSION));

            $result = match ($extension) {
                'zip' => $processingService->processZipFileFromPath($filePath, $upload),
                'xlsx', 'xls' => $processingService->processExcelFileFromPath($filePath, $upload),
                'csv' => $processingService->processCsvFileFromPath($filePath, $upload),
                default => throw new \Exception("Unsupported file type: {$extension}")
            };

            $duration = round(microtime(true) - $startTime, 2);

            // Update upload status to completed
            $upload->update([
                'status' => 'completed',
                'completed_at' => now(),
                'total_parts' => $result['total_parts'],
                'processed_parts' => $result['total_parts'],
                'processing_logs' => array_merge($upload->processing_logs ?? [], [
                    "File processing completed in {$duration}s",
                    "Successfully processed {$result['total_parts']} parts"
                ])
            ]);

            Log::info("[ProcessUploadedFileJob] File processing completed for upload {$this->uploadId}", [
                'total_parts' => $result['total_parts'],
                'duration_seconds' => $duration
            ]);

            // Dispatch Shopify sync job for the processed parts
            $this->dispatchShopifySync($upload);

            // Clean up the temporary file
            Storage::delete($this->storedFilePath);

        } catch (\Exception $e) {
            Log::error("[ProcessUploadedFileJob] File processing failed for upload {$this->uploadId}", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Update upload status to failed
            $upload = PartsUpload::find($this->uploadId);
            if ($upload) {
                $upload->update([
                    'status' => 'failed',
                    'processing_logs' => array_merge($upload->processing_logs ?? [], [
                        "File processing failed: " . $e->getMessage()
                    ])
                ]);
            }

            // Clean up the temporary file even on failure
            Storage::delete($this->storedFilePath);

            throw $e; // Re-throw to mark job as failed
        }
    }

    /**
     * Dispatch Shopify sync for processed parts
     */
    private function dispatchShopifySync(PartsUpload $upload): void
    {
        try {
            $partIds = $upload->parts()->pluck('id')->toArray();

            if (!empty($partIds)) {
                Log::info("[ProcessUploadedFileJob] Dispatching Shopify sync for upload {$upload->id} with " . count($partIds) . " parts");

                // Dispatch Shopify sync job
                SyncPartsWithShopifyJob::dispatch($partIds, $upload->id);

                // Update upload logs
                $logs = $upload->processing_logs ?? [];
                $logs[] = "Shopify sync job dispatched for " . count($partIds) . " parts";
                $upload->update(['processing_logs' => $logs]);

            } else {
                Log::warning("[ProcessUploadedFileJob] No parts found for Shopify sync in upload {$upload->id}");
            }
        } catch (\Exception $e) {
            Log::error("[ProcessUploadedFileJob] Failed to dispatch Shopify sync for upload {$upload->id}: " . $e->getMessage());

            $logs = $upload->processing_logs ?? [];
            $logs[] = "Failed to dispatch Shopify sync: " . $e->getMessage();
            $upload->update(['processing_logs' => $logs]);
        }
    }

    /**
     * Handle job failure
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("[ProcessUploadedFileJob] Job failed after {$this->tries} attempts", [
            'upload_id' => $this->uploadId,
            'file_path' => $this->storedFilePath,
            'exception' => $exception->getMessage(),
        ]);

        // Clean up file on failure
        Storage::delete($this->storedFilePath);

        // Update upload status
        $upload = PartsUpload::find($this->uploadId);
        if ($upload) {
            $upload->update([
                'status' => 'failed',
                'processing_logs' => array_merge($upload->processing_logs ?? [], [
                    "File processing failed after {$this->tries} attempts: " . $exception->getMessage()
                ])
            ]);
        }
    }

    /**
     * Get job tags for monitoring
     */
    public function tags(): array
    {
        return ['file-processing', 'parts-dataset', "upload-{$this->uploadId}"];
    }
}
