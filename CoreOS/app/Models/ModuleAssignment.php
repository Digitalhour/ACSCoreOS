<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModuleAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'module_id',
        'assignment_type',
        'assignable_id',
    ];

    protected $casts = [
        'assignment_type' => 'string',
    ];

    protected $appends = ['display_name'];

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignable_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'assignable_id');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignable_id');
    }

    // Helper method to get the assignable entity
    public function getAssignableAttribute()
    {
        return match ($this->assignment_type) {
            'user' => $this->user,
            'department' => $this->department,
            'hierarchy' => $this->manager,
            default => null,
        };
    }

    /**
     * Check if a user is included in this assignment
     */
    public function includesUser(User $user): bool
    {
        return match ($this->assignment_type) {
            'everyone' => true,
            'user' => $this->assignable_id === $user->id,
            'department' => $user->departments()->where('department_id', $this->assignable_id)->exists(),
            'hierarchy' => $this->includesUserInHierarchy($user),
            default => false,
        };
    }

    /**
     * Check if user is included in hierarchy assignment
     */
    private function includesUserInHierarchy(User $user): bool
    {
        $manager = User::find($this->assignable_id);
        if (!$manager) {
            return false;
        }

        // Check if user is the manager themselves
        if ($user->id === $manager->id) {
            return true;
        }

        // Check if user is in manager's hierarchy
        return in_array($user->id, $manager->getHierarchyUserIds());
    }

    /**
     * Get all users that this assignment applies to
     */
    public function getAssignedUsers()
    {
        return match ($this->assignment_type) {
            'everyone' => User::all(),
            'user' => User::where('id', $this->assignable_id)->get(),
            'department' => User::whereHas('departments', function ($query) {
                $query->where('department_id', $this->assignable_id);
            })->get(),
            'hierarchy' => $this->getHierarchyUsers(),
            default => collect(),
        };
    }

    /**
     * Get users in hierarchy assignment
     */
    private function getHierarchyUsers()
    {
        $manager = User::find($this->assignable_id);
        if (!$manager) {
            return collect();
        }

        $hierarchyIds = $manager->getHierarchyUserIds();
        return User::whereIn('id', $hierarchyIds)->get();
    }

    /**
     * Get assignment display name
     */
    public function getDisplayNameAttribute(): string
    {
        return match ($this->assignment_type) {
            'everyone' => 'Everyone',
            'user' => $this->user?->name ?? 'Unknown User',
            'department' => $this->department?->name ?? 'Unknown Department',
            'hierarchy' => ($this->manager?->name ?? 'Unknown Manager') . ' (Hierarchy)',
            default => 'Unknown Assignment',
        };
    }
}
