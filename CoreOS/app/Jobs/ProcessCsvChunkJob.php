<?php

namespace App\Jobs;

use App\Services\PartInstanceProcessingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessCsvChunkJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300;
    public $tries = 3;

    protected array $chunkData;
    protected array $csvHeaders;
    protected string $csvFilename;
    protected string $batchId;
    protected int $chunkNumber;
    protected int $totalChunks;
    protected ?string $configuredUniqueColumn;

    public function __construct(
        array $chunkData,
        array $csvHeaders,
        string $csvFilename,
        string $batchId,
        int $chunkNumber,
        int $totalChunks,
        ?string $configuredUniqueColumn = null
    ) {
        $this->chunkData = $chunkData;
        $this->csvHeaders = $csvHeaders;
        $this->csvFilename = $csvFilename;
        $this->batchId = $batchId;
        $this->chunkNumber = $chunkNumber;
        $this->totalChunks = $totalChunks;
        $this->configuredUniqueColumn = $configuredUniqueColumn;
    }

    public function handle(): void
    {
        $startMemory = memory_get_usage(true) / 1024 / 1024;
        Log::info("[ProcessCsvChunkJob] Processing chunk {$this->chunkNumber}/{$this->totalChunks} for {$this->csvFilename} (Start memory: {$startMemory}MB)");

        try {
            $service = app(PartInstanceProcessingService::class);

            $stats = $service->processPartInstancesFromCsv(
                $this->chunkData,
                $this->csvHeaders,
                $this->csvFilename,
                $this->configuredUniqueColumn,
                $this->batchId // Pass batch ID to maintain consistency
            );

            $endMemory = memory_get_usage(true) / 1024 / 1024;
            Log::info("[ProcessCsvChunkJob] Completed chunk {$this->chunkNumber}/{$this->totalChunks}: ".json_encode($stats)." (End memory: {$endMemory}MB)");

// Store chunk completion status
            \Cache::put("csv_chunk_{$this->batchId}_{$this->chunkNumber}", [
                'completed' => true,
                'stats' => $stats,
                'completed_at' => now()
            ], now()->addHours(24));

        } catch (\Exception $e) {
            Log::error("[ProcessCsvChunkJob] Failed chunk {$this->chunkNumber}/{$this->totalChunks}: ".$e->getMessage());

// Store failure status
            \Cache::put("csv_chunk_{$this->batchId}_{$this->chunkNumber}", [
                'completed' => false,
                'error' => $e->getMessage(),
                'failed_at' => now()
            ], now()->addHours(24));

            throw $e;
        }
    }
}
