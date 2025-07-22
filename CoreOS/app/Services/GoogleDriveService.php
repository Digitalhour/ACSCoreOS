<?php

namespace App\Services;

use Exception;
use Google\Client as GoogleClient;
use Google\Service\Drive;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GoogleDriveService
{
    protected $client;
    protected $driveService;
    protected $sharedDriveId;

    public function __construct()
    {
        $this->initializeClient();
        $this->sharedDriveId = config('services.google.drive_id');
    }

    protected function initializeClient()
    {
        $this->client = new GoogleClient();

        try {
            // Use service account authentication
            $serviceAccountPath = config('services.google.service_account_path');

            if (!file_exists($serviceAccountPath)) {
                throw new Exception('Google service account file not found at: ' . $serviceAccountPath);
            }

            $this->client->setAuthConfig($serviceAccountPath);
            $this->client->addScope(Drive::DRIVE);
            $this->client->setSubject(null); // No impersonation needed

            $this->driveService = new Drive($this->client);

            Log::info('Google Drive service initialized with service account');

        } catch (Exception $e) {
            Log::error('Google Drive service account initialization failed', [
                'error' => $e->getMessage(),
                'service_account_path' => $serviceAccountPath ?? 'not set'
            ]);
            throw new Exception('Google Drive authentication failed: ' . $e->getMessage());
        }
    }

    public function searchFolders($query)
    {
        $this->clearTemporaryImages();

        $cacheKey = "folders_{$query}_" . (Auth::id() ?? 'guest');

        return Cache::remember($cacheKey, now()->addMinutes(5), function () use ($query) {
            try {
                $optParams = [
                    'q' => "mimeType='application/vnd.google-apps.folder' and name contains '{$query}' and trashed=false",
                    'fields' => 'files(id, name)'
                ];

                // Add shared drive parameters if configured
                if ($this->sharedDriveId) {
                    $optParams['includeItemsFromAllDrives'] = true;
                    $optParams['corpora'] = 'drive';
                    $optParams['supportsAllDrives'] = true;
                    $optParams['driveId'] = $this->sharedDriveId;
                }

                $results = $this->driveService->files->listFiles($optParams);

                return collect($results->getFiles())->map(fn($file) => [
                    'id' => $file->getId(),
                    'name' => $file->getName()
                ])->all();

            } catch (Exception $e) {
                Log::error('Google Drive folder search failed', [
                    'query' => $query,
                    'error' => $e->getMessage()
                ]);
                throw new Exception('Failed to search folders: ' . $e->getMessage());
            }
        });
    }

    protected function clearTemporaryImages()
    {
        try {
            $tempPath = 'google_temp/' . (Auth::id() ?? 'guest');
            if (Storage::disk('public')->exists($tempPath)) {
                Storage::disk('public')->deleteDirectory($tempPath);
            }
        } catch (Exception $e) {
            Log::warning('Failed to clear temporary images', ['error' => $e->getMessage()]);
        }
    }

    public function fetchImages($folderId)
    {
        $cacheKey = "drive_images_{$folderId}_" . (Auth::id() ?? 'guest');

        return Cache::remember($cacheKey, now()->addMinutes(5), function () use ($folderId) {
            try {
                // Get the original subfolder ID
                $originalFolderId = $this->findSubfolder($folderId, 'original');
                $processedFolderId = $this->findSubfolder($folderId, 'processed');

                // Fetch images from main folder
                $mainImages = $this->fetchImagesFromFolder($folderId, false);

                // Fetch images from original folder
                $originalImages = collect();
                if ($originalFolderId) {
                    $originalImages = $this->fetchImagesFromFolder($originalFolderId, true);
                }

                // Fetch images from processed folder
                $processedImages = collect();
                if ($processedFolderId) {
                    $processedImages = $this->fetchImagesFromFolder($processedFolderId, false);
                }

                return $mainImages->concat($originalImages)->concat($processedImages)->all();

            } catch (Exception $e) {
                Log::error('Google Drive image fetch failed', [
                    'folder_id' => $folderId,
                    'error' => $e->getMessage()
                ]);
                throw new Exception('Failed to fetch images: ' . $e->getMessage());
            }
        });
    }

    protected function findSubfolder($parentFolderId, $folderName)
    {
        try {
            $params = [
                'q' => "name = '{$folderName}' and mimeType = 'application/vnd.google-apps.folder' and '{$parentFolderId}' in parents and trashed = false",
                'spaces' => 'drive',
            ];

            if ($this->sharedDriveId) {
                $params['supportsAllDrives'] = true;
                $params['includeItemsFromAllDrives'] = true;
            }

            $results = $this->driveService->files->listFiles($params);

            if (count($results->getFiles()) > 0) {
                return $results->getFiles()[0]->getId();
            }

            return null;
        } catch (Exception $e) {
            Log::warning("Failed to find subfolder '{$folderName}'", ['error' => $e->getMessage()]);
            return null;
        }
    }

    protected function fetchImagesFromFolder($folderId, $isOriginal)
    {
        try {
            $imageQuery = "'{$folderId}' in parents and trashed = false and (mimeType contains 'image/')";

            $params = [
                'q' => $imageQuery,
                'fields' => 'files(id, name, mimeType, parents)',
            ];

            if ($this->sharedDriveId) {
                $params['supportsAllDrives'] = true;
                $params['includeItemsFromAllDrives'] = true;
            }

            $imageResults = $this->driveService->files->listFiles($params);

            return collect($imageResults->getFiles())->map(function ($file) use ($isOriginal) {
                try {
                    $content = $this->driveService->files->get($file->getId(), ['alt' => 'media']);
                    return [
                        'id' => $file->getId(),
                        'name' => $file->getName(),
                        'mimeType' => $file->getMimeType(),
                        'isOriginal' => $isOriginal,
                        'tempUrl' => $this->storeTemporaryFile($content->getBody()->getContents(), $file->getName())
                    ];
                } catch (Exception $e) {
                    Log::warning('Failed to download image', [
                        'file_id' => $file->getId(),
                        'error' => $e->getMessage()
                    ]);
                    return null;
                }
            })->filter();
        } catch (Exception $e) {
            Log::error('Failed to fetch images from folder', [
                'folder_id' => $folderId,
                'error' => $e->getMessage()
            ]);
            return collect();
        }
    }

    protected function storeTemporaryFile($content, $filename)
    {
        try {
            $uniqueFilename = uniqid() . '_' . $filename;
            $path = 'google_temp/' . (Auth::id() ?? 'guest') . '/' . $uniqueFilename;

            Storage::disk('public')->makeDirectory('google_temp/' . (Auth::id() ?? 'guest'));
            Storage::disk('public')->put($path, $content);

            // Return proper asset URL
            return asset('storage/' . $path);

        } catch (Exception $e) {
            Log::error('Failed to store temporary file', [
                'filename' => $filename,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to store temporary file');
        }
    }

    public function uploadFile(UploadedFile $file, $folderId, $productNumber, $isCropped = false)
    {
        try {
            // Get or create target folder based on file type
            $targetFolderId = $folderId;
            if (!$isCropped) {
                $targetFolderId = $this->getOrCreateOriginalFolder($folderId);
            } else {
                $targetFolderId = $this->getOrCreateProcessedFolder($folderId);
            }

            $fileName = $productNumber . '_' . ($isCropped ? 'processed_' : 'original_') . $file->getClientOriginalName();

            $fileMetadata = new Drive\DriveFile([
                'name' => $fileName,
                'parents' => [$targetFolderId]
            ]);

            $content = file_get_contents($file->getRealPath());

            $uploadParams = [
                'data' => $content,
                'mimeType' => $file->getMimeType(),
                'uploadType' => 'media',
                'fields' => 'id',
            ];

            if ($this->sharedDriveId) {
                $uploadParams['supportsAllDrives'] = true;
            }

            $uploadedFile = $this->driveService->files->create($fileMetadata, $uploadParams);

            // Clear cache for both parent and target folders
            Cache::forget("drive_images_{$folderId}_" . (Auth::id() ?? 'guest'));
            Cache::forget("drive_images_{$targetFolderId}_" . (Auth::id() ?? 'guest'));



            return $uploadedFile->getId();

        } catch (Exception $e) {
            Log::error('Google Drive upload failed', [
                'folder_id' => $folderId,
                'product_number' => $productNumber,
                'is_cropped' => $isCropped,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to upload to Google Drive: ' . $e->getMessage());
        }
    }

    protected function getOrCreateOriginalFolder($parentFolderId)
    {
        $originalFolderId = $this->findSubfolder($parentFolderId, 'original');

        if ($originalFolderId) {
            return $originalFolderId;
        }

        // Create new 'original' folder if it doesn't exist
        return $this->createFolder('original', $parentFolderId);
    }

    protected function getOrCreateProcessedFolder($parentFolderId)
    {
        $processedFolderId = $this->findSubfolder($parentFolderId, 'processed');

        if ($processedFolderId) {
            return $processedFolderId;
        }

        // Create new 'processed' folder if it doesn't exist
        return $this->createFolder('processed', $parentFolderId);
    }

    public function createFolder($name, $parentId = null)
    {
        try {
            $fileMetadata = new Drive\DriveFile([
                'name' => $name,
                'mimeType' => 'application/vnd.google-apps.folder',
                'parents' => $parentId ? [$parentId] : [$this->sharedDriveId]
            ]);

            $options = [
                'fields' => 'id',
            ];

            if ($this->sharedDriveId) {
                $options['supportsAllDrives'] = true;
            }

            $folder = $this->driveService->files->create($fileMetadata, $options);



            return $folder->getId();

        } catch (Exception $e) {
            Log::error('Google Drive folder creation failed', [
                'name' => $name,
                'parent_id' => $parentId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to create folder: ' . $e->getMessage());
        }
    }

    public function deleteFile($fileId)
    {
        try {
            if (!$this->driveService) {
                throw new Exception('Drive service not initialized');
            }

            // Get file info before deletion for logging
            $fileInfo = null;
            try {
                $file = $this->driveService->files->get($fileId, ['fields' => 'name']);
                $fileInfo = $file->getName();
            } catch (Exception $e) {
                Log::warning('Could not retrieve file info before deletion', ['file_id' => $fileId]);
            }

            // Delete the file
            $deleteParams = [];
            if ($this->sharedDriveId) {
                $deleteParams['supportsAllDrives'] = true;
            }

            $this->driveService->files->delete($fileId, $deleteParams);



            // Clear relevant caches
            $this->clearImageCaches();

            return true;

        } catch (Exception $e) {
            Log::error('Google Drive delete error', [
                'fileId' => $fileId,
                'error' => $e->getMessage()
            ]);

            throw new Exception('Failed to delete file from Google Drive: ' . $e->getMessage());
        }
    }

    protected function clearImageCaches()
    {
        try {
            $userId = Auth::id() ?? 'guest';
            $cacheKeys = Cache::getRedis()->keys("*drive_images_*_{$userId}");
            foreach ($cacheKeys as $key) {
                Cache::forget($key);
            }
        } catch (Exception $e) {
            Log::warning('Failed to clear image caches', ['error' => $e->getMessage()]);
        }
    }

    public function moveFileToProcessed($fileId, $parentFolderId)
    {
        try {
            $processedFolderId = $this->getOrCreateProcessedFolder($parentFolderId);

            // Get current file info
            $file = $this->driveService->files->get($fileId, ['fields' => 'parents,name']);
            $previousParents = join(',', $file->getParents());

            // Move file to processed folder
            $updateParams = [
                'addParents' => $processedFolderId,
                'removeParents' => $previousParents,
                'fields' => 'id,parents'
            ];

            if ($this->sharedDriveId) {
                $updateParams['supportsAllDrives'] = true;
            }

            $this->driveService->files->update($fileId, new Drive\DriveFile(), $updateParams);



            // Clear cache
            Cache::forget("drive_images_{$parentFolderId}_" . (Auth::id() ?? 'guest'));
            Cache::forget("drive_images_{$processedFolderId}_" . (Auth::id() ?? 'guest'));

            return true;

        } catch (Exception $e) {
            Log::error('Failed to move file to processed', [
                'file_id' => $fileId,
                'parent_folder_id' => $parentFolderId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to move file to processed folder: ' . $e->getMessage());
        }
    }

    public function getFileUrl($fileId)
    {
        try {
            return "https://drive.google.com/file/d/{$fileId}/view";
        } catch (Exception $e) {
            Log::error('Failed to generate file URL', [
                'file_id' => $fileId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    public function getFolderUrl($folderId)
    {
        try {
            return "https://drive.google.com/drive/folders/{$folderId}";
        } catch (Exception $e) {
            Log::error('Failed to generate folder URL', [
                'folder_id' => $folderId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
}
