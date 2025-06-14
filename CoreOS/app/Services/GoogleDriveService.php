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
        $this->client->setClientId(config('services.google.client_id'));
        $this->client->setClientSecret(config('services.google.client_secret'));
        $this->client->setRedirectUri(config('services.google.redirect'));
        $this->client->setAccessType('offline');
        $this->client->setPrompt('consent');
        $this->client->setIncludeGrantedScopes(true);
        $this->client->addScope(Drive::DRIVE);

        $user = Auth::user();
        if ($user && $user->google_refresh_token) {
            try {
                $this->client->fetchAccessTokenWithRefreshToken($user->google_refresh_token);
                $accessToken = $this->client->getAccessToken();

                if (!isset($accessToken['access_token'])) {
                    throw new Exception('Failed to refresh Google access token');
                }

                // Update user token in database
                $user->google_token = $accessToken['access_token'];
                $user->save();

                $this->driveService = new Drive($this->client);

            } catch (Exception $e) {
                Log::error('Google Drive client initialization failed', [
                    'error' => $e->getMessage(),
                    'user_id' => $user->id
                ]);
                throw new Exception('Google authentication failed: '.$e->getMessage());
            }
        } else {
            // If user exists but refresh token is null, we need to redirect to Google auth
            if ($user) {
                Log::info('Google refresh token is null, redirecting to Google auth', [
                    'user_id' => $user->id
                ]);

                // We can't directly return a redirect from a service class,
                // so we throw a specific exception that can be caught by the calling code
                throw new Exception('REDIRECT_TO_GOOGLE_AUTH');
            } else {
                throw new Exception('Google authentication required');
            }
        }
    }

    public function searchFolders($query)
    {
        $this->clearTemporaryImages();

        $cacheKey = "folders_{$query}_".Auth::id();

        return Cache::remember($cacheKey, now()->addMinutes(5), function () use ($query) {
            try {
                $optParams = [
                    'q' => "mimeType='application/vnd.google-apps.folder' and name contains '{$query}' and trashed=false",
                    'includeItemsFromAllDrives' => true,
                    'corpora' => 'drive',
                    'supportsAllDrives' => true,
                    'driveId' => $this->sharedDriveId,
                    'fields' => 'files(id, name)'
                ];

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
                throw new Exception('Failed to search folders: '.$e->getMessage());
            }
        });
    }

    protected function clearTemporaryImages()
    {
        try {
            $tempPath = 'google_temp/'.Auth::id();
            if (Storage::disk('public')->exists($tempPath)) {
                Storage::disk('public')->deleteDirectory($tempPath);
            }
        } catch (Exception $e) {
            Log::warning('Failed to clear temporary images', ['error' => $e->getMessage()]);
        }
    }

    public function fetchImages($folderId)
    {
        $cacheKey = "drive_images_{$folderId}_".Auth::id();

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
                throw new Exception('Failed to fetch images: '.$e->getMessage());
            }
        });
    }

    protected function findSubfolder($parentFolderId, $folderName)
    {
        try {
            $results = $this->driveService->files->listFiles([
                'q' => "name = '{$folderName}' and mimeType = 'application/vnd.google-apps.folder' and '{$parentFolderId}' in parents and trashed = false",
                'spaces' => 'drive',
                'supportsAllDrives' => true,
                'includeItemsFromAllDrives' => true,
            ]);

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
            $imageResults = $this->driveService->files->listFiles([
                'q' => $imageQuery,
                'fields' => 'files(id, name, mimeType, parents)',
                'supportsAllDrives' => true,
                'includeItemsFromAllDrives' => true,
            ]);

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
            // Create unique filename to avoid conflicts
            $uniqueFilename = uniqid().'_'.$filename;
            $path = 'google_temp/'.Auth::id().'/'.$uniqueFilename;

            // Ensure the directory exists
            Storage::disk('public')->makeDirectory('google_temp/'.Auth::id());

            // Store the file
            Storage::disk('public')->put($path, $content);

            return 'storage/'.$path;  // Return path with 'storage/' prefix
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

            $fileName = $productNumber.'_'.($isCropped ? 'processed_' : 'original_').$file->getClientOriginalName();

            $fileMetadata = new Drive\DriveFile([
                'name' => $fileName,
                'parents' => [$targetFolderId]
            ]);

            $content = file_get_contents($file->getRealPath());
            $uploadedFile = $this->driveService->files->create($fileMetadata, [
                'data' => $content,
                'mimeType' => $file->getMimeType(),
                'uploadType' => 'media',
                'fields' => 'id',
                'supportsAllDrives' => true,
            ]);

            // Clear cache for both parent and target folders
            Cache::forget("drive_images_{$folderId}_".Auth::id());
            Cache::forget("drive_images_{$targetFolderId}_".Auth::id());

            ActivityLogger::log(
                'Product Picture Manager',
                'Uploaded to Google Drive',
                auth()->user()->name.' uploaded file: '.$fileName.' to folder ID: '.$targetFolderId
            );

            return $uploadedFile->getId();

        } catch (Exception $e) {
            Log::error('Google Drive upload failed', [
                'folder_id' => $folderId,
                'product_number' => $productNumber,
                'is_cropped' => $isCropped,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to upload to Google Drive: '.$e->getMessage());
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
                'supportsAllDrives' => true,
                'fields' => 'id',
            ];

            $folder = $this->driveService->files->create($fileMetadata, $options);

            ActivityLogger::log(
                'Product Picture Manager',
                'Created Folder',
                auth()->user()->name.' created folder: '.$name.' (ID: '.$folder->getId().')'
            );

            return $folder->getId();

        } catch (Exception $e) {
            Log::error('Google Drive folder creation failed', [
                'name' => $name,
                'parent_id' => $parentId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to create folder: '.$e->getMessage());
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
            $this->driveService->files->delete($fileId, [
                'supportsAllDrives' => true
            ]);

            ActivityLogger::log(
                'Product Picture Manager',
                'Deleted from Google Drive',
                auth()->user()->name.' deleted file: '.($fileInfo ?? $fileId)
            );

            // Clear relevant caches
            $this->clearImageCaches();

            return true;

        } catch (Exception $e) {
            Log::error('Google Drive delete error', [
                'fileId' => $fileId,
                'error' => $e->getMessage()
            ]);

            throw new Exception('Failed to delete file from Google Drive: '.$e->getMessage());
        }
    }

    protected function clearImageCaches()
    {
        try {
            $userId = Auth::id();
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
            $this->driveService->files->update($fileId, new Drive\DriveFile(), [
                'addParents' => $processedFolderId,
                'removeParents' => $previousParents,
                'supportsAllDrives' => true,
                'fields' => 'id,parents'
            ]);

            ActivityLogger::log(
                'Product Picture Manager',
                'Moved to Processed',
                auth()->user()->name.' moved file '.$file->getName().' to processed folder'
            );

            // Clear cache
            Cache::forget("drive_images_{$parentFolderId}_".Auth::id());
            Cache::forget("drive_images_{$processedFolderId}_".Auth::id());

            return true;

        } catch (Exception $e) {
            Log::error('Failed to move file to processed', [
                'file_id' => $fileId,
                'parent_folder_id' => $parentFolderId,
                'error' => $e->getMessage()
            ]);
            throw new Exception('Failed to move file to processed folder: '.$e->getMessage());
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
