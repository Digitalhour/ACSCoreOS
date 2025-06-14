<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessCsvImportJob;
use App\Jobs\ProcessUploadedImageJob;
use App\Jobs\ProcessUploadedPdfJob;
use App\Services\CsvProcessingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;
use ZipArchive;

class CsvProcessController extends Controller
{
    public function getCsvHeaders(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'csv_file' => 'required|file|mimes:csv,txt|max:5120', // Max 5MB for header check
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            /** @var CsvProcessingService $csvService */
            $csvService = app(CsvProcessingService::class);
            $file = $request->file('csv_file');
            $headers = $csvService->getCsvHeadersFromFile($file);
            return response()->json(['headers' => $headers]);
        } catch (Throwable $e) {
            Log::error('Error getting CSV headers: '.$e->getMessage());
            return response()->json(['error' => 'Could not read CSV headers.', 'details' => $e->getMessage()], 500);
        }
    }

    public function uploadAndProcessCsv(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'csv_file' => 'required|file|mimes:csv,txt|max:20480', // Max 20MB for CSV
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:5120', // Max 5MB per image
        ]);

        if ($validator->fails()) {
            Log::error('Validation failed for CSV upload.', $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $csvFile = $request->file('csv_file');
        $originalCsvFilename = $csvFile->getClientOriginalName();
        $csvNameForS3Folder = $this->deriveS3FolderNameFromCsv($originalCsvFilename);
        Log::info("[CsvProcessController] Original CSV Filename: {$originalCsvFilename}, Derived S3 Folder Name for images: {$csvNameForS3Folder}");

        /** @var UploadedFile[] $uploadedImageFiles */
        $uploadedImageFiles = $request->file('images', []);
        $imagesQueuedCount = 0;
        $processingLogs = ["[INFO] Received request for CSV: {$originalCsvFilename}"];

        try {
            $temporaryCsvPath = $this->storeTemporaryFile($csvFile, 'temp_csvs');
            $processingLogs[] = "[INFO] CSV file '{$originalCsvFilename}' saved temporarily at '{$temporaryCsvPath}'.";

            ProcessCsvImportJob::dispatch($temporaryCsvPath, $originalCsvFilename, null);
            $processingLogs[] = "[INFO] CSV processing job for '{$originalCsvFilename}' dispatched to queue (ID generation mode).";

            if (!empty($uploadedImageFiles)) {
                $processingLogs[] = "[INFO] Queuing ".count($uploadedImageFiles)." images for background processing...";
                $s3ImageDirectory = "parts_images/{$csvNameForS3Folder}";

                foreach ($uploadedImageFiles as $imageFile) {
                    try {
                        $originalImageFileName = $imageFile->getClientOriginalName();
                        $temporaryImagePath = $this->storeTemporaryFile($imageFile, 'temp_images');

                        ProcessUploadedImageJob::dispatch(
                            $temporaryImagePath,
                            $originalImageFileName,
                            $s3ImageDirectory
                        );
                        $imagesQueuedCount++;
                        $processingLogs[] = "[INFO] Queued {$originalImageFileName} for S3 upload to directory '{$s3ImageDirectory}'. Temp file: {$temporaryImagePath}";
                    } catch (Throwable $e) {
                        Log::error("Error queuing image {$imageFile->getClientOriginalName()}: ".$e->getMessage());
                        $processingLogs[] = "[ERROR] Error queuing {$imageFile->getClientOriginalName()}: ".$e->getMessage();
                    }
                }
                $processingLogs[] = "[INFO] Image queuing process completed. {$imagesQueuedCount} images dispatched to queue.";
            } else {
                $processingLogs[] = "[INFO] No images were provided with this CSV.";
            }

            return response()->json([
                'message' => 'CSV and image processing jobs have been dispatched. They will be processed in the background.',
                'logs' => $processingLogs,
                'images_queued_count' => $imagesQueuedCount,
            ]);

        } catch (Throwable $e) {
            Log::critical('Critical error dispatching CSV/image processing jobs: '.$e->getMessage(),
                ['exception' => $e]);
            $processingLogs[] = "[CRITICAL] Critical error during job dispatch: ".$e->getMessage();
            return response()->json([
                'error' => 'An unexpected error occurred while preparing data for background processing.',
                'logs' => $processingLogs,
                'details' => App::environment('local') ? $e->getMessage() : 'Error details hidden.'
            ], 500);
        }
    }

    /**
     * Handles uploading multiple ZIP bundles, extracting their contents, and dispatching jobs.
     */
    public function uploadAndProcessZipBundle(Request $request): JsonResponse
    {
        // Updated validation for multiple ZIP files
        $validator = Validator::make($request->all(), [
            'zip_bundles' => 'required|array|max:10', // Max 10 zip files per request, adjust as needed
            'zip_bundles.*' => 'file|mimes:zip|max:1002400',
            // Max 100MB per ZIP file (adjust as needed, e.g. 1002400 for 1GB)
        ]);

        if ($validator->fails()) {
            Log::error('Validation failed for ZIP bundle upload.', $validator->errors()->toArray());
            return response()->json(['errors' => $validator->errors()], 422);
        }

        /** @var UploadedFile[] $zipFiles */
        $zipFiles = $request->file('zip_bundles'); // Get array of files

        $overallProcessingLogs = [];
        $overallDatasetsProcessedCount = 0;
        $overallTotalImagesQueued = 0;
        $overallTotalPdfsQueued = 0;
        $overallQueuedPdfDetails = [];
        $totalZipFilesReceived = count($zipFiles);
        $processedZipFileNames = [];


        $tempZipStoragePath = storage_path('app/temp_zips');
        $tempExtractionBasePath = storage_path('app/temp_extractions');
        File::ensureDirectoryExists($tempZipStoragePath);
        File::ensureDirectoryExists($tempExtractionBasePath);

        $overallProcessingLogs[] = "[INFO] Received {$totalZipFilesReceived} ZIP bundle(s) for processing.";

        foreach ($zipFiles as $index => $zipFile) {
            if (!$zipFile instanceof UploadedFile || !$zipFile->isValid()) {
                $overallProcessingLogs[] = "[ERROR] Invalid or corrupted ZIP file at index {$index}. Skipping.";
                Log::warning("Invalid or corrupted ZIP file received at index {$index}.");
                continue;
            }

            $originalZipFilename = $zipFile->getClientOriginalName();
            $processingLogsForThisZip = ["[INFO] === Processing ZIP Bundle: {$originalZipFilename} ==="];
            $datasetsProcessedCountForThisZip = 0;
            $totalImagesQueuedForThisZip = 0;
            $totalPdfsQueuedForThisZip = 0;
            $queuedPdfDetailsForThisZip = [];

            $temporaryZipFileName = Str::uuid().'.zip';
            $temporaryZipPath = null;
            $extractionPath = null;

            try {
                $temporaryZipPath = $zipFile->move($tempZipStoragePath, $temporaryZipFileName)->getPathname();
                $processingLogsForThisZip[] = "[INFO] ZIP '{$originalZipFilename}' saved temporarily at '{$temporaryZipPath}'.";

                $extractionId = Str::uuid()->toString();
                $extractionPath = $tempExtractionBasePath.'/'.$extractionId;
                File::ensureDirectoryExists($extractionPath);

                $zipArchive = new ZipArchive;
                if ($zipArchive->open($temporaryZipPath) === true) {
                    $zipArchive->extractTo($extractionPath);
                    $zipArchive->close();
                    $processingLogsForThisZip[] = "[INFO] ZIP '{$originalZipFilename}' extracted to '{$extractionPath}'.";

                    $datasetFolders = File::directories($extractionPath);

                    if (empty($datasetFolders)) {
                        $processingLogsForThisZip[] = "[WARNING] No dataset folders found in '{$originalZipFilename}' at the root level.";
                    }

                    foreach ($datasetFolders as $datasetFolderPath) {
                        $datasetFolderNameInZip = basename($datasetFolderPath);
                        $processingLogsForThisZip[] = "[INFO] Processing dataset folder from '{$originalZipFilename}': {$datasetFolderNameInZip}";

                        $filesInDatasetFolder = File::files($datasetFolderPath);
                        $csvFileInFolder = null;
                        $imageFilesPathsInFolder = [];
                        $pdfFilesDataInFolder = [];
                        $originalCsvNameForThisDataset = '';

                        foreach ($filesInDatasetFolder as $fileInfo) {
                            $filePath = $fileInfo->getPathname();
                            $fileName = $fileInfo->getFilename();
                            $fileExtension = strtolower($fileInfo->getExtension());

                            if ($fileExtension === 'csv' && !$csvFileInFolder) {
                                $tempCsvForJobName = Str::uuid().'.csv';
                                $tempCsvForJobPath = storage_path('app/temp_csvs/'.$tempCsvForJobName);
                                File::ensureDirectoryExists(dirname($tempCsvForJobPath));
                                File::move($filePath, $tempCsvForJobPath);
                                $csvFileInFolder = $tempCsvForJobPath;
                                $originalCsvNameForThisDataset = $fileName;
                                $processingLogsForThisZip[] = "[INFO] Found CSV '{$originalCsvNameForThisDataset}' in '{$datasetFolderNameInZip}'. Moved to '{$tempCsvForJobPath}'.";
                            } elseif (in_array($fileExtension, ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'])) {
                                $tempImgForJobName = Str::uuid().'.'.$fileExtension;
                                $tempImgForJobPath = storage_path('app/temp_images/'.$tempImgForJobName);
                                File::ensureDirectoryExists(dirname($tempImgForJobPath));
                                File::move($filePath, $tempImgForJobPath);
                                $imageFilesPathsInFolder[] = [
                                    'path' => $tempImgForJobPath, 'originalName' => $fileName
                                ];
                                $processingLogsForThisZip[] = "[INFO] Found image '{$fileName}' in '{$datasetFolderNameInZip}'. Moved to '{$tempImgForJobPath}'.";
                            } elseif ($fileExtension === 'pdf') {
                                $tempPdfForJobName = Str::uuid().'.pdf';
                                $tempPdfDir = storage_path('app/temp_pdfs');
                                File::ensureDirectoryExists($tempPdfDir);
                                $tempPdfForJobPath = $tempPdfDir.'/'.$tempPdfForJobName;

                                // ✅ Check if move succeeds
                                if (File::move($filePath, $tempPdfForJobPath)) {
                                    $pdfFilesDataInFolder[] = [
                                        'path' => $tempPdfForJobPath, 'originalName' => $fileName
                                    ];
                                    $processingLogsForThisZip[] = "[INFO] Found PDF '{$fileName}' in '{$datasetFolderNameInZip}'. Moved to '{$tempPdfForJobPath}'.";
                                } else {
                                    $processingLogsForThisZip[] = "[ERROR] Failed to move PDF '{$fileName}' from '{$filePath}' to '{$tempPdfForJobPath}'.";
                                    Log::error("Failed to move PDF file: {$filePath} -> {$tempPdfForJobPath}");
                                }
                            }
                        }

                        if ($csvFileInFolder) {
                            ProcessCsvImportJob::dispatch($csvFileInFolder, $originalCsvNameForThisDataset, null);
                            $processingLogsForThisZip[] = "[INFO] CSV processing job for '{$originalCsvNameForThisDataset}' (from '{$datasetFolderNameInZip}') dispatched.";
                            $datasetsProcessedCountForThisZip++;

                            if (!empty($imageFilesPathsInFolder)) {
                                $s3ImageDirectory = "parts_images/{$datasetFolderNameInZip}";
                                $processingLogsForThisZip[] = "[INFO] Queuing ".count($imageFilesPathsInFolder)." images for '{$datasetFolderNameInZip}' to S3 directory '{$s3ImageDirectory}'.";
                                foreach ($imageFilesPathsInFolder as $imgData) {
                                    ProcessUploadedImageJob::dispatch($imgData['path'], $imgData['originalName'],
                                        $s3ImageDirectory);
                                    $totalImagesQueuedForThisZip++;
                                }
                            }
                            if (!empty($pdfFilesDataInFolder)) {
                                $processingLogsForThisZip[] = "[INFO] Queuing ".count($pdfFilesDataInFolder)." PDF(s) for '{$datasetFolderNameInZip}'.";
                                foreach ($pdfFilesDataInFolder as $pdfData) {
                                    $originalPdfName = $pdfData['originalName'];
                                    $pdfNameWithoutExtension = pathinfo($originalPdfName, PATHINFO_FILENAME);
                                    $s3PdfTargetDirectory = "service_manuals/{$pdfNameWithoutExtension}";
                                    ProcessUploadedPdfJob::dispatch($pdfData['path'], $originalPdfName,
                                        $s3PdfTargetDirectory);
                                    $totalPdfsQueuedForThisZip++;
                                    $s3FullPathForPdf = $s3PdfTargetDirectory.'/'.$originalPdfName;
                                    $queuedPdfDetailsForThisZip[] = [
                                        'original_filename' => $originalPdfName,
                                        'dataset_folder_in_zip' => $datasetFolderNameInZip,
                                        's3_target_path' => $s3FullPathForPdf,
                                    ];
                                }
                            }
                        } else {
                            $processingLogsForThisZip[] = "[WARNING] No CSV file found in dataset folder '{$datasetFolderNameInZip}'. Skipping this folder.";
                        }
                    }
                } else {
                    $processingLogsForThisZip[] = "[ERROR] Failed to open ZIP '{$originalZipFilename}'. Error code: ".$zipArchive->status;
                    throw new \Exception("Failed to open ZIP bundle: {$originalZipFilename}");
                }
                $processedZipFileNames[] = $originalZipFilename; // Add to list of successfully initiated ZIPs
            } catch (Throwable $e) {
                Log::critical("Critical error processing ZIP '{$originalZipFilename}': ".$e->getMessage(),
                    ['exception' => $e]);
                $processingLogsForThisZip[] = "[CRITICAL] Critical error during ZIP processing for '{$originalZipFilename}': ".$e->getMessage();
            } finally {
                if (File::isDirectory($extractionPath)) {
                    File::deleteDirectory($extractionPath);
                    $processingLogsForThisZip[] = "[INFO] Cleaned up temp extraction for '{$originalZipFilename}': {$extractionPath}";
                }
                if ($temporaryZipPath && File::exists($temporaryZipPath)) {
                    File::delete($temporaryZipPath);
                    $processingLogsForThisZip[] = "[INFO] Cleaned up temp ZIP '{$originalZipFilename}': {$temporaryZipPath}";
                }
                $processingLogsForThisZip[] = "[INFO] === Finished Processing ZIP Bundle: {$originalZipFilename} ===";

                // Aggregate results for this ZIP
                $overallProcessingLogs = array_merge($overallProcessingLogs, $processingLogsForThisZip);
                $overallDatasetsProcessedCount += $datasetsProcessedCountForThisZip;
                $overallTotalImagesQueued += $totalImagesQueuedForThisZip;
                $overallTotalPdfsQueued += $totalPdfsQueuedForThisZip;
                $overallQueuedPdfDetails = array_merge($overallQueuedPdfDetails, $queuedPdfDetailsForThisZip);
            }
        } // End of loop for each ZIP file

        $successfulZipCount = count($processedZipFileNames);
        $failedZipCount = $totalZipFilesReceived - $successfulZipCount;

        $message = "{$successfulZipCount} of {$totalZipFilesReceived} ZIP bundle(s) initiated for processing. ";
        if ($failedZipCount > 0) {
            $message .= "{$failedZipCount} ZIP bundle(s) failed to initiate. ";
        }
        $message .= "Details in logs. Queued: {$overallDatasetsProcessedCount} dataset(s), {$overallTotalImagesQueued} image(s), {$overallTotalPdfsQueued} PDF(s).";


        return response()->json([
            'message' => $message,
            'logs' => $overallProcessingLogs,
            'total_zip_files_received' => $totalZipFilesReceived,
            'zip_files_processed_successfully' => $successfulZipCount,
            'total_datasets_processed_across_all_zips' => $overallDatasetsProcessedCount,
            'total_images_queued_across_all_zips' => $overallTotalImagesQueued,
            'total_pdfs_queued_across_all_zips' => $overallTotalPdfsQueued,
            'queued_pdf_details_across_all_zips' => $overallQueuedPdfDetails,
        ]);
    }

    private function deriveS3FolderNameFromCsv(string $originalCsvFilename): string
    {
        return pathinfo($originalCsvFilename, PATHINFO_FILENAME);
    }

    private function storeTemporaryFile(UploadedFile $file, string $subDirectory): string
    {
        $tempDir = storage_path('app/'.$subDirectory);
        File::ensureDirectoryExists($tempDir);
        $temporaryFileName = Str::uuid().'.'.$file->getClientOriginalExtension();
        $movedFile = $file->move($tempDir, $temporaryFileName);
        if (!$movedFile) {
            throw new \Exception("Failed to move uploaded file {$file->getClientOriginalName()} to temporary storage.");
        }
        return $movedFile->getPathname();
    }
}
