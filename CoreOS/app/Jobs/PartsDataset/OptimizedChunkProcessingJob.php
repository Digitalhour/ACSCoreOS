<?php

// app/Jobs/PartsDataset/OptimizedChunkProcessingJob.php

namespace App\Jobs\PartsDataset;

use App\Models\PartsDataset\Part;
use App\Models\PartsDataset\PartAdditionalField;
use App\Models\PartsDataset\UploadChunk;
use App\Services\PartsDataset\StreamingExcelService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class OptimizedChunkProcessingJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $chunkId;
    protected string $storedFilePath;
    protected array $headers;

    public int $timeout = 600;
    public int $tries = 3;

    public function __construct(int $chunkId, string $storedFilePath, array $headers)
    {
        $this->chunkId = $chunkId;
        $this->storedFilePath = $storedFilePath;
        $this->headers = $headers;
        $this->onQueue('chunk-processing');
    }

    public function handle(StreamingExcelService $streamingService): void
    {
        $startTime = microtime(true);

        try {
            $chunk = UploadChunk::findOrFail($this->chunkId);
            $upload = $chunk->upload;

            Log::info("[OptimizedChunkProcessingJob] Processing chunk {$chunk->chunk_number} for upload {$upload->id}");

            $chunk->markAsProcessing();

            $filePath = Storage::path($this->storedFilePath);
            $chunkData = $streamingService->processChunk($filePath, $chunk, $this->headers);

            // Process the data with bulk operations
            $results = $this->processBulkChunkData(
                $chunkData['data'],
                $this->headers,
                $upload,
                pathinfo($upload->original_filename, PATHINFO_FILENAME)
            );

            $processingTime = microtime(true) - $startTime;

            $chunk->markAsCompleted(
                $results['created_parts'],
                $results['updated_parts'],
                $processingTime
            );

            Log::info("[OptimizedChunkProcessingJob] Chunk {$chunk->chunk_number} completed", [
                'created_parts' => $results['created_parts'],
                'updated_parts' => $results['updated_parts'],
                'processing_time' => round($processingTime, 2) . 's'
            ]);

        } catch (\Exception $e) {
            Log::error("[OptimizedChunkProcessingJob] Chunk {$this->chunkId} failed", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $chunk = UploadChunk::find($this->chunkId);
            if ($chunk) {
                $chunk->markAsFailed($e->getMessage());
            }

            throw $e;
        }
    }

    private function processBulkChunkData(array $data, array $headers, $upload, string $excelContext): array
    {
        $coreFields = ['part_number', 'description', 'manufacturer'];

        // Find header indices once
        $fieldIndices = [];
        foreach ($coreFields as $field) {
            $fieldIndices[$field] = $this->findHeaderIndex($headers, $field);
        }
        $imageColumnIndex = $this->findImageColumnIndex($headers);

        // Prepare data for bulk operations
        $validRows = [];
        $partNumbers = [];
        $manufacturers = [];

        // First pass: validate and collect data
        foreach ($data as $rowIndex => $row) {
            if (empty(array_filter($row))) continue;

            $partNumber = $this->getValueFromRow($row, $fieldIndices['part_number']);
            $manufacturer = $this->getValueFromRow($row, $fieldIndices['manufacturer']);

            if (empty($partNumber)) continue;

            $rowData = [
                'part_number' => $partNumber,
                'description' => $this->getValueFromRow($row, $fieldIndices['description']),
                'manufacturer' => $manufacturer,
                'upload_id' => $upload->id,
                'batch_id' => $upload->batch_id,
                'raw_row' => $row,
                'row_index' => $rowIndex
            ];

            $validRows[] = $rowData;
            $partNumbers[] = $partNumber;
            if ($manufacturer) {
                $manufacturers[] = $manufacturer;
            }
        }

        if (empty($validRows)) {
            return ['created_parts' => 0, 'updated_parts' => 0];
        }

        DB::connection('parts_database')->beginTransaction();

        try {
            // Bulk lookup existing parts in this Excel context
            $existingParts = $this->bulkLookupExistingParts(
                array_unique($partNumbers),
                array_unique($manufacturers),
                $excelContext
            );

            // Separate into updates and creates
            $partsToUpdate = [];
            $partsToCreate = [];
            $rowsWithPartInfo = []; // Track which rows correspond to which parts
            $timestamp = now();

            foreach ($validRows as $index => $rowData) {
                $key = $this->makePartKey($rowData['part_number'], $rowData['manufacturer']);

                if (isset($existingParts[$key])) {
                    // Update existing part
                    $existingPart = $existingParts[$key];
                    $partsToUpdate[] = [
                        'id' => $existingPart->id,
                        'description' => $rowData['description'],
                        'upload_id' => $upload->id,
                        'batch_id' => $upload->batch_id,
                        'is_active' => true,
                        'updated_at' => $timestamp
                    ];

                    $rowsWithPartInfo[$index] = [
                        'row_data' => $rowData,
                        'part_id' => $existingPart->id,
                        'is_existing' => true
                    ];
                } else {
                    // Prepare for bulk insert
                    $partsToCreate[] = [
                        'part_number' => $rowData['part_number'],
                        'description' => $rowData['description'],
                        'manufacturer' => $rowData['manufacturer'],
                        'upload_id' => $upload->id,
                        'batch_id' => $upload->batch_id,
                        'is_active' => true,
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp
                    ];

                    $rowsWithPartInfo[$index] = [
                        'row_data' => $rowData,
                        'part_id' => null, // Will be set after bulk insert
                        'is_existing' => false
                    ];
                }
            }

            // Bulk update existing parts
            $updatedCount = 0;
            if (!empty($partsToUpdate)) {
                $updatedCount = $this->bulkUpdateParts($partsToUpdate);

                // Clear existing additional fields for updated parts
                $updatePartIds = array_column($partsToUpdate, 'id');
                PartAdditionalField::whereIn('part_id', $updatePartIds)->delete();
            }

            // Bulk insert new parts
            $createdCount = 0;
            $newPartIds = [];
            if (!empty($partsToCreate)) {
                Log::info("[OptimizedChunkProcessingJob] Bulk inserting " . count($partsToCreate) . " new parts");
                $newPartIds = $this->bulkInsertParts($partsToCreate);
                $createdCount = count($newPartIds);
                Log::info("[OptimizedChunkProcessingJob] Created {$createdCount} new parts, got " . count($newPartIds) . " IDs");
            }

            // Prepare all additional fields for bulk insert
            $allAdditionalFields = [];
            $newPartIndex = 0;
            $expectedNewParts = count(array_filter($rowsWithPartInfo, fn($info) => !$info['is_existing']));

            // Validate we got the expected number of new part IDs
            if (count($newPartIds) !== $expectedNewParts) {
                Log::warning("[OptimizedChunkProcessingJob] Part ID count mismatch: expected {$expectedNewParts} new parts, got " . count($newPartIds) . " IDs");
            }

            foreach ($rowsWithPartInfo as $index => $info) {
                $partId = $info['part_id'];
                $rowData = $info['row_data'];

                // If it was a new part, get the actual ID from the bulk insert
                if (!$info['is_existing']) {
                    if (isset($newPartIds[$newPartIndex])) {
                        $partId = $newPartIds[$newPartIndex];
                        $newPartIndex++;
                    } else {
                        Log::error("[OptimizedChunkProcessingJob] Missing part ID for new part at index {$newPartIndex}");
                        continue; // Skip this row if we don't have a part ID
                    }
                }

                if ($partId) {
                    // Prepare additional fields for this part
                    $additionalFields = $this->prepareAdditionalFields(
                        $rowData['raw_row'],
                        $headers,
                        $coreFields,
                        $excelContext,
                        $imageColumnIndex
                    );

                    foreach ($additionalFields as $fieldData) {
                        $allAdditionalFields[] = [
                            'part_id' => $partId,
                            'field_name' => $fieldData['field_name'],
                            'field_value' => $fieldData['field_value'],
                            'created_at' => $timestamp,
                            'updated_at' => $timestamp
                        ];
                    }
                }
            }

            // Bulk insert additional fields
            if (!empty($allAdditionalFields)) {
                Log::info("[OptimizedChunkProcessingJob] Bulk inserting " . count($allAdditionalFields) . " additional fields");
                $this->bulkInsertAdditionalFields($allAdditionalFields);
            }

            DB::connection('parts_database')->commit();

            return [
                'created_parts' => $createdCount,
                'updated_parts' => $updatedCount,
                'total_processed' => count($validRows)
            ];

        } catch (\Exception $e) {
            DB::connection('parts_database')->rollBack();
            throw $e;
        }
    }

    private function bulkLookupExistingParts(array $partNumbers, array $manufacturers, string $excelContext): array
    {
        // Build a single query to find all existing parts
        $existingParts = Part::whereIn('part_number', $partNumbers)
            ->when(!empty($manufacturers), function($query) use ($manufacturers) {
                return $query->whereIn('manufacturer', $manufacturers);
            })
            ->whereHas('additionalFields', function($q) use ($excelContext) {
                $q->where('field_name', '_excel_context')
                    ->where('field_value', $excelContext);
            })
            ->get(['id', 'part_number', 'manufacturer']);

        // Index by part_number + manufacturer for fast lookup
        $indexed = [];
        foreach ($existingParts as $part) {
            $key = $this->makePartKey($part->part_number, $part->manufacturer);
            $indexed[$key] = $part;
        }

        return $indexed;
    }

    private function makePartKey(string $partNumber, ?string $manufacturer): string
    {
        return $partNumber . '|' . ($manufacturer ?? '');
    }

    private function bulkUpdateParts(array $partsToUpdate): int
    {
        $updated = 0;

        // Group updates by the fields that are being updated to minimize queries
        foreach ($partsToUpdate as $partData) {
            $updated += DB::connection('parts_database')
                ->table('parts')
                ->where('id', $partData['id'])
                ->update([
                    'description' => $partData['description'],
                    'upload_id' => $partData['upload_id'],
                    'batch_id' => $partData['batch_id'],
                    'is_active' => $partData['is_active'],
                    'updated_at' => $partData['updated_at']
                ]);
        }

        return $updated;
    }

    private function bulkInsertParts(array $partsToCreate): array
    {
        if (empty($partsToCreate)) {
            return [];
        }

        $insertedIds = [];
        $chunks = array_chunk($partsToCreate, 500);

        foreach ($chunks as $chunkIndex => $chunk) {
            try {
                // Insert the chunk
                DB::connection('parts_database')->table('parts')->insert($chunk);

                // Get the inserted IDs by querying back with the unique data we just inserted
                // Using a combination of part_number, upload_id, and created_at for uniqueness
                $partNumbers = array_column($chunk, 'part_number');
                $uploadId = $chunk[0]['upload_id'];
                $createdAt = $chunk[0]['created_at'];

                $lastInserted = DB::connection('parts_database')
                    ->table('parts')
                    ->whereIn('part_number', $partNumbers)
                    ->where('upload_id', $uploadId)
                    ->where('created_at', $createdAt)
                    ->orderBy('id')
                    ->pluck('id')
                    ->toArray();

                $insertedIds = array_merge($insertedIds, $lastInserted);

                Log::debug("[OptimizedChunkProcessingJob] Chunk {$chunkIndex}: inserted " . count($chunk) . " parts, got " . count($lastInserted) . " IDs");

            } catch (\Exception $e) {
                Log::error("[OptimizedChunkProcessingJob] Failed to bulk insert chunk {$chunkIndex}: " . $e->getMessage());
                throw $e;
            }
        }

        Log::info("[OptimizedChunkProcessingJob] Bulk insert completed: expected " . count($partsToCreate) . " parts, got " . count($insertedIds) . " IDs");

        return $insertedIds;
    }

    private function bulkInsertAdditionalFields(array $additionalFields): void
    {
        if (empty($additionalFields)) {
            return;
        }

        // Insert in chunks to avoid hitting MySQL limits
        $chunks = array_chunk($additionalFields, 1000);

        foreach ($chunks as $chunkIndex => $chunk) {
            try {
                DB::connection('parts_database')->table('parts_additional_fields')->insert($chunk);
                Log::debug("[OptimizedChunkProcessingJob] Additional fields chunk {$chunkIndex}: inserted " . count($chunk) . " fields");
            } catch (\Exception $e) {
                Log::error("[OptimizedChunkProcessingJob] Failed to bulk insert additional fields chunk {$chunkIndex}: " . $e->getMessage());
                throw $e;
            }
        }

        Log::info("[OptimizedChunkProcessingJob] Bulk inserted " . count($additionalFields) . " additional fields successfully");
    }

    private function prepareAdditionalFields(array $row, array $headers, array $coreFields, string $excelContext, ?int $imageColumnIndex): array
    {
        $fields = [];

        // Add Excel context
        $fields[] = [
            'field_name' => '_excel_context',
            'field_value' => $excelContext
        ];

        // Add image filename if present
        if ($imageColumnIndex !== null) {
            $imageFilename = $this->getValueFromRow($row, $imageColumnIndex);
            if ($imageFilename) {
                $fields[] = [
                    'field_name' => '_image_filename_from_csv',
                    'field_value' => $imageFilename
                ];
            }
        }

        // Add other fields
        foreach ($headers as $index => $header) {
            $header = trim($header);

            // Skip core fields and empty headers
            $isCore = false;
            foreach ($coreFields as $coreField) {
                if ($this->findHeaderIndex($headers, $coreField) === $index) {
                    $isCore = true;
                    break;
                }
            }

            if ($isCore || empty($header)) continue;

            $value = $this->getValueFromRow($row, $index);
            if ($value !== null && $value !== '') {
                $fields[] = [
                    'field_name' => $header,
                    'field_value' => $value
                ];
            }
        }

        return $fields;
    }

    // Keep existing helper methods
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
                    return $index;
                }
            }
        }

        return null;
    }

    private function findImageColumnIndex(array $headers): ?int
    {
        foreach ($headers as $index => $header) {
            if (strtolower(trim($header)) === 'img_page_path') {
                return $index;
            }
        }
        return null;
    }

    private function getValueFromRow(array $row, ?int $index): ?string
    {
        if ($index === null || !isset($row[$index])) {
            return null;
        }
        return trim((string) $row[$index]) ?: null;
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("[OptimizedChunkProcessingJob] Job failed", [
            'chunk_id' => $this->chunkId,
            'exception' => $exception->getMessage()
        ]);

        $chunk = UploadChunk::find($this->chunkId);
        if ($chunk) {
            $chunk->markAsFailed($exception->getMessage());
        }
    }

    public function tags(): array
    {
        return ['optimized-chunk-processing', 'parts-dataset', "chunk-{$this->chunkId}"];
    }
}
