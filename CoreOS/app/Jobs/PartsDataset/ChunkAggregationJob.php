<?php

// app/Jobs/PartsDataset/ChunkAggregationJob.php

namespace App\Jobs\PartsDataset;

use App\Models\PartsDataset\PartsUpload;
use App\Models\PartsDataset\UploadChunk;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ChunkAggregationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $uploadId;
    protected int $maxRetries = 5;

    public int $timeout = 120;
    public int $tries = 10;

    public function __construct(int $uploadId)
    {
        $this->uploadId = $uploadId;
        $this->onQueue('aggregation');
    }

    public function handle(): void
    {
        try {
            $upload = PartsUpload::findOrFail($this->uploadId);

            Log::info("[ChunkAggregationJob] Checking completion status for upload {$this->uploadId}");

            // Check if all chunks are completed
            $chunks = $upload->chunks;
            $completedChunks = $chunks->where('status', UploadChunk::STATUS_COMPLETED);
            $failedChunks = $chunks->where('status', UploadChunk::STATUS_FAILED);
            $pendingChunks = $chunks->whereIn('status', [
                UploadChunk::STATUS_PENDING,
                UploadChunk::STATUS_PROCESSING
            ]);

            // If there are still pending chunks, reschedule this job
            if ($pendingChunks->count() > 0) {
                Log::info("[ChunkAggregationJob] Still waiting for chunks", [
                    'upload_id' => $this->uploadId,
                    'pending' => $pendingChunks->count(),
                    'completed' => $completedChunks->count(),
                    'failed' => $failedChunks->count()
                ]);

                // Reschedule with exponential backoff
                $delay = min(60 * pow(2, $this->attempts() - 1), 300); // Max 5 minutes
                $this->release($delay);
                return;
            }

            // All chunks are done, aggregate results
            $this->aggregateResults($upload, $completedChunks, $failedChunks);

        } catch (\Exception $e) {
            Log::error("[ChunkAggregationJob] Failed", [
                'upload_id' => $this->uploadId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function aggregateResults(PartsUpload $upload, $completedChunks, $failedChunks): void
    {
        $totalCreated = $completedChunks->sum('created_parts');
        $totalUpdated = $completedChunks->sum('updated_parts');
        $totalProcessed = $totalCreated + $totalUpdated;
        $totalProcessingTime = $completedChunks->sum('processing_time_seconds');

        $logs = $upload->processing_logs ?? [];

        if ($failedChunks->count() > 0) {
            // Partial completion
            $logs[] = sprintf(
                "Processing completed with %d failed chunks. Created: %d, Updated: %d, Total: %d parts in %.2fs",
                $failedChunks->count(),
                $totalCreated,
                $totalUpdated,
                $totalProcessed,
                $totalProcessingTime
            );

            $upload->update([
                'status' => 'completed_with_errors',
                'total_parts' => $totalProcessed,
                'processed_parts' => $totalProcessed,
                'completed_at' => now(),
                'processing_logs' => $logs
            ]);

            Log::warning("[ChunkAggregationJob] Upload {$upload->id} completed with errors", [
                'completed_chunks' => $completedChunks->count(),
                'failed_chunks' => $failedChunks->count(),
                'total_parts' => $totalProcessed
            ]);

        } else {
            // Full completion
            $logs[] = sprintf(
                "Processing completed successfully. Created: %d, Updated: %d, Total: %d parts in %.2fs",
                $totalCreated,
                $totalUpdated,
                $totalProcessed,
                $totalProcessingTime
            );

            $upload->update([
                'status' => 'completed',
                'total_parts' => $totalProcessed,
                'processed_parts' => $totalProcessed,
                'completed_at' => now(),
                'processing_logs' => $logs
            ]);

            Log::info("[ChunkAggregationJob] Upload {$upload->id} completed successfully", [
                'total_chunks' => $completedChunks->count(),
                'total_parts' => $totalProcessed,
                'processing_time' => round($totalProcessingTime, 2) . 's'
            ]);
        }

        // Dispatch Shopify sync for processed parts
        if ($totalProcessed > 0) {
            $this->dispatchShopifySync($upload);
        }

        // Clean up temporary file
        $this->cleanupTempFile($upload);
    }

    private function dispatchShopifySync(PartsUpload $upload): void
    {
        try {
            $partIds = $upload->parts()->pluck('id')->toArray();

            if (!empty($partIds)) {
                Log::info("[ChunkAggregationJob] Dispatching Shopify sync for {$upload->id} with " . count($partIds) . " parts");

                SyncPartsWithShopifyJob::dispatch($partIds, $upload->id);

                $logs = $upload->processing_logs ?? [];
                $logs[] = "Shopify sync job dispatched for " . count($partIds) . " parts";
                $upload->update(['processing_logs' => $logs]);
            }
        } catch (\Exception $e) {
            Log::error("[ChunkAggregationJob] Failed to dispatch Shopify sync for upload {$upload->id}: " . $e->getMessage());
        }
    }

    private function cleanupTempFile(PartsUpload $upload): void
    {
        // This would need to be coordinated with the stored file path
        // For now, just log that cleanup should happen
        Log::info("[ChunkAggregationJob] Temporary file cleanup needed for upload {$upload->id}");
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("[ChunkAggregationJob] Job failed after {$this->tries} attempts", [
            'upload_id' => $this->uploadId,
            'exception' => $exception->getMessage()
        ]);

        $upload = PartsUpload::find($this->uploadId);
        if ($upload) {
            $logs = $upload->processing_logs ?? [];
            $logs[] = "Aggregation failed: " . $exception->getMessage();

            $upload->update([
                'status' => 'failed',
                'processing_logs' => $logs
            ]);
        }
    }

    public function tags(): array
    {
        return ['aggregation', 'parts-dataset', "upload-{$this->uploadId}"];
    }
}
