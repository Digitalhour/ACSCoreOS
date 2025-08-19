<?php

// app/Jobs/PartsDataset/FileChunkingJob.php

namespace App\Jobs\PartsDataset;

use App\Models\PartsDataset\PartsUpload;
use App\Services\PartsDataset\StreamingExcelService;
use App\Services\PartsDataset\UploadProcessingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileChunkingJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $uploadId;
    protected string $storedFilePath;

    public int $timeout = 300; // 5 minutes for analysis
    public int $tries = 2;

    public function __construct(int $uploadId, string $storedFilePath)
    {
        $this->uploadId = $uploadId;
        $this->storedFilePath = $storedFilePath;
        $this->onQueue('file-processing');
    }

    public function handle(StreamingExcelService $streamingService): void
    {
        $startTime = microtime(true);

        Log::info("[FileChunkingJob] Starting file analysis for upload {$this->uploadId}");

        try {
            $upload = PartsUpload::findOrFail($this->uploadId);

            $upload->update([
                'status' => 'analyzing',
                'processing_logs' => array_merge($upload->processing_logs ?? [], [
                    "Started file analysis at " . now()->format('H:i:s')
                ])
            ]);

            $filePath = Storage::path($this->storedFilePath);
            $extension = strtolower(pathinfo($upload->original_filename, PATHINFO_EXTENSION));

            if ($extension === 'zip') {
                // Handle ZIP files with proper chunking support
                $this->handleZipFile($filePath, $upload, $streamingService);
            } else {
                // Handle individual files (Excel/CSV)
                $analysis = $streamingService->analyzeAndCreateChunks($filePath, $upload);
                $this->dispatchChunkJobs($upload, $analysis['headers']);
            }

        } catch (\Exception $e) {
            Log::error("[FileChunkingJob] Failed", [
                'upload_id' => $this->uploadId,
                'error' => $e->getMessage()
            ]);

            $upload = PartsUpload::find($this->uploadId);
            if ($upload) {
                $upload->update([
                    'status' => 'failed',
                    'processing_logs' => array_merge($upload->processing_logs ?? [], [
                        "File analysis failed: " . $e->getMessage()
                    ])
                ]);
            }

            throw $e;
        }
    }

    private function handleZipFile(string $zipFilePath, PartsUpload $upload, StreamingExcelService $streamingService): void
    {
        $tempDir = storage_path('app/temp/' . Str::uuid());
        mkdir($tempDir, 0755, true);

        try {
            Log::info("[FileChunkingJob] Processing ZIP file: {$zipFilePath}");

            $zip = new \ZipArchive();
            if ($zip->open($zipFilePath) !== true) {
                throw new \Exception('Failed to open ZIP file');
            }

            $zip->extractTo($tempDir);
            $zip->close();

            $totalParts = 0;
            $processedFiles = [];
            $imagePaths = [];
            $chunkingFiles = [];

            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($tempDir)
            );

            Log::info("[DEBUG] Starting file analysis in ZIP");

            // First pass: identify files and determine processing strategy
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $filename = $file->getFilename();
                    $extension = strtolower($file->getExtension());

                    if ($this->shouldSkipFile($filename)) {
                        Log::debug("[DEBUG] Skipping file: {$filename}");
                        continue;
                    }

                    if (in_array($extension, ['xlsx', 'xls', 'csv'])) {
                        $fileSize = filesize($file->getPathname());
                        $shouldChunk = $this->shouldFileBeChunked($file->getPathname(), $extension);

                        Log::info("[DEBUG] Found Excel/CSV file: {$filename}", [
                            'extension' => $extension,
                            'size_bytes' => $fileSize,
                            'size_mb' => round($fileSize / 1024 / 1024, 2),
                            'should_chunk' => $shouldChunk
                        ]);

                        if ($shouldChunk) {
                            Log::info("[DEBUG] File {$filename} WILL use chunking");
                            $chunkingFiles[] = [
                                'path' => $file->getPathname(),
                                'filename' => $filename,
                                'extension' => $extension
                            ];
                        } else {
                            Log::info("[DEBUG] File {$filename} will use DIRECT processing");
                            // Process small files directly
                            $processingService = app(UploadProcessingService::class);
                            $result = match ($extension) {
                                'xlsx', 'xls' => $processingService->processExcelFileFromPath($file->getPathname(), $upload),
                                'csv' => $processingService->processCsvFileFromPath($file->getPathname(), $upload),
                                default => ['total_parts' => 0]
                            };

                            $totalParts += $result['total_parts'];
                            $processedFiles[] = $filename;
                            Log::info("[DEBUG] Directly processed {$filename}: {$result['total_parts']} parts");
                        }
                    } elseif (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                        $imagePaths[$file->getPathname()] = $filename;
                        Log::debug("[DEBUG] Found image: {$filename}");
                    }
                }
            }

            Log::info("[DEBUG] File analysis complete", [
                'chunking_files' => count($chunkingFiles),
                'direct_processed_files' => count($processedFiles),
                'images_found' => count($imagePaths),
                'total_parts_from_direct' => $totalParts
            ]);

            // Handle files that need chunking
            if (!empty($chunkingFiles)) {
                Log::info("[DEBUG] CHUNKING PATH: Processing " . count($chunkingFiles) . " files with chunking");

                foreach ($chunkingFiles as $fileInfo) {
                    // Store file temporarily for chunk processing
                    $storedPath = 'temp/zip_chunk_' . Str::uuid() . '.' . $fileInfo['extension'];
                    Storage::put($storedPath, file_get_contents($fileInfo['path']));

                    // Create a temporary upload record for this file to track chunking
                    $fileUpload = PartsUpload::create([
                        'filename' => $fileInfo['filename'],
                        'original_filename' => $fileInfo['filename'],
                        'upload_type' => $this->determineUploadType($fileInfo['extension']),
                        'batch_id' => Str::uuid(),
                        'status' => 'analyzing',
                        'uploaded_at' => now(),
                        'processing_logs' => ["Part of ZIP: {$upload->original_filename}"],
                        'parent_upload_id' => $upload->id,
                    ]);

                    Log::info("[DEBUG] Created child upload {$fileUpload->id} for {$fileInfo['filename']}");

                    // Analyze and create chunks for this file
                    $analysis = $streamingService->analyzeAndCreateChunks(Storage::path($storedPath), $fileUpload);

                    // Dispatch chunk processing jobs for this file
                    $this->dispatchChunkJobs($fileUpload, $analysis['headers'], $storedPath);

                    $processedFiles[] = $fileInfo['filename'] . ' (chunked)';
                }

                // Update parent upload to track child uploads
                $childUploadIds = PartsUpload::where('parent_upload_id', $upload->id)->pluck('id')->toArray();
                $upload->update([
                    'status' => 'processing',
                    'processing_logs' => array_merge($upload->processing_logs ?? [], [
                        "Dispatched chunking for " . count($chunkingFiles) . " files",
                        "Child upload IDs: " . implode(', ', $childUploadIds),
                        "Found " . count($imagePaths) . " images for later processing"
                    ])
                ]);

                // Store ZIP file for later image processing if images exist
                $zipStoredPath = null;
                if (!empty($imagePaths)) {
                    $zipStoredPath = 'temp/zip_for_images_' . Str::uuid() . '.zip';
                    Storage::put($zipStoredPath, file_get_contents($zipFilePath));
                    Log::info("[DEBUG] Stored ZIP file for image processing: {$zipStoredPath}");
                }

                // Dispatch aggregation job with ZIP path for image processing
                Log::info("[DEBUG] Dispatching ZipAggregationJob for parent upload {$upload->id}");
                ZipAggregationJob::dispatch($upload->id, $zipStoredPath)->delay(now()->addMinutes(2));

            } else {
                Log::info("[DEBUG] DIRECT PATH: No chunking needed, completing directly");
                Log::info("[DEBUG] About to process images", [
                    'images_count' => count($imagePaths),
                    'processed_files_count' => count($processedFiles),
                    'processed_files' => $processedFiles
                ]);

                // No chunking needed, complete normally with image processing
                if (!empty($imagePaths) && !empty($processedFiles)) {
                    Log::info("[DEBUG] Processing images for direct path");
                    $this->processImagesForZip($upload, $imagePaths, $processedFiles);
                } else {
                    Log::warning("[DEBUG] Skipping image processing: images=" . count($imagePaths) . ", files=" . count($processedFiles));
                }

                $upload->update([
                    'status' => 'completed',
                    'total_parts' => $totalParts,
                    'processed_parts' => $totalParts,
                    'completed_at' => now(),
                    'processing_logs' => array_merge($upload->processing_logs ?? [], [
                        "ZIP processing completed via DIRECT path",
                        "Processed files: " . implode(', ', $processedFiles),
                        "Total parts: {$totalParts}",
                        "Images found: " . count($imagePaths)
                    ])
                ]);

                Log::info("[DEBUG] ZIP upload {$upload->id} completed directly with {$totalParts} parts");
            }

        } finally {
            $this->deleteDirectory($tempDir);
            Storage::delete($this->storedFilePath);
        }
    }


    private function shouldFileBeChunked(string $filePath, string $extension): bool
{
    // File size check (> 10MB)
    if (filesize($filePath) > 10 * 1024 * 1024) {
        return true;
    }

    // Row count check
    try {
        if ($extension === 'csv') {
            $rowCount = $this->getCsvRowCount($filePath);
        } else {
            $rowCount = $this->getExcelRowCount($filePath);
        }
        return $rowCount > 100; // Threshold
    } catch (\Exception $e) {
        Log::warning("[FileChunkingJob] Could not determine row count for {$filePath}: " . $e->getMessage());
        return true; // Default to chunking if we can't determine
    }
}

