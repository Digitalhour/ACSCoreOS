<?php

namespace App\Models\PtoModels;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PtoTransaction extends Model
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
            ->useLogName('Time Off Transaction')
            ->dontSubmitEmptyLogs();
    }

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'transaction_number',
        'user_id',
        'pto_type_id',
        'pto_request_id',
        'amount',
        'balance_before',
        'balance_after',
        'type',
        'description',
        'metadata',
        'created_by_id',
        'effective_date',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'metadata' => 'array',
        'effective_date' => 'datetime',
    ];

    /**
     * Get the user this transaction belongs to.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the PTO type for this transaction.
     */
    public function ptoType(): BelongsTo
    {
        return $this->belongsTo(PtoType::class);
    }

    /**
     * Get the PTO request this transaction is related to.
     */
    public function ptoRequest(): BelongsTo
    {
        return $this->belongsTo(PtoRequest::class);
    }

    /**
     * Get the user who created this transaction.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Scope a query for a specific transaction type.
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($transaction) {
            if (!$transaction->transaction_number) {
                $transaction->transaction_number = 'TXN-'.now()->format('Y').'-'.str_pad(
                        static::whereYear('created_at', now()->year)->count() + 1,
                        6,
                        '0',
                        STR_PAD_LEFT
                    );
            }
        });
    }
}
