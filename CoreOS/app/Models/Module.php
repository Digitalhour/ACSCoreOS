<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $lessons_count
 * @property int $enrollments_count
 * @property bool $has_test
 * @property array $assignment_summary
 */
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
        return $this->hasMany(Lesson::class);
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

    // Add the missing assignments relationship
    public function assignments(): HasMany
    {
        return $this->hasMany(ModuleAssignment::class);
    }

    public function getAssignmentSummary(): array
    {
        $assignments = $this->assignments()->get();

        if ($assignments->isEmpty()) {
            return ['type' => 'none', 'count' => 0, 'description' => 'No assignments'];
        }

        $summary = [
            'everyone' => 0,
            'user' => 0,
            'department' => 0,
            'hierarchy' => 0,
        ];

        foreach ($assignments as $assignment) {
            $summary[$assignment->assignment_type]++;
        }

        $totalAssignments = $assignments->count();

        if ($summary['everyone'] > 0) {
            return ['type' => 'everyone', 'count' => $totalAssignments, 'description' => 'Available to everyone'];
        }

        $descriptions = [];
        if ($summary['user'] > 0) {
            $descriptions[] = $summary['user'] . ' user' . ($summary['user'] > 1 ? 's' : '');
        }
        if ($summary['department'] > 0) {
            $descriptions[] = $summary['department'] . ' department' . ($summary['department'] > 1 ? 's' : '');
        }
        if ($summary['hierarchy'] > 0) {
            $descriptions[] = $summary['hierarchy'] . ' hierarchy' . ($summary['hierarchy'] > 1 ? 's' : '');
        }

        return [
            'type' => 'specific',
            'count' => $totalAssignments,
            'description' => 'Assigned to ' . implode(', ', $descriptions)
        ];
    }

    /**
     * Scope to get modules accessible by a specific user
     */
    public function scopeAccessibleByUser($query, User $user)
    {
        return $query->where('is_active', true)
            ->where(function ($query) use ($user) {
                // If no assignments exist, assume everyone can access (backwards compatibility)
                $query->whereDoesntHave('assignments')
                    ->orWhereHas('assignments', function ($assignmentQuery) use ($user) {
                        $assignmentQuery->where('assignment_type', 'everyone')
                            ->orWhere(function ($q) use ($user) {
                                $q->where('assignment_type', 'user')
                                    ->where('assignable_id', $user->id);
                            })
                            ->orWhere(function ($q) use ($user) {
                                $q->where('assignment_type', 'department')
                                    ->whereIn('assignable_id', $user->departments()->pluck('departments.id'));
                            })
                            ->orWhere(function ($q) use ($user) {
                                $q->where('assignment_type', 'hierarchy')
                                    ->whereIn('assignable_id', $user->getManagersInHierarchy());
                            });
                    });
            });
    }

    /**
     * Check if this module is accessible by a specific user
     */
    public function isAccessibleByUser(User $user): bool
    {
        if (!$this->is_active) {
            return false;
        }

        // If no assignments exist, assume everyone can access (backwards compatibility)
        if ($this->assignments()->count() === 0) {
            return true;
        }

        return $this->assignments()->get()->some(function ($assignment) use ($user) {
            return $assignment->includesUser($user);
        });
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
