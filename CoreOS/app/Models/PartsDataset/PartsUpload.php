<?php

// app/Models/PartsDataset/PartsUpload.php (Updated)

namespace App\Models\PartsDataset;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PartsUpload extends Model
{
    use HasFactory;

    protected $connection = 'parts_database';
    protected $table = 'parts_uploads';

    protected $fillable = [
        'filename',
        'original_filename',
        'upload_type',
        'batch_id',
        'total_parts',
        'processed_parts',
        'status',
        'processing_logs',
        'uploaded_at',
        'completed_at',
        'parent_upload_id',
    ];

    protected $casts = [
        'processing_logs' => 'array',
        'uploaded_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_ANALYZING = 'analyzing';
    const STATUS_CHUNKED = 'chunked';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_COMPLETED_WITH_ERRORS = 'completed_with_errors';
    const STATUS_FAILED = 'failed';
    const STATUS_CANCELLED = 'cancelled';

    public function parts(): HasMany
    {
        return $this->hasMany(Part::class, 'upload_id');
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(UploadChunk::class, 'upload_id');
    }

    public function getProgressPercentageAttribute(): float
    {
        if ($this->total_parts === 0) {
            return 0;
        }
        return round(($this->processed_parts / $this->total_parts) * 100, 2);
    }

    public function getChunkProgressAttribute(): array
    {
        $chunks = $this->chunks;

        if ($chunks->isEmpty()) {
            return [
                'total_chunks' => 0,
                'completed_chunks' => 0,
                'failed_chunks' => 0,
                'processing_chunks' => 0,
                'pending_chunks' => 0,
                'progress_percentage' => 0
            ];
        }

        $completed = $chunks->where('status', UploadChunk::STATUS_COMPLETED)->count();
        $failed = $chunks->where('status', UploadChunk::STATUS_FAILED)->count();
        $processing = $chunks->where('status', UploadChunk::STATUS_PROCESSING)->count();
        $pending = $chunks->where('status', UploadChunk::STATUS_PENDING)->count();
        $total = $chunks->count();

        return [
            'total_chunks' => $total,
            'completed_chunks' => $completed,
            'failed_chunks' => $failed,
            'processing_chunks' => $processing,
            'pending_chunks' => $pending,
            'progress_percentage' => $total > 0 ? round((($completed + $failed) / $total) * 100, 2) : 0
        ];
    }

    public function getIsProcessingAttribute(): bool
    {
        return in_array($this->status, [
            self::STATUS_ANALYZING,
            self::STATUS_CHUNKED,
            self::STATUS_PROCESSING
        ]);
    }

    public function getIsCompletedAttribute(): bool
    {
        return in_array($this->status, [
            self::STATUS_COMPLETED,
            self::STATUS_COMPLETED_WITH_ERRORS
        ]);
    }

    public function getIsFailedAttribute(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    public function getEstimatedTimeRemainingAttribute(): ?string
    {
        if (!$this->is_processing) {
            return null;
        }

        $chunks = $this->chunks;
        if ($chunks->isEmpty()) {
            return null;
        }

        $completedChunks = $chunks->where('status', UploadChunk::STATUS_COMPLETED);
        $remainingChunks = $chunks->whereIn('status', [
            UploadChunk::STATUS_PENDING,
            UploadChunk::STATUS_PROCESSING
        ]);

        if ($completedChunks->isEmpty() || $remainingChunks->isEmpty()) {
            return null;
        }

        $avgProcessingTime = $completedChunks->avg('processing_time_seconds');
        $estimatedSeconds = $remainingChunks->count() * $avgProcessingTime;

        if ($estimatedSeconds < 60) {
            return round($estimatedSeconds) . 's';
        } elseif ($estimatedSeconds < 3600) {
            return round($estimatedSeconds / 60) . 'm';
        } else {
            return round($estimatedSeconds / 3600, 1) . 'h';
        }
    }
}
