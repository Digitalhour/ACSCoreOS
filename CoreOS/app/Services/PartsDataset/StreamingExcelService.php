<?php

// app/Services/PartsDataset/StreamingExcelService.php

namespace App\Services\PartsDataset;

use App\Models\PartsDataset\PartsUpload;
use App\Models\PartsDataset\UploadChunk;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class StreamingExcelService
{
    private int $chunkSize;
    private array $headers = [];

    public function __construct(int $chunkSize = 250)
    {
        $this->chunkSize = $chunkSize;
    }

    /**
     * Analyze Excel file and create chunks
     */
    public function analyzeAndCreateChunks(string $filePath, PartsUpload $upload): array
    {
        try {
 
            // Get basic file info first
            $reader = IOFactory::createReaderForFile($filePath);
            $reader->setReadDataOnly(true);
            $reader->setReadEmptyCells(false);

            // Load only to get dimensions
            $spreadsheet = $reader->load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();

            $highestRow = $worksheet->getHighestRow();
            $highestColumn = $worksheet->getHighestColumn();

            // Get headers
            $this->headers = $this->extractHeaders($worksheet);

            Log::info("[StreamingExcelService] File analysis completed", [
                'file' => basename($filePath),
                'total_rows' => $highestRow,
                'data_rows' => $highestRow - 1,
                'columns' => count($this->headers),
                'headers' => $this->headers
            ]);

            // Clean up memory
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);

            if ($highestRow < 2) {
                throw new \Exception('Excel file contains no data rows');
            }

            // Create chunks
            $chunks = $this->createChunks($upload, $highestRow - 1); // -1 for header row

            return [
                'total_data_rows' => $highestRow - 1,
                'total_chunks' => count($chunks),
                'chunk_size' => $this->chunkSize,
                'headers' => $this->headers,
                'chunks' => $chunks
            ];

        } catch (\Exception $e) {
            Log::error("[StreamingExcelService] File analysis failed", [
                'file' => basename($filePath),
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Process a specific chunk of the Excel file
     */
    public function processChunk(string $filePath, UploadChunk $chunk, array $headers): array
    {
        $startTime = microtime(true);

        try {
            Log::info("[StreamingExcelService] Processing chunk {$chunk->chunk_number}", [
                'start_row' => $chunk->start_row,
                'end_row' => $chunk->end_row,
                'total_rows' => $chunk->total_rows
            ]);

            // Create filtered reader for this chunk
            $filter = new ChunkReadFilter($chunk->start_row, $chunk->end_row);
            $reader = IOFactory::createReaderForFile($filePath);
            $reader->setReadDataOnly(true);
            $reader->setReadEmptyCells(false);
            $reader->setReadFilter($filter);

            // Load only the chunk
            $spreadsheet = $reader->load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();

            $data = [];
            $rowIndex = $chunk->start_row;

            foreach ($worksheet->getRowIterator($chunk->start_row, $chunk->end_row) as $row) {
                $rowData = [];
                $cellIterator = $row->getCellIterator();

                foreach ($cellIterator as $cell) {
                    $value = $cell->getCalculatedValue();

                    // Handle dates
                    if (Date::isDateTime($cell)) {
                        try {
                            $value = Date::excelToDateTimeObject($value)->format('Y-m-d');
                        } catch (\Exception $e) {
                            $value = (string) $value;
                        }
                    }

                    $rowData[] = $value;
                }

                // Skip empty rows
                if (!empty(array_filter($rowData, fn($val) => $val !== null && $val !== ''))) {
                    $data[] = $rowData;
                }

                $rowIndex++;
            }

            // Clean up memory immediately
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet, $reader, $filter);

            $processingTime = microtime(true) - $startTime;

            Log::info("[StreamingExcelService] Chunk {$chunk->chunk_number} loaded", [
                'rows_loaded' => count($data),
                'processing_time' => round($processingTime, 3) . 's',
                'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . 'MB'
            ]);

            return [
                'data' => $data,
                'headers' => $headers,
                'processing_time' => $processingTime
            ];

        } catch (\Exception $e) {
            Log::error("[StreamingExcelService] Chunk processing failed", [
                'chunk_number' => $chunk->chunk_number,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Extract headers from worksheet
     */
    private function extractHeaders($worksheet): array
    {
        $headers = [];
        $headerRow = $worksheet->getRowIterator(1, 1)->current();

        foreach ($headerRow->getCellIterator() as $cell) {
            $headers[] = trim((string) $cell->getCalculatedValue());
        }

        return array_filter($headers); // Remove empty headers
    }

    /**
     * Create chunk records for the upload
     */
    private function createChunks(PartsUpload $upload, int $totalDataRows): array
    {
        $chunks = [];
        $chunkNumber = 1;

        for ($startRow = 2; $startRow <= $totalDataRows + 1; $startRow += $this->chunkSize) {
            $endRow = min($startRow + $this->chunkSize - 1, $totalDataRows + 1);
            $chunkRows = $endRow - $startRow + 1;

            $chunk = UploadChunk::create([
                'upload_id' => $upload->id,
                'chunk_number' => $chunkNumber,
                'start_row' => $startRow,
                'end_row' => $endRow,
                'total_rows' => $chunkRows,
                'status' => UploadChunk::STATUS_PENDING
            ]);

            $chunks[] = $chunk;
            $chunkNumber++;
        }

        return $chunks;
    }

    public function getHeaders(): array
    {
        return $this->headers;
    }
}
