<?php

// app/Services/PartsDataset/S3ImageService.php

namespace App\Services\PartsDataset;

use App\Models\PartsDataset\PartAdditionalField;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class S3ImageService
{
    private string $bucket;
    private string $region;
    private ?string $lastUploadedUrl = null;

    public function __construct()
    {
        $this->bucket = config('filesystems.disks.s3.bucket');
        $this->region = config('filesystems.disks.s3.region', 'us-east-1');
    }
    public function getLastUploadedUrl(): ?string
    {
        return $this->lastUploadedUrl;
    }
    
    /**
     * Extract part number from filename using common patterns
     */
    private function extractPartNumberFromFilename(string $filename): ?string
    {
        // Remove extension
        $name = pathinfo($filename, PATHINFO_FILENAME);

        // Common patterns for part numbers in filenames
        $patterns = [
            // Exact numeric patterns (like 80447527)
            '/(\d{7,})/', // 7+ digit numbers
            '/(\d{5,})/', // 5+ digit numbers

            // Alphanumeric patterns
            '/([A-Z0-9]{5,})/', // 5+ alphanumeric chars
            '/([A-Z]\d{4,})/', // Letter followed by 4+ digits
            '/(\d{4,}[A-Z])/', // 4+ digits followed by letter

            // Common separators
            '/_([A-Z0-9\-_.]+)_/', // Between underscores
            '/\-([A-Z0-9\-_.]+)\-/', // Between dashes
            '/^([A-Z0-9\-_.]+)/', // Start of filename

            // Extract any meaningful alphanumeric sequence
            '/([A-Z0-9\-_.]{3,})/', // Any alphanumeric sequence 3+ chars
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, strtoupper($name), $matches)) {
                $candidate = trim($matches[1], '-_.');
                if (strlen($candidate) >= 3) {
                    Log::debug("[S3ImageService] Pattern matched: {$pattern} -> {$candidate}");
                    return $candidate;
                }
            }
        }

        return null;
    }


    /**
     * Match and upload images for parts based on filename patterns
     */
    public function matchAndUploadImages(array $parts, array $imagePaths): array
    {
        $results = ['matched' => 0, 'uploaded' => 0, 'failed' => 0];

        Log::info("[S3ImageService] Starting enhanced image matching", [
            'parts_count' => count($parts),
            'images_count' => count($imagePaths)
        ]);

        if (empty($this->bucket)) {
            Log::error("[S3ImageService] S3 bucket not configured");
            return $results;
        }

        // Create multiple lookup strategies
        $partsByNumber = [];
        $partsByDescription = [];
        $partsById = [];

        foreach ($parts as $part) {
            $partNumber = is_array($part) ? ($part['part_number'] ?? null) : $part->part_number;
            $description = is_array($part) ? ($part['description'] ?? null) : $part->description;
            $id = is_array($part) ? ($part['id'] ?? null) : $part->id;

            if ($partNumber) {
                $partsByNumber[strtolower(trim($partNumber))] = $part;
            }
            if ($description) {
                $partsByDescription[strtolower(trim($description))] = $part;
            }
            if ($id) {
                $partsById[$id] = $part;
            }
        }

        Log::info("[S3ImageService] Created lookups", [
            'by_number' => count($partsByNumber),
            'by_description' => count($partsByDescription),
            'by_id' => count($partsById)
        ]);

        foreach ($imagePaths as $imagePath => $originalFilename) {
            Log::debug("[S3ImageService] Processing image: {$originalFilename}");

            $matched = false;
            $matchedPart = null;

            // Strategy 1: Extract and match part number from filename
            $extractedPartNumber = $this->extractPartNumberFromFilename($originalFilename);
            if ($extractedPartNumber && isset($partsByNumber[strtolower($extractedPartNumber)])) {
                $matchedPart = $partsByNumber[strtolower($extractedPartNumber)];
                $matched = true;
                Log::info("[S3ImageService] Strategy 1 match: {$originalFilename} -> part {$extractedPartNumber}");
            }

            // Strategy 2: Check if any part number appears in filename
            if (!$matched) {
                foreach ($partsByNumber as $partNumber => $part) {
                    if (stripos($originalFilename, $partNumber) !== false) {
                        $matchedPart = $part;
                        $matched = true;
                        Log::info("[S3ImageService] Strategy 2 match: {$originalFilename} contains part {$partNumber}");
                        break;
                    }
                }
            }

            // Strategy 3: Check for position-based matching (if this is row-based from CSV)
            if (!$matched) {
                // Try to extract numbers that might correspond to row/position
                if (preg_match('/(\d+)/', $originalFilename, $matches)) {
                    $position = (int)$matches[1];
                    // This would need additional logic based on your CSV structure
                    Log::debug("[S3ImageService] Found position {$position} in filename {$originalFilename}");
                }
            }

            if ($matched && $matchedPart) {
                $results['matched']++;

                if ($this->uploadImageForPart($matchedPart, $imagePath, $originalFilename)) {
                    $results['uploaded']++;
                    $partNum = is_array($matchedPart) ? $matchedPart['part_number'] : $matchedPart->part_number;
                    Log::info("[S3ImageService] Successfully uploaded image for part {$partNum}");
                } else {
                    $results['failed']++;
                }
            } else {
                Log::debug("[S3ImageService] No match found for: {$originalFilename}");
                Log::debug("[S3ImageService] Extracted: {$extractedPartNumber}");
                Log::debug("[S3ImageService] Available parts: " . implode(', ', array_keys($partsByNumber)));
            }
        }

        Log::info("[S3ImageService] Enhanced matching completed", $results);
        return $results;
    }


    public function uploadImageForPart($part, string $imagePath, string $originalFilename, ?string $excelContext = null): bool
    {
        try {
            $partId = is_object($part) ? $part->id : $part['id'];

            Log::debug("[S3ImageService] Starting upload", [
                'part_id' => $partId,
                'image_path' => $imagePath,
                'filename' => $originalFilename,
                'excel_context' => $excelContext
            ]);

            if (!file_exists($imagePath)) {
                Log::error("[S3ImageService] Image file not found: {$imagePath}");
                return false;
            }

            $imageInfo = getimagesize($imagePath);
            if (!$imageInfo) {
                Log::error("[S3ImageService] Invalid image file: {$originalFilename}");
                return false;
            }

            $extension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));
            $s3Key = $this->generateS3Key($part, $originalFilename, $extension, $excelContext);

            Log::info("[S3ImageService] Generated S3 key: {$s3Key}");

            // Test S3 configuration first
            if (empty($this->bucket)) {
                Log::error("[S3ImageService] S3 bucket not configured");
                return false;
            }

            $uploaded = Storage::disk('s3')->putFileAs(
                dirname($s3Key),
                new \Illuminate\Http\File($imagePath),
                basename($s3Key),
                [
                    'visibility' => 'public',
                    'ContentType' => $imageInfo['mime'],
                    'CacheControl' => 'max-age=31536000',
                ]
            );

            if (!$uploaded) {
                Log::error("[S3ImageService] S3 upload failed for: {$originalFilename}");
                return false;
            }

            $s3Url = Storage::disk('s3')->url($s3Key);
            $this->lastUploadedUrl = $s3Url;

            Log::info("[S3ImageService] S3 upload successful, updating database");

            $updated = DB::connection('parts_database')
                ->table('parts')
                ->where('id', $partId)
                ->update(['image_url' => $s3Url]);

            if ($updated) {
                Log::info("[S3ImageService] Successfully uploaded and updated part {$partId}: {$s3Url}");
                return true;
            } else {
                Log::error("[S3ImageService] Database update failed for part {$partId}");
                return false;
            }

        } catch (\Exception $e) {
            Log::error("[S3ImageService] Upload failed", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Generate S3 key for part image
     */
    private function generateS3Key($part, string $originalFilename, string $extension, ?string $excelContext = null): string
    {
        // Use provided Excel context first, then fall back to database lookup
        if (!$excelContext && is_object($part) && isset($part->id)) {
            $contextField = PartAdditionalField::where('part_id', $part->id)
                ->where('field_name', '_excel_context')
                ->first();
            if ($contextField) {
                $excelContext = $contextField->field_value;
            }
        }

        // Default fallback
        if (!$excelContext) {
            $excelContext = 'unknown';
        }

        $sanitizedExcelName = Str::slug($excelContext);
        $cleanFilename = pathinfo($originalFilename, PATHINFO_FILENAME);
        $sanitizedFilename = Str::slug($cleanFilename);

        return "parts/{$sanitizedExcelName}/{$sanitizedFilename}.{$extension}";
    }


    /**
     * Delete image from S3
     */
    public function deleteImage(string $imageUrl): bool
    {
        try {
            $s3Key = $this->extractS3KeyFromUrl($imageUrl);
            if ($s3Key && Storage::disk('s3')->exists($s3Key)) {
                $deleted = Storage::disk('s3')->delete($s3Key);
                Log::info("[S3ImageService] Deleted S3 image: {$s3Key}");
                return $deleted;
            }
            return false;
        } catch (\Exception $e) {
            Log::error("[S3ImageService] Error deleting image: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Extract S3 key from full URL
     */
    private function extractS3KeyFromUrl(string $url): ?string
    {
        $parsed = parse_url($url);
        if ($parsed && isset($parsed['path'])) {
            return ltrim($parsed['path'], '/');
        }
        return null;
    }
}
