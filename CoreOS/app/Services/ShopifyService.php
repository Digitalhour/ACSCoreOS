<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ShopifyService
{
    private string $shopDomain;
    private string $accessToken;
    private string $storefrontDomain;
    private int $batchGraphQlQueryLimit = 12;

    public function __construct()
    {
        $this->shopDomain = config('services.shopify.shop_domain');
        $this->accessToken = config('services.shopify.access_token');
        $this->storefrontDomain = config('services.shopify.storefront_domain', 'aircompressorservices.com');

        if (empty($this->shopDomain) || empty($this->accessToken)) {
            Log::error('Shopify domain or access token is not configured.');
        }
    }

    /**
     * Get product images and storefront URLs for multiple parts in a batch using a single GraphQL query with aliases.
     */
    public function getBatchProductImages(array $partsToQuery): array
    {
        if (empty($partsToQuery) || empty($this->shopDomain) || empty($this->accessToken)) {
            return [];
        }

        $allProductData = [];

        foreach (array_chunk($partsToQuery, $this->batchGraphQlQueryLimit) as $batch) {
            if (empty($batch)) {
                continue;
            }

            $queryParts = [];
            $aliasToOriginalIdMap = [];

            foreach ($batch as $item) {
                if (empty($item['vendor']) || empty($item['sku']) || !isset($item['original_part_id'])) {
                    continue;
                }

                $vendorQuery = addslashes(trim($item['vendor']));
                $skuQuery = addslashes(trim($item['sku']));

                $aliasSuffix = preg_replace('/[^a-zA-Z0-9_]/', '_', (string) $item['original_part_id']);
                $alias = "product_".$aliasSuffix."_".Str::random(4);

                $aliasToOriginalIdMap[$alias] = $item['original_part_id'];

                $productGraphqlQuery = "vendor:\\\"{$vendorQuery}\\\" AND sku:\\\"{$skuQuery}\\\"";

                $queryParts[] = "
                    {$alias}: products(first: 1, query: \"{$productGraphqlQuery}\") {
                        nodes {
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
                            images(first: 5) {
                                nodes {
                                    url
                                    altText
                                    width
                                    height
                                }
                            }
                            variants(first: 1) {
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
                ";
            }

            if (empty($queryParts)) {
                continue;
            }

            $fullQuery = "query {\n".implode("\n", $queryParts)."\n}";

            try {
                $response = Http::withHeaders([
                    'X-Shopify-Access-Token' => $this->accessToken,
                    'Content-Type' => 'application/json',
                ])->post("https://{$this->shopDomain}/admin/api/2025-04/graphql.json", [
                    'query' => $fullQuery,
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    if (isset($data['data'])) {
                        foreach ($data['data'] as $aliasKey => $productData) {
                            $originalPartId = $aliasToOriginalIdMap[$aliasKey] ?? null;
                            if ($originalPartId && !empty($productData['nodes'])) {
                                $product = $productData['nodes'][0];

                                $productInfo = [
                                    'shopify_id' => $this->extractShopifyId($product['id'] ?? ''),
                                    'handle' => $product['handle'] ?? null,
                                    'title' => $product['title'] ?? null,
                                    'vendor' => $product['vendor'] ?? null,
                                    'product_type' => $product['productType'] ?? null,
                                    'status' => $product['status'] ?? null,
                                    'image_url' => $product['featuredMedia']['image']['url'] ?? null,
                                    'image_alt' => $product['featuredMedia']['image']['altText'] ?? null,
                                    'storefront_url' => $this->buildStorefrontUrl($product['handle'] ?? null),
                                    'admin_url' => $this->buildAdminUrl($this->extractShopifyId($product['id'] ?? '')),
                                    'all_images' => $this->extractAllImages($product['images']['nodes'] ?? []),
                                    'variant_info' => $this->extractVariantInfo($product['variants']['nodes'] ?? []),
                                    // FIXED: Use actual Shopify onlineStoreUrl with fallback
                                    'online_store_url' => $product['onlineStoreUrl'] ?? $this->buildStorefrontUrl($product['handle'] ?? null),
                                ];

                                $allProductData[$originalPartId] = $productInfo;
                            }
                        }
                    } else {
                        Log::warning('Shopify batch GraphQL query succeeded but data key is missing.', [
                            'response_body' => $data,
                        ]);
                    }
                } else {
                    Log::error('Shopify batch GraphQL query failed.', [
                        'status_code' => $response->status(),
                        'response_body' => $response->body(),
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Exception during Shopify batch GraphQL request.', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $allProductData;
    }

    /**
     * Get product image from Shopify for a single product.
     */
    public function getProductImage(string $vendor, string $sku): ?array
    {
        if (empty($this->shopDomain) || empty($this->accessToken)) {
            return null;
        }

        $vendorQuery = addslashes(trim($vendor));
        $skuQuery = addslashes(trim($sku));

        try {
            $query = '
                query($queryString: String!) {
                    products(first: 1, query: $queryString) {
                        nodes {
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
                            images(first: 5) {
                                nodes {
                                    url
                                    altText
                                    width
                                    height
                                }
                            }
                            variants(first: 1) {
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
                }
            ';

            $variables = [
                'queryString' => "vendor:\"{$vendorQuery}\" AND sku:\"{$skuQuery}\""
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
                $product = $data['data']['products']['nodes'][0] ?? null;

                if ($product) {
                    return [
                        'shopify_id' => $this->extractShopifyId($product['id'] ?? ''),
                        'handle' => $product['handle'] ?? null,
                        'title' => $product['title'] ?? null,
                        'vendor' => $product['vendor'] ?? null,
                        'product_type' => $product['productType'] ?? null,
                        'status' => $product['status'] ?? null,
                        'image_url' => $product['featuredMedia']['image']['url'] ?? null,
                        'image_alt' => $product['featuredMedia']['image']['altText'] ?? null,
                        'storefront_url' => $this->buildStorefrontUrl($product['handle'] ?? null),
                        'admin_url' => $this->buildAdminUrl($this->extractShopifyId($product['id'] ?? '')),
                        'all_images' => $this->extractAllImages($product['images']['nodes'] ?? []),
                        'variant_info' => $this->extractVariantInfo($product['variants']['nodes'] ?? []),
                        // FIXED: Use actual Shopify onlineStoreUrl with fallback
                        'online_store_url' => $product['onlineStoreUrl'] ?? $this->buildStorefrontUrl($product['handle'] ?? null),
                    ];
                }
            } else {
                Log::warning('Shopify single product image query failed.', [
                    'vendor' => $vendor, 'sku' => $sku,
                    'status' => $response->status(), 'response' => $response->body()
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Shopify API Error (single product image)', [
                'vendor' => $vendor,
                'sku' => $sku,
                'error' => $e->getMessage()
            ]);
        }

        return null;
    }

    /**
     * Get product by Shopify ID
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
                    $productInfo = [
                        'shopify_id' => $shopifyId,
                        'handle' => $product['handle'] ?? null,
                        'title' => $product['title'] ?? null,
                        'vendor' => $product['vendor'] ?? null,
                        'product_type' => $product['productType'] ?? null,
                        'status' => $product['status'] ?? null,
                        'image_url' => $product['featuredMedia']['image']['url'] ?? null,
                        'image_alt' => $product['featuredMedia']['image']['altText'] ?? null,
                        'storefront_url' => $this->buildStorefrontUrl($product['handle'] ?? null),
                        'admin_url' => $this->buildAdminUrl($shopifyId),
                        'all_images' => $this->extractAllImages($product['images']['nodes'] ?? []),
                        'variant_info' => $this->extractVariantInfo($product['variants']['nodes'] ?? []),
                        // FIXED: Use actual Shopify onlineStoreUrl with fallback
                        'online_store_url' => $product['onlineStoreUrl'] ?? $this->buildStorefrontUrl($product['handle'] ?? null),
                    ];

                    return $productInfo;
                }
            } else {
                Log::warning('Shopify product by ID query failed.', [
                    'shopify_id' => $shopifyId,
                    'status' => $response->status(),
                    'response' => $response->body()
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Shopify API Error (get product by ID)', [
                'shopify_id' => $shopifyId,
                'error' => $e->getMessage()
            ]);
        }

        return null;
    }

    /**
     * Extract Shopify product ID from GraphQL ID
     */
    private function extractShopifyId(string $graphqlId): ?string
    {
        if (preg_match('/\/Product\/(\d+)$/', $graphqlId, $matches)) {
            return $matches[1];
        }
        return null;
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
        return "https://admin.shopify.com/store/{$this->getShopName()}/products/{$shopifyId}";
    }

    /**
     * Extract shop name from shop domain
     */
    private function getShopName(): string
    {
        return str_replace('.myshopify.com', '', $this->shopDomain);
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
    private function extractVariantInfo(array $variantNodes): array
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

    /**
     * Generate product slug from name (for backwards compatibility)
     */
    public function generateProductSlug(string $productName): string
    {
        return Str::slug($productName);
    }
}
