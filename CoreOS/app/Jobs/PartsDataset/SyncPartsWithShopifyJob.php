<?php

// app/Jobs/PartsDataset/SyncPartsWithShopifyJob.php

namespace App\Jobs\PartsDataset;

use App\Models\PartsDataset\PartsUpload;
use App\Services\PartsDataset\ShopifyService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncPartsWithShopifyJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected array $partIds;
    protected ?int $uploadId;
    protected int $batchSize;

    /**
     * Job timeout in seconds
     */
    public int $timeout = 300; // 5 minutes

    /**
     * Number of times the job may be attempted
     */
    public int $tries = 3;

    /**
     * Create a new job instance
     */
    public function __construct(array $partIds, ?int $uploadId = null, int $batchSize = 20)
    {
        $this->partIds = $partIds;
        $this->uploadId = $uploadId;
        $this->batchSize = $batchSize;

        // Use a specific queue for Shopify syncing
        $this->onQueue('shopify-sync');
    }

    /**
     * Execute the job
     */
    public function handle(ShopifyService $shopifyService): void
    {
        $startTime = microtime(true);
        $totalParts = count($this->partIds);

        Log::info("[SyncPartsWithShopifyJob] Starting Shopify sync for {$totalParts} parts", [
            'upload_id' => $this->uploadId,
            'part_ids_count' => $totalParts,
            'batch_size' => $this->batchSize,
        ]);

        try {
            // Process parts in smaller chunks to avoid memory issues and API rate limits
            $chunks = array_chunk($this->partIds, $this->batchSize);
            $totalResults = ['synced' => 0, 'failed' => 0, 'not_found' => 0];

            foreach ($chunks as $chunkIndex => $chunk) {
                Log::info("[SyncPartsWithShopifyJob] Processing chunk " . ($chunkIndex + 1) . "/" . count($chunks) . " ({" . count($chunk) . "} parts)");

                try {
                    $results = $shopifyService->syncMultipleParts($chunk);

                    // Aggregate results
                    $totalResults['synced'] += $results['synced'];
                    $totalResults['failed'] += $results['failed'];
                    $totalResults['not_found'] += $results['not_found'];

                    Log::info("[SyncPartsWithShopifyJob] Chunk " . ($chunkIndex + 1) . " completed", $results);

                    // Small delay between chunks to be nice to APIs
                    if ($chunkIndex < count($chunks) - 1) {
                        usleep(250000); // 250ms delay
                    }

                } catch (\Exception $e) {
                    Log::error("[SyncPartsWithShopifyJob] Chunk " . ($chunkIndex + 1) . " failed: " . $e->getMessage());
                    $totalResults['failed'] += count($chunk);
                }
            }

            $duration = round(microtime(true) - $startTime, 2);

            Log::info("[SyncPartsWithShopifyJob] Shopify sync completed", [
                'upload_id' => $this->uploadId,
                'total_parts' => $totalParts,
                'duration_seconds' => $duration,
                'results' => $totalResults,
            ]);

            // Update upload logs if this was triggered by an upload
            if ($this->uploadId) {
                $this->updateUploadLogs($totalResults, $duration);
            }

        } catch (\Exception $e) {
            Log::error("[SyncPartsWithShopifyJob] Shopify sync job failed", [
                'upload_id' => $this->uploadId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Update upload with error if applicable
            if ($this->uploadId) {
                $this->updateUploadLogs(['error' => $e->getMessage()], 0);
            }

            throw $e; // Re-throw to mark job as failed
        }
    }

    /**
     * Handle job failure
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("[SyncPartsWithShopifyJob] Job failed after {$this->tries} attempts", [
            'upload_id' => $this->uploadId,
            'part_ids_count' => count($this->partIds),
            'exception' => $exception->getMessage(),
        ]);

        // Update upload logs with failure
        if ($this->uploadId) {
            $this->updateUploadLogs(['error' => 'Shopify sync failed: ' . $exception->getMessage()], 0);
        }
    }

    /**
     * Update upload processing logs
     */
    private function updateUploadLogs(array $results, float $duration): void
    {
        try {
            $upload = PartsUpload::find($this->uploadId);
            if (!$upload) {
                return;
            }

            $logs = $upload->processing_logs ?? [];

            if (isset($results['error'])) {
                $logs[] = "Shopify sync failed: {$results['error']}";
            } else {
                $logs[] = sprintf(
                    "Shopify sync completed in %.2fs: %d synced, %d not found, %d failed",
                    $duration,
                    $results['synced'] ?? 0,
                    $results['not_found'] ?? 0,
                    $results['failed'] ?? 0
                );
            }

            $upload->update(['processing_logs' => $logs]);

        } catch (\Exception $e) {
            Log::error("[SyncPartsWithShopifyJob] Failed to update upload logs: " . $e->getMessage());
        }
    }

    /**
     * Get job tags for monitoring
     */
    public function tags(): array
    {
        $tags = ['shopify-sync', 'parts-dataset'];

        if ($this->uploadId) {
            $tags[] = "upload-{$this->uploadId}";
        }

        return $tags;
    }
}
