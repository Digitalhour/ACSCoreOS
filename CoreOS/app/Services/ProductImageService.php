<?php

namespace App\Services;

use Exception;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductImageService
{
    protected $shopDomain;
    protected $accessToken;
    private string $storefrontDomain;
    private int $batchGraphQlQueryLimit = 20;

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
     * Upload image to Shopify via S3
     */
    public function uploadImage(UploadedFile $file, $productId)
    {
        Log::info("Starting Shopify upload via S3", [
            'product_id' => $productId,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize()
        ]);

        $s3Path = null;

        try {
            $altText = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

            // Upload to S3
            $s3Path = $this->uploadToS3($file, $altText);
            $s3Url = Storage::disk('s3')->url($s3Path);

            Log::info("File uploaded to S3", [
                'path' => $s3Path,
                'url' => $s3Url
            ]);

            // Verify S3 file is accessible before proceeding
            $this->verifyS3FileAccessible($s3Url);

            $altText = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

            // Upload to Shopify using S3 URL
            $query = <<<GQL
            mutation UploadProductImage(\$productId: ID!, \$media: [CreateMediaInput!]!) {
                productCreateMedia(productId: \$productId, media: \$media) {
                    media {
                        id
                        alt
                        status
                        mediaErrors {
                            code
                            details
                            message
                        }
                        ... on MediaImage {
                            image {
                                url
                                width
                                height
                            }
                        }
                    }
                    mediaUserErrors {
                        field
                        message
                        code
                    }
                }
            }
            GQL;

            $variables = [
                'productId' => "gid://shopify/Product/{$productId}",
                'media' => [
                    [
                        'mediaContentType' => 'IMAGE',
                        'originalSource' => $s3Url,
                        'alt' => $altText,
                    ],
                ],
            ];

            Log::info("Sending GraphQL request to Shopify", [
                'product_id' => $productId,
                's3_url' => $s3Url
            ]);

            $response = Http::timeout(120)->withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->post("https://{$this->shopDomain}/admin/api/2025-04/graphql.json", [
                'query' => $query,
                'variables' => $variables,
            ]);

            $responseBody = $response->json();

            if (!$response->successful()) {
                Log::error('Shopify API request failed', [
                    'status' => $response->status(),
                    'response' => $response->body()
                ]);
                throw new Exception("Shopify API request failed with status {$response->status()}");
            }

            if (isset($responseBody['errors'])) {
                Log::error('GraphQL errors', ['errors' => $responseBody['errors']]);
                throw new Exception("GraphQL errors: " . collect($responseBody['errors'])->pluck('message')->implode(', '));
            }

            $mediaUserErrors = $responseBody['data']['productCreateMedia']['mediaUserErrors'] ?? [];
            if (!empty($mediaUserErrors)) {
                Log::error('Media user errors', ['errors' => $mediaUserErrors]);
                throw new Exception("Media upload errors: " . collect($mediaUserErrors)->pluck('message')->implode(', '));
            }

            $media = $responseBody['data']['productCreateMedia']['media'] ?? [];
            if (empty($media)) {
                throw new Exception('No media returned from Shopify API');
            }

            // Check for media-level errors
            foreach ($media as $mediaItem) {
                if (!empty($mediaItem['mediaErrors'])) {
                    Log::error('Media item errors', ['errors' => $mediaItem['mediaErrors']]);
                    throw new Exception("Media processing errors: " . collect($mediaItem['mediaErrors'])->pluck('message')->implode(', '));
                }
            }

            Log::info("Successfully uploaded to Shopify via S3", [
                'media_count' => count($media),
                'media_ids' => collect($media)->pluck('id')->toArray()
            ]);

            // Schedule cleanup after delay to allow Shopify to process
            $this->scheduleS3Cleanup($s3Path);

            return $media;

        } catch (Exception $e) {
            Log::error('Shopify upload via S3 failed', [
                'product_id' => $productId,
                'file_name' => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
                's3_path' => $s3Path
            ]);

            // Clean up S3 file on error
            if ($s3Path) {
                $this->cleanupS3File($s3Path);
            }

            throw $e;
        }
    }

    /**
     * Upload file to S3
     */
    private function uploadToS3(UploadedFile $file, string $altText = null): string
    {
        $desiredName = $altText ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $cleanName = Str::slug($desiredName);
        $filename = 'shopify-temp/' . $cleanName . '.' . $file->getClientOriginalExtension();

        try {
            $path = Storage::disk('s3')->put(
                $filename,
                file_get_contents($file->getRealPath()),
                [
                    'visibility' => 'public',
                    'ACL' => 'public-read'
                ]
            );

            if (!$path) {
                throw new Exception('S3 upload returned false');
            }

            Log::info("File uploaded to S3", ['path' => $filename]);
            return $filename;

        } catch (Exception $e) {
            Log::error("S3 upload failed", [
                'filename' => $filename,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to upload file to S3: ' . $e->getMessage());
        }
    }

    /**
     * Verify S3 file is accessible before sending to Shopify
     */
    private function verifyS3FileAccessible(string $s3Url): void
    {
        $maxAttempts = 5;
        $attempt = 0;

        while ($attempt < $maxAttempts) {
            try {
                $response = Http::timeout(10)->get($s3Url);

                if ($response->successful()) {
                    Log::info("S3 file verified accessible", ['url' => $s3Url, 'attempt' => $attempt + 1]);
                    return;
                }
            } catch (Exception $e) {
                Log::warning("S3 file verification attempt failed", [
                    'url' => $s3Url,
                    'attempt' => $attempt + 1,
                    'error' => $e->getMessage()
                ]);
            }

            $attempt++;
            if ($attempt < $maxAttempts) {
                sleep(2); // Wait 2 seconds before retry
            }
        }

        throw new Exception("S3 file not accessible after {$maxAttempts} attempts");
    }

    /**
     * Schedule S3 cleanup with delay
     */
    private function scheduleS3Cleanup(string $s3Path): void
    {
        // Log for now - you can implement actual delayed cleanup later
        Log::info("S3 file scheduled for cleanup (delayed to allow Shopify processing)", ['path' => $s3Path]);

        // For immediate implementation, you could use a simple approach:
        // Don't clean up immediately - let it stay for manual cleanup or cron job
    }

    /**
     * Clean up S3 file
     */
    private function cleanupS3File(string $path): void
    {
        try {
            if (Storage::disk('s3')->exists($path)) {
                Storage::disk('s3')->delete($path);
                Log::info("Cleaned up S3 file", ['path' => $path]);
            }
        } catch (Exception $e) {
            Log::warning("Could not clean up S3 file", [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Get product images from Shopify by product ID
     */
    public function getProductImages(string $productId): array
    {
        if (empty($this->shopDomain) || empty($this->accessToken)) {
            Log::error('Shopify domain or access token is not configured.');
            return [];
        }

        try {
            $query = '
                query($id: ID!) {
                    product(id: $id) {
                        media(first: 20) {
                            nodes {
                                id
                                alt
                                status
                                mediaContentType
                                ... on MediaImage {
                                    image {
                                        url
                                        width
                                        height
                                    }
                                }
                            }
                        }
                    }
                }
            ';

            $variables = [
                'id' => "gid://shopify/Product/{$productId}"
            ];

            Log::info("Fetching Shopify images for product", [
                'product_id' => $productId
            ]);

            $response = Http::timeout(30)->withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->post("https://{$this->shopDomain}/admin/api/2025-04/graphql.json", [
                'query' => $query,
                'variables' => $variables
            ]);

            if (!$response->successful()) {
                Log::error('Shopify API request failed', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                    'product_id' => $productId
                ]);
                return [];
            }

            $responseBody = $response->json();

            if (isset($responseBody['errors'])) {
                Log::error('GraphQL errors when fetching images', [
                    'errors' => $responseBody['errors'],
                    'product_id' => $productId
                ]);
                return [];
            }

            $product = $responseBody['data']['product'] ?? null;
            if (!$product || !isset($product['media']['nodes'])) {
                Log::info('No product or media found', ['product_id' => $productId]);
                return [];
            }

            $images = [];
            foreach ($product['media']['nodes'] as $media) {
                // Only process image media
                if ($media['mediaContentType'] === 'IMAGE' && isset($media['image'])) {
                    $images[] = [
                        'id' => $this->extractMediaId($media['id'] ?? ''),
                        'alt' => $media['alt'] ?? null,
                        'status' => $media['status'] ?? null,
                        'image' => [
                            'url' => $media['image']['url'] ?? null,
                            'width' => $media['image']['width'] ?? null,
                            'height' => $media['image']['height'] ?? null,
                        ]
                    ];
                }
            }

            Log::info("Successfully fetched Shopify images", [
                'product_id' => $productId,
                'image_count' => count($images)
            ]);

            return $images;

        } catch (Exception $e) {
            Log::error('Exception when fetching Shopify images', [
                'product_id' => $productId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Delete image from Shopify product
     */
    public function deleteImage(string $productId, string $mediaId): bool
    {
        if (empty($this->shopDomain) || empty($this->accessToken)) {
            Log::error('Shopify domain or access token is not configured.');
            return false;
        }

        try {
            $query = '
            mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
                productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
                    deletedMediaIds
                    deletedProductImageIds
                    mediaUserErrors {
                        field
                        message
                        code
                    }
                }
            }
        ';

            $variables = [
                'productId' => "gid://shopify/Product/{$productId}",
                'mediaIds' => ["gid://shopify/MediaImage/{$mediaId}"]
            ];

            Log::info("Deleting Shopify image", [
                'product_id' => $productId,
                'media_id' => $mediaId
            ]);

            $response = Http::timeout(30)->withHeaders([
                'X-Shopify-Access-Token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->post("https://{$this->shopDomain}/admin/api/2025-04/graphql.json", [
                'query' => $query,
                'variables' => $variables
            ]);

            if (!$response->successful()) {
                Log::error('Shopify delete image API request failed', [
                    'status' => $response->status(),
                    'response' => $response->body()
                ]);
                return false;
            }

            $responseBody = $response->json();

            if (isset($responseBody['errors'])) {
                Log::error('GraphQL errors when deleting image', [
                    'errors' => $responseBody['errors']
                ]);
                return false;
            }

            $mediaUserErrors = $responseBody['data']['productDeleteMedia']['mediaUserErrors'] ?? [];
            if (!empty($mediaUserErrors)) {
                Log::error('Media user errors when deleting', [
                    'errors' => $mediaUserErrors
                ]);
                return false;
            }

            Log::info("Successfully deleted Shopify image", [
                'product_id' => $productId,
                'media_id' => $mediaId
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Exception when deleting Shopify image', [
                'product_id' => $productId,
                'media_id' => $mediaId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Extract Shopify product ID from GraphQL ID
     */
    private function extractShopifyId(string $graphqlId): ?string
    {
        // Shopify GraphQL IDs look like: gid://shopify/Product/1234567890
        if (preg_match('/\/Product\/(\d+)$/', $graphqlId, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Extract media ID from GraphQL ID
     */
    private function extractMediaId(string $graphqlId): ?string
    {
        // Shopify GraphQL Media IDs look like: gid://shopify/MediaImage/1234567890
        if (preg_match('/\/MediaImage\/(\d+)$/', $graphqlId, $matches)) {
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
        // Extract shop name from domain like "your-shop.myshopify.com"
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
                'inventory_quantity' => $variant['inventoryQuantory'] ?? 0,
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
