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
    public function getVisibleUsers(): Collection
    {
        $users = collect([$this]); // Always include self

        // Add direct reports
        $users = $users->merge($this->directReports);

        // Add department members if user is a manager
        if ($this->canApprovePto()) {
            $departmentUsers = User::whereHas('departments', function ($query) {
                $query->whereIn('departments.id', $this->departments->pluck('id'));
            })->get();

            $users = $users->merge($departmentUsers);
        }

        return $users->unique('id');
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








}
