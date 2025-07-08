<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoPolicy;
use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoTransaction;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Lab404\Impersonate\Models\Impersonate;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, LogsActivity, Impersonate, softDeletes;


    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'workos_id',
        'avatar',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'workos_id',
        'remember_token',
    ];




    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnly([
                'name', 'email', 'avatar', 'last_login_at', 'last_login_ip'
            ])
            ->useLogName('UserModel')
            ->dontSubmitEmptyLogs();
    }

    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(Department::class)->withPivot('assigned_at')->withTimestamps();
    }

    /**
     * Get the user's current position.
     */
    public function currentPosition(): BelongsTo
    {
        return $this->belongsTo(Position::class, 'position_id');
    }

    /**
     * Get the user's current direct manager.
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reports_to_user_id');
    }

    /**
     * Get the users who report directly to this user (current subordinates).
     */
    public function subordinates(): HasMany
    {
        return $this->hasMany(User::class, 'reports_to_user_id');
    }

    /**
     * Get all historical reporting assignments for this user (where they are the Employee).
     */
    public function reportingAssignments(): HasMany
    {
        return $this->hasMany(EmployeeReportingAssignment::class, 'user_id');
    }

    /**
     * Get all historical reporting assignments where this user was the manager.
     */
    public function managedAssignments(): HasMany
    {
        return $this->hasMany(EmployeeReportingAssignment::class, 'manager_id');
    }

    /**
     * Get the current active reporting assignment for this user.
     */
    public function currentReportingAssignment()
    {
        return $this->hasOne(EmployeeReportingAssignment::class, 'user_id')->whereNull('end_date');
    }

    /*
    |--------------------------------------------------------------------------
    | PTO System Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * Get the PTO balances for this user.
     */
    public function ptoBalances(): HasMany
    {
        return $this->hasMany(PtoBalance::class);
    }

    /**
     * Get the PTO requests for this user.
     */
    public function ptoRequests(): HasMany
    {
        return $this->hasMany(PtoRequest::class);
    }

    /**
     * Get the PTO transactions for this user.
     */
    public function ptoTransactions(): HasMany
    {
        return $this->hasMany(PtoTransaction::class);
    }



    /**
     * Get the PTO policies for this user.
     */
    public function ptoPolicies(): HasMany
    {
        return $this->hasMany(PtoPolicy::class);
    }

    /**
     * Get active PTO policies for this user.
     */
    public function activePtoPolicies(): HasMany
    {
        return $this->ptoPolicies()
            ->where('is_active', true)
            ->where('effective_date', '<=', now())
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            });
    }

    /**
     * Get a specific PTO policy for a PTO type.
     */
    public function getPolicyForPtoType(int $ptoTypeId): ?PtoPolicy
    {
        return $this->activePtoPolicies()
            ->where('pto_type_id', $ptoTypeId)
            ->first();
    }


    /**
     * Emergency Contact
     */
    public function emergencyContacts(): HasMany
    {
        return $this->hasMany(EmergencyContact::class);
    }
    /**
     * Get all users visible to this user (self + hierarchy + departments)
     * Updated to include department members and full hierarchy
     */
    public function getVisibleUsers(): Collection
    {
        $users = collect([$this]); // Always include self

        // Add direct reports (subordinates)
        $directReports = $this->subordinates()->with(['departments', 'currentPosition'])->get();
        $users = $users->merge($directReports);

        // Add all users in subordinate hierarchy (reports of reports, etc.)
        $allSubordinateIds = $this->getAllSubordinateIds();
        if (!empty($allSubordinateIds)) {
            $allSubordinates = User::whereIn('id', $allSubordinateIds)
                ->with(['departments', 'currentPosition'])
                ->get();
            $users = $users->merge($allSubordinates);
        }

        // Add department members if user is a manager or has department access
        if ($this->isManager() || $this->hasRole(['manager', 'admin', 'hr'])) {
            $departmentUsers = User::whereHas('departments', function ($query) {
                $query->whereIn('departments.id', $this->departments->pluck('id'));
            })->with(['departments', 'currentPosition'])->get();

            $users = $users->merge($departmentUsers);
        }

        // Add manager and manager's other reports (peer visibility)
        if ($this->reports_to_user_id) {
            $manager = $this->manager()->with(['departments', 'currentPosition'])->first();
            if ($manager) {
                $users = $users->push($manager);

                // Add peers (other direct reports of same manager)
                $peers = $manager->subordinates()->with(['departments', 'currentPosition'])->get();
                $users = $users->merge($peers);
            }
        }

        return $users->unique('id');
    }
    /**
     * Get all subordinate user IDs recursively (entire hierarchy below this user)
     */
    public function getAllSubordinateIds(): array
    {
        $subordinateIds = [];
        $directSubordinates = $this->subordinates()->pluck('id')->toArray();

        foreach ($directSubordinates as $subordinateId) {
            $subordinateIds[] = $subordinateId;

            // Recursively get subordinates of subordinates
            $subordinate = User::find($subordinateId);
            if ($subordinate) {
                $nestedSubordinates = $subordinate->getAllSubordinateIds();
                $subordinateIds = array_merge($subordinateIds, $nestedSubordinates);
            }
        }

        return array_unique($subordinateIds);
    }
    /**
     * Get all users in complete hierarchy (managers above + subordinates below)
     */
    public function getCompleteHierarchy(): Collection
    {
        $users = collect([$this]);

        // Add all managers up the chain
        $managerIds = $this->getManagersInHierarchy();
        if (!empty($managerIds)) {
            $managers = User::whereIn('id', $managerIds)
                ->with(['departments', 'currentPosition'])
                ->get();
            $users = $users->merge($managers);
        }

        // Add all subordinates down the chain
        $subordinateIds = $this->getAllSubordinateIds();
        if (!empty($subordinateIds)) {
            $subordinates = User::whereIn('id', $subordinateIds)
                ->with(['departments', 'currentPosition'])
                ->get();
            $users = $users->merge($subordinates);
        }

        return $users->unique('id');
    }
    /**
     * Get employees that this user manages directly
     */
    public function getDirectReports(): Collection
    {
        return $this->subordinates()->with(['departments', 'currentPosition'])->get();
    }

    /**
     * Get all department members for departments this user belongs to
     */
    public function getDepartmentMembers(): Collection
    {
        if ($this->departments->isEmpty()) {
            return collect();
        }

        return User::whereHas('departments', function ($query) {
            $query->whereIn('departments.id', $this->departments->pluck('id'));
        })->with(['departments', 'currentPosition'])->get();
    }
    /**
     * Check if the user has a temporary WorkOS ID (invitation pending)
     */
    public function hasPendingInvitation(): bool
    {
        return str_starts_with($this->workos_id, 'inv_');
    }

    /**
     * Check if the user has accepted their WorkOS invitation
     */
    public function hasAcceptedInvitation(): bool
    {
        return !$this->hasPendingInvitation() && !empty($this->workos_id);
    }

    /**
     * Get the user's first name from the full name
     */
    public function getFirstNameAttribute(): string
    {
        return explode(' ', $this->name)[0] ?? '';
    }

    /**
     * Get the user's last name from the full name
     */
    public function getLastNameAttribute(): string
    {
        $nameParts = explode(' ', $this->name);
        return count($nameParts) > 1 ? array_slice($nameParts, 1)[0] : '';
    }

    /**
     * Update WorkOS ID when user accepts invitation
     */
    public function updateWorkosId(string $workosId): void
    {
        if ($this->hasPendingInvitation()) {
            $this->update(['workos_id' => $workosId]);
            \Log::info("WorkOS ID updated for user {$this->email}: {$workosId}");
        }
    }



    /**
     * Get the addresses for this user.
     */
    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    /**
     * Get active addresses for this user.
     */
    public function activeAddresses(): HasMany
    {
        return $this->addresses()->active();
    }

    /**
     * Get the primary address for this user.
     */
    public function primaryAddress()
    {
        return $this->addresses()->primary()->first();
    }

    /**
     * Get addresses by type for this user.
     */
    public function getAddressesByType(string $type)
    {
        return $this->addresses()->byType($type)->active()->get();
    }


    /*
  |--------------------------------------------------------------------------
  | Document Management System Relationships
  |--------------------------------------------------------------------------
  */

    /**
     * Get folders created by this user.
     */
    public function createdFolders(): HasMany
    {
        return $this->hasMany(Folder::class, 'created_by');
    }

    /**
     * Get documents uploaded by this user.
     */
    public function uploadedDocuments(): HasMany
    {
        return $this->hasMany(Document::class, 'uploaded_by');
    }

    /**
     * Get tags created by this user.
     */
    public function createdTags(): HasMany
    {
        return $this->hasMany(Tag::class, 'created_by');
    }

    /**
     * Get folders accessible by this user.
     */
    public function accessibleFolders(): Collection
    {
        return Folder::accessibleByUser($this)->get();
    }

    /**
     * Get documents accessible by this user.
     */
    public function accessibleDocuments(): Collection
    {
        return Document::accessibleByUser($this)->get();
    }
    /**
     * Get all users in this user's hierarchy (including manager and subordinates)
     * This is used for folder/document access when assignment_type is 'hierarchy'
     */
    public function getHierarchyUserIds(): array
    {
        $userIds = [$this->id];

        // Add manager if exists
        if ($this->reports_to_user_id) {
            $userIds[] = $this->reports_to_user_id;
        }

        // Add all subordinates
        $subordinateIds = $this->subordinates()->pluck('id')->toArray();
        $userIds = array_merge($userIds, $subordinateIds);

        return array_unique($userIds);
    }
    /**
     * Check if this user is a manager (has people reporting to them)
     */
    public function isManager(): bool
    {
        return $this->subordinates()->count() > 0;
    }
    /**
     * Check if this user can access content assigned to another user via hierarchy
     */
    public function canAccessUserViaHierarchy($targetUserId): bool
    {
        $hierarchyIds = $this->getHierarchyUserIds();
        return in_array($targetUserId, $hierarchyIds);
    }
    public function getSubordinatesForFolderAssignment(): array
    {
        return $this->subordinates()
            ->select('id', 'name', 'email')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ];
            })
            ->toArray();
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }
    /**
     * Get all managers in this user's hierarchy (managers who could have this user in their hierarchy)
     */
    public function getManagersInHierarchy(): array
    {
        $managerIds = [];

        // Direct manager
        if ($this->reports_to_user_id) {
            $managerIds[] = $this->reports_to_user_id;

            // Get manager's manager (and so on up the chain)
            $manager = $this->manager;
            while ($manager && $manager->reports_to_user_id) {
                $managerIds[] = $manager->reports_to_user_id;
                $manager = $manager->manager;
            }
        }

        return array_unique($managerIds);
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function timesheetSubmissions(): HasMany
    {
        return $this->hasMany(TimesheetSubmission::class);
    }

    public function timeAdjustments(): HasMany
    {
        return $this->hasMany(TimeAdjustment::class);
    }

// Get current active time entry
    public function getCurrentTimeEntry(): ?TimeEntry
    {
        return $this->timeEntries()
            ->where('status', 'active')
            ->whereNull('clock_out_time')
            ->first();
    }

    public function currentTimeEntry()
    {
        return $this->hasOne(TimeEntry::class)->where('status', 'active')->whereNull('clock_out_time')->latest();
    }
}
