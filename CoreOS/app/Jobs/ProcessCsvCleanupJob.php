<?php

namespace App\Jobs;

use App\Services\PartInstanceProcessingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;


class ProcessCsvCleanupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300;
    public $tries = 3;

    protected string $csvFilename;
    protected string $batchId;
    protected int $totalChunks;

    public function __construct(string $csvFilename, string $batchId, int $totalChunks)
    {
        $this->csvFilename = $csvFilename;
        $this->batchId = $batchId;
        $this->totalChunks = $totalChunks;
    }

    public function handle(): void
    {
        Log::info("[ProcessCsvCleanupJob] Starting cleanup for {$this->csvFilename}, batch {$this->batchId}");

// Wait for all chunks to complete (with timeout)
        $maxWaitTime = now()->addMinutes(30);
        $completedChunks = 0;

        while (now()->lt($maxWaitTime) && $completedChunks < $this->totalChunks) {
            $completedChunks = 0;

            for ($i = 1; $i <= $this->totalChunks; $i++) {
                $chunkStatus = \Cache::get("csv_chunk_{$this->batchId}_{$i}");
                if ($chunkStatus && $chunkStatus['completed']) {
                    $completedChunks++;
                }
            }

            if ($completedChunks < $this->totalChunks) {
                Log::info("[ProcessCsvCleanupJob] Waiting for chunks to complete: {$completedChunks}/{$this->totalChunks}");
                sleep(10); // Wait 10 seconds before checking again
            }
        }

        if ($completedChunks < $this->totalChunks) {
            Log::warning("[ProcessCsvCleanupJob] Not all chunks completed in time: {$completedChunks}/{$this->totalChunks}");
        }

// Handle removed instances (mark as inactive)
        $service = app(PartInstanceProcessingService::class);
        $service->handleRemovedInstances($this->csvFilename, $this->batchId);

// Compile final statistics
        $totalStats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0,
            'completed_chunks' => $completedChunks,
            'total_chunks' => $this->totalChunks
        ];

        for ($i = 1; $i <= $this->totalChunks; $i++) {
            $chunkStatus = \Cache::get("csv_chunk_{$this->batchId}_{$i}");
            if ($chunkStatus && isset($chunkStatus['stats'])) {
                $stats = $chunkStatus['stats'];
                $totalStats['created'] += $stats['created'] ?? 0;
                $totalStats['updated'] += $stats['updated'] ?? 0;
                $totalStats['skipped'] += $stats['skipped'] ?? 0;
                $totalStats['errors'] += $stats['errors'] ?? 0;
            }
        }

// Get final processing statistics
        $finalStats = $service->getProcessingStats($this->csvFilename);

        Log::info("[ProcessCsvCleanupJob] Completed processing for {$this->csvFilename}: ".json_encode([
                'chunk_stats' => $totalStats,
                'final_db_stats' => $finalStats
            ]));

// Clean up chunk status cache
        for ($i = 1; $i <= $this->totalChunks; $i++) {
            \Cache::forget("csv_chunk_{$this->batchId}_{$i}");
        }

// Store final results
        \Cache::put("csv_import_final_{$this->batchId}", [
            'filename' => $this->csvFilename,
            'batch_id' => $this->batchId,
            'chunk_stats' => $totalStats,
            'final_stats' => $finalStats,
            'completed_at' => now()
        ], now()->addDays(7));
    }
}
