<?php

// app/Services/PartsDataset/ShopifyService.php

namespace App\Services\PartsDataset;

use App\Models\PartsDataset\Part;
use App\Models\PartsDataset\PartAdditionalField;
use App\Models\PartsDataset\PartShopifyData;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ShopifyService
{
    private string $shopDomain;
    private string $accessToken;
    private string $storefrontDomain;

    public function __construct()
    {
        $this->shopDomain = config('services.shopify.shop_domain');
        $this->accessToken = config('services.shopify.access_token');
        $this->storefrontDomain = config('services.shopify.storefront_domain', 'aircompressorservices.com');

        if (empty($this->shopDomain) || empty($this->accessToken)) {
            Log::error('[PartsDataset][ShopifyService] Shopify domain or access token is not configured.');
        }
    }

    /**
     * Sync Shopify data for a single part using NetSuite lookup
     */
    public function syncPartData(Part $part): bool
    {
        if (empty($part->manufacturer) || empty($part->part_number)) {
            Log::warning("[PartsDataset][ShopifyService] Skipping part {$part->id} - missing manufacturer or part_number");
            return false;
        }

        try {
            // Step 1: Look up in NetSuite NSProduct database
            $nsProduct = $this->findNSProduct($part->manufacturer, $part->part_number);

            if (!$nsProduct) {
                Log::info("[PartsDataset][ShopifyService] No NSProduct found for part {$part->id} ({$part->manufacturer} / {$part->part_number})");
                return false;
            }

            // Step 2: Store NetSuite ID in additional fields
            $this->storeNetSuiteId($part, $nsProduct->nsitem_id);

            // Step 3: Get Shopify data using shop_id from NSProduct
            $shopifyData = null;
            if (!empty($nsProduct->shop_id)) {
                $shopifyData = $this->getProductById($nsProduct->shop_id);
            }

            // Step 4: Store the Shopify data
            $this->storeShopifyData($part, $shopifyData, $nsProduct);

            Log::info("[PartsDataset][ShopifyService] Synced data for part {$part->id} - NSProduct: {$nsProduct->nsitem_id}, Shopify: " . ($shopifyData ? 'Yes' : 'No'));
            return true;

        } catch (\Exception $e) {
            Log::error("[PartsDataset][ShopifyService] Error syncing part {$part->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Sync Shopify data for multiple parts in batch using NetSuite lookup
     */
    public function syncMultipleParts(array $partIds): array
    {
        $results = ['synced' => 0, 'failed' => 0, 'not_found' => 0];

        $parts = Part::whereIn('id', $partIds)
            ->whereNotNull('manufacturer')
            ->whereNotNull('part_number')
            ->get();

        Log::info("[PartsDataset][ShopifyService] Starting batch sync for " . count($parts) . " parts");

        // Step 1: Batch lookup NSProducts
        $searchCriteria = [];
        $partsById = [];

        foreach ($parts as $part) {
            $partsById[$part->id] = $part;
            $searchCriteria[] = [
                'original_part_id' => $part->id,
                'manufacturer' => trim($part->manufacturer),
                'part_number' => trim($part->part_number),
            ];
        }

        $nsProductMatches = $this->batchFindNSProducts($searchCriteria);
        Log::info("[PartsDataset][ShopifyService] Found " . count($nsProductMatches) . " NSProduct matches");

        // Step 2: Store NetSuite IDs for matched parts
        $this->batchStoreNetSuiteIds($nsProductMatches);

        // Step 3: Batch get Shopify data for NSProducts with shop_ids
        $shopifyLookups = [];
        foreach ($nsProductMatches as $partId => $nsProduct) {
            if (!empty($nsProduct->shop_id)) {
                $shopifyLookups[] = [
                    'original_part_id' => $partId,
                    'shopify_id' => $nsProduct->shop_id,
                ];
            }
        }

        $shopifyDataByPartId = [];
        if (!empty($shopifyLookups)) {
            $shopifyDataByPartId = $this->getShopifyDataByIds($shopifyLookups);
            Log::info("[PartsDataset][ShopifyService] Got Shopify data for " . count($shopifyDataByPartId) . " parts");
        }

        // Step 4: Store results
        foreach ($parts as $part) {
            try {
                $nsProduct = $nsProductMatches[$part->id] ?? null;
                $shopifyData = $shopifyDataByPartId[$part->id] ?? null;

                if ($nsProduct) {
                    $this->storeShopifyData($part, $shopifyData, $nsProduct);
                    $results['synced']++;
                } else {
                    $results['not_found']++;
                }
            } catch (\Exception $e) {
                $results['failed']++;
                Log::error("[PartsDataset][ShopifyService] Failed to sync part {$part->id}: " . $e->getMessage());
            }
        }

        return $results;
    }

    /**
     * Store NetSuite ID in additional fields
     */
    private function storeNetSuiteId(Part $part, string $netsuiteId): void
    {
        try {
            PartAdditionalField::updateOrCreate(
                [
                    'part_id' => $part->id,
                    'field_name' => '_netsuite_item_id'
                ],
                [
                    'field_value' => $netsuiteId
                ]
            );

            Log::debug("[PartsDataset][ShopifyService] Stored NetSuite ID {$netsuiteId} for part {$part->id}");
        } catch (\Exception $e) {
            Log::error("[PartsDataset][ShopifyService] Failed to store NetSuite ID for part {$part->id}: " . $e->getMessage());
        }
    }

    /**
     * Batch store NetSuite IDs for multiple parts
     */
    private function batchStoreNetSuiteIds(array $nsProductMatches): void
    {
        try {
            $batchData = [];
            $timestamp = now();

            foreach ($nsProductMatches as $partId => $nsProduct) {
                // Check if NetSuite ID field already exists
                $existing = PartAdditionalField::where('part_id', $partId)
                    ->where('field_name', '_netsuite_item_id')
                    ->first();

                if ($existing) {
                    // Update existing
                    $existing->update(['field_value' => $nsProduct->nsitem_id]);
                } else {
                    // Prepare for batch insert
                    $batchData[] = [
                        'part_id' => $partId,
                        'field_name' => '_netsuite_item_id',
                        'field_value' => $nsProduct->nsitem_id,
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ];
                }
            }

            // Batch insert new NetSuite ID fields
            if (!empty($batchData)) {
                DB::connection('parts_database')
                    ->table('parts_additional_fields')
                    ->insert($batchData);

                Log::info("[PartsDataset][ShopifyService] Batch stored " . count($batchData) . " NetSuite IDs");
            }

        } catch (\Exception $e) {
            Log::error("[PartsDataset][ShopifyService] Failed to batch store NetSuite IDs: " . $e->getMessage());
        }
    }

    /**
     * Find NSProduct by manufacturer and part number
     */
    private function findNSProduct(string $manufacturer, string $partNumber): ?object
    {
        try {
            $connection = DB::connection('acsdatawarehouse');

            $result = $connection->table('nsproduct')
                ->select(['nsitem_id', 'oem', 'number', 'shop_id', 'name'])
                ->where('oem', 'like', "%{$manufacturer}%")
                ->where('number', $partNumber)
                ->first();

            return $result;

        } catch (\Exception $e) {
            Log::error("[PartsDataset][ShopifyService] NSProduct lookup error: " . $e->getMessage(), [
                'manufacturer' => $manufacturer,
                'part_number' => $partNumber,
            ]);
            return null;
        }
    }

    /**
     * Batch find NSProducts using optimized queries
     */
    private function batchFindNSProducts(array $searchCriteria): array
    {
        $matches = [];
        if (empty($searchCriteria)) {
            return $matches;
        }

        try {
            $connection = DB::connection('acsdatawarehouse');

            // Group by manufacturer for optimized queries
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

                $results = $connection->table('nsproduct')
                    ->select(['nsitem_id', 'oem', 'number', 'shop_id', 'name'])
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
            Log::error('[PartsDataset][ShopifyService] Batch NSProduct matching error', [
                'error' => $e->getMessage(),
                'criteria_count' => count($searchCriteria),
            ]);
            return [];
        }
    }

    /**
     * Get Shopify product data by ID
     */
    public function getProductById(string $shopifyId): ?array
    {
        if (empty($this->shopDomain) || empty($this->accessToken)) {
            return null;
        }

        try {
            $query = '
                query($id: ID!) {
                    product(id: $id) {
                        id
                        handle
                        title
                        vendor
                        productType
                        status
                        onlineStoreUrl
                        featuredMedia {
                            ... on MediaImage {
                                image {
                                    url
                                    altText
                                    width
                                    height
                                }
                            }
                        }
                        images(first: 10) {
                            nodes {
                                url
                                altText
                                width
                                height
                            }
                        }
                        variants(first: 10) {
                            nodes {
                                sku
                                price
                                compareAtPrice
                                availableForSale
                                inventoryQuantity
                            }
                        }
                    }
                }
            ';

            $variables = [
                'id' => "gid://shopify/Product/{$shopifyId}"
            ];

            $response = Http::withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->post("https://{$this->shopDomain}/admin/api/2025-04/graphql.json", [
                'query' => $query,
                'variables' => $variables
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $product = $data['data']['product'] ?? null;

                if ($product) {
                    return [
                        'shopify_id' => $shopifyId,
                        'handle' => $product['handle'] ?? null,
                        'title' => $product['title'] ?? null,
                        'vendor' => $product['vendor'] ?? null,
                        'product_type' => $product['productType'] ?? null,
                        'status' => strtolower($product['status'] ?? ''),
                        'featured_image_url' => $product['featuredMedia']['image']['url'] ?? null,
                        'storefront_url' => $this->buildStorefrontUrl($product['handle'] ?? null),
                        'admin_url' => $this->buildAdminUrl($shopifyId),
                        'all_images' => $this->extractAllImages($product['images']['nodes'] ?? []),
                        'variant_data' => $this->extractVariantData($product['variants']['nodes'] ?? []),
                        'online_store_url' => $product['onlineStoreUrl'] ?? $this->buildStorefrontUrl($product['handle'] ?? null),
                    ];
                }
            } else {
                Log::warning("[PartsDataset][ShopifyService] Shopify product by ID query failed", [
                    'shopify_id' => $shopifyId,
                    'status' => $response->status(),
                    'response' => $response->body()
                ]);
            }

        } catch (\Exception $e) {
            Log::error("[PartsDataset][ShopifyService] Shopify API Error (get product by ID)", [
                'shopify_id' => $shopifyId,
                'error' => $e->getMessage()
            ]);
        }

        return null;
    }

    /**
     * Get Shopify product data for parts that already have Shopify IDs
     */
    private function getShopifyDataByIds(array $partsWithShopifyIds): array
    {
        $shopifyDataByPartId = [];

        foreach (array_chunk($partsWithShopifyIds, 10) as $batch) {
            foreach ($batch as $item) {
                $shopifyId = $item['shopify_id'];
                $originalPartId = $item['original_part_id'];

                try {
                    $productData = $this->getProductById($shopifyId);
                    if ($productData) {
                        $shopifyDataByPartId[$originalPartId] = $productData;
                    }
                } catch (\Exception $e) {
                    Log::error('[PartsDataset][ShopifyService] Error getting Shopify product by ID', [
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
     * Store Shopify data for a part
     */
    private function storeShopifyData(Part $part, ?array $shopifyData, object $nsProduct): void
    {
        $dataToStore = [
            'shopify_id' => $shopifyData['shopify_id'] ?? $nsProduct->shop_id ?? null,
            'handle' => $shopifyData['handle'] ?? null,
            'title' => $shopifyData['title'] ?? $nsProduct->name ?? null,
            'vendor' => $shopifyData['vendor'] ?? $nsProduct->oem ?? null,
            'product_type' => $shopifyData['product_type'] ?? null,
            'status' => $shopifyData['status'] ?? null,
            'featured_image_url' => $shopifyData['featured_image_url'] ?? null,
            'storefront_url' => $shopifyData['storefront_url'] ?? null,
            'admin_url' => $shopifyData['admin_url'] ?? null,
            'all_images' => $shopifyData['all_images'] ?? [],
            'variant_data' => $shopifyData['variant_data'] ?? [],
            'last_synced_at' => now(),
        ];

        // Update or create Shopify data
        PartShopifyData::updateOrCreate(
            ['part_id' => $part->id],
            $dataToStore
        );
    }

    /**
     * Build storefront URL from product handle
     */
    private function buildStorefrontUrl(?string $handle): ?string
    {
        if (empty($handle)) {
            return null;
        }
        return "https://{$this->storefrontDomain}/products/{$handle}";
    }

    /**
     * Build admin URL from Shopify ID
     */
    private function buildAdminUrl(?string $shopifyId): ?string
    {
        if (empty($shopifyId)) {
            return null;
        }
        $shopName = str_replace('.myshopify.com', '', $this->shopDomain);
        return "https://admin.shopify.com/store/{$shopName}/products/{$shopifyId}";
    }

    /**
     * Extract all image information
     */
    private function extractAllImages(array $imageNodes): array
    {
        return array_map(function ($image) {
            return [
                'url' => $image['url'] ?? null,
                'alt' => $image['altText'] ?? null,
                'width' => $image['width'] ?? null,
                'height' => $image['height'] ?? null,
            ];
        }, $imageNodes);
    }

    /**
     * Extract variant information
     */
    private function extractVariantData(array $variantNodes): array
    {
        return array_map(function ($variant) {
            return [
                'sku' => $variant['sku'] ?? null,
                'price' => $variant['price'] ?? null,
                'compare_at_price' => $variant['compareAtPrice'] ?? null,
                'available_for_sale' => $variant['availableForSale'] ?? false,
                'inventory_quantity' => $variant['inventoryQuantity'] ?? 0,
            ];
        }, $variantNodes);
    }
}
