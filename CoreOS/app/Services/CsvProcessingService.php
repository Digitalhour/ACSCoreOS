<?php

namespace App\Services;

use Exception;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use League\Csv\Reader;
use League\Csv\Statement;

// It's good practice to use \Exception or import specific exception types

class CsvProcessingService
{
    /**
     * Reads a CSV file (UploadedFile instance) and returns its headers.
     * @param  UploadedFile  $file
     * @return array
     * @throws \Exception
     */
    public function getCsvHeadersFromFile(UploadedFile $file): array
    {
        Log::debug("[CsvProcessingService] getCsvHeadersFromFile called for: ".$file->getClientOriginalName());
        // Delegate to the path-based method
        return $this->getCsvHeadersFromPath($file->getPathname());
    }

    /**
     * Reads a CSV file from a given path and returns its headers.
     * @param  string  $filePath
     * @return array
     * @throws \Exception
     */
    public function getCsvHeadersFromPath(string $filePath): array
    {
        Log::debug("[CsvProcessingService] getCsvHeadersFromPath called for path: ".$filePath);
        try {
            if (!file_exists($filePath) || !is_readable($filePath)) {
                throw new Exception("CSV file not found or is not readable at: ".$filePath);
            }
            $csv = Reader::createFromPath($filePath, 'r');
            $csv->setHeaderOffset(0); // Assumes first row is header
            $headers = $csv->getHeader();
            return array_map('trim', $headers); // Clean headers
        } catch (Exception $e) {
            Log::error("Failed to read CSV headers from path {$filePath}: ".$e->getMessage());
            // Re-throw with more context or the original exception
            throw new Exception("Could not parse CSV headers from path. Ensure it's a valid CSV file with a header row. Path: {$filePath}. Original Error: ".$e->getMessage(),
                0, $e);
        }
    }

    /**
     * Parses the entire CSV file (UploadedFile instance), taking all columns.
     * @param  UploadedFile  $csvFile
     * @return array [data, headers]
     * @throws \Exception
     */
    public function parseCsvAllColumns(UploadedFile $csvFile): array
    {
        Log::debug("[CsvProcessingService] parseCsvAllColumns called for: ".$csvFile->getClientOriginalName());
        // Delegate to the path-based method
        return $this->parseCsvFromPath($csvFile->getPathname());
    }

    /**
     * Parses the entire CSV file from a given path, taking all columns.
     * This is the method your Job should call.
     * @param  string  $filePath
     * @return array [data, headers]
     * @throws \Exception
     */
    public function parseCsvFromPath(string $filePath): array
    {
        Log::debug("[CsvProcessingService] parseCsvFromPath called for path: ".$filePath);
        try {
            if (!file_exists($filePath) || !is_readable($filePath)) {
                throw new Exception("CSV file not found or is not readable at: ".$filePath);
            }

            $csv = Reader::createFromPath($filePath, 'r');
            $csv->setHeaderOffset(0); // First row is the header

            $headers = array_map('trim', $csv->getHeader());
            if (empty($headers) || (count($headers) === 1 && empty(trim($headers[0])))) {
                // Check if the single header is just an empty string after trim
                throw new Exception("CSV headers are empty or invalid after trimming. Path: ".$filePath);
            }

            // Fetch records using the obtained headers
            // This ensures that even if rows have varying numbers of columns,
            // you always get values corresponding to the defined headers.
            $stmt = Statement::create();
            $recordsIterator = $stmt->process($csv, $headers);

            $data = [];
            foreach ($recordsIterator as $record) {
                // $record is already an associative array with header keys
                $data[] = $record;
            }

            return [$data, $headers];
        } catch (Exception $e) {
            Log::error("CSV parsing error from path {$filePath}: ".$e->getMessage());
            // Re-throw a more generic message or the same one, adding context
            throw new Exception("Failed to parse CSV file from path. Please ensure it is correctly formatted. Path: {$filePath}. Details: ".$e->getMessage(),
                0, $e);
        }
    }
}
