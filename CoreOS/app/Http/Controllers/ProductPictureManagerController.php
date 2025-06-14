<?php

namespace App\Http\Controllers;

use App\Services\ActivityLogger;
use App\Services\GoogleDriveService;
use App\Services\NetSuiteService;
use App\Services\ProductImageService;
use Exception;
use Illuminate\Http\Request;
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
                return response()->json(['folders' => []]);
            }

            $folders = $this->googleDriveService->searchFolders($query);
            return response()->json(['folders' => $folders]);

        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function fetchDriveImages(Request $request)
    {
        try {
            $folderId = $request->input('folderId');

            if (empty($folderId)) {
                return response()->json(['success' => false, 'error' => 'Empty folder ID']);
            }

            $images = $this->googleDriveService->fetchImages($folderId);
            return response()->json(['success' => true, 'images' => $images]);

        } catch (Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function searchNetSuite(Request $request)
    {
        try {
            $number = $request->input('query');
            $results = $this->netSuiteService->search($number);
            return response()->json($results);

        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
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

            return response()->json([
                'success' => true,
                'googleDriveFileId' => $googleDriveFileId,
                'shopifyImageId' => $shopifyImageId,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'error' => 'Failed to upload file',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteGoogleDriveImage(Request $request)
    {
        try {
            $fileId = $request->input('fileId');

            if (empty($fileId)) {
                return response()->json(['success' => false, 'error' => 'File ID is required'], 400);
            }

            $this->googleDriveService->deleteFile($fileId);

            return response()->json([
                'success' => true,
                'message' => 'File deleted successfully from Google Drive'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to delete file: '.$e->getMessage()
            ], 500);
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

            ActivityLogger::log(
                'Product Picture Manager',
                'Created Folder',
                auth()->user()->name.' created folder: '.$folderName
            );

            return response()->json([
                'success' => true,
                'folderId' => $folderId,
                'folderName' => $folderName
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function uploadProcessedImages(Request $request)
    {
        $request->validate([
            'images' => 'required|array',
            'images.*' => 'required|string', // Base64 encoded images
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

            // Process each image
            foreach ($images as $index => $imageData) {
                // Decode base64 image
                $data = explode(',', $imageData);
                $decoded = base64_decode($data[1]);

                // Create temporary file
                $tempPath = 'temp/cropped/'.uniqid().'.jpg';
                Storage::disk('public')->put($tempPath, $decoded);

                $view = $imageViews[$index] === 'custom'
                    ? $customTitles[$index]
                    : $imageViews[$index];

                // Upload to Google Drive (once per image)
                $fileName = "processed-{$view}-{$index}";
                $tempFile = Storage::disk('public')->path($tempPath);

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

                // Upload to each selected Shopify product
                foreach ($selectedItems as $item) {
                    $shopifyId = $item['custrecord_product_shopify_id'];
                    $itemName = str_replace(' ', '-', $item['name']);

                    $shopifyFileName = "{$itemName}-{$view}.jpg";
                    $shopifyFile = new \Illuminate\Http\UploadedFile(
                        $tempFile,
                        $shopifyFileName,
                        'image/jpeg',
                        null,
                        true
                    );

                    $this->productImageService->uploadImage($shopifyFile, $shopifyId);

                    // Update NetSuite image capture date
                    try {
                        $this->netSuiteService->updateImageCaptureDate($item['custrecord_product_parent_item']);
                    } catch (Exception $e) {
                        \Log::warning('Failed to update NetSuite image date', [
                            'item_id' => $item['custrecord_product_parent_item'],
                            'error' => $e->getMessage()
                        ]);
                    }
                }

                // Cleanup temp file
                Storage::disk('public')->delete($tempPath);
                $uploadedCount++;
            }

            ActivityLogger::log(
                'Product Picture Manager',
                'Uploaded Processed Images',
                auth()->user()->name." uploaded {$uploadedCount} processed images"
            );

            return response()->json([
                'success' => true,
                'message' => "Successfully uploaded {$uploadedCount} images"
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getShopifyImages(Request $request)
    {
        try {
            $shopifyId = $request->input('shopifyId');
            $images = $this->productImageService->getProductImages($shopifyId);

            return response()->json(['images' => $images]);

        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function deleteShopifyImage(Request $request)
    {
        try {
            $shopifyId = $request->input('shopifyId');
            $imageId = $request->input('imageId');

            $this->productImageService->deleteImage($shopifyId, $imageId);

            ActivityLogger::log(
                'Product Picture Manager',
                'Deleted Shopify Image',
                auth()->user()->name." deleted image ID: {$imageId} from product: {$shopifyId}"
            );

            return response()->json(['success' => true]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
