<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class TimeEntry extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'user_id',
        'clock_in_time',
        'clock_out_time',
        'total_hours',
        'regular_hours',
        'overtime_hours',
        'clock_in_ip',
        'clock_in_device',
        'clock_in_location',
        'clock_in_user_agent',
        'clock_out_ip',
        'clock_out_device',
        'clock_out_location',
        'clock_out_user_agent',
        'status',
        'notes',
        'adjustment_reason',
        'adjusted_by_user_id',
        'adjusted_at',
        'overtime_rule_id',
    ];

    protected $casts = [
        'clock_in_time' => 'datetime',
        'clock_out_time' => 'datetime',
        'total_hours' => 'decimal:2',
        'regular_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'clock_in_location' => 'array',
        'clock_out_location' => 'array',
        'adjusted_at' => 'datetime',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->useLogName('Time Entries')
            ->dontSubmitEmptyLogs();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function adjustedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adjusted_by_user_id');
    }

    public function overtimeRule(): BelongsTo
    {
        return $this->belongsTo(OvertimeRule::class);
    }

    public function breakEntries(): HasMany
    {
        return $this->hasMany(BreakEntry::class);
    }

    public function timeAdjustments(): HasMany
    {
        return $this->hasMany(TimeAdjustment::class);
    }

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
        return $query->whereBetween('clock_in_time', [$startDate, $endDate]);
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && is_null($this->clock_out_time);
    }

    public function clockOut($metadata = []): bool
    {
        if (!$this->isActive()) {
            return false;
        }

        $clockOutTime = now();

        // End any active breaks
        $this->breakEntries()->where('status', 'active')->update([
            'break_end' => $clockOutTime,
            'status' => 'completed',
            'end_ip' => $metadata['ip'] ?? null,
            'end_location' => $metadata['location'] ?? null,
        ]);

        // Calculate total break time
        $this->breakEntries()->completed()->each(function ($break) {
            if (!$break->duration_minutes && $break->break_end) {
                $break->update([
                    'duration_minutes' => $break->break_start->diffInMinutes($break->break_end)
                ]);
            }
        });

        $totalBreakMinutes = $this->breakEntries()->completed()->sum('duration_minutes');

        // Calculate total work hours (excluding breaks)
        $totalMinutes = $this->clock_in_time->diffInMinutes($clockOutTime);
        $workMinutes = $totalMinutes - $totalBreakMinutes;
        $totalHours = round($workMinutes / 60, 2);

        // Get overtime rule and calculate regular/overtime hours
        $overtimeRule = OvertimeRule::getForUser($this->user);
        $regularHours = min($totalHours, $overtimeRule->daily_threshold);
        $overtimeHours = max(0, $totalHours - $overtimeRule->daily_threshold);

        return $this->update([
            'clock_out_time' => $clockOutTime,
            'total_hours' => $totalHours,
            'regular_hours' => $regularHours,
            'overtime_hours' => $overtimeHours,
            'status' => 'completed',
            'overtime_rule_id' => $overtimeRule->id,
            'clock_out_ip' => $metadata['ip'] ?? null,
            'clock_out_device' => $metadata['device'] ?? null,
            'clock_out_location' => $metadata['location'] ?? null,
            'clock_out_user_agent' => $metadata['user_agent'] ?? null,
        ]);
    }

    public function getCurrentBreak(): ?BreakEntry
    {
        return $this->breakEntries()->where('status', 'active')->first();
    }

    public function getTotalBreakMinutes(): int
    {
        return $this->breakEntries()->completed()->sum('duration_minutes');
    }

    public function getFormattedDuration(): string
    {
        if (!$this->clock_out_time) {
            $duration = $this->clock_in_time->diffInMinutes(now());
        } else {
            $duration = $this->clock_in_time->diffInMinutes($this->clock_out_time);
        }

        $hours = floor($duration / 60);
        $minutes = $duration % 60;

        return sprintf('%d:%02d', $hours, $minutes);
    }

    public function recalculateHours(): void
    {
        if (!$this->clock_out_time) return;

        $totalBreakMinutes = $this->getTotalBreakMinutes();
        $totalMinutes = $this->clock_in_time->diffInMinutes($this->clock_out_time);
        $workMinutes = $totalMinutes - $totalBreakMinutes;
        $totalHours = round($workMinutes / 60, 2);

        $overtimeRule = $this->overtimeRule ?? OvertimeRule::getForUser($this->user);
        $regularHours = min($totalHours, $overtimeRule->daily_threshold);
        $overtimeHours = max(0, $totalHours - $overtimeRule->daily_threshold);

        $this->update([
            'total_hours' => $totalHours,
            'regular_hours' => $regularHours,
            'overtime_hours' => $overtimeHours,
            'overtime_rule_id' => $overtimeRule->id,
        ]);
    }
}
