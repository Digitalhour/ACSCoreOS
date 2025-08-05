<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class WikiAttachment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'original_name',
        'file_path',
        'mime_type',
        'file_size',
        'wiki_page_id',
        'user_id',
        'download_count',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'file_size' => 'integer',
        'download_count' => 'integer',
    ];

    public function page(): BelongsTo
    {
        return $this->belongsTo(WikiPage::class, 'wiki_page_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeImages($query)
    {
        return $query->where('mime_type', 'like', 'image/%');
    }

    public function scopeDocuments($query)
    {
        return $query->whereNotLike('mime_type', 'image/%');
    }

    public function scopeByMimeType($query, $mimeType)
    {
        return $query->where('mime_type', $mimeType);
    }

    // Helper methods
    public function getDownloadUrl(): string
    {
        try {
            return Storage::disk('s3')->temporaryUrl(
                $this->file_path,
                now()->addHours(24)
            );
        } catch (\Exception $e) {
            return '';
        }
    }

    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }

    public function isDocument(): bool
    {
        return in_array($this->mime_type, [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv',
        ]);
    }

    public function getFileSizeFormatted(): string
    {
        $size = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];

        for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
            $size /= 1024;
        }

        return round($size, 2) . ' ' . $units[$i];
    }

    public function incrementDownloadCount(): void
    {
        $this->increment('download_count');
    }

    public function canBeDownloadedBy(User $user): bool
    {
        return $this->page->isPublished() ||
            $this->page->canBeEditedBy($user) ||
            $user->hasRole('admin');
    }

    public function delete(): bool
    {
        // Delete file from S3 when model is deleted
        try {
            Storage::disk('s3')->delete($this->file_path);
        } catch (\Exception $e) {
            \Log::warning("Failed to delete file from S3: {$this->file_path}");
        }

        return parent::delete();
    }
}
