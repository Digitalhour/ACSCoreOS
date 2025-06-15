<?php
// App/Models/PtoPolicy.php
namespace App\Models\PtoModels;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PtoPolicy extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->useLogName('Time Off Policy')
            ->dontSubmitEmptyLogs();
    }
    protected $fillable = [
        'name',
        'description',
        'initial_days',
        'annual_accrual_amount',
        'bonus_days_per_year',
        'rollover_enabled',
        'max_rollover_days',
        'max_negative_balance',
        'years_for_bonus',
        'accrual_frequency',
        'prorate_first_year',
        'effective_date',
        'end_date',
        'pto_type_id',
        'user_id',
        'is_active',
    ];

    protected $casts = [
        'initial_days' => 'decimal:2',
        'annual_accrual_amount' => 'decimal:2',
        'bonus_days_per_year' => 'decimal:2',
        'rollover_enabled' => 'boolean',
        'max_rollover_days' => 'decimal:2',
        'max_negative_balance' => 'decimal:2',
        'years_for_bonus' => 'integer',
        'prorate_first_year' => 'boolean',
        'effective_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function ptoType(): BelongsTo
    {
        return $this->belongsTo(PtoType::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where('effective_date', '<=', now())
            ->where(function ($q) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', now());
            });
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForPtoType(Builder $query, int $ptoTypeId): Builder
    {
        return $query->where('pto_type_id', $ptoTypeId);
    }

    public function isCurrentlyActive(): bool
    {
        return $this->is_active &&
            $this->effective_date <= now() &&
            ($this->end_date === null || $this->end_date >= now());
    }
}
