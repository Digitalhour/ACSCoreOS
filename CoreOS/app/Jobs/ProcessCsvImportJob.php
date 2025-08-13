<?php

// Updated ProcessCsvImportJob - Maintains ZIP handling, adds chunking for CSV processing
namespace App\Jobs;

use App\Services\CsvProcessingService;
use App\Services\PartInstanceProcessingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;
use ZipArchive;

class ProcessCsvImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $filePath;
    protected string $originalFilename;
    protected ?string $configuredUniqueColumnName;

    public $tries = 3;
    public $timeout = 1800; // 30 minutes for large files

    public function __construct(string $filePath, string $originalFilename, ?string $configuredUniqueColumnName = null)
    {
        $this->filePath = $filePath;
        $this->originalFilename = $originalFilename;
        $this->configuredUniqueColumnName = $configuredUniqueColumnName;
    }

    public function handle(
        CsvProcessingService $csvService,
        PartInstanceProcessingService $partInstanceService
    ): void {
        $logPrefix = "[JOB:ProcessCsvImportJob '{$this->originalFilename}']";
        Log::info("{$logPrefix} Starting processing. Path: {$this->filePath}");

        if (!file_exists($this->filePath)) {
            Log::error("{$logPrefix} File NOT FOUND at path: {$this->filePath}");
            return;
        }

        $fileExtension = strtolower(pathinfo($this->originalFilename, PATHINFO_EXTENSION));

        if ($fileExtension === 'zip') {
            $this->handleZipFile($csvService, $partInstanceService, $logPrefix);
        } elseif ($fileExtension === 'csv') {
            $this->handleCsvFile($csvService, $partInstanceService, $logPrefix, $this->filePath,
                $this->originalFilename);
        } else {
            Log::error("{$logPrefix} Unsupported file type: {$fileExtension}");
        }
    }

    protected function handleZipFile(
        CsvProcessingService $csvService,
        PartInstanceProcessingService $partInstanceService,
        string $logPrefix
    ): void {
        $zip = new ZipArchive();
        $extractPath = storage_path('app/temp/zip_extracts/'.Str::uuid());
        $extractedFiles = [];

        try {
            $result = $zip->open($this->filePath);
            if ($result !== true) {
                Log::error("{$logPrefix} Failed to open ZIP file. Error code: {$result}");
                return;
            }

            if (!is_dir($extractPath)) {
                mkdir($extractPath, 0755, true);
            }

            Log::info("{$logPrefix} ZIP file opened successfully. Contains {$zip->numFiles} files.");

            // Extract CSV files
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $fileInfo = $zip->statIndex($i);
                $filename = $fileInfo['name'];

                if (substr($filename, -1) === '/' || strtolower(pathinfo($filename, PATHINFO_EXTENSION)) !== 'csv') {
                    continue;
                }

                $extractedFilePath = $extractPath.'/'.basename($filename);
                if ($zip->extractTo($extractPath, $filename)) {
                    $actualExtractedPath = $extractPath.'/'.$filename;
                    if (file_exists($actualExtractedPath) && $actualExtractedPath !== $extractedFilePath) {
                        rename($actualExtractedPath, $extractedFilePath);
                    }
                    $extractedFiles[] = $extractedFilePath;
                    Log::info("{$logPrefix} Extracted CSV file: {$filename} to {$extractedFilePath}");
                } else {
                    Log::error("{$logPrefix} Failed to extract file: {$filename}");
                }
            }
            $zip->close();

            if (empty($extractedFiles)) {
                Log::warning("{$logPrefix} No CSV files found in ZIP archive.");
                return;
            }

            Log::info("{$logPrefix} Successfully extracted ".count($extractedFiles)." CSV files from ZIP.");

            // Process each extracted CSV
            foreach ($extractedFiles as $csvFilePath) {
                $csvFilename = basename($csvFilePath);
                $logPrefixForCsv = "[JOB:ProcessCsvImportJob ZIP:'{$this->originalFilename}' CSV:'{$csvFilename}']";
                Log::info("{$logPrefixForCsv} Processing CSV file from ZIP...");
                $this->handleCsvFile($csvService, $partInstanceService, $logPrefixForCsv, $csvFilePath, $csvFilename);
            }

        } catch (Throwable $e) {
            Log::error("{$logPrefix} Exception during ZIP processing: ".$e->getMessage(), [
                'exception_trace' => $e->getTraceAsString()
            ]);
            throw $e;
        } finally {
            // Cleanup
            foreach ($extractedFiles as $file) {
                if (file_exists($file)) {
                    unlink($file);
                }
            }
            if (is_dir($extractPath)) {
                if (count(scandir($extractPath)) <= 2) {
                    rmdir($extractPath);
                }
            }
            Log::info("{$logPrefix} Cleaned up extracted files from ZIP processing.");
        }
    }

    protected function handleCsvFile(
        CsvProcessingService $csvService,
        PartInstanceProcessingService $partInstanceService,
        string $logPrefix,
        string $csvFilePath,
        string $csvFilename
    ): void {
        $startTime = microtime(true);

        try {
            // Parse CSV data
            list($csvData, $csvHeaders) = $csvService->parseCsvFromPath($csvFilePath);

            Log::info("{$logPrefix} CSV Parsed successfully. Rows: ".count($csvData).", Headers: ".implode(', ',
                    $csvHeaders));

            if (empty($csvData)) {
                Log::warning("{$logPrefix} No data rows found in CSV file.");
                return;
            }

            // Check if this is a large CSV that should be chunked
            $totalRows = count($csvData);
            $chunkThreshold = 500; // Chunk if more than 500 rows

            if ($totalRows > $chunkThreshold) {
                Log::info("{$logPrefix} Large CSV detected ({$totalRows} rows). Using chunked processing.");
                $this->dispatchChunkedProcessing($csvData, $csvHeaders, $csvFilename, $logPrefix);
            } else {
                Log::info("{$logPrefix} Small CSV ({$totalRows} rows). Using direct processing.");
                $this->processDirectly($partInstanceService, $csvData, $csvHeaders, $csvFilename, $logPrefix,
                    $startTime);
            }

        } catch (Throwable $e) {
            $processingTime = round(microtime(true) - $startTime, 2);
            Log::error("{$logPrefix} EXCEPTION after {$processingTime}s: ".$e->getMessage(), [
                'exception_trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    protected function dispatchChunkedProcessing(
        array $csvData,
        array $csvHeaders,
        string $csvFilename,
        string $logPrefix
    ): void {
        $batchId = Str::uuid();
        $totalRows = count($csvData);
        $chunkSize = 200; // Process 200 rows per chunk job

        Log::info("{$logPrefix} Starting chunked processing: {$totalRows} rows, batch {$batchId}");

        // Break CSV data into chunks
        $chunks = array_chunk($csvData, $chunkSize);
        $totalChunks = count($chunks);

        // Dispatch individual chunk processing jobs
        foreach ($chunks as $chunkIndex => $chunk) {
            ProcessCsvChunkJob::dispatch(
                $chunk,
                $csvHeaders,
                $csvFilename,
                $batchId,
                $chunkIndex + 1,
                $totalChunks,
                $this->configuredUniqueColumnName
            )->onQueue('csv-processing');
        }

        // Dispatch a cleanup job to run after all chunks are processed
        ProcessCsvCleanupJob::dispatch(
            $csvFilename,
            $batchId,
            $totalChunks
        )->onQueue('csv-processing')->delay(now()->addMinutes(2));

        Log::info("{$logPrefix} Dispatched {$totalChunks} chunk jobs for chunked processing");
    }

    protected function processDirectly(
        PartInstanceProcessingService $partInstanceService,
        array $csvData,
        array $csvHeaders,
        string $csvFilename,
        string $logPrefix,
        float $startTime
    ): void {
        // Process small CSVs directly (original behavior)
        $stats = $partInstanceService->processPartInstancesFromCsv(
            $csvData,
            $csvHeaders,
            $csvFilename,
            $this->configuredUniqueColumnName
        );

        $processingTime = round(microtime(true) - $startTime, 2);

        // Log final statistics
        Log::info("{$logPrefix} Processing completed in {$processingTime}s. Stats: ".json_encode($stats));

        // Get additional file stats
        $fileStats = $partInstanceService->getProcessingStats($csvFilename);
        Log::info("{$logPrefix} File statistics: ".json_encode($fileStats));
    }

    public function failed(Throwable $exception): void
    {
        $logPrefix = "[JOB:ProcessCsvImportJob '{$this->originalFilename}']";
        Log::error("{$logPrefix} PERMANENTLY FAILED. Error: {$exception->getMessage()}", [
            'filePath' => $this->filePath,
            'exception_trace' => $exception->getTraceAsString(),
        ]);
    }
}

// Chunk Processing Job - Processes a small subset of rows


// Cleanup Job - Runs after all chunks to handle removed instances and final stats

