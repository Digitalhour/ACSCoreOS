<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Parts\PartInstance;
use App\Services\OptimizedNSProductMatcher;
use App\Services\ShopifyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ShopifyEnhancementController extends Controller
{
    private OptimizedNSProductMatcher $nsProductMatcher;
    private ShopifyService $shopifyService;

    public function __construct(OptimizedNSProductMatcher $nsProductMatcher, ShopifyService $shopifyService)
    {
        $this->nsProductMatcher = $nsProductMatcher;
        $this->shopifyService = $shopifyService;
    }

    /**
     * Get Shopify data for specific parts (called via AJAX when needed)
     */
    public function getShopifyData(Request $request)
    {
        $partIds = $request->input('part_ids', []);

        if (empty($partIds) || !is_array($partIds)) {
            return response()->json(['error' => 'part_ids array is required'], 400);
        }

        // Limit to reasonable batch size
        if (count($partIds) > 50) {
            return response()->json(['error' => 'Maximum 50 parts per request'], 400);
        }

        try {
            // Get the part instances
            $partInstances = PartInstance::whereIn('id', $partIds)
                ->where('is_active', true)
                ->with('manufacturer')
                ->get();

            if ($partInstances->isEmpty()) {
                return response()->json(['data' => []]);
            }

            // Transform to the format expected by the matcher
            $partsArray = $partInstances->map(function ($instance) {
                return [
                    'id' => $instance->id,
                    'manufacture' => $instance->manufacturer?->name ?? '',
                    'part_number' => $instance->part_number,
                    'shopify_id' => $instance->shopify_id,
                ];
            })->toArray();

            // Get enhanced data
            $enhancedParts = $this->nsProductMatcher->enhancePartsWithShopifyImages($partsArray);

            // Format response - only return parts that have Shopify data
            $response = [];
            foreach ($enhancedParts as $part) {
                if ($part['has_shopify_match'] && !empty($part['shopify_image'])) {
                    $response[$part['id']] = [
                        'has_shopify_match' => $part['has_shopify_match'],
                        'shopify_image' => $part['shopify_image'],
                        'shopify_data' => $part['shopify_data'] ?? null,
                        'nsproduct_match' => $part['nsproduct_match'] ?? null,
                    ];
                }
            }

            return response()->json(['data' => $response]);

        } catch (\Exception $e) {
            Log::error('Error in getShopifyData: '.$e->getMessage(), [
                'part_ids' => $partIds,
                'exception' => $e->getTraceAsString()
            ]);

            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Get Shopify product data by Shopify ID (for parts that already have shopify_id)
     */
    public function getShopifyProductById(Request $request)
    {
        $shopifyId = $request->input('shopify_id');

        if (empty($shopifyId)) {
            return response()->json(['error' => 'shopify_id is required'], 400);
        }

        try {
            $productData = $this->shopifyService->getProductById($shopifyId);

            if ($productData) {
                return response()->json(['data' => $productData]);
            } else {
                return response()->json(['data' => null]);
            }

        } catch (\Exception $e) {
            Log::error('Error in getShopifyProductById: '.$e->getMessage(), [
                'shopify_id' => $shopifyId,
                'exception' => $e->getTraceAsString()
            ]);

            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Batch get Shopify product data for multiple Shopify IDs
     */
    public function batchGetShopifyProducts(Request $request)
    {
        $shopifyIds = $request->input('shopify_ids', []);

        if (empty($shopifyIds) || !is_array($shopifyIds)) {
            return response()->json(['error' => 'shopify_ids array is required'], 400);
        }

        if (count($shopifyIds) > 20) {
            return response()->json(['error' => 'Maximum 20 products per request'], 400);
        }

        try {
            $results = [];

            // Process in smaller batches to avoid overwhelming the API
            foreach (array_chunk($shopifyIds, 5) as $batch) {
                foreach ($batch as $shopifyId) {
                    $productData = $this->shopifyService->getProductById($shopifyId);
                    if ($productData) {
                        $results[$shopifyId] = $productData;
                    }
                }
            }

            return response()->json(['data' => $results]);

        } catch (\Exception $e) {
            Log::error('Error in batchGetShopifyProducts: '.$e->getMessage(), [
                'shopify_ids' => $shopifyIds,
                'exception' => $e->getTraceAsString()
            ]);

            return response()->json(['error' => 'Internal server error'], 500);
        }
    }
}
