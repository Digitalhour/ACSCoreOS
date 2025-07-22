<?php

namespace App\Http\Controllers;


use App\Services\GoogleDriveService;
use App\Services\NetSuiteService;
use App\Services\ProductImageService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;


class ProductPictureManagerController extends Controller
{
    public function __construct(
        protected GoogleDriveService $googleDriveService,
        protected NetSuiteService $netSuiteService,
        protected ProductImageService $productImageService
    ) {
    }

    public function index(): Response
    {
        return Inertia::render('productpicturemanager');
    }

    public function searchFolders(Request $request)
    {
        try {
            $query = $request->input('query');

            if (empty($query)) {
                return Inertia::render('productpicturemanager', [
                    'folders' => []
                ]);
            }

            $folders = $this->googleDriveService->searchFolders($query);

            return Inertia::render('productpicturemanager', [
                'folders' => $folders
            ]);

        } catch (Exception $e) {
            return Inertia::render('productpicturemanager', [
                'folders' => [],
                'error' => $e->getMessage()
            ]);
        }
    }

    public function fetchDriveImages(Request $request)
    {
        try {
            $folderId = $request->input('folderId');

            if (empty($folderId)) {
                return Inertia::render('productpicturemanager', [
                    'success' => false,
                    'error' => 'Empty folder ID'
                ]);
            }

            $images = $this->googleDriveService->fetchImages($folderId);

            return Inertia::render('productpicturemanager', [
                'success' => true,
                'images' => $images
            ]);

        } catch (Exception $e) {
            return Inertia::render('productpicturemanager', [
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
    }

    public function searchNetSuite(Request $request)
    {
        try {
            $number = $request->input('query');
            $results = $this->netSuiteService->search($number);

            return Inertia::render('productpicturemanager', $results);

        } catch (Exception $e) {
            return Inertia::render('productpicturemanager', [
                'error' => $e->getMessage()
            ]);
        }
    }
    public function uploadProcessedImages(Request $request)
    {
        $request->validate([
            'images' => 'required|array',
            'images.*' => 'required|string',
            'folderId' => 'required|string',
            'selectedItems' => 'required|array',
            'imageViews' => 'required|array',
            'customTitles' => 'array',
            'storeOriginal' => 'boolean',
        ]);

        try {
            $images = $request->input('images');
            $folderId = $request->input('folderId');
            $selectedItems = $request->input('selectedItems');
            $imageViews = $request->input('imageViews');
            $customTitles = $request->input('customTitles', []);
            $storeOriginal = $request->input('storeOriginal', false);

            $uploadedCount = 0;
            $shopifyErrors = [];

            foreach ($images as $index => $imageData) {
                try {
                    // Decode base64 image
                    $data = explode(',', $imageData);
                    $decoded = base64_decode($data[1]);

                    // Create temporary file for S3 upload
                    $tempPath = 'temp/s3_upload_' . uniqid() . '.jpg';
                    Storage::disk('local')->put($tempPath, $decoded);

                    $view = $imageViews[$index] === 'custom'
                        ? $customTitles[$index]
                        : $imageViews[$index];

                    // Upload to Google Drive
                    try {
                        $fileName = "processed-{$view}-{$index}";
                        $tempFile = Storage::disk('local')->path($tempPath);

                        $uploadedFile = new \Illuminate\Http\UploadedFile(
                            $tempFile,
                            "{$fileName}.jpg",
                            'image/jpeg',
                            null,
                            true
                        );

                        $this->googleDriveService->uploadFile(
                            $uploadedFile,
                            $folderId,
                            $fileName,
                            true
                        );
                    } catch (Exception $e) {
                        Log::error("Google Drive upload failed", [
                            'index' => $index,
                            'error' => $e->getMessage()
                        ]);
                    }

                    // Upload to each selected Shopify product via S3
                    foreach ($selectedItems as $item) {
                        try {
                            $shopifyId = $item['custrecord_product_shopify_id'];
                            $itemName = str_replace([' ', '/'], '-', $item['name']);

                            $shopifyFileName = "{$itemName}-{$view}.jpg";
                            $shopifyFile = new \Illuminate\Http\UploadedFile(
                                Storage::disk('local')->path($tempPath),
                                $shopifyFileName,
                                'image/jpeg',
                                null,
                                true
                            );

                            // This now uses S3 internally
                            $this->productImageService->uploadImage($shopifyFile, $shopifyId);

                            // Update NetSuite image capture date
                            try {
                                $this->netSuiteService->updateImageCaptureDate($item['custrecord_product_parent_item']);
                            } catch (Exception $e) {
                                Log::warning('Failed to update NetSuite image date', [
                                    'item_id' => $item['custrecord_product_parent_item'],
                                    'error' => $e->getMessage()
                                ]);
                            }

                        } catch (Exception $e) {
                            $shopifyErrors[] = "Shopify upload failed for image {$index}, item '{$item['name']}': " . $e->getMessage();
                        }
                    }

                    // Cleanup local temp file
                    Storage::disk('local')->delete($tempPath);
                    $uploadedCount++;

                } catch (Exception $e) {
                    Log::error("Failed to process image", [
                        'index' => $index,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            $response = [
                'success' => true,
                'message' => "Processed {$uploadedCount} images",
                'uploaded_count' => $uploadedCount,
            ];

            if (!empty($shopifyErrors)) {
                $response['shopify_errors'] = $shopifyErrors;
                $response['message'] .= ". Some Shopify uploads failed.";
            }

            return response()->json($response);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Upload process failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function uploadImages(Request $request)
    {
        $request->validate([
            'file' => 'required|image|max:10240',
            'folderId' => 'required|string',
            'productNumber' => 'required|string',
            'shopifyId' => 'required|string',
        ]);

        try {
            $file = $request->file('file');
            $folderId = $request->input('folderId');
            $productNumber = $request->input('productNumber');
            $shopifyId = $request->input('shopifyId');

            // Upload to Google Drive
            $googleDriveFileId = $this->googleDriveService->uploadFile(
                $file,
                $folderId,
                $productNumber,
                false
            );

            // Upload to Shopify
            $shopifyImageId = null;
            try {
                $shopifyImageId = $this->productImageService->uploadImage($file, $shopifyId);
            } catch (Exception $e) {
                \Log::error('Shopify upload failed', ['error' => $e->getMessage()]);
            }

            return Inertia::render('productpicturemanager', [
                'success' => true,
                'googleDriveFileId' => $googleDriveFileId,
                'shopifyImageId' => $shopifyImageId,
            ]);

        } catch (Exception $e) {
            return Inertia::render('productpicturemanager', [
                'success' => false,
                'error' => 'Failed to upload file',
                'message' => $e->getMessage()
            ]);
        }
    }

    public function deleteGoogleDriveImage(Request $request)
    {
        try {
            $fileId = $request->input('fileId');

            if (empty($fileId)) {
                return Inertia::render('productpicturemanager', [
                    'success' => false,
                    'error' => 'File ID is required'
                ]);
            }

            $this->googleDriveService->deleteFile($fileId);

            return Inertia::render('productpicturemanager', [
                'success' => true,
                'message' => 'File deleted successfully from Google Drive'
            ]);

        } catch (Exception $e) {
            return Inertia::render('productpicturemanager', [
                'success' => false,
                'error' => 'Failed to delete file: '.$e->getMessage()
            ]);
        }
    }

    public function createFolders(Request $request)
    {
        $request->validate([
            'netsuiteNumber' => 'required|string',
            'itemDetails' => 'required|array',
        ]);

        try {
            $netsuiteNumber = $request->input('netsuiteNumber');
            $itemDetails = $request->input('itemDetails');

            $folderName = "{$netsuiteNumber} - {$itemDetails['displayname']} - {$itemDetails['id']}";
            $folderId = $this->googleDriveService->createFolder($folderName);

            // Create subfolders
            $this->googleDriveService->createFolder('original', $folderId);
            $this->googleDriveService->createFolder('processed', $folderId);



            return Inertia::render('productpicturemanager', [
                'success' => true,
                'folderId' => $folderId,
                'folderName' => $folderName
            ]);

        } catch (Exception $e) {
            return Inertia::render('productpicturemanager', [
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
    }



    public function getShopifyImages(Request $request)
    {
        try {
            $shopifyId = $request->input('shopifyId');
            $images = $this->productImageService->getProductImages($shopifyId);

            return response()->json([
                'success' => true,
                'images' => $images
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteShopifyImage(Request $request)
    {
        try {
            // Extract data from nested structure
            $data = $request->input('data', []);
            $shopifyId = $data['shopifyId'] ?? null;
            $imageId = $data['imageId'] ?? null;

            if (!$shopifyId || !$imageId) {
                Log::error('Missing required parameters', [
                    'shopifyId' => $shopifyId,
                    'imageId' => $imageId,
                    'full_data' => $data
                ]);

                return Inertia::render('productpicturemanager', [
                    'success' => false,
                    'error' => 'Shopify ID and Image ID are required'
                ]);
            }

            Log::info('Attempting to delete image', [
                'shopifyId' => $shopifyId,
                'imageId' => $imageId
            ]);

            $deleted = $this->productImageService->deleteImage($shopifyId, $imageId);

            Log::info('Delete result', ['deleted' => $deleted]);

            return Inertia::render('productpicturemanager', [
                'success' => $deleted,
                'message' => $deleted ? 'Image deleted successfully' : 'Failed to delete image'
            ]);

        } catch (Exception $e) {
            Log::error('Delete exception', ['error' => $e->getMessage()]);

            return Inertia::render('productpicturemanager', [
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
    }
}
