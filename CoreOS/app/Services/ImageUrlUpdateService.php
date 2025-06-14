<?php

namespace App\Services;

use App\Models\Parts\PartInstance;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Service to update part instances with S3 image URLs and Shopify IDs
 * This can be used for bulk updates of existing images or individual updates
 */
class ImageUrlUpdateService
{
    private OptimizedNSProductMatcher $nsMatcher;

    public function __construct(OptimizedNSProductMatcher $nsMatcher)
    {
        $this->nsMatcher = $nsMatcher;
    }

    /**
     * Update part instances with image URL based on various matching strategies
     */
    public function updatePartInstancesWithImage(string $imageFileName, string $s3Path): array
    {
        $imageUrl = Storage::disk('s3')->url($s3Path);
        $imageNameWithoutExtension = pathinfo($imageFileName, PATHINFO_FILENAME);

        Log::info("[ImageUrlUpdateService] Updating part instances for image: {$imageFileName}");
        Log::info("[ImageUrlUpdateService] S3 URL: {$imageUrl}");

        // Try multiple matching strategies
        $partInstances = $this->findMatchingPartInstances($imageNameWithoutExtension);

        if ($partInstances->isEmpty()) {
            Log::warning("[ImageUrlUpdateService] No part instances found for image: {$imageFileName}");
            return [
                'updated_count' => 0,
                'shopify_matches' => 0,
                'message' => 'No matching part instances found'
            ];
        }

        Log::info("[ImageUrlUpdateService] Found ".count($partInstances)." part instances to update");

        // Convert to array for the matcher service
        $partsArray = $partInstances->map(function ($instance) {
            return [
                'id' => $instance->id,
                'manufacture' => $instance->manufacturer?->name ?? '',
                'part_number' => $instance->part_number,
            ];
        })->toArray();

        // Get Shopify matches
        $enhancedParts = $this->nsMatcher->enhancePartsWithShopifyImages($partsArray);

        // Update each part instance
        $updatedCount = 0;
        $shopifyMatches = 0;

        foreach ($enhancedParts as $enhancedPart) {
            $partInstance = $partInstances->where('id', $enhancedPart['id'])->first();

            if ($partInstance) {
                $updateData = ['s3_img_url' => $imageUrl];

                // Add Shopify ID if found
                if (!empty($enhancedPart['nsproduct_match']->shop_id ?? null)) {
                    $updateData['shopify_id'] = $enhancedPart['nsproduct_match']->shop_id;
                    $shopifyMatches++;
                    Log::info("[ImageUrlUpdateService] Found Shopify ID: {$enhancedPart['nsproduct_match']->shop_id} for part instance: {$partInstance->id}");
                }

                $partInstance->update($updateData);
                $updatedCount++;

                Log::info("[ImageUrlUpdateService] Updated part instance {$partInstance->id} with image URL".
                    (isset($updateData['shopify_id']) ? " and Shopify ID: {$updateData['shopify_id']}" : ""));
            }
        }

        return [
            'updated_count' => $updatedCount,
            'shopify_matches' => $shopifyMatches,
            'message' => "Updated {$updatedCount} part instances, {$shopifyMatches} with Shopify IDs"
        ];
    }

    /**
     * Bulk update Shopify IDs for parts that don't have them yet
     */
    public function bulkUpdateShopifyIds(?string $batchId = null, int $limit = 100): array
    {
        Log::info("[ImageUrlUpdateService] Starting bulk Shopify ID update (limit: {$limit})");

        $query = PartInstance::whereNull('shopify_id')
            ->where('is_active', true)
            ->with('manufacturer')
            ->limit($limit);

        if ($batchId) {
            $query->where('import_batch_id', $batchId);
        }

        $partInstances = $query->get();

        if ($partInstances->isEmpty()) {
            return [
                'updated_count' => 0,
                'message' => 'No parts found without Shopify IDs'
            ];
        }

        Log::info("[ImageUrlUpdateService] Found ".count($partInstances)." parts to check for Shopify IDs");

        // Convert to array format expected by the matcher
        $partsArray = $partInstances->map(function ($instance) {
            return [
                'id' => $instance->id,
                'manufacture' => $instance->manufacturer?->name ?? '',
                'part_number' => $instance->part_number,
            ];
        })->toArray();

        // Get enhanced parts with Shopify data
        $enhancedParts = $this->nsMatcher->enhancePartsWithShopifyImages($partsArray);

        $updatedCount = 0;

        foreach ($enhancedParts as $enhancedPart) {
            if (!empty($enhancedPart['nsproduct_match']->shop_id ?? null)) {
                PartInstance::where('id', $enhancedPart['id'])
                    ->update(['shopify_id' => $enhancedPart['nsproduct_match']->shop_id]);
                $updatedCount++;

                Log::info("[ImageUrlUpdateService] Updated part {$enhancedPart['id']} with Shopify ID: {$enhancedPart['nsproduct_match']->shop_id}");
            }
        }

        return [
            'updated_count' => $updatedCount,
            'checked_count' => count($partInstances),
            'message' => "Updated {$updatedCount} parts with Shopify IDs out of ".count($partInstances)." checked"
        ];
    }

