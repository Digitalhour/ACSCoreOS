<?php

// app/Models/PartsDataset/UploadChunk.php

namespace App\Models\PartsDataset;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UploadChunk extends Model
{
    use HasFactory;

    protected $connection = 'parts_database';
    protected $table = 'upload_chunks';

    protected $fillable = [
        'upload_id',
        'chunk_number',
        'start_row',
        'end_row',
        'total_rows',
        'status',
        'processed_rows',
        'created_parts',
        'updated_parts',
        'failed_rows',
        'error_details',
        'started_at',
        'completed_at',
        'processing_time_seconds',
    ];

    protected $casts = [
        'error_details' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'processing_time_seconds' => 'float',
    ];

    const STATUS_PENDING = 'pending';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_FAILED = 'failed';

    public function upload(): BelongsTo
    {
        return $this->belongsTo(PartsUpload::class, 'upload_id');
    }

    public function getProgressPercentageAttribute(): float
    {
        if ($this->total_rows === 0) {
            return 0;
        }
        return round(($this->processed_rows / $this->total_rows) * 100, 2);
    }

    public function getIsCompletedAttribute(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function getIsFailedAttribute(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    public function markAsProcessing(): void
    {
        $this->update([
            'status' => self::STATUS_PROCESSING,
            'started_at' => now(),
        ]);
    }

    public function markAsCompleted(int $createdParts, int $updatedParts, float $processingTime): void
    {
        $this->update([
            'status' => self::STATUS_COMPLETED,
            'processed_rows' => $this->total_rows,
            'created_parts' => $createdParts,
            'updated_parts' => $updatedParts,
            'completed_at' => now(),
            'processing_time_seconds' => $processingTime,
        ]);
    }

    public function markAsFailed(string $error, int $processedRows = 0): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'processed_rows' => $processedRows,
            'error_details' => ['error' => $error, 'timestamp' => now()->toISOString()],
            'completed_at' => now(),
        ]);
    }
}
