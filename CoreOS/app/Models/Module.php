<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

class Module extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'thumbnail',
        'sequential_lessons',
        'quiz_required',
        'test_required',
        'passing_score',
        'allow_retakes',
        'is_active',
        'order'
    ];

    protected $appends = ['thumbnail_url'];

    protected $casts = [
        'title' => 'string',
        'description' => 'string',
        'sequential_lessons' => 'boolean',
        'quiz_required' => 'boolean',
        'test_required' => 'boolean',
        'allow_retakes' => 'boolean',
        'is_active' => 'boolean',
        'passing_score' => 'integer',
        'order' => 'integer'
    ];

    public function lessons(): HasMany
    {
        return $this->hasMany(Lesson::class)->orderBy('order');
    }

    public function test(): HasOne
    {
        return $this->hasOne(Test::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'enrollments')
            ->withPivot(['enrolled_at', 'completed_at', 'is_active'])
            ->withTimestamps();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function getProgressPercentageForUser($userId)
    {
        if (!$userId) return 0;

        $totalLessons = $this->lessons()->where('is_active', true)->count();
        if ($totalLessons === 0) return 100;

        $completedLessons = 0;

        foreach ($this->lessons()->where('is_active', true)->get() as $lesson) {
            if ($lesson->isCompletedBy($userId)) {
                $completedLessons++;
            }
        }

        return round(($completedLessons / $totalLessons) * 100);
    }

    public function isCompletedBy($userId)
    {
        $enrollment = $this->enrollments()->where('user_id', $userId)->first();
        return $enrollment && $enrollment->completed_at !== null;
    }

    public function getThumbnailUrlAttribute()
    {
        if (!$this->thumbnail) return null;
        return Storage::disk('s3')->temporaryUrl($this->thumbnail, now()->addHours(2));
    }
}
