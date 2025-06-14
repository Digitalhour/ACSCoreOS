<?php

namespace App\Models\PtoModels;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PtoBalance extends Model
{
    use HasFactory, LogsActivity;

    /**
     * The activity log options for the model.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->useLogName('Pto Balance')
            ->dontSubmitEmptyLogs();
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'pto_type_id',
        'balance',
        'pending_balance',
        'used_balance',
        'year',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'balance' => 'decimal:2',
        'pending_balance' => 'decimal:2',
        'used_balance' => 'decimal:2',
        'year' => 'integer',
    ];

    /**
     * Get the user that owns the balance.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the PTO type for this balance.
     */
    public function ptoType(): BelongsTo
    {
        return $this->belongsTo(PtoType::class);
    }

    /**
     * Get the transactions for this balance.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(PtoTransaction::class);
    }

    /**
     * Add to the balance.
     */
    public function addBalance(float $amount, string $description = null, User $createdBy = null): PtoTransaction
    {
        $this->balance += $amount;
        $this->save();

        return PtoTransaction::create([
            'user_id' => $this->user_id,
            'pto_type_id' => $this->pto_type_id,
            'amount' => $amount,
            'type' => 'accrual',
            'description' => $description ?? 'Balance adjustment',
            'created_by_id' => $createdBy?->id,
        ]);
    }

    /**
     * Subtract from the balance.
     */
    public function subtractBalance(float $amount, string $description = null, User $createdBy = null): PtoTransaction
    {
        $this->balance -= $amount;
        $this->used_balance += $amount;
        $this->save();

        return PtoTransaction::create([
            'user_id' => $this->user_id,
            'pto_type_id' => $this->pto_type_id,
            'amount' => -$amount,
            'type' => 'usage',
            'description' => $description ?? 'PTO usage',
            'created_by_id' => $createdBy?->id,
        ]);
    }

    /**
     * Add to the pending balance.
     */
    public function addPendingBalance(float $amount, PtoRequest $request = null): void
    {
        $this->pending_balance += $amount;
        $this->save();
    }

    /**
     * Subtract from the pending balance.
     */
    public function subtractPendingBalance(float $amount): void
    {
        $this->pending_balance -= $amount;
        $this->save();
    }

    /**
     * Reset the balance for a new year.
     */
    public function resetForNewYear(float $newBalance, User $createdBy = null): PtoTransaction
    {
        $oldBalance = $this->balance;
        $this->balance = $newBalance;
        $this->used_balance = 0;
        $this->pending_balance = 0;
        $this->year = now()->year;
        $this->save();

        return PtoTransaction::create([
            'user_id' => $this->user_id,
            'pto_type_id' => $this->pto_type_id,
            'amount' => $newBalance - $oldBalance,
            'type' => 'reset',
            'description' => 'Annual balance reset',
            'created_by_id' => $createdBy?->id,
        ]);
    }
}
