<?php

// app/Services/PartsDataset/UploadProcessingService.php

namespace App\Services\PartsDataset;

use App\Jobs\PartsDataset\FileChunkingJob;
use App\Models\PartsDataset\Part;
use App\Models\PartsDataset\PartAdditionalField;
use App\Models\PartsDataset\PartsUpload;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class UploadProcessingService
{
    private ShopifyService $shopifyService;
    private S3ImageService $imageService;
    private int $chunkSizeThreshold;

    public function __construct(ShopifyService $shopifyService, S3ImageService $imageService)
    {
        $this->shopifyService = $shopifyService;
        $this->imageService = $imageService;
        $this->chunkSizeThreshold = 100; // Rows threshold for chunking
    }

    /**
     * Process uploaded file - automatically choose chunking vs standard processing
     */
    public function processUpload(UploadedFile $file): array
    {
        $batchId = Str::uuid();
        $extension = strtolower($file->getClientOriginalExtension());

        Log::info("[UploadProcessingService] Processing upload: {$file->getClientOriginalName()}");

        try {
            // Create upload record
            $upload = PartsUpload::create([
                'filename' => $file->getClientOriginalName(),
                'original_filename' => $file->getClientOriginalName(),
                'upload_type' => $this->determineUploadType($extension),
                'batch_id' => $batchId,
                'status' => PartsUpload::STATUS_PENDING,
                'uploaded_at' => now(),
                'processing_logs' => ["Started processing {$file->getClientOriginalName()}"],
            ]);

            // Store file temporarily
            $storedPath = $file->store('temp/uploads', 'local');

            // Send ZIP files and large Excel/CSV files to chunking workflow
            if ($extension === 'zip' || $this->shouldUseChunking($file, $extension)) {
                Log::info("[UploadProcessingService] Using chunked processing for {$extension} file");

                FileChunkingJob::dispatch($upload->id, $storedPath);

                return [
                    'success' => true,
                    'upload_id' => $upload->id,
                    'batch_id' => $batchId,
                    'processing_method' => 'chunked',
                    'message' => "File queued for chunked processing",
                ];
            } else {
                Log::info("[UploadProcessingService] Using standard processing");

                // Process small files directly
                $result = match ($extension) {
                    'xlsx', 'xls' => $this->processExcelFileFromPath(Storage::path($storedPath), $upload),
                    'csv' => $this->processCsvFileFromPath(Storage::path($storedPath), $upload),
                    default => ['total_parts' => 0]
                };

                $upload->update([
                    'status' => 'completed',
                    'total_parts' => $result['total_parts'],
                    'processed_parts' => $result['total_parts'],
                    'completed_at' => now(),
                ]);

                Storage::delete($storedPath);

                return [
                    'success' => true,
                    'upload_id' => $upload->id,
                    'batch_id' => $batchId,
                    'processing_method' => 'standard',
                    'total_parts' => $result['total_parts'],
                    'message' => "File processed successfully",
                ];
            }

        } catch (\Exception $e) {
                Log::error("[UploadProcessingService] Upload processing failed: " . $e->getMessage());

                if (isset($upload)) {
                    $upload->update([
                        'status' => PartsUpload::STATUS_FAILED,
                        'processing_logs' => array_merge($upload->processing_logs ?? [], ["Error: " . $e->getMessage()]),
                    ]);
                }

                return [
                    'success' => false,
                    'error' => $e->getMessage(),
                ];
            }
    }

    /**
     * Determine if file should use chunked processing
     */
    private function shouldUseChunking(UploadedFile $file, string $extension): bool
    {
        // Only chunk Excel/CSV files (ZIP files handled separately)
        if (!in_array($extension, ['xlsx', 'xls', 'csv'])) {
            return false;
        }

        // File size check (> 10MB)
        if ($file->getSize() > 10 * 1024 * 1024) {
            return true;
        }

        // Quick row count check for Excel files
        try {
            $rowCount = $this->getExcelRowCount($file->getPathname());
            return $rowCount > $this->chunkSizeThreshold;
        } catch (\Exception $e) {
            Log::warning("[UploadProcessingService] Could not determine row count, defaulting to chunking: " . $e->getMessage());
            return true; // Default to chunking if we can't determine size
        }
    }

    /**
     * Quick row count estimation for Excel files
     */
    private function getExcelRowCount(string $filePath): int
    {
        try {
            $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($filePath);
            $reader->setReadDataOnly(true);
            $reader->setReadEmptyCells(false);

            // Load minimal data to get dimensions
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

    /**
     * Process images for an upload (called from FileChunkingJob)
     */
    public function processImagesForUpload(PartsUpload $upload, array $imagePaths, string $excelFilename = null): void
    {
        try {
            // Use the provided Excel filename, or extract from upload's original filename if ZIP
            if ($excelFilename) {
                // Use the Excel filename found in the ZIP
                $excelContext = pathinfo($excelFilename, PATHINFO_FILENAME);
            } else {
                // Fallback to upload's original filename (for direct Excel uploads)
                $excelContext = pathinfo($upload->original_filename, PATHINFO_FILENAME);
            }

            Log::info("[UploadProcessingService] Processing images for Excel context: {$excelContext}");

            // Get parts from this specific Excel context
            $parts = $upload->parts()
                ->with('additionalFields')
                ->whereHas('additionalFields', function($q) use ($excelContext) {
                    $q->where('field_name', '_excel_context')
                        ->where('field_value', $excelContext);
                })
                ->get();

            if ($parts->isEmpty()) {
                Log::warning("[UploadProcessingService] No parts found for Excel context: {$excelContext}");
                return;
            }

            Log::info("[UploadProcessingService] Found {$parts->count()} parts for image processing");

            // Group parts by image filename within this Excel context
            $imageFilenameToPartIds = [];
            foreach ($parts as $part) {
                $csvImageField = $part->additionalFields
                    ->where('field_name', '_image_filename_from_csv')
                    ->first();

                if ($csvImageField && $csvImageField->field_value) {
                    $imageFilename = strtolower($csvImageField->field_value);
                    if (!isset($imageFilenameToPartIds[$imageFilename])) {
                        $imageFilenameToPartIds[$imageFilename] = [];
                    }
                    $imageFilenameToPartIds[$imageFilename][] = $part->id;
                    Log::debug("[UploadProcessingService] Mapped image {$imageFilename} to part {$part->id}");
                }
            }

            $results = ['matched' => 0, 'uploaded' => 0, 'replaced' => 0, 'skipped' => 0];

            foreach ($imageFilenameToPartIds as $imageFilename => $partIds) {
                $imageExists = false;
                $imagePath = null;
                $originalFilename = null;

                foreach ($imagePaths as $path => $filename) {
                    if (strtolower($filename) === $imageFilename) {
                        $imageExists = true;
                        $imagePath = $path;
                        $originalFilename = $filename;
                        break;
                    }
                }

                if ($imageExists) {
                    $results['matched'] += count($partIds);
                    Log::info("[UploadProcessingService] Processing image {$originalFilename} for " . count($partIds) . " parts");

                    // Delete old images from S3 for this Excel context
                    $partsWithImages = DB::connection('parts_database')
                        ->table('parts')
                        ->whereIn('id', $partIds)
                        ->whereNotNull('image_url')
                        ->pluck('image_url', 'id');

                    foreach ($partsWithImages as $partId => $oldUrl) {
                        if ($this->imageService->deleteImage($oldUrl)) {
                            $results['replaced']++;
                        }
                    }

                    // Upload new image with Excel context
                    $firstPart = $parts->find($partIds[0]);
                    if ($this->imageService->uploadImageForPart($firstPart, $imagePath, $originalFilename, $excelContext)) {
                        $s3Url = $this->imageService->getLastUploadedUrl();

                        $updated = DB::connection('parts_database')
                            ->table('parts')
                            ->whereIn('id', $partIds)
                            ->update(['image_url' => $s3Url]);

                        $results['uploaded'] += $updated;
                        Log::info("[UploadProcessingService] Uploaded {$originalFilename} to S3: {$s3Url}");
                    } else {
                        Log::error("[UploadProcessingService] Failed to upload {$originalFilename}");
                        $results['skipped'] += count($partIds);
                    }
                } else {
                    $results['skipped'] += count($partIds);
                    Log::debug("[UploadProcessingService] Image {$imageFilename} not found in ZIP");
                }
            }

            $logs = $upload->processing_logs ?? [];
            $logs[] = "Images for '{$excelContext}': {$results['matched']} matched, {$results['uploaded']} updated, {$results['replaced']} replaced";
            $upload->update(['processing_logs' => $logs]);

        } catch (\Exception $e) {
            Log::error("[UploadProcessingService] Error processing images: " . $e->getMessage());
            Log::error("[UploadProcessingService] Stack trace: " . $e->getTraceAsString());
        }
    }

    /**
     * Process Excel file from path (public for job access)
     */
    public function processExcelFileFromPath(string $filePath, PartsUpload $upload): array
    {
        try {
            $excelFilename = basename($filePath);
            Log::info("[PartsDataset][UploadProcessingService] Processing Excel: {$excelFilename}");

            // Validate file exists and is readable
            if (!file_exists($filePath) || !is_readable($filePath)) {
                throw new \Exception("Excel file not found or not readable: {$filePath}");
            }

            // Check if file is empty
            if (filesize($filePath) === 0) {
                throw new \Exception("Excel file is empty");
            }

            // Validate file extension
            $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
            if (!in_array($extension, ['xlsx', 'xls'])) {
                throw new \Exception("Invalid Excel file extension: {$extension}");
            }

            // Try to identify the file type first
            try {
                $reader = IOFactory::createReaderForFile($filePath);
                if (!$reader) {
                    throw new \Exception("Could not identify Excel file format");
                }
            } catch (\Exception $e) {
                throw new \Exception("Invalid Excel file format: " . $e->getMessage());
            }

            // Load the spreadsheet
            $spreadsheet = IOFactory::load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();

            // Get headers from first row
            $headers = [];
            $headerRow = $worksheet->getRowIterator(1, 1)->current();
            foreach ($headerRow->getCellIterator() as $cell) {
                $headers[] = trim((string) $cell->getCalculatedValue());
            }

            if (empty($headers) || empty(array_filter($headers))) {
                throw new \Exception('Excel file has no valid headers');
            }

            Log::info("[PartsDataset][UploadProcessingService] Excel headers: " . implode(', ', $headers));

            // Process data rows
            $data = [];
            $highestRow = $worksheet->getHighestRow();

            if ($highestRow < 2) {
                throw new \Exception('Excel file contains no data rows');
            }

            for ($row = 2; $row <= $highestRow; $row++) {
                $rowData = [];
                $cellIterator = $worksheet->getRowIterator($row, $row)->current()->getCellIterator();

                foreach ($cellIterator as $cell) {
                    $value = $cell->getCalculatedValue();

                    // Handle date values properly
                    if (Date::isDateTime($cell)) {
                        try {
                            $value = Date::excelToDateTimeObject($value)->format('Y-m-d');
                        } catch (\Exception $e) {
                            // If date conversion fails, keep original value
                            $value = (string) $value;
                        }
                    }

                    $rowData[] = $value;
                }

                // Skip completely empty rows
                if (!empty(array_filter($rowData, fn($val) => $val !== null && $val !== ''))) {
                    $data[] = $rowData;
                }
            }

            if (empty($data)) {
                throw new \Exception('Excel file contains no valid data rows');
            }

            Log::info("[PartsDataset][UploadProcessingService] Excel file loaded with " . count($data) . " data rows");

            return $this->processDataRows($data, $headers, $upload, $excelFilename);

        } catch (\Exception $e) {
            Log::error("[PartsDataset][UploadProcessingService] Excel processing error for file {$filePath}: " . $e->getMessage());
            throw new \Exception("Excel processing failed: " . $e->getMessage());
        }
    }

    /**
     * Process CSV file from path (public for job access)
     */
    public function processCsvFileFromPath(string $filePath, PartsUpload $upload): array
    {
        try {
            $data = [];
            $headers = [];

            if (($handle = fopen($filePath, 'r')) !== false) {
                // Get headers
                $headers = fgetcsv($handle);
                $headers = array_map('trim', $headers);

                // Get data rows
                while (($row = fgetcsv($handle)) !== false) {
                    $data[] = $row;
                }
                fclose($handle);
            }

            if (empty($data)) {
                throw new \Exception('CSV file is empty');
            }

            Log::info("[PartsDataset][UploadProcessingService] CSV headers: " . implode(', ', $headers));

            $csvFilename = $upload->original_filename;
            Log::info("[PartsDataset][UploadProcessingService] Processing CSV: {$csvFilename}");

            return $this->processDataRows($data, $headers, $upload, $csvFilename);

        } catch (\Exception $e) {
            Log::error("[PartsDataset][UploadProcessingService] CSV processing error: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Process data rows and create part records
     */
    private function processDataRows(array $data, array $headers, PartsUpload $upload, string $excelFilename): array
    {
        $coreFields = ['part_number', 'description', 'manufacturer'];
        $totalParts = 0;
        $updatedParts = 0;

        // Get Excel filename without extension for context
        $excelContext = pathinfo($excelFilename, PATHINFO_FILENAME);

        $fieldIndices = [];
        foreach ($coreFields as $field) {
            $fieldIndices[$field] = $this->findHeaderIndex($headers, $field);
        }

        $imageColumnIndex = $this->findImageColumnIndex($headers);

        DB::connection('parts_database')->beginTransaction();

        try {
            foreach ($data as $rowIndex => $row) {
                if (empty(array_filter($row))) continue;

                $partData = [
                    'upload_id' => $upload->id,
                    'batch_id' => $upload->batch_id,
                    'part_number' => $this->getValueFromRow($row, $fieldIndices['part_number']),
                    'description' => $this->getValueFromRow($row, $fieldIndices['description']),
                    'manufacturer' => $this->getValueFromRow($row, $fieldIndices['manufacturer']),
                ];

                if (empty($partData['part_number'])) continue;

                // Check if part exists in THIS Excel context (filename + part_number + manufacturer)
                $existingPart = Part::where('part_number', $partData['part_number'])
                    ->where('manufacturer', $partData['manufacturer'])
                    ->whereHas('additionalFields', function($q) use ($excelContext) {
                        $q->where('field_name', '_excel_context')
                            ->where('field_value', $excelContext);
                    })
                    ->first();

                if ($existingPart) {
                    // Update existing part in same Excel context
                    $existingPart->update([
                        'description' => $partData['description'],
                        'upload_id' => $upload->id,
                        'batch_id' => $upload->batch_id,
                        'is_active' => true
                    ]);

                    // Clear old additional fields
                    PartAdditionalField::where('part_id', $existingPart->id)->delete();
                    $part = $existingPart;
                    $updatedParts++;
                } else {
                    // Create new part (different Excel context or truly new)
                    $part = Part::create($partData);
                }

                // Store Excel context
                PartAdditionalField::create([
                    'part_id' => $part->id,
                    'field_name' => '_excel_context',
                    'field_value' => $excelContext,
                ]);

                // Store additional fields
                $this->storeAdditionalFields($part, $row, $headers, $coreFields);

                // Store image mapping
                if ($imageColumnIndex !== null) {
                    $imageFilename = $this->getValueFromRow($row, $imageColumnIndex);
                    if ($imageFilename) {
                        PartAdditionalField::create([
                            'part_id' => $part->id,
                            'field_name' => '_image_filename_from_csv',
                            'field_value' => $imageFilename,
                        ]);
                    }
                }

                $totalParts++;
            }

            $upload->update(['total_parts' => $totalParts, 'processed_parts' => $totalParts]);
            DB::connection('parts_database')->commit();

            Log::info("[UploadProcessingService] Excel context '{$excelContext}': {$totalParts} parts ({$updatedParts} updated)");

            return ['total_parts' => $totalParts, 'updated_parts' => $updatedParts];

        } catch (\Exception $e) {
            DB::connection('parts_database')->rollBack();
            throw $e;
        }
    }

    /**
     * Find image column index in headers
     */
    private function findImageColumnIndex(array $headers): ?int
    {
        foreach ($headers as $index => $header) {
            if (strtolower(trim($header)) === 'img_page_path') {
                return $index;
            }
        }
        return null;
    }

    /**
     * Store additional fields for a part
     */
    private function storeAdditionalFields(Part $part, array $row, array $headers, array $coreFields): void
    {
        $additionalFieldsCount = 0;

        foreach ($headers as $index => $header) {
            $header = trim($header);

            // Skip core fields and empty headers - check by lowercase comparison
            $isCore = false;
            foreach ($coreFields as $coreField) {
                if ($this->findHeaderIndex($headers, $coreField) === $index) {
                    $isCore = true;
                    break;
                }
            }

            if ($isCore || empty($header)) {
                continue;
            }

            $value = $this->getValueFromRow($row, $index);

            if ($value !== null && $value !== '') {
                try {
                    PartAdditionalField::create([
                        'part_id' => $part->id,
                        'field_name' => $header,
                        'field_value' => $value,
                    ]);
                    $additionalFieldsCount++;
                } catch (\Exception $e) {
                    Log::error("[PartsDataset][UploadProcessingService] Failed to create additional field '{$header}' for part {$part->id}: " . $e->getMessage());
                }
            }
        }

        Log::debug("[PartsDataset][UploadProcessingService] Created {$additionalFieldsCount} additional fields for part {$part->id}");
    }

    /**
     * Helper methods
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

    private function findHeaderIndex(array $headers, string $fieldName): ?int
    {
        $variations = [
            'part_number' => ['part_number', 'part number', 'partnumber', 'part_no', 'part no', 'part-number'],
            'description' => ['description', 'desc', 'product_description', 'product description', 'product_desc'],
            'manufacturer' => ['manufacturer', 'manufacture', 'vendor', 'brand', 'mfg', 'mfr'],
        ];

        $searchTerms = $variations[$fieldName] ?? [$fieldName];

        foreach ($headers as $index => $header) {
            $header = strtolower(trim($header));
            foreach ($searchTerms as $term) {
                if ($header === strtolower($term)) {
                    Log::debug("[PartsDataset][UploadProcessingService] Matched '{$fieldName}' to header '{$headers[$index]}' at index {$index}");
                    return $index;
                }
            }
        }

        Log::warning("[PartsDataset][UploadProcessingService] Could not find header for field '{$fieldName}'. Available headers: " . implode(', ', $headers));
        return null;
    }

    private function getValueFromRow(array $row, ?int $index): ?string
    {
        if ($index === null || !isset($row[$index])) {
            return null;
        }

        $value = $row[$index];

        // Convert to string and trim
        return trim((string) $value) ?: null;
    }

    /**
     * Process ZIP file from path (called by FileChunkingJob)
     */
    public function processZipFileFromPath(string $zipFilePath, PartsUpload $upload): array
    {
        // This method is called by FileChunkingJob for simple ZIP processing
        // (when files inside don't need chunking)
        $tempDir = storage_path('app/temp/' . Str::uuid());
        mkdir($tempDir, 0755, true);

        try {
            $zip = new \ZipArchive();
            if ($zip->open($zipFilePath) !== true) {
                throw new \Exception('Failed to open ZIP file');
            }

            $zip->extractTo($tempDir);
            $zip->close();

            $totalParts = 0;
            $processedFiles = [];
            $imagePaths = [];

            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($tempDir)
            );

            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $filename = $file->getFilename();
                    $extension = strtolower($file->getExtension());

                    if ($this->shouldSkipFile($filename)) {
                        continue;
                    }

                    if (in_array($extension, ['xlsx', 'xls', 'csv'])) {
                        // Process files directly (chunking handled in FileChunkingJob)
                        try {
                            $result = match ($extension) {
                                'xlsx', 'xls' => $this->processExcelFileFromPath($file->getPathname(), $upload),
                                'csv' => $this->processCsvFileFromPath($file->getPathname(), $upload),
                            };

                            $totalParts += $result['total_parts'];
                            $processedFiles[] = $filename;

                        } catch (\Exception $e) {
                            Log::error("[UploadProcessingService] Failed to process {$filename}: " . $e->getMessage());
                        }
                    } elseif (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                        $imagePaths[$file->getPathname()] = $filename;
                    }
                }
            }

            // Process images if found
            if (!empty($imagePaths) && $totalParts > 0 && !empty($processedFiles)) {
                $this->processImagesForUpload($upload, $imagePaths, $processedFiles[0]);
            }

            return [
                'total_parts' => $totalParts,
                'processed_files' => $processedFiles,
                'processed_images' => count($imagePaths),
            ];

        } finally {
            $this->deleteDirectory($tempDir);
        }
    }

    /**
     * Check if file should be skipped (system files, hidden files, etc.)
     */
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
        $systemFiles = [
            '__MACOSX',
            'Thumbs.db',
            'Desktop.ini',
            '.DS_Store',
        ];

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



    public function processImagesForUploadWithDebug(PartsUpload $upload, array $imagePaths, string $excelFilename = null): void
    {
        try {
            $excelContext = $excelFilename ? pathinfo($excelFilename, PATHINFO_FILENAME) : pathinfo($upload->original_filename, PATHINFO_FILENAME);

            Log::info("[DEBUG] Starting image processing", [
                'upload_id' => $upload->id,
                'upload_filename' => $upload->original_filename,
                'excel_context' => $excelContext,
                'images_count' => count($imagePaths),
                'image_filenames' => array_values($imagePaths)
            ]);

            // Get parts from this specific upload and Excel context
            $partsQuery = $upload->parts()->with('additionalFields');

            Log::info("[DEBUG] Base parts count for upload {$upload->id}: " . $upload->parts()->count());

            $parts = $partsQuery->whereHas('additionalFields', function($q) use ($excelContext) {
                $q->where('field_name', '_excel_context')
                    ->where('field_value', $excelContext);
            })->get();

            Log::info("[DEBUG] Parts found with Excel context '{$excelContext}': " . $parts->count());

            if ($parts->isEmpty()) {
                // Let's see what Excel contexts we actually have
                $existingContexts = $upload->parts()
                    ->join('parts_additional_fields', 'parts.id', '=', 'parts_additional_fields.part_id')
                    ->where('parts_additional_fields.field_name', '_excel_context')
                    ->distinct()
                    ->pluck('parts_additional_fields.field_value')
                    ->toArray();

                Log::warning("[DEBUG] No parts found for Excel context '{$excelContext}'. Available contexts: " . implode(', ', $existingContexts));

                // Let's also check parts with image filename mappings
                $partsWithImageMappings = $upload->parts()
                    ->whereHas('additionalFields', function($q) {
                        $q->where('field_name', '_image_filename_from_csv');
                    })
                    ->with(['additionalFields' => function($q) {
                        $q->whereIn('field_name', ['_image_filename_from_csv', '_excel_context']);
                    }])
                    ->get();

                Log::info("[DEBUG] Parts with image filename mappings: " . $partsWithImageMappings->count());

                foreach ($partsWithImageMappings->take(5) as $part) {
                    $imageFilename = $part->additionalFields->where('field_name', '_image_filename_from_csv')->first()?->field_value;
                    $context = $part->additionalFields->where('field_name', '_excel_context')->first()?->field_value;
                    Log::info("[DEBUG] Sample part {$part->id}: image_filename='{$imageFilename}', context='{$context}'");
                }

                return;
            }

            // Group parts by image filename within this Excel context
            $imageFilenameToPartIds = [];
            foreach ($parts as $part) {
                $csvImageField = $part->additionalFields
                    ->where('field_name', '_image_filename_from_csv')
                    ->first();

                if ($csvImageField && $csvImageField->field_value) {
                    $imageFilename = strtolower($csvImageField->field_value);
                    if (!isset($imageFilenameToPartIds[$imageFilename])) {
                        $imageFilenameToPartIds[$imageFilename] = [];
                    }
                    $imageFilenameToPartIds[$imageFilename][] = $part->id;
                    Log::debug("[DEBUG] Mapped image {$imageFilename} to part {$part->id} (part_number: {$part->part_number})");
                }
            }

            Log::info("[DEBUG] Image filename mappings created", [
                'mappings_count' => count($imageFilenameToPartIds),
                'mapped_filenames' => array_keys($imageFilenameToPartIds)
            ]);

            $results = ['matched' => 0, 'uploaded' => 0, 'replaced' => 0, 'skipped' => 0];
            $imageService = app(\App\Services\PartsDataset\S3ImageService::class);

            foreach ($imageFilenameToPartIds as $imageFilename => $partIds) {
                $imageExists = false;
                $imagePath = null;
                $originalFilename = null;

                // Look for matching image file
                foreach ($imagePaths as $path => $filename) {
                    if (strtolower($filename) === $imageFilename) {
                        $imageExists = true;
                        $imagePath = $path;
                        $originalFilename = $filename;
                        break;
                    }
                }

                Log::info("[DEBUG] Processing image mapping", [
                    'csv_filename' => $imageFilename,
                    'part_ids' => $partIds,
                    'image_exists' => $imageExists,
                    'actual_filename' => $originalFilename
                ]);

                if ($imageExists) {
                    $results['matched'] += count($partIds);

                    // Upload image with Excel context
                    $firstPart = $parts->find($partIds[0]);
                    if ($imageService->uploadImageForPart($firstPart, $imagePath, $originalFilename, $excelContext)) {
                        $s3Url = $imageService->getLastUploadedUrl();

                        // Update all parts with this image
                        $updated = DB::connection('parts_database')
                            ->table('parts')
                            ->whereIn('id', $partIds)
                            ->update(['image_url' => $s3Url]);

                        $results['uploaded'] += $updated;
                        Log::info("[DEBUG] Successfully uploaded {$originalFilename} to S3: {$s3Url}, updated {$updated} parts");
                    } else {
                        Log::error("[DEBUG] Failed to upload {$originalFilename} to S3");
                        $results['skipped'] += count($partIds);
                    }
                } else {
                    $results['skipped'] += count($partIds);
                    Log::info("[DEBUG] Image {$imageFilename} not found in ZIP");
                }
            }

            Log::info("[DEBUG] Image processing completed", $results);

            $logs = $upload->processing_logs ?? [];
            $logs[] = "Images for '{$excelContext}': {$results['matched']} matched, {$results['uploaded']} uploaded, {$results['skipped']} skipped";
            $upload->update(['processing_logs' => $logs]);

        } catch (\Exception $e) {
            Log::error("[DEBUG] Error processing images: " . $e->getMessage());
            Log::error("[DEBUG] Stack trace: " . $e->getTraceAsString());
        }
    }
}