private function getExcelRowCount(string $filePath): int
{
    try {
        $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($filePath);
        $reader->setReadDataOnly(true);
        $reader->setReadEmptyCells(false);

        $spreadsheet = $reader->load($filePath);
        $rowCount = $spreadsheet->getActiveSheet()->getHighestRow();

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return $rowCount - 1; // Subtract header row
    } catch (\Exception $e) {
        throw new \Exception("Could not read Excel file: " . $e->getMessage());
    }
}

private function getCsvRowCount(string $filePath): int
{
    $count = 0;
    if (($handle = fopen($filePath, 'r')) !== false) {
        while (fgetcsv($handle) !== false) {
            $count++;
        }
        fclose($handle);
    }
    return $count - 1; // Subtract header
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

    private function processImagesForZip(PartsUpload $upload, array $imagePaths, array $processedFiles): void
    {
        Log::info("[DEBUG] processImagesForZip called", [
            'upload_id' => $upload->id,
            'images_count' => count($imagePaths),
            'processed_files_count' => count($processedFiles),
            'processed_files' => $processedFiles,
            'image_filenames' => array_values($imagePaths)
        ]);

        if (!empty($imagePaths) && !empty($processedFiles)) {
            try {
                $processingService = app(UploadProcessingService::class);

                // Use the first processed Excel file as context
                $excelFilename = $processedFiles[0];

                Log::info("[DEBUG] Processing images with Excel context: {$excelFilename}");

                // Use the debug version if it exists, otherwise use regular version
                if (method_exists($processingService, 'processImagesForUploadWithDebug')) {
                    $processingService->processImagesForUploadWithDebug($upload, $imagePaths, $excelFilename);
                } else {
                    $processingService->processImagesForUpload($upload, $imagePaths, $excelFilename);
                }

                Log::info("[DEBUG] Image processing completed successfully");

            } catch (\Exception $e) {
                Log::error("[DEBUG] Failed to process images in processImagesForZip: " . $e->getMessage());
                Log::error("[DEBUG] Stack trace: " . $e->getTraceAsString());
            }
        } else {
            Log::warning("[DEBUG] Skipping image processing", [
                'images_empty' => empty($imagePaths),
                'files_empty' => empty($processedFiles),
                'images_count' => count($imagePaths),
                'files_count' => count($processedFiles)
            ]);
        }
    }

    private function dispatchChunkJobs(PartsUpload $upload, array $headers, string $filePath = null): void
    {
        $filePathToUse = $filePath ?: $this->storedFilePath;
        $chunks = $upload->chunks()->orderBy('chunk_number')->get();

        Log::info("[FileChunkingJob] Dispatching {$chunks->count()} optimized chunk processing jobs for upload {$upload->id}");

        foreach ($chunks as $chunk) {
            if (config('parts_processing.enable_optimized_processing', true)) {
                OptimizedChunkProcessingJob::dispatch(
                    $chunk->id,
                    $filePathToUse,
                    $headers
                )->delay(now()->addSeconds($chunk->chunk_number * 2));
            } else {
                ChunkProcessingJob::dispatch(
                    $chunk->id,
                    $filePathToUse,
                    $headers
                )->delay(now()->addSeconds($chunk->chunk_number));
            }
        }

        // Only dispatch aggregation job for standalone uploads, not ZIP child uploads
        if ($upload->parent_upload_id === null) {
            // This is a standalone file (not part of ZIP)
            $estimatedCompletionTime = now()->addMinutes(ceil($chunks->count() / 10));

            ChunkAggregationJob::dispatch($upload->id)
                ->delay($estimatedCompletionTime);

            Log::info("[FileChunkingJob] Dispatched ChunkAggregationJob for standalone upload {$upload->id}");
        } else {
            // This is a child upload (part of ZIP) - parent will handle aggregation
            Log::info("[FileChunkingJob] Child upload {$upload->id} - parent {$upload->parent_upload_id} will handle aggregation");
        }
    }

private function determineUploadType(string $extension): string
{
    return match ($extension) {
        'zip' => 'zip',
        'xlsx', 'xls' => 'excel',
        'csv' => 'csv',
        default => 'unknown'
    };
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
    Log::error("[FileChunkingJob] Job failed", [
        'upload_id' => $this->uploadId,
        'exception' => $exception->getMessage()
    ]);

    $upload = PartsUpload::find($this->uploadId);
    if ($upload) {
        $upload->update([
            'status' => 'failed',
            'processing_logs' => array_merge($upload->processing_logs ?? [], [
                "File chunking failed: " . $exception->getMessage()
            ])
        ]);
    }

    // Clean up stored file
    Storage::delete($this->storedFilePath);
}

public function tags(): array
{
    return ['file-chunking', 'parts-dataset', "upload-{$this->uploadId}"];
}
}
