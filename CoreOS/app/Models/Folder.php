<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Folder extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        's3_path',
        'parent_id',
        'assignment_type',
        'assignment_ids',
        'created_by',
        'is_active',
    ];

    protected $casts = [
        'assignment_ids' => 'array',
        'is_active' => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->useLogName('Folders')
            ->dontSubmitEmptyLogs();
    }

    // Relationships
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Folder::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Folder::class, 'parent_id')
            ->where('is_active', true)
            ->orderBy('name');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class)
            ->where('is_active', true)
            ->orderBy('name');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'folder_tags')->withTimestamps();
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeRootFolders($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeAccessibleByUser($query, User $user)
    {
        return $query->where(function ($q) use ($user) {
            $q->where('assignment_type', 'company_wide')
                ->orWhere(function ($subQ) use ($user) {
                    $subQ->where('assignment_type', 'user')
                        ->whereJsonContains('assignment_ids', $user->id);
                })
                ->orWhere(function ($subQ) use ($user) {
                    $subQ->where('assignment_type', 'department')
                        ->where(function ($deptQ) use ($user) {
                            foreach ($user->departments->pluck('id') as $deptId) {
                                $deptQ->orWhereJsonContains('assignment_ids', $deptId);
                            }
                        });
                })
                ->orWhere(function ($subQ) use ($user) {
                    $subQ->where('assignment_type', 'hierarchy')
                        ->where(function ($hierQ) use ($user) {
                            // Get all users in hierarchy (user + manager + subordinates)
                            $hierarchyUserIds = $user->getHierarchyUserIds();

                            foreach ($hierarchyUserIds as $userId) {
                                $hierQ->orWhereJsonContains('assignment_ids', $userId);
                            }
                        });
                });
        });
    }

    // Helper methods
    public function getFullPath(): string
    {
        $path = collect();
        $current = $this;

        while ($current) {
            $path->prepend($current->name);
            $current = $current->parent;
        }

        return $path->join(' / ');
    }

    public function isAccessibleBy(User $user): bool
    {
        switch ($this->assignment_type) {
            case 'company_wide':
                return true;

            case 'user':
                return in_array($user->id, $this->assignment_ids ?? []);

            case 'department':
                $userDepartmentIds = $user->departments->pluck('id')->toArray();
                return !empty(array_intersect($userDepartmentIds, $this->assignment_ids ?? []));

            case 'hierarchy':
                // Check if any assigned user is in the current user's hierarchy
                $assignedUserIds = $this->assignment_ids ?? [];
                foreach ($assignedUserIds as $assignedUserId) {
                    if ($user->canAccessUserViaHierarchy($assignedUserId)) {
                        return true;
                    }
                }
                return false;

            default:
                return false;
        }
    }

    public function getAssignedEntities()
    {
        switch ($this->assignment_type) {
            case 'company_wide':
                return ['type' => 'company_wide', 'entities' => []];

            case 'user':
                $users = User::whereIn('id', $this->assignment_ids ?? [])->get();
                return ['type' => 'users', 'entities' => $users];

            case 'department':
                $departments = Department::whereIn('id', $this->assignment_ids ?? [])->get();
                return ['type' => 'departments', 'entities' => $departments];

            case 'hierarchy':
                $users = User::with('manager')->whereIn('id', $this->assignment_ids ?? [])->get();
                return ['type' => 'hierarchy', 'entities' => $users];

            default:
                return ['type' => 'unknown', 'entities' => []];
        }
    }

    /**
     * Get all users who have access to this folder including hierarchy relationships
     */
    public function getAllAccessibleUsers(): array
    {
        switch ($this->assignment_type) {
            case 'company_wide':
                return User::pluck('id')->toArray();

            case 'user':
                return $this->assignment_ids ?? [];

            case 'department':
                return User::whereHas('departments', function ($q) {
                    $q->whereIn('departments.id', $this->assignment_ids ?? []);
                })->pluck('id')->toArray();

            case 'hierarchy':
                $allAccessibleUserIds = [];
                $assignedUserIds = $this->assignment_ids ?? [];

                foreach ($assignedUserIds as $assignedUserId) {
                    $assignedUser = User::find($assignedUserId);
                    if ($assignedUser) {
                        $hierarchyIds = $assignedUser->getHierarchyUserIds();
                        $allAccessibleUserIds = array_merge($allAccessibleUserIds, $hierarchyIds);
                    }
                }

                return array_unique($allAccessibleUserIds);

            default:
                return [];
        }
    }
}
