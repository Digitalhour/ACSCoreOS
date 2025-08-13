<?php

namespace App\Jobs;

use App\Models\Parts\PartInstance;
use App\Services\OptimizedNSProductMatcher;
use App\Services\S3UploadService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ProcessUploadedImageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $temporaryFilePath;
    protected string $originalFileName;
    protected string $targetS3Directory;

    /**
     * How many times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 300; // 5 minutes

    /**
     * Create a new job instance.
     *
     * @param  string  $temporaryFilePath  Path to the temporarily stored uploaded file
     * @param  string  $originalFileName  The original name of the file
     * @param  string  $targetS3Directory  The desired directory path in S3 (e.g., 'parts_images/foldername')
     */
    public function __construct(string $temporaryFilePath, string $originalFileName, string $targetS3Directory)
    {
        $this->temporaryFilePath = $temporaryFilePath;
        $this->originalFileName = $originalFileName;
        $this->targetS3Directory = rtrim($targetS3Directory, '/'); // Ensure no trailing slash
    }

    /**
     * Execute the job.
     *
     * @param  S3UploadService  $s3Service
     * @param  OptimizedNSProductMatcher  $nsMatcher
     * @return void
     */
    public function handle(S3UploadService $s3Service, OptimizedNSProductMatcher $nsMatcher): void
    {
        Log::info("[JOB:ProcessUploadedImageJob] Starting processing for: {$this->originalFileName} from temp path: {$this->temporaryFilePath} to target S3 directory: {$this->targetS3Directory}");

        try {
            if (!file_exists($this->temporaryFilePath)) {
                Log::error("[JOB:ProcessUploadedImageJob] Temporary file not found: {$this->temporaryFilePath} for original file: {$this->originalFileName}");
                return; // Exit if file is gone
            }

            // Upload file to S3
            $s3UploadedPath = $s3Service->uploadFileFromPath(
                $this->temporaryFilePath,   // The local path to the temp file
                $this->targetS3Directory,   // The S3 directory to upload into
                $this->originalFileName     // The name the file should have in S3
            );

            if ($s3UploadedPath) {
                Log::info("[JOB:ProcessUploadedImageJob] Successfully uploaded {$this->originalFileName} to S3 at {$s3UploadedPath}");

                // Generate the image URL
                $imageUrl = Storage::disk('s3')->url($s3UploadedPath);

                // Update PartInstances with the image URL and Shopify ID
                $this->updatePartInstancesWithImageData($imageUrl, $nsMatcher);

            } else {
                Log::error("[JOB:ProcessUploadedImageJob] S3 upload returned false for {$this->originalFileName}. Check S3UploadService logs for more details.");
            }

        } catch (Throwable $e) {
            Log::error("[JOB:ProcessUploadedImageJob] S3 Upload Exception for {$this->originalFileName}: ".$e->getMessage(),
                [
                    'exception_class' => get_class($e),
                    'temporaryFilePath' => $this->temporaryFilePath,
                    'targetS3Directory' => $this->targetS3Directory,
                    'originalFileName' => $this->originalFileName,
                ]);
            // Re-throw to mark job as failed for Laravel's retry mechanism
            throw $e;
        } finally {
            // Clean up the temporary file after processing
            if (file_exists($this->temporaryFilePath)) {
                unlink($this->temporaryFilePath);
                Log::info("[JOB:ProcessUploadedImageJob] Deleted temporary file: {$this->temporaryFilePath} for {$this->originalFileName}");
            }
        }
    }

    /**
     * Update PartInstances with image URL and Shopify ID based on filename matching
     */
    protected function updatePartInstancesWithImageData(string $imageUrl, OptimizedNSProductMatcher $nsMatcher): void
    {
        try {
            // Extract the base filename without extension for matching
            $imageNameWithoutExtension = pathinfo($this->originalFileName, PATHINFO_FILENAME);

            Log::info("[JOB:ProcessUploadedImageJob] Looking for part instances to update with image: {$imageNameWithoutExtension}");
            Log::info("[JOB:ProcessUploadedImageJob] Image URL: {$imageUrl}");

            // Try multiple matching strategies to find part instances
            $partInstances = $this->findMatchingPartInstances($imageNameWithoutExtension);

            if ($partInstances->isEmpty()) {
                Log::warning("[JOB:ProcessUploadedImageJob] No part instances found matching image: {$imageNameWithoutExtension}");

                // Log some sample part instances for debugging
                $sampleParts = PartInstance::where('is_active', true)
                    ->select(['id', 'part_number', 'ccn_number', 'img_page_path'])
                    ->limit(5)
                    ->get();

                Log::info("[JOB:ProcessUploadedImageJob] Sample active parts for reference: ".
                    $sampleParts->map(fn($p
                    ) => "ID:{$p->id} PN:{$p->part_number} CCN:{$p->ccn_number} IMG:{$p->img_page_path}")->implode(', '));

                return;
            }

            Log::info("[JOB:ProcessUploadedImageJob] Found ".count($partInstances)." part instances to update");

            // Convert to array for the matcher service
            $partsArray = $partInstances->map(function ($instance) {
                return [
                    'id' => $instance->id,
                    'manufacture' => $instance->manufacturer?->name ?? '',
                    'part_number' => $instance->part_number,
                    'shopify_id' => $instance->shopify_id, // Include existing shopify_id
                ];
            })->toArray();

            // Get Shopify matches
            $enhancedParts = $nsMatcher->enhancePartsWithShopifyImages($partsArray);

            // Update each part instance
            $updatedCount = 0;
            $shopifyMatches = 0;

            foreach ($enhancedParts as $enhancedPart) {
                $partInstance = $partInstances->where('id', $enhancedPart['id'])->first();

                if ($partInstance) {
                    $updateData = ['s3_img_url' => $imageUrl];

                    // Add Shopify ID if found and not already set
                    if (empty($partInstance->shopify_id) && !empty($enhancedPart['nsproduct_match']->shop_id ?? null)) {
                        $updateData['shopify_id'] = $enhancedPart['nsproduct_match']->shop_id;
                        $shopifyMatches++;
                        Log::info("[JOB:ProcessUploadedImageJob] Found Shopify ID: {$enhancedPart['nsproduct_match']->shop_id} for part instance: {$partInstance->id}");
                    }

                    $partInstance->update($updateData);
                    $updatedCount++;

                    Log::info("[JOB:ProcessUploadedImageJob] Updated part instance {$partInstance->id} with image URL".
                        (isset($updateData['shopify_id']) ? " and Shopify ID: {$updateData['shopify_id']}" : ""));
                }
            }

            Log::info("[JOB:ProcessUploadedImageJob] Successfully updated {$updatedCount} part instances with image URL, {$shopifyMatches} got new Shopify IDs");

        } catch (Throwable $e) {
            Log::error("[JOB:ProcessUploadedImageJob] Error updating part instances with image data: ".$e->getMessage(),
                [
                    'imageUrl' => $imageUrl,
                    'originalFileName' => $this->originalFileName,
                    'exception_trace' => $e->getTraceAsString()
                ]);
            // Don't re-throw here as the main upload was successful
        }
    }

    /**
     * Find part instances that match the given image name using multiple strategies
     */
    protected function findMatchingPartInstances(string $imageName)
    {
        Log::info("[JOB:ProcessUploadedImageJob] Trying to match image name: '{$imageName}'");

        // Strategy 1: Direct match on img_page_path (most common)
        $partInstances = PartInstance::where('img_page_path', 'LIKE', "%{$imageName}%")
            ->where('is_active', true)
            ->get();

        if ($partInstances->isNotEmpty()) {
            Log::info("[JOB:ProcessUploadedImageJob] Found ".count($partInstances)." matches using img_page_path strategy");
            return $partInstances;
        }

        // Strategy 2: Direct match on img_page_path without extension
        $imageNameClean = preg_replace('/\.(jpg|jpeg|png|gif|bmp|webp)$/i', '', $imageName);
        if ($imageNameClean !== $imageName) {
            $partInstances = PartInstance::where('img_page_path', 'LIKE', "%{$imageNameClean}%")
                ->where('is_active', true)
                ->get();

            if ($partInstances->isNotEmpty()) {
                Log::info("[JOB:ProcessUploadedImageJob] Found ".count($partInstances)." matches using img_page_path without extension strategy");
                return $partInstances;
            }
        }

        // Strategy 3: Match on part_number
        $partInstances = PartInstance::where('part_number', $imageName)
            ->where('is_active', true)
            ->get();

        if ($partInstances->isNotEmpty()) {
            Log::info("[JOB:ProcessUploadedImageJob] Found ".count($partInstances)." matches using part_number strategy");
            return $partInstances;
        }

        // Strategy 4: Match on CCN number
        $partInstances = PartInstance::where('ccn_number', $imageName)
            ->where('is_active', true)
            ->get();

        if ($partInstances->isNotEmpty()) {
            Log::info("[JOB:ProcessUploadedImageJob] Found ".count($partInstances)." matches using ccn_number strategy");
            return $partInstances;
        }

        // Strategy 5: Fuzzy match - remove common separators and try again
        $cleanImageName = preg_replace('/[-_\s\.]+/', '', strtolower($imageName));

        if ($cleanImageName !== strtolower($imageName)) {
            $partInstances = PartInstance::where(function ($query) use ($cleanImageName) {
                $query->whereRaw("LOWER(REPLACE(REPLACE(REPLACE(REPLACE(part_number, '-', ''), '_', ''), ' ', ''), '.', '')) = ?",
                    [$cleanImageName])
                    ->orWhereRaw("LOWER(REPLACE(REPLACE(REPLACE(REPLACE(ccn_number, '-', ''), '_', ''), ' ', ''), '.', '')) = ?",
                        [$cleanImageName])
                    ->orWhereRaw("LOWER(REPLACE(REPLACE(REPLACE(REPLACE(img_page_path, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?",
                        ["%{$cleanImageName}%"]);
            })
                ->where('is_active', true)
                ->get();

            if ($partInstances->isNotEmpty()) {
                Log::info("[JOB:ProcessUploadedImageJob] Found ".count($partInstances)." matches using fuzzy matching strategy");
                return $partInstances;
            }
        }

        // Strategy 6: Partial match on part numbers that contain the image name
        if (strlen($imageName) >= 3) { // Only try partial matching for names with 3+ characters
            $partInstances = PartInstance::where('part_number', 'LIKE', "%{$imageName}%")
                ->where('is_active', true)
                ->get();

            if ($partInstances->isNotEmpty()) {
                Log::info("[JOB:ProcessUploadedImageJob] Found ".count($partInstances)." matches using partial part_number strategy");
                return $partInstances;
            }
        }

        // Strategy 7: Try matching against the original filename pattern from your folder structure
        // Many times images are named like "manual_page_123.jpg" or similar
        if (preg_match('/(\d+)/', $imageName, $matches)) {
            $numbers = $matches[1];
            $partInstances = PartInstance::where(function ($query) use ($numbers) {
                $query->where('img_page_number', $numbers)
                    ->orWhere('part_number', 'LIKE', "%{$numbers}%")
                    ->orWhere('ccn_number', 'LIKE', "%{$numbers}%");
            })
                ->where('is_active', true)
                ->get();

            if ($partInstances->isNotEmpty()) {
                Log::info("[JOB:ProcessUploadedImageJob] Found ".count($partInstances)." matches using number extraction strategy");
                return $partInstances;
            }
        }

        Log::warning("[JOB:ProcessUploadedImageJob] No matches found for image: '{$imageName}' using any strategy");
        return collect();
    }

    /**
     * Handle a job failure after all retries are exhausted.
     */
    public function failed(Throwable $exception): void
    {
        Log::error("[JOB:ProcessUploadedImageJob] PERMANENTLY FAILED for image: {$this->originalFileName}. Error: {$exception->getMessage()}",
            [
                'temporaryFilePath' => $this->temporaryFilePath,
                'targetS3Directory' => $this->targetS3Directory,
                'originalFileName' => $this->originalFileName,
                'exception_trace' => $exception->getTraceAsString(),
            ]);
        // Clean up the temporary file even if the job fails permanently
        if (file_exists($this->temporaryFilePath)) {
            unlink($this->temporaryFilePath);
            Log::info("[JOB:ProcessUploadedImageJob] Deleted temporary file after permanent job failure: {$this->temporaryFilePath} for {$this->originalFileName}");
        }
    }
}