    /**
     * Find part instances that match the given image name using multiple strategies
     */
    private function findMatchingPartInstances(string $imageName)
    {
        // Strategy 1: Direct match on img_page_path
        $partInstances = PartInstance::where('img_page_path', 'LIKE', "%{$imageName}%")
            ->where('is_active', true)
            ->get();

        if ($partInstances->isNotEmpty()) {
            Log::info("[ImageUrlUpdateService] Found ".count($partInstances)." matches using img_page_path strategy");
            return $partInstances;
        }

        // Strategy 2: Match on part_number
        $partInstances = PartInstance::where('part_number', $imageName)
            ->where('is_active', true)
            ->get();

        if ($partInstances->isNotEmpty()) {
            Log::info("[ImageUrlUpdateService] Found ".count($partInstances)." matches using part_number strategy");
            return $partInstances;
        }

        // Strategy 3: Match on CCN number
        $partInstances = PartInstance::where('ccn_number', $imageName)
            ->where('is_active', true)
            ->get();

        if ($partInstances->isNotEmpty()) {
            Log::info("[ImageUrlUpdateService] Found ".count($partInstances)." matches using ccn_number strategy");
            return $partInstances;
        }

        // Strategy 4: Fuzzy match - remove common separators and try again
        $cleanImageName = preg_replace('/[-_\s]+/', '', $imageName);

        if ($cleanImageName !== $imageName) {
            $partInstances = PartInstance::where(function ($query) use ($cleanImageName) {
                $query->whereRaw("REPLACE(REPLACE(REPLACE(part_number, '-', ''), '_', ''), ' ', '') = ?",
                    [$cleanImageName])
                    ->orWhereRaw("REPLACE(REPLACE(REPLACE(ccn_number, '-', ''), '_', ''), ' ', '') = ?",
                        [$cleanImageName])
                    ->orWhereRaw("REPLACE(REPLACE(REPLACE(img_page_path, '-', ''), '_', ''), ' ', '') LIKE ?",
                        ["%{$cleanImageName}%"]);
            })
                ->where('is_active', true)
                ->get();

            if ($partInstances->isNotEmpty()) {
                Log::info("[ImageUrlUpdateService] Found ".count($partInstances)." matches using fuzzy matching strategy");
                return $partInstances;
            }
        }

        // Strategy 5: Partial match on part numbers that contain the image name
        $partInstances = PartInstance::where('part_number', 'LIKE', "%{$imageName}%")
            ->where('is_active', true)
            ->get();

        if ($partInstances->isNotEmpty()) {
            Log::info("[ImageUrlUpdateService] Found ".count($partInstances)." matches using partial part_number strategy");
            return $partInstances;
        }

        Log::warning("[ImageUrlUpdateService] No matches found for image: {$imageName} using any strategy");
        return collect();
    }

    /**
     * Get statistics about image and Shopify coverage
     */
    public function getImageStats(?string $batchId = null): array
    {
        $query = PartInstance::where('is_active', true);

        if ($batchId) {
            $query->where('import_batch_id', $batchId);
        }

        $total = $query->count();
        $withImages = $query->clone()->whereNotNull('s3_img_url')->count();
        $withShopifyIds = $query->clone()->whereNotNull('shopify_id')->count();
        $withBoth = $query->clone()->whereNotNull('s3_img_url')->whereNotNull('shopify_id')->count();

        return [
            'total_parts' => $total,
            'parts_with_images' => $withImages,
            'parts_with_shopify_ids' => $withShopifyIds,
            'parts_with_both' => $withBoth,
            'image_coverage_percent' => $total > 0 ? round(($withImages / $total) * 100, 2) : 0,
            'shopify_coverage_percent' => $total > 0 ? round(($withShopifyIds / $total) * 100, 2) : 0,
            'complete_coverage_percent' => $total > 0 ? round(($withBoth / $total) * 100, 2) : 0,
        ];
    }
}
