<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OptimizedNSProductMatcher
{
    private ShopifyService $shopifyService;

    public function __construct(ShopifyService $shopifyService)
    {
        $this->shopifyService = $shopifyService;
    }

    /**
     * Batch process parts to find matches in NSProduct database
     * and then enhance them with Shopify images and storefront URLs using batch GraphQL queries.
     */
    public function enhancePartsWithShopifyImages(array $parts): array
    {
        if (empty($parts)) {
            return $parts;
        }

        Log::info('[NSProductMatcher] Starting enhancement for '.count($parts).' parts');

        // Step 1: Separate parts that already have Shopify IDs from those that need NSProduct lookup
        $partsWithShopifyIds = [];
        $partsNeedingNSLookup = [];
        $partsById = [];

        foreach ($parts as $index => $part) {
            if (!isset($part['id'])) {
                Log::warning('Part missing ID in OptimizedNSProductMatcher', ['part_data' => $part]);
                continue;
            }

            $partsById[$part['id']] = $part;

            // If part already has a Shopify ID, add it to the direct lookup group
            if (!empty($part['shopify_id'])) {
                Log::debug('[NSProductMatcher] Part '.$part['id'].' has shopify_id: '.$part['shopify_id']);
                $partsWithShopifyIds[] = [
                    'original_part_id' => $part['id'],
                    'shopify_id' => $part['shopify_id'],
                ];
            } else {
                // Part needs NSProduct lookup
                $manufacturer = trim($part['manufacture'] ?? '');
                $partNumber = trim($part['part_number'] ?? '');

                if (!empty($manufacturer) && !empty($partNumber)) {
                    Log::debug('[NSProductMatcher] Part '.$part['id'].' needs NS lookup: '.$manufacturer.' / '.$partNumber);
                    $partsNeedingNSLookup[] = [
                        'original_part_id' => $part['id'],
                        'manufacturer' => $manufacturer,
                        'part_number' => $partNumber,
                    ];
                }
            }
        }

        Log::info('[NSProductMatcher] Parts with Shopify IDs: '.count($partsWithShopifyIds).', Parts needing NS lookup: '.count($partsNeedingNSLookup));

        // Step 2: For parts with Shopify IDs, get product data directly
        $shopifyDataByPartId = [];
        if (!empty($partsWithShopifyIds)) {
            $shopifyDataByPartId = $this->getShopifyDataByIds($partsWithShopifyIds);
            Log::info('[NSProductMatcher] Got Shopify data for '.count($shopifyDataByPartId).' parts via direct lookup');
        }

        // Step 3: For parts needing NS lookup, batch query NSProduct database
        $nsProductMatchesByOriginalId = [];
        if (!empty($partsNeedingNSLookup)) {
            $nsProductMatchesByOriginalId = $this->batchFindNSProducts($partsNeedingNSLookup);
            Log::info('[NSProductMatcher] Found '.count($nsProductMatchesByOriginalId).' NSProduct matches');
        }

        // Step 4: Prepare criteria for Shopify batch image lookup from NSProduct matches
        $shopifyImageCriteria = [];
        foreach ($nsProductMatchesByOriginalId as $originalPartId => $nsProduct) {
            if ($nsProduct && isset($nsProduct->oem) && isset($nsProduct->number)) {
                if (!empty(trim($nsProduct->oem)) && !empty(trim($nsProduct->number))) {
                    $shopifyImageCriteria[] = [
                        'original_part_id' => $originalPartId,
                        'vendor' => trim($nsProduct->oem),
                        'sku' => trim($nsProduct->number),
                    ];
                    Log::debug('[NSProductMatcher] Will lookup Shopify for part '.$originalPartId.': '.$nsProduct->oem.' / '.$nsProduct->number);
                }
            }
        }

        // Step 5: Batch query Shopify for images if there's anything to query
        if (!empty($shopifyImageCriteria)) {
            $additionalShopifyData = $this->shopifyService->getBatchProductImages($shopifyImageCriteria);
            $shopifyDataByPartId = array_merge($shopifyDataByPartId, $additionalShopifyData);
            Log::info('[NSProductMatcher] Got additional Shopify data for '.count($additionalShopifyData).' parts via NS lookup');
        }

        Log::info('[NSProductMatcher] Total Shopify data available for '.count($shopifyDataByPartId).' parts');

        // Step 6: Enhance original parts with the retrieved data
        $enhancedParts = [];
        foreach ($partsById as $partId => $originalPart) {
            $enhancedPart = $originalPart;

            // Check if we have Shopify data (either from direct ID lookup or from NSProduct lookup)
            $hasShopifyData = isset($shopifyDataByPartId[$partId]);
            $hasNSProductMatch = isset($nsProductMatchesByOriginalId[$partId]);

            if ($hasShopifyData) {
                $shopifyData = $shopifyDataByPartId[$partId];

                $enhancedPart['has_shopify_match'] = true;
                $enhancedPart['shopify_image'] = $shopifyData['image_url'] ?? null;

                Log::debug('[NSProductMatcher] Part '.$partId.' has Shopify data. Image URL: '.($shopifyData['image_url'] ?? 'None'));

                // Create the nsproduct_match structure for backwards compatibility
                if ($hasNSProductMatch) {
                    $nsProduct = $nsProductMatchesByOriginalId[$partId];
                    $enhancedPart['nsproduct_match'] = (object) [
                        'id' => $nsProduct->id ?? null,
                        'oem' => $nsProduct->oem ?? null,
                        'number' => $nsProduct->number ?? null,
                        'shop_id' => $shopifyData['shopify_id'] ?? $nsProduct->shop_id ?? null,
                        'name' => $shopifyData['title'] ?? $nsProduct->name ?? null,
                    ];
                } else {
                    // Part had shopify_id directly, create nsproduct_match from Shopify data
                    $enhancedPart['nsproduct_match'] = (object) [
                        'id' => null,
                        'oem' => $shopifyData['vendor'] ?? null,
                        'number' => $originalPart['part_number'] ?? null,
                        'shop_id' => $shopifyData['shopify_id'] ?? null,
                        'name' => $shopifyData['title'] ?? null,
                    ];
                }

                // Additional Shopify data for enhanced frontend experience
                $enhancedPart['shopify_data'] = [
                    'shopify_id' => $shopifyData['shopify_id'] ?? null,
                    'handle' => $shopifyData['handle'] ?? null,
                    'title' => $shopifyData['title'] ?? null,
                    'vendor' => $shopifyData['vendor'] ?? null,
                    'product_type' => $shopifyData['product_type'] ?? null,
                    'status' => $shopifyData['status'] ?? null,
                    'storefront_url' => $shopifyData['storefront_url'] ?? null,
                    'admin_url' => $shopifyData['admin_url'] ?? null,
                    'all_images' => $shopifyData['all_images'] ?? [],
                    'variant_info' => $shopifyData['variant_info'] ?? [],
                ];

            } elseif ($hasNSProductMatch) {
                // Has NSProduct match but no Shopify data (API might have failed)
                $nsProduct = $nsProductMatchesByOriginalId[$partId];
                $enhancedPart['nsproduct_match'] = $nsProduct;

                // Still mark as having a match if NSProduct has shop_id
                $enhancedPart['has_shopify_match'] = !empty($nsProduct->shop_id);
                $enhancedPart['shopify_image'] = null;
                $enhancedPart['shopify_data'] = null;

                Log::debug('[NSProductMatcher] Part '.$partId.' has NSProduct match but no Shopify data. Shop ID: '.($nsProduct->shop_id ?? 'None'));

            } else {
                // No matches found
                $enhancedPart['nsproduct_match'] = null;
                $enhancedPart['has_shopify_match'] = false;
                $enhancedPart['shopify_image'] = null;
                $enhancedPart['shopify_data'] = null;

                Log::debug('[NSProductMatcher] Part '.$partId.' has no matches');
            }

            $enhancedParts[] = $enhancedPart;
        }

        Log::info('[NSProductMatcher] Enhanced '.count($enhancedParts).' parts. Parts with Shopify matches: '.
            count(array_filter($enhancedParts, fn($p) => $p['has_shopify_match'] ?? false)));

        return $enhancedParts;
    }

    /**
     * Get Shopify product data for parts that already have Shopify IDs
     */
    private function getShopifyDataByIds(array $partsWithShopifyIds): array
    {
        $shopifyDataByPartId = [];

        // Process in smaller batches to avoid overwhelming the API
        foreach (array_chunk($partsWithShopifyIds, 10) as $batch) {
            foreach ($batch as $item) {
                $shopifyId = $item['shopify_id'];
                $originalPartId = $item['original_part_id'];

                try {
                    $productData = $this->shopifyService->getProductById($shopifyId);
                    if ($productData) {
                        $shopifyDataByPartId[$originalPartId] = $productData;
                    }
                } catch (\Exception $e) {
                    Log::error('Error getting Shopify product by ID', [
                        'shopify_id' => $shopifyId,
                        'original_part_id' => $originalPartId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }

        return $shopifyDataByPartId;
    }

    /**
     * Batch find NSProducts using optimized queries.
     * Returns an array mapping original part ID to the found NSProduct object or null.
     */
    private function batchFindNSProducts(array $searchCriteria): array
    {
        $matches = [];
        if (empty($searchCriteria)) {
            return $matches;
        }

        try {
            $connection = DB::connection('acsdatawarehouse');

            // Group by manufacturer to build more targeted IN clauses for part_numbers
            $criteriaByManufacturer = [];
            foreach ($searchCriteria as $criterion) {
                $manufacturer = trim($criterion['manufacturer']);
                $partNumber = trim($criterion['part_number']);
                if (!isset($criteriaByManufacturer[$manufacturer])) {
                    $criteriaByManufacturer[$manufacturer] = [
                        'part_numbers' => [],
                        'original_part_ids_map' => [],
                    ];
                }
                $criteriaByManufacturer[$manufacturer]['part_numbers'][] = $partNumber;
                $criteriaByManufacturer[$manufacturer]['original_part_ids_map'][$partNumber][] = $criterion['original_part_id'];
            }

            foreach ($criteriaByManufacturer as $manufacturer => $data) {
                $partNumbers = array_unique($data['part_numbers']);
                if (empty($partNumbers)) {
                    continue;
                }

                // Query for this manufacturer and their associated part numbers
                $results = $connection->table('nsproduct')
                    ->select(['id', 'oem', 'number', 'shop_id', 'name'])
                    ->where('oem', 'like', "%{$manufacturer}%")
                    ->whereIn('number', $partNumbers)
                    ->get();

                foreach ($results as $result) {
                    $matchedNumber = trim($result->number);

                    if (isset($data['original_part_ids_map'][$matchedNumber])) {
                        foreach ($data['original_part_ids_map'][$matchedNumber] as $originalPartId) {
                            $matches[$originalPartId] = $result;
                        }
                    }
                }
            }

            return $matches;

        } catch (\Exception $e) {
            Log::error('Batch NSProduct matching error', [
                'error' => $e->getMessage(),
                'criteria_count' => count($searchCriteria),
            ]);
            return [];
        }
    }

    /**
     * Helper to add null Shopify data if no processing is done.
     */
    private function addNullShopifyData(array $parts): array
    {
        return array_map(function ($part) {
            return array_merge($part, [
                'nsproduct_match' => null,
                'has_shopify_match' => false,
                'shopify_image' => null,
                'shopify_data' => null,
            ]);
        }, $parts);
    }
}
