<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NetSuiteService
{
    protected $baseUrl;
    protected $realm;
    protected $consumerKey;
    protected $consumerSecret;
    protected $token;
    protected $tokenSecret;

    public function __construct()
    {
        $this->baseUrl = config('services.netsuite.base_url');
        $this->realm = config('services.netsuite.realm');
        $this->consumerKey = config('services.netsuite.consumer_key');
        $this->consumerSecret = config('services.netsuite.consumer_secret_key');
        $this->token = config('services.netsuite.token');
        $this->tokenSecret = config('services.netsuite.token_secret');

        // Validate configuration
        if (empty($this->baseUrl) || empty($this->realm) || empty($this->consumerKey) ||
            empty($this->consumerSecret) || empty($this->token) || empty($this->tokenSecret)) {
            throw new Exception('NetSuite configuration is incomplete');
        }
    }

    public function search($number)
    {
        $cacheKey = "netsuite_search_{$number}_".auth()->id();

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($number) {
            try {
                // Get item details
                $itemQuery = "SELECT * FROM item WHERE id = '{$number}'";
                $itemDetails = $this->executeQuery($itemQuery);

                // Get associated products
                $productsQuery = "SELECT * FROM customrecord_product WHERE custrecord_product_parent_item = '{$number}'";
                $customRecords = $this->executeQuery($productsQuery);



                return [
                    'itemDetails' => $itemDetails['items'][0] ?? null,
                    'items' => $customRecords['items'] ?? []
                ];

            } catch (Exception $e) {
                Log::error('NetSuite Search Error', [
                    'item_number' => $number,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw new Exception('NetSuite search failed: '.$e->getMessage());
            }
        });
    }

    public function searchByName($name)
    {
        try {
            // Search items by name
            $itemQuery = "SELECT * FROM item WHERE displayname LIKE '%{$name}%' OR itemid LIKE '%{$name}%' LIMIT 50";
            $results = $this->executeQuery($itemQuery);

            return $results['items'] ?? [];

        } catch (Exception $e) {
            Log::error('NetSuite Name Search Error', [
                'name' => $name,
                'error' => $e->getMessage()
            ]);
            throw new Exception('NetSuite name search failed: '.$e->getMessage());
        }
    }

    protected function executeQuery($query)
    {
        Log::info('Executing NetSuite Query', [
            'query' => $query,
            'user_id' => auth()->id()
        ]);

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'Authorization' => $this->generateOAuthHeader(),
                    'Content-Type' => 'application/json',
                    'Prefer' => 'transient'
                ])
                ->post($this->baseUrl, [
                    'q' => $query
                ]);

            if (!$response->successful()) {
                $errorBody = $response->body();
                Log::error('NetSuite API Error', [
                    'query' => $query,
                    'status' => $response->status(),
                    'response' => $errorBody
                ]);

                // Handle specific error codes
                if ($response->status() === 401) {
                    throw new Exception('NetSuite authentication failed. Please check credentials.');
                } elseif ($response->status() === 403) {
                    throw new Exception('NetSuite access forbidden. Please check permissions.');
                } elseif ($response->status() === 429) {
                    throw new Exception('NetSuite rate limit exceeded. Please try again later.');
                } else {
                    throw new Exception('NetSuite API Error: '.$errorBody);
                }
            }

            $responseData = $response->json();

            Log::info('NetSuite Query Success', [
                'query' => $query,
                'status' => $response->status(),
                'item_count' => count($responseData['items'] ?? [])
            ]);

            return $responseData;

        } catch (Exception $e) {
            Log::error('NetSuite Query Error', [
                'query' => $query,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    protected function generateOAuthHeader($method = 'POST', $url = null)
    {
        $oauth_nonce = md5(mt_rand());
        $oauth_timestamp = time();
        $oauth_signature_method = 'HMAC-SHA256';
        $oauth_version = '1.0';

        // Use provided URL or default to base URL
        $targetUrl = $url ?? $this->baseUrl;

        $base_string = "{$method}&".urlencode($targetUrl)."&".urlencode(
                "oauth_consumer_key=".$this->consumerKey.
                "&oauth_nonce=".$oauth_nonce.
                "&oauth_signature_method=".$oauth_signature_method.
                "&oauth_timestamp=".$oauth_timestamp.
                "&oauth_token=".$this->token.
                "&oauth_version=".$oauth_version
            );

        $key = $this->consumerSecret.'&'.$this->tokenSecret;
        $oauth_signature = base64_encode(hash_hmac('sha256', $base_string, $key, true));

        return 'OAuth realm="'.$this->realm.'",'.
            'oauth_consumer_key="'.$this->consumerKey.'",'.
            'oauth_token="'.$this->token.'",'.
            'oauth_nonce="'.$oauth_nonce.'",'.
            'oauth_timestamp="'.$oauth_timestamp.'",'.
            'oauth_signature_method="'.$oauth_signature_method.'",'.
            'oauth_version="'.$oauth_version.'",'.
            'oauth_signature="'.urlencode($oauth_signature).'"';
    }

    public function updateImageCaptureDate($itemId)
    {
        try {
            // First get the item details to verify it exists
            $query = "SELECT * FROM item WHERE id = '{$itemId}'";
            $result = $this->executeQuery($query);

            if (empty($result['items'][0])) {
                throw new Exception("Item not found: {$itemId}");
            }

            // Get the item data
            $itemData = $result['items'][0];
            $id = $itemData['id'];

            // Get base domain for REST API
            $baseApiDomain = parse_url($this->baseUrl, PHP_URL_SCHEME).'://'.parse_url($this->baseUrl, PHP_URL_HOST);

            // Construct REST API endpoint using inventoryitem as the record type
            $restUrl = "{$baseApiDomain}/services/rest/record/v1/inventoryitem/{$id}";

            Log::info('NetSuite REST Update Attempt', [
                'url' => $restUrl,
                'item_id' => $itemId,
                'item_type' => $itemData['itemtype'] ?? 'unknown',
                'user_id' => auth()->id()
            ]);

            $response = Http::timeout(30)
                ->withHeaders([
                    'Authorization' => $this->generateOAuthHeader('PATCH', $restUrl),
                    'Content-Type' => 'application/json',
                    'Prefer' => 'transient'
                ])
                ->patch($restUrl, [
                    'custitem_pic_capture_date' => now()->toISOString()
                ]);

            if (!$response->successful()) {
                $errorBody = $response->body();
                Log::error('NetSuite Update Error', [
                    'item_id' => $itemId,
                    'status' => $response->status(),
                    'response' => $errorBody,
                    'url' => $restUrl
                ]);
                throw new Exception('NetSuite API Error: '.$errorBody);
            }



            return $response->json();

        } catch (Exception $e) {
            Log::error('NetSuite Update Error', [
                'item_id' => $itemId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw new Exception('Failed to update NetSuite image date: '.$e->getMessage());
        }
    }

    public function getItemById($itemId)
    {
        $cacheKey = "netsuite_item_{$itemId}";

        return Cache::remember($cacheKey, now()->addMinutes(30), function () use ($itemId) {
            try {
                $query = "SELECT * FROM item WHERE id = '{$itemId}'";
                $result = $this->executeQuery($query);

                return $result['items'][0] ?? null;

            } catch (Exception $e) {
                Log::error('NetSuite Get Item Error', [
                    'item_id' => $itemId,
                    'error' => $e->getMessage()
                ]);
                throw new Exception('Failed to get NetSuite item: '.$e->getMessage());
            }
        });
    }

    public function validateItemExists($itemId)
    {
        try {
            $item = $this->getItemById($itemId);
            return !empty($item);

        } catch (Exception $e) {
            Log::warning('NetSuite item validation failed', [
                'item_id' => $itemId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    public function getProductsByParentItem($parentItemId)
    {
        $cacheKey = "netsuite_products_{$parentItemId}";

        return Cache::remember($cacheKey, now()->addMinutes(15), function () use ($parentItemId) {
            try {
                $query = "SELECT * FROM customrecord_product WHERE custrecord_product_parent_item = '{$parentItemId}'";
                $result = $this->executeQuery($query);

                return collect($result['items'] ?? [])
                    ->filter(function ($item) {
                        return isset($item['isinactive']) &&
                            $item['isinactive'] === 'F' &&
                            !empty($item['custrecord_product_shopify_id']);
                    })
                    ->values()
                    ->all();

            } catch (Exception $e) {
                Log::error('NetSuite Get Products Error', [
                    'parent_item_id' => $parentItemId,
                    'error' => $e->getMessage()
                ]);
                throw new Exception('Failed to get NetSuite products: '.$e->getMessage());
            }
        });
    }

    public function clearCache($itemId = null)
    {
        try {
            if ($itemId) {
                Cache::forget("netsuite_search_{$itemId}_".auth()->id());
                Cache::forget("netsuite_item_{$itemId}");
                Cache::forget("netsuite_products_{$itemId}");
            } else {
                // Clear all NetSuite caches for current user
                $userId = auth()->id();
                $cacheKeys = Cache::getRedis()->keys("*netsuite_*_{$userId}");
                foreach ($cacheKeys as $key) {
                    Cache::forget($key);
                }
            }
        } catch (Exception $e) {
            Log::warning('Failed to clear NetSuite cache', ['error' => $e->getMessage()]);
        }
    }
}
