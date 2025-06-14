<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NSProductMatcher
{
    private ShopifyService $shopifyService;

    public function __construct(ShopifyService $shopifyService)
    {
        $this->shopifyService = $shopifyService;
    }

    /**
     * Find matching NSProducts and get Shopify images
     */
    public function getMatchingProductsWithImages(array $parts): array
    {
        $matchedProducts = [];

        foreach ($parts as $part) {
            $manufacturer = $part['manufacture'] ?? '';
            $partNumber = $part['part_number'] ?? '';

            if (empty($manufacturer) || empty($partNumber)) {
                continue;
            }

            // Find matching NSProduct
            $nsProduct = $this->findMatchingNSProduct($manufacturer, $partNumber);

            if ($nsProduct) {
                // Get Shopify image using shop_id
                $shopifyImage = $this->getShopifyImageFromNSProduct($nsProduct);

                $matchedProducts[$part['id']] = [
                    'nsproduct' => $nsProduct,
                    'shopify_image' => $shopifyImage,
                    'has_match' => true
                ];
            } else {
                $matchedProducts[$part['id']] = [
                    'nsproduct' => null,
                    'shopify_image' => null,
                    'has_match' => false
                ];
            }
        }

        return $matchedProducts;
    }

    /**
     * Find matching NSProduct by manufacturer and part number
     */
    private function findMatchingNSProduct(string $manufacturer, string $partNumber): ?object
    {
        try {
            return DB::connection('acsdatawarehouse')
                ->table('nsproduct')
                ->where('oem', 'like', "%{$manufacturer}%")
                ->where('number', $partNumber)
                ->first();
        } catch (\Exception $e) {
            Log::error('NSProduct matching error', [
                'manufacturer' => $manufacturer,
                'part_number' => $partNumber,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get Shopify image using NSProduct shop_id
     */
    private function getShopifyImageFromNSProduct(object $nsProduct): ?string
    {
        if (empty($nsProduct->shop_id)) {
            return null;
        }

        // Extract manufacturer and part number for Shopify query
        $manufacturer = $nsProduct->oem ?? '';
        $partNumber = $nsProduct->number ?? '';

        if (empty($manufacturer) || empty($partNumber)) {
            return null;
        }

        return $this->shopifyService->getProductImage($manufacturer, $partNumber);
    }

    /**
     * Get enhanced part data with Shopify images
     */
    public function enhancePartsWithShopifyImages(array $parts): array
    {
        $matches = $this->getMatchingProductsWithImages($parts);

        // Enhance parts data with Shopify images
        foreach ($parts as &$part) {
            $partId = $part['id'];

            if (isset($matches[$partId])) {
                $part['shopify_image'] = $matches[$partId]['shopify_image'];
                $part['has_shopify_match'] = $matches[$partId]['has_match'];
                $part['nsproduct_match'] = $matches[$partId]['nsproduct'];
            } else {
                $part['shopify_image'] = null;
                $part['has_shopify_match'] = false;
                $part['nsproduct_match'] = null;
            }
        }

        return $parts;
    }
}
