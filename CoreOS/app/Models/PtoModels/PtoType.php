<?php

namespace App\Models\PtoModels;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PtoType extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'code',
        'description',
        'color',
        'multi_level_approval',
        'disable_hierarchy_approval',
        'specific_approvers',
        'uses_balance',
        'carryover_allowed',
        'negative_allowed',
        'affects_schedule',
        'show_in_department_calendar',
        'is_active',
        'sort_order',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'multi_level_approval' => 'boolean',
        'disable_hierarchy_approval' => 'boolean',
        'specific_approvers' => 'array',
        'uses_balance' => 'boolean',
        'carryover_allowed' => 'boolean',
        'negative_allowed' => 'boolean',
        'affects_schedule' => 'boolean',
        'show_in_department_calendar' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['approver_users'];


    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'deleted_at',
    ];

    /**
     * Accessor to get user models from the IDs stored in specific_approvers.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getApproverUsersAttribute(): EloquentCollection
    {
        if (empty($this->specific_approvers)) {
            return new EloquentCollection();
        }
        return User::whereIn('id', $this->specific_approvers)->get(['id', 'name', 'email']);
    }

    /**
     * Get the policies for this PTO type.
     */
    public function policies(): HasMany
    {
        return $this->hasMany(PtoPolicy::class);
    }

    /**
     * Get the requests for this PTO type.
     */
    public function requests(): HasMany
    {
        return $this->hasMany(PtoRequest::class);
    }

    /**
     * Get the balances for this PTO type.
     */
    public function balances(): HasMany
    {
        return $this->hasMany(PtoBalance::class);
    }

    /**
     * Get the transactions for this PTO type.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(PtoTransaction::class);
    }

    /**
     * Get the blackouts that restrict this PTO type.
     */
    public function blackouts(): HasMany
    {
        return $this->hasMany(PtoBlackout::class);
    }

    /**
     * Scope a query to only include active PTO types.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include PTO types that show in department calendar.
     */
    public function scopeShowInDepartmentCalendar(Builder $query): Builder
    {
        return $query->where('show_in_department_calendar', true);
    }

    /**
     * Scope a query to order by sort order and name.
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Get the display name with code.
     */
    protected function displayName(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->code ? "{$this->name} ({$this->code})" : $this->name,
        );
    }

    /**
     * Check if this PTO type can be deleted.
     */
    public function canBeDeleted(): bool
    {
        return $this->policies()->count() === 0
            && $this->requests()->count() === 0
            && $this->balances()->count() === 0
            && $this->transactions()->count() === 0;
    }

    /**
     * Get usage statistics for this PTO type.
     */
    public function getUsageStats(): array
    {
        return [
            'policies_count' => $this->policies()->count(),
            'requests_count' => $this->requests()->count(),
            'active_requests_count' => $this->requests()->whereIn('status', ['pending', 'approved'])->count(),
            'users_with_balance_count' => $this->balances()->distinct('user_id')->count(),
        ];
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate code if not provided
        static::creating(function ($ptoType) {
            if (!$ptoType->code) {
                $ptoType->code = strtoupper(substr($ptoType->name, 0, 4));

                // Ensure uniqueness
                $counter = 1;
                $originalCode = $ptoType->code;
                while (static::where('code', $ptoType->code)->exists()) {
                    $ptoType->code = $originalCode . $counter;
                    $counter++;
                }
            }

            // Set sort order if not provided
            if (!$ptoType->sort_order) {
                $maxOrder = static::max('sort_order') ?? 0;
                $ptoType->sort_order = $maxOrder + 10;
            }
        });
    }
}
