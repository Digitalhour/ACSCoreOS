<?php

namespace App\Models\PtoModels;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PtoRequest extends Model
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
            ->useLogName('PTO Request')
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
        'request_number',
        'start_date',
        'end_date',
        'start_time',
        'end_time',
        'total_days',
        'reason',
        'status',
        'day_options',
        'approval_notes',
        'denial_reason',
        'cancellation_reason',
        'approved_by_id',
        'approved_at',
        'denied_at',
        'cancelled_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'total_days' => 'decimal:2',
        'day_options' => 'array',
        'approved_at' => 'datetime',
        'denied_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    /**
     * Get the user that owns the request.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the PTO type for this request.
     */
    public function ptoType(): BelongsTo
    {
        return $this->belongsTo(PtoType::class);
    }

    /**
     * Get the user who approved this request.
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    /**
     * Scope a query to only include pending requests.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include approved requests.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope a query to only include denied requests.
     */
    public function scopeDenied($query)
    {
        return $query->where('status', 'denied');
    }

    /**
     * Scope a query to only include cancelled requests.
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Check if the request is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if the request is approved.
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }
    /**
     * Get the approvals for this request.
     */
    public function approvals(): HasMany
    {
        return $this->hasMany(PtoApproval::class);
    }
    /**
     * Check if the request is denied.
     */
    public function isDenied(): bool
    {
        return $this->status === 'denied';
    }
    public function deniedBy()
    {
        return $this->belongsTo(User::class, 'denied_by');
    }
    /**
     * Check if the request is cancelled.
     */
    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * Get the status badge color.
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'pending' => 'yellow',
            'approved' => 'green',
            'denied' => 'red',
            'cancelled' => 'gray',
            default => 'gray',
        };
    }
}
