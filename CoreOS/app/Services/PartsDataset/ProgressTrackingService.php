<?php

// app/Services/PartsDataset/ProgressTrackingService.php

namespace App\Services\PartsDataset;

use App\Models\PartsDataset\PartsUpload;
use App\Models\PartsDataset\UploadChunk;
use Illuminate\Support\Facades\Cache;

class ProgressTrackingService
{
    /**
     * Get comprehensive progress for an upload
     */
    public function getUploadProgress(int $uploadId): array
    {
        $upload = PartsUpload::with('chunks')->findOrFail($uploadId);

        // Basic upload info
        $progress = [
            'upload_id' => $uploadId,
            'status' => $upload->status,
            'filename' => $upload->original_filename,
            'total_parts' => $upload->total_parts,
            'processed_parts' => $upload->processed_parts,
            'processing_method' => $this->getProcessingMethod($upload),
            'started_at' => $upload->uploaded_at,
            'completed_at' => $upload->completed_at,
            'processing_logs' => $upload->processing_logs ?? [],
        ];

        // Add chunk-specific progress if chunked processing
        if ($upload->chunks->isNotEmpty()) {
            $progress = array_merge($progress, $this->getChunkProgress($upload));
        } else {
            $progress = array_merge($progress, $this->getStandardProgress($upload));
        }

        return $progress;
    }

    /**
     * Get chunked processing progress
     */
    private function getChunkProgress(PartsUpload $upload): array
    {
        $chunks = $upload->chunks;

        $completed = $chunks->where('status', UploadChunk::STATUS_COMPLETED);
        $failed = $chunks->where('status', UploadChunk::STATUS_FAILED);
        $processing = $chunks->where('status', UploadChunk::STATUS_PROCESSING);
        $pending = $chunks->where('status', UploadChunk::STATUS_PENDING);

        $totalChunks = $chunks->count();
        $completedCount = $completed->count();
        $failedCount = $failed->count();
        $processingCount = $processing->count();
        $pendingCount = $pending->count();

        // Calculate overall progress
        $overallProgress = $totalChunks > 0 ?
            round((($completedCount + $failedCount) / $totalChunks) * 100, 1) : 0;

        // Calculate processing speed and ETA
        $avgProcessingTime = $completed->isNotEmpty() ? $completed->avg('processing_time_seconds') : null;
        $remainingChunks = $processingCount + $pendingCount;
        $estimatedTimeRemaining = $avgProcessingTime && $remainingChunks > 0 ?
            $this->formatDuration($avgProcessingTime * $remainingChunks) : null;

        // Get chunk details
        $chunkDetails = $chunks->map(function ($chunk) {
            return [
                'chunk_number' => $chunk->chunk_number,
                'status' => $chunk->status,
                'start_row' => $chunk->start_row,
                'end_row' => $chunk->end_row,
                'total_rows' => $chunk->total_rows,
                'processed_rows' => $chunk->processed_rows,
                'created_parts' => $chunk->created_parts,
                'updated_parts' => $chunk->updated_parts,
                'failed_rows' => $chunk->failed_rows,
                'progress_percentage' => $chunk->progress_percentage,
                'processing_time' => $chunk->processing_time_seconds ?
                    round($chunk->processing_time_seconds, 2) : null,
                'started_at' => $chunk->started_at,
                'completed_at' => $chunk->completed_at,
                'error_details' => $chunk->error_details,
            ];
        })->toArray();

        return [
            'processing_type' => 'chunked',
            'overall_progress_percentage' => $overallProgress,
            'chunks' => [
                'total' => $totalChunks,
                'completed' => $completedCount,
                'failed' => $failedCount,
                'processing' => $processingCount,
                'pending' => $pendingCount,
            ],
            'performance' => [
                'avg_processing_time_per_chunk' => $avgProcessingTime ? round($avgProcessingTime, 2) : null,
                'estimated_time_remaining' => $estimatedTimeRemaining,
                'total_processing_time' => $completed->sum('processing_time_seconds'),
                'chunks_per_minute' => $this->calculateChunksPerMinute($completed),
            ],
            'chunk_details' => $chunkDetails,
            'summary' => [
                'total_created_parts' => $completed->sum('created_parts'),
                'total_updated_parts' => $completed->sum('updated_parts'),
                'total_failed_rows' => $chunks->sum('failed_rows'),
            ],
        ];
    }

    /**
     * Get standard processing progress
     */
    private function getStandardProgress(PartsUpload $upload): array
    {
        $progress = $upload->total_parts > 0 ?
            round(($upload->processed_parts / $upload->total_parts) * 100, 1) : 0;

        return [
            'processing_type' => 'standard',
            'overall_progress_percentage' => $progress,
            'performance' => [
                'estimated_time_remaining' => null,
                'processing_speed' => null,
            ],
        ];
    }

