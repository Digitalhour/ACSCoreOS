<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class LessonContent extends Model
{
    use HasFactory;

    protected $fillable = [
        'lesson_id',
        'type',
        'title',
        'description',
        'file_path',
        'file_url',
        'duration',
        'thumbnail',
        'metadata',
        'order'
    ];

    protected $casts = [
        'metadata' => 'array',
        'duration' => 'integer',
        'order' => 'integer'
    ];

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function progressTracking(): HasMany
    {
        return $this->hasMany(ProgressTracking::class, 'trackable_id')
            ->where('trackable_type', self::class);
    }

    public function isCompletedBy($userId)
    {
        return $this->progressTracking()
            ->where('user_id', $userId)
            ->where('completed', true)
            ->exists();
    }
    public function getFileUrlAttribute()
    {
        if (!$this->file_path) return null;
        return Storage::disk('s3')->temporaryUrl($this->file_path, now()->addHours(2));
    }
    public function getFormattedDurationAttribute()
    {
        if (!$this->duration) return null;

        $hours = floor($this->duration / 3600);
        $minutes = floor(($this->duration % 3600) / 60);
        $seconds = $this->duration % 60;

        if ($hours > 0) {
            return sprintf('%d:%02d:%02d', $hours, $minutes, $seconds);
        }

        return sprintf('%d:%02d', $minutes, $seconds);
    }
}
