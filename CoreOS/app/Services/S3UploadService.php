<?php

namespace App\Services;

use Exception;
use Illuminate\Http\File as IlluminateFile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

// Alias to avoid conflict with global File facade

class S3UploadService
{
    /**
     * Uploads a file (UploadedFile instance) to S3.
     * This method is suitable for direct uploads from a controller.
     *
     * @param  UploadedFile  $file  The file to upload.
     * @param  string  $s3Directory  The desired directory path in S3 (e.g., "folder/subfolder").
     * @param  string|null  $fileNameToStoreAs  The name to store the file as in S3 (optional, uses original if null).
     * @return string The full S3 path of the uploaded file.
     * @throws \Exception If upload fails.
     */
    public function uploadFile(UploadedFile $file, string $s3Directory, ?string $fileNameToStoreAs = null): string
    {
        $actualFileNameToStoreAs = $fileNameToStoreAs ?: $file->getClientOriginalName();
        Log::debug("[S3UploadService] uploadFile (UploadedFile) called for original: ".$file->getClientOriginalName()." to S3 directory: ".$s3Directory." as ".$actualFileNameToStoreAs);

        // Use getPathname() as the file might have been moved by the request handling before this service is called,
        // or getRealPath() if it's guaranteed to be in its original temp location. getPathname() is generally safer.
        return $this->uploadFileFromPath($file->getPathname(), $s3Directory, $actualFileNameToStoreAs);
    }

    /**
     * Uploads a file from a given server path to S3.
     * This is the method your Job (ProcessUploadedImageJob, ProcessUploadedPdfJob) should call.
     *
     * @param  string  $localFilePath  The absolute path to the file on the server.
     * @param  string  $s3Directory  The desired directory path in S3 (e.g., "folder/subfolder").
     * @param  string  $fileNameToStoreAs  The name to store the file as in S3.
     * @return string The full S3 path of the uploaded file.
     * @throws \Exception If upload fails.
     */
    public function uploadFileFromPath(string $localFilePath, string $s3Directory, string $fileNameToStoreAs): string
    {
        Log::debug("[S3UploadService] uploadFileFromPath called for local path: ".$localFilePath." to S3 directory: ".$s3Directory." as ".$fileNameToStoreAs);

        if (!file_exists($localFilePath) || !is_readable($localFilePath)) {
            Log::error("[S3UploadService] File not found or not readable at local path: ".$localFilePath);
            throw new Exception("Local file not found or not readable for S3 upload: ".$localFilePath);
        }

        try {
            // Ensure $s3Directory doesn't have leading/trailing slashes that might cause issues
            $cleanS3Directory = trim($s3Directory, '/');

            // Using putFileAs with an Illuminate\Http\File object
            // This is generally robust for uploading from a local path.
            $uploadedPath = Storage::disk('s3')->putFileAs(
                $cleanS3Directory,
                new IlluminateFile($localFilePath), // Wrap the path in a File object
                $fileNameToStoreAs,
                'public' // Set visibility to public
            );

            if (!$uploadedPath) {
                // Construct the expected full path for the error message, as $uploadedPath would be false
                $expectedS3Path = $cleanS3Directory.'/'.$fileNameToStoreAs;
                Log::error("[S3UploadService] S3 putFileAs returned false or an empty path for expected S3 path: {$expectedS3Path}");
                throw new Exception("S3 putFileAs returned false or an empty path for S3 path: {$expectedS3Path}");
            }

            Log::info("[S3UploadService] Successfully uploaded {$fileNameToStoreAs} to S3 at {$uploadedPath}");

            // Return the path. If you need the full URL, use Storage::disk('s3')->url($uploadedPath);
            return $uploadedPath;

        } catch (Exception $e) {
            // Construct the attempted full S3 URI for better logging
            $attemptedS3Bucket = config('filesystems.disks.s3.bucket');
            $attemptedS3Path = "s3://{$attemptedS3Bucket}/".trim($s3Directory, '/')."/{$fileNameToStoreAs}";

            Log::error(
                "[S3UploadService] Exception during S3 upload for {$fileNameToStoreAs} to {$attemptedS3Path}: ".$e->getMessage(),
                ['exception' => $e->getTraceAsString()] // Log stack trace for more details
            );
            // Re-throw the exception to be handled by the caller (e.g., the Job)
            throw new Exception("S3 upload failed for file {$fileNameToStoreAs}. Attempted S3 path: {$attemptedS3Path}. Details: ".$e->getMessage(),
                0, $e);
        }
    }
}
