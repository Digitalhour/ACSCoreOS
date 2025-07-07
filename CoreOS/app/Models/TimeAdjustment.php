<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class TimeAdjustment extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'user_id',
        'time_entry_id',
        'break_entry_id',
        'adjustment_type',
        'original_data',
        'adjusted_clock_in',
        'adjusted_clock_out',
        'adjusted_hours',
        'reason',
        'employee_notes',
        'status',
        'requested_by_user_id',
        'approved_at',
        'approved_by_user_id',
        'approval_notes',
        'rejected_at',
        'rejected_by_user_id',
        'rejection_reason',
    ];

    protected $casts = [
        'original_data' => 'array',
        'adjusted_clock_in' => 'datetime',
        'adjusted_clock_out' => 'datetime',
        'adjusted_hours' => 'decimal:2',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->useLogName('Time Adjustments')
            ->dontSubmitEmptyLogs();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function timeEntry(): BelongsTo
    {
        return $this->belongsTo(TimeEntry::class);
    }

    public function breakEntry(): BelongsTo
    {
        return $this->belongsTo(BreakEntry::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public static function getAdjustmentTypes(): array
    {
        return [
            'missed_punch' => 'Missed Punch',
            'time_correction' => 'Time Correction',
            'break_adjustment' => 'Break Adjustment',
            'manual_entry' => 'Manual Entry',
        ];
    }
}