    /**
     * Get processing method
     */
    private function getProcessingMethod(PartsUpload $upload): string
    {
        if ($upload->chunks->isNotEmpty()) {
            return 'chunked';
        }
        return 'standard';
    }

    /**
     * Calculate chunks processed per minute
     */
    private function calculateChunksPerMinute($completedChunks): ?float
    {
        if ($completedChunks->isEmpty()) {
            return null;
        }

        $firstStarted = $completedChunks->min('started_at');
        $lastCompleted = $completedChunks->max('completed_at');

        if (!$firstStarted || !$lastCompleted) {
            return null;
        }

        $totalMinutes = $firstStarted->diffInMinutes($lastCompleted);
        return $totalMinutes > 0 ? round($completedChunks->count() / $totalMinutes, 2) : null;
    }

    /**
     * Format duration in human readable format
     */
    private function formatDuration(float $seconds): string
    {
        if ($seconds < 60) {
            return round($seconds) . 's';
        } elseif ($seconds < 3600) {
            return round($seconds / 60) . 'm';
        } else {
            $hours = floor($seconds / 3600);
            $minutes = round(($seconds % 3600) / 60);
            return $hours . 'h' . ($minutes > 0 ? ' ' . $minutes . 'm' : '');
        }
    }

    /**
     * Get progress summary for multiple uploads
     */
    public function getUploadsProgressSummary(array $uploadIds): array
    {
        $uploads = PartsUpload::with('chunks')->whereIn('id', $uploadIds)->get();

        return $uploads->map(function ($upload) {
            $basic = [
                'upload_id' => $upload->id,
                'filename' => $upload->original_filename,
                'status' => $upload->status,
                'processing_method' => $this->getProcessingMethod($upload),
            ];

            if ($upload->chunks->isNotEmpty()) {
                $chunks = $upload->chunks;
                $totalChunks = $chunks->count();
                $completedChunks = $chunks->where('status', UploadChunk::STATUS_COMPLETED)->count();
                $failedChunks = $chunks->where('status', UploadChunk::STATUS_FAILED)->count();

                $basic['progress_percentage'] = $totalChunks > 0 ?
                    round((($completedChunks + $failedChunks) / $totalChunks) * 100, 1) : 0;
                $basic['chunks_completed'] = $completedChunks;
                $basic['chunks_total'] = $totalChunks;
                $basic['has_failures'] = $failedChunks > 0;
            } else {
                $basic['progress_percentage'] = $upload->progress_percentage;
            }

            return $basic;
        })->toArray();
    }

    /**
     * Cache progress data for frequent polling
     */
    public function cacheUploadProgress(int $uploadId): void
    {
        $progress = $this->getUploadProgress($uploadId);
        Cache::put("upload_progress_{$uploadId}", $progress, now()->addMinutes(5));
    }

    /**
     * Get cached progress or fresh data
     */
    public function getCachedUploadProgress(int $uploadId, bool $forceFresh = false): array
    {
        if ($forceFresh) {
            return $this->getUploadProgress($uploadId);
        }

        return Cache::remember(
            "upload_progress_{$uploadId}",
            now()->addSeconds(30), // Cache for 30 seconds
            fn() => $this->getUploadProgress($uploadId)
        );
    }

    /**
     * Update chunk progress in real-time
     */
    public function updateChunkProgress(int $chunkId, int $processedRows, ?string $status = null): void
    {
        $chunk = UploadChunk::find($chunkId);
        if (!$chunk) return;

        $updateData = ['processed_rows' => $processedRows];
        if ($status) {
            $updateData['status'] = $status;
        }

        $chunk->update($updateData);

        // Clear cached progress to force refresh
        Cache::forget("upload_progress_{$chunk->upload_id}");
    }

    /**
     * Check for stuck uploads and update their status
     */
    public function checkStuckUploads(): array
    {
        $stuckThreshold = now()->subHours(2);

        $stuckUploads = PartsUpload::where('status', 'processing')
            ->where('updated_at', '<', $stuckThreshold)
            ->get();

        $results = [];
        foreach ($stuckUploads as $upload) {
            // Check if it's truly stuck or just slow
            $recentChunkActivity = $upload->chunks()
                ->where('updated_at', '>=', now()->subMinutes(30))
                ->exists();

            if (!$recentChunkActivity) {
                $results[] = [
                    'upload_id' => $upload->id,
                    'filename' => $upload->original_filename,
                    'stuck_since' => $upload->updated_at,
                    'action' => 'marked_as_stuck'
                ];
            }
        }

        return $results;
    }
}
