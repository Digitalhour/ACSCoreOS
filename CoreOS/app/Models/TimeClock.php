<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TimeClock extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'timesheet_id',
        'clock_in_at',
        'clock_out_at',
        'break_start_at',
        'break_end_at',
        'break_type_id',
        'regular_hours',
        'overtime_hours',
        'break_duration',
        'notes',
        'status',
        'location_data',
    ];

    protected $casts = [
        'clock_in_at' => 'datetime',
        'clock_out_at' => 'datetime',
        'break_start_at' => 'datetime',
        'break_end_at' => 'datetime',
        'regular_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'break_duration' => 'decimal:2',
        'location_data' => 'array',
    ];

    /**
     * Get the user that owns this time clock entry.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the timesheet that this time clock entry belongs to.
     */
    public function timesheet(): BelongsTo
    {
        return $this->belongsTo(Timesheet::class);
    }

    /**
     * Get the break type for this time clock entry.
     */
    public function breakType(): BelongsTo
    {
        return $this->belongsTo(BreakType::class);
    }

    /**
     * Get the audit records for this time clock entry.
     */
    public function audits(): HasMany
    {
        return $this->hasMany(TimeClockAudit::class);
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('clock_in_at', [$startDate, $endDate]);
    }

    public function scopeForWeek($query, $weekStart)
    {
        return $query->whereBetween('clock_in_at', [
            $weekStart,
            $weekStart->copy()->addDays(6)->endOfDay()
        ]);
    }

    /**
     * Helper methods
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isOnBreak(): bool
    {
        return $this->break_start_at && !$this->break_end_at;
    }

    public function getTotalHours(): float
    {
        if (!$this->clock_out_at) {
            return 0;
        }

        $minutes = $this->clock_in_at->diffInMinutes($this->clock_out_at);
        $breakMinutes = $this->break_duration * 60;

        return round(($minutes - $breakMinutes) / 60, 2);
    }

    public function getWorkingHours(): float
    {
        return $this->regular_hours + $this->overtime_hours;
    }

    public function getCurrentBreakDuration(): float
    {
        if (!$this->break_start_at) {
            return 0;
        }

        $endTime = $this->break_end_at ?? now();
        return round($this->break_start_at->diffInMinutes($endTime) / 60, 2);
    }

    public function getFormattedClockIn(): string
    {
        return $this->clock_in_at ? $this->clock_in_at->format('g:i A') : '';
    }

    public function getFormattedClockOut(): string
    {
        return $this->clock_out_at ? $this->clock_out_at->format('g:i A') : '';
    }

    public function getFormattedBreakDuration(): string
    {
        if ($this->break_duration == 0) {
            return '0:00';
        }

        $hours = floor($this->break_duration);
        $minutes = ($this->break_duration - $hours) * 60;

        return sprintf('%d:%02d', $hours, $minutes);
    }

    public function getFormattedWorkingHours(): string
    {
        $totalHours = $this->getWorkingHours();
        $hours = floor($totalHours);
        $minutes = ($totalHours - $hours) * 60;

        return sprintf('%d:%02d', $hours, $minutes);
    }

    /**
     * Calculate overtime based on active overtime rules
     */
    public function calculateOvertime(): void
    {
        $totalHours = $this->getTotalHours();
        $regularHours = $totalHours;
        $overtimeHours = 0;

        // Get active overtime rules
        $rules = OvertimeRule::active()->orderBy('priority')->get();

        foreach ($rules as $rule) {
            if ($rule->type === 'daily' && $rule->daily_threshold) {
                if ($totalHours > $rule->daily_threshold) {
                    $overtimeHours += $totalHours - $rule->daily_threshold;
                    $regularHours = $rule->daily_threshold;
                    break; // Use first matching rule
                }
            }
        }

        $this->update([
            'regular_hours' => $regularHours,
            'overtime_hours' => $overtimeHours,
        ]);
    }

    /**
     * Create audit record for this time clock entry
     */
    public function createAudit(string $action, array $additionalData = []): TimeClockAudit
    {
        return $this->audits()->create([
            'user_id' => $this->user_id,
            'action' => $action,
            'action_timestamp' => now(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'device_info' => [
                'platform' => request()->header('sec-ch-ua-platform'),
                'browser' => request()->header('user-agent'),
            ],
            ...$additionalData
        ]);
    }
}
