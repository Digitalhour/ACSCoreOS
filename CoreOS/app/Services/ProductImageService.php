<?php

namespace App\Services;

use Exception;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProductImageService
{
    protected $shopDomain;
    protected $accessToken;

    public function __construct()
    {
        $this->shopDomain = config('services.shopify.shop_domain');
        $this->accessToken = config('services.shopify.access_token');
    }

    public function uploadImage(UploadedFile $file, $productId)
    {
        $imageUrl = $this->uploadFileToTemporaryStorage($file);
        $altText = $file->getClientOriginalName();

        // GraphQL query for productCreateMedia mutation
        $query = <<<GQL
        mutation UploadProductImage(\$productId: ID!, \$media: [CreateMediaInput!]!) {
            productCreateMedia(productId: \$productId, media: \$media) {
                media {
                    id
                    alt
                    status
                    ... on MediaImage {
                        image {
                            url
                        }
                    }
                }
                mediaUserErrors {
                    field
                    message
                }
            }
        }
        GQL;

        // Variables for the GraphQL mutation
        $variables = [
            'productId' => "gid://shopify/Product/{$productId}",
            'media' => [
                [
                    'mediaContentType' => 'IMAGE',
                    'originalSource' => $imageUrl,
                    'alt' => $altText,
                ],
            ],
        ];

        // Send the GraphQL request
        $response = Http::withHeaders([
            'X-Shopify-Access-Token' => $this->accessToken,
            'Content-Type' => 'application/json',
        ])->post("https://{$this->shopDomain}/admin/api/2025-01/graphql.json", [
            'query' => $query,
            'variables' => $variables,
        ]);

        $responseBody = $response->json();

        // Handle errors
        if (isset($responseBody['errors']) || !empty($responseBody['data']['productCreateMedia']['mediaUserErrors'])) {
            Log::error('Failed to upload media to Shopify', ['response' => $responseBody]);
            throw new Exception('Error uploading media to Shopify.');
        }

        return $responseBody['data']['productCreateMedia']['media'];
    }

    /**
     * Upload the file to a temporary public storage (e.g., S3, CDN).
     * Replace this with the actual implementation.
     */
    private function uploadFileToTemporaryStorage(UploadedFile $file): string
    {
        // For example, store it in S3 or a public storage
        return asset('storage/'.$file->store('shopify_images', 'public'));
    }

    public function getProductImages($productId)
    {
        $query = <<<'GQL'
    query GetProductImages($productId: ID!) {
      product(id: $productId) {
        media(query: "media_type:IMAGE", sortKey: POSITION, first: 10) {
          nodes {
            id
            alt
            ...on MediaImage {
              createdAt
              image {
                width
                height
                url
              }
            }
          }
          pageInfo {
            startCursor
            endCursor
          }
        }
      }
    }
    GQL;

        $variables = [
            'productId' => "gid://shopify/Product/{$productId}"
        ];

        $response = Http::withHeaders([
            'X-Shopify-Access-Token' => $this->accessToken,
            'Content-Type' => 'application/json',
        ])->post("https://{$this->shopDomain}/admin/api/2025-01/graphql.json", [
            'query' => $query,
            'variables' => $variables
        ]);

        $responseBody = $response->json();

        if (isset($responseBody['errors'])) {
            Log::error('Failed to fetch product images from Shopify', ['response' => $responseBody]);
            throw new Exception('Error fetching product images from Shopify.');
        }

        return collect($responseBody['data']['product']['media']['nodes'])
            ->all();
    }

    public function deleteImage($productId, $imageId)
    {
        $query = <<<'GQL'
    mutation DeleteProductImage($productId: ID!, $mediaIds: [ID!]!) {
        productDeleteMedia(
            productId: $productId,
            mediaIds: $mediaIds
        ) {
            deletedMediaIds
            mediaUserErrors {
                field
                message
            }
        }
    }
    GQL;

        // Ensure the imageId is properly formatted as a Global ID
        $formattedImageId = str_starts_with($imageId, 'gid://shopify/MediaImage/')
            ? $imageId
            : "gid://shopify/MediaImage/{$imageId}";

        $variables = [
            'productId' => "gid://shopify/Product/{$productId}",
            'mediaIds' => [$formattedImageId]
        ];

        $response = Http::withHeaders([
            'X-Shopify-Access-Token' => $this->accessToken,
            'Content-Type' => 'application/json',
        ])->post("https://{$this->shopDomain}/admin/api/2025-01/graphql.json", [
            'query' => $query,
            'variables' => $variables
        ]);

        $responseBody = $response->json();

        // Check for errors
        if (isset($responseBody['errors']) ||
            (isset($responseBody['data']['productDeleteMedia']['mediaUserErrors'])
                && !empty($responseBody['data']['productDeleteMedia']['mediaUserErrors']))) {

            Log::error('Failed to delete media from Shopify', ['response' => $responseBody]);

            $errorMessages = collect($responseBody['data']['productDeleteMedia']['mediaUserErrors'] ?? [])
                ->pluck('message')
                ->implode(', ');

            throw new Exception("Error deleting media from Shopify: $errorMessages");
        }

        // Clear cache
        Cache::forget("shopify_images_{$productId}");

        // Return deleted media IDs
        return $responseBody['data']['productDeleteMedia']['deletedMediaIds'];
    }
}
