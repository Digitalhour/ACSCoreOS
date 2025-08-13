<?php

namespace App\Jobs;

use App\Models\Parts\PartInstance;
use App\Services\S3UploadService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

// Use the global File facade

class ProcessUploadedPdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $temporaryPdfPath;
    protected string $originalPdfFileName;
    protected string $s3Directory;

    /**
     * Create a new job instance.
     *
     * @param  string  $temporaryPdfPath  The absolute path to the temporary PDF file.
     * @param  string  $originalPdfFileName  The original name of the PDF file.
     * @param  string  $s3Directory  The target directory in S3 (e.g., "service_manuals/pdf_name_without_extension").
     * @return void
     */
    public function __construct(string $temporaryPdfPath, string $originalPdfFileName, string $s3Directory)
    {
        $this->temporaryPdfPath = $temporaryPdfPath;
        $this->originalPdfFileName = $originalPdfFileName;
        $this->s3Directory = $s3Directory;
    }

    /**
     * Execute the job.
     *
     * @param  S3UploadService  $s3UploadService
     * @return void
     * @throws Throwable
     */
    public function handle(S3UploadService $s3UploadService): void
    {
        Log::info("[ProcessUploadedPdfJob] Processing PDF: {$this->originalPdfFileName}. Temp path: {$this->temporaryPdfPath}. S3 Directory: {$this->s3Directory}");

        try {
            if (!File::exists($this->temporaryPdfPath)) {
                Log::error("[ProcessUploadedPdfJob] Temporary PDF file not found: {$this->temporaryPdfPath} for {$this->originalPdfFileName}. Job will not proceed.");
                // Fail the job explicitly if the file is missing, so it doesn't silently complete.
                // You might want to throw a specific exception here.
                $this->fail(new \Exception("Temporary PDF file not found: {$this->temporaryPdfPath}"));
                return;
            }

            // Optional: Log file size for debugging
            $fileSize = File::size($this->temporaryPdfPath);
            Log::info("[ProcessUploadedPdfJob] Temporary PDF file {$this->temporaryPdfPath} exists. Size: {$fileSize} bytes.");
            if ($fileSize === 0) {
                Log::warning("[ProcessUploadedPdfJob] Temporary PDF file {$this->temporaryPdfPath} is 0 bytes. This may cause issues with the upload or indicate an earlier problem.");
                // Decide if a 0-byte file should cause the job to fail
                // $this->fail(new \Exception("Temporary PDF file {$this->temporaryPdfPath} is 0 bytes."));
                // return;
            }

            // The S3UploadService's uploadFileFromPath method will upload the file
            // to the specified s3Directory with its originalPdfFileName.
            $s3Path = $s3UploadService->uploadFileFromPath(
                $this->temporaryPdfPath,
                $this->s3Directory,
                $this->originalPdfFileName
            );

            // Generate the PDF URL
            $pdfUrl = Storage::disk('s3')->url($s3Path);

            // Update all PartInstances that reference this PDF
            $pdfNameWithoutExtension = pathinfo($this->originalPdfFileName, PATHINFO_FILENAME);

            PartInstance::where('pdf_id', $pdfNameWithoutExtension)
                ->orWhere('pdf_id', $this->originalPdfFileName)
                ->update(['pdf_url' => $pdfUrl]);

            Log::info("[ProcessUploadedPdfJob] Successfully uploaded PDF and updated part instances with URL: {$pdfUrl}");


        } catch (Throwable $e) {
            Log::error("[ProcessUploadedPdfJob] Failed to upload PDF {$this->originalPdfFileName} to S3. Error: ".$e->getMessage(),
                [
                    'exception_message' => $e->getMessage(),
                    'exception_trace' => $e->getTraceAsString(), // Log stack trace
                    'temporary_path' => $this->temporaryPdfPath,
                    's3_directory' => $this->s3Directory,
                    'original_filename' => $this->originalPdfFileName,
                ]);
            // Re-throw the exception to mark the job as failed and allow for retries
            throw $e;
        } finally {
            // Always attempt to clean up the temporary file
            if (File::exists($this->temporaryPdfPath)) {
                if (File::delete($this->temporaryPdfPath)) {
                    Log::info("[ProcessUploadedPdfJob] Cleaned up temporary PDF file: {$this->temporaryPdfPath}");
                } else {
                    Log::warning("[ProcessUploadedPdfJob] Failed to clean up temporary PDF file: {$this->temporaryPdfPath}");
                }
            }
        }
    }

    /**
     * Handle a job failure.
     *
     * @param  \Throwable  $exception
     * @return void
     */
    public function failed(Throwable $exception): void
    {
        Log::critical("[ProcessUploadedPdfJob] Job failed for PDF: {$this->originalPdfFileName}. Error: ".$exception->getMessage(),
            [
                'temporary_path' => $this->temporaryPdfPath,
                's3_directory' => $this->s3Directory,
                'exception_trace' => $exception->getTraceAsString(),
            ]);
        // You can add any additional failure logic here, like sending notifications.
    }
}
