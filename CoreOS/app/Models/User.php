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
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Lab404\Impersonate\Models\Impersonate;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, LogsActivity, Impersonate;


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
     * Get all historical reporting assignments for this user (where they are the employee).
     */
    public function reportingAssignments(): HasMany
    {
        return $this->hasMany(UserReportingAssignment::class, 'user_id');
    }

    /**
     * Get all historical reporting assignments where this user was the manager.
     */
    public function managedAssignments(): HasMany
    {
        return $this->hasMany(UserReportingAssignment::class, 'manager_id');
    }

    /**
     * Get the current active reporting assignment for this user.
     */
    public function currentReportingAssignment()
    {
        return $this->hasOne(UserReportingAssignment::class, 'user_id')->whereNull('end_date');
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
}
