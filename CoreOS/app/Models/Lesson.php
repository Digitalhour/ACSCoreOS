<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Lesson extends Model
{
    use HasFactory;

    protected $fillable = [
        'module_id',
        'title',
        'description',
        'order',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer'
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function contents(): HasMany
    {
        return $this->hasMany(LessonContent::class)->orderBy('order');
    }

    public function quiz(): HasOne
    {
        return $this->hasOne(Quiz::class);
    }

    public function progressTracking(): HasMany
    {
        return $this->hasMany(ProgressTracking::class, 'trackable_id')
            ->where('trackable_type', self::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function isCompletedBy($userId)
    {
        return $this->progressTracking()
            ->where('user_id', $userId)
            ->where('completed', true)
            ->exists();
    }

    public function canBeAccessedBy($userId)
    {
        if (!$this->module->sequential_lessons) {
            return true;
        }

        $previousLessons = $this->module->lessons()
            ->where('order', '<', $this->order)
            ->pluck('id');

        if ($previousLessons->isEmpty()) {
            return true;
        }

        $completedPreviousLessons = ProgressTracking::where('user_id', $userId)
            ->where('trackable_type', self::class)
            ->whereIn('trackable_id', $previousLessons)
            ->where('completed', true)
            ->count();

        return $completedPreviousLessons === $previousLessons->count();
    }
}
