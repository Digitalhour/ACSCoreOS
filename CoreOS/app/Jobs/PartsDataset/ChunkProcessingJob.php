<?php

// app/Jobs/PartsDataset/ChunkProcessingJob.php

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

class ChunkProcessingJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $chunkId;
    protected string $storedFilePath;
    protected array $headers;

    public int $timeout = 600; // 10 minutes per chunk
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

            Log::info("[ChunkProcessingJob] Processing chunk {$chunk->chunk_number} for upload {$upload->id}");

            $chunk->markAsProcessing();

            $filePath = Storage::path($this->storedFilePath);

            // Load chunk data
            $chunkData = $streamingService->processChunk($filePath, $chunk, $this->headers);

            // Process the data
            $results = $this->processChunkData(
                $chunkData['data'],
                $this->headers,
                $upload,
                pathinfo($upload->original_filename, PATHINFO_FILENAME)
            );

            $processingTime = microtime(true) - $startTime;

            // Mark chunk as completed
            $chunk->markAsCompleted(
                $results['created_parts'],
                $results['updated_parts'],
                $processingTime
            );

            Log::info("[ChunkProcessingJob] Chunk {$chunk->chunk_number} completed", [
                'created_parts' => $results['created_parts'],
                'updated_parts' => $results['updated_parts'],
                'processing_time' => round($processingTime, 2) . 's'
            ]);

        } catch (\Exception $e) {
            Log::error("[ChunkProcessingJob] Chunk {$this->chunkId} failed", [
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

    private function processChunkData(array $data, array $headers, $upload, string $excelContext): array
    {
        $coreFields = ['part_number', 'description', 'manufacturer'];
        $createdParts = 0;
        $updatedParts = 0;

        // Find header indices
        $fieldIndices = [];
        foreach ($coreFields as $field) {
            $fieldIndices[$field] = $this->findHeaderIndex($headers, $field);
        }

        $imageColumnIndex = $this->findImageColumnIndex($headers);

        DB::connection('parts_database')->beginTransaction();

        try {
            foreach ($data as $row) {
                if (empty(array_filter($row))) continue;

                // Get and normalize manufacturer name
                $rawManufacturer = $this->getValueFromRow($row, $fieldIndices['manufacturer']);
                $normalizedManufacturer = ManufacturerNormalizer::normalize($rawManufacturer);

                $partData = [
                    'upload_id' => $upload->id,
                    'batch_id' => $upload->batch_id,
                    'part_number' => $this->getValueFromRow($row, $fieldIndices['part_number']),
                    'description' => $this->getValueFromRow($row, $fieldIndices['description']),
                    'manufacturer' => $normalizedManufacturer, // Use normalized name
                ];

                if (empty($partData['part_number'])) continue;

                // Check for existing part in same Excel context using normalized manufacturer
                $existingPart = Part::where('part_number', $partData['part_number'])
                    ->where('manufacturer', $normalizedManufacturer)
                    ->whereHas('additionalFields', function($q) use ($excelContext) {
                        $q->where('field_name', '_excel_context')
                            ->where('field_value', $excelContext);
                    })
                    ->first();

                if ($existingPart) {
                    $existingPart->update([
                        'description' => $partData['description'],
                        'upload_id' => $upload->id,
                        'batch_id' => $upload->batch_id,
                        'is_active' => true
                    ]);

                    PartAdditionalField::where('part_id', $existingPart->id)->delete();
                    $part = $existingPart;
                    $updatedParts++;
                } else {
                    $part = Part::create($partData);
                    $createdParts++;
                }

                // Store Excel context
                PartAdditionalField::create([
                    'part_id' => $part->id,
                    'field_name' => '_excel_context',
                    'field_value' => $excelContext,
                ]);

                // Store original manufacturer name if it was changed
                if ($rawManufacturer && $rawManufacturer !== $normalizedManufacturer) {
                    PartAdditionalField::create([
                        'part_id' => $part->id,
                        'field_name' => '_original_manufacturer',
                        'field_value' => $rawManufacturer,
                    ]);
                }

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
            }

            DB::connection('parts_database')->commit();

            return [
                'created_parts' => $createdParts,
                'updated_parts' => $updatedParts,
                'total_processed' => count($data)
            ];

        } catch (\Exception $e) {
            DB::connection('parts_database')->rollBack();
            throw $e;
        }
    }

    private function storeAdditionalFields(Part $part, array $row, array $headers, array $coreFields): void
    {
        foreach ($headers as $index => $header) {
            $header = trim($header);

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
                PartAdditionalField::create([
                    'part_id' => $part->id,
                    'field_name' => $header,
                    'field_value' => $value,
                ]);
            }
        }
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
        Log::error("[ChunkProcessingJob] Job failed", [
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
        return ['chunk-processing', 'parts-dataset', "chunk-{$this->chunkId}"];
    }
}
