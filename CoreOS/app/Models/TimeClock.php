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
        'punch_type',
        'break_type_id',
        'clock_in_at',
        'clock_out_at',
        'regular_hours',
        'overtime_hours',
        'notes',
        'status',
        'location_data',
    ];

    protected $casts = [
        'clock_in_at' => 'datetime',
        'clock_out_at' => 'datetime',
        'regular_hours' => 'float',
        'overtime_hours' => 'float',
        'location_data' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function timesheet(): BelongsTo
    {
        return $this->belongsTo(Timesheet::class);
    }

    public function breakType(): BelongsTo
    {
        return $this->belongsTo(BreakType::class);
    }

    public function audits(): HasMany
    {
        return $this->hasMany(TimeClockAudit::class);
    }

    // Scopes
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

    public function scopeWorkPunches($query)
    {
        return $query->where('punch_type', 'work');
    }

    public function scopeBreakPunches($query)
    {
        return $query->where('punch_type', 'break');
    }

    public function scopeForWeek($query, $weekStart)
    {
        return $query->whereBetween('clock_in_at', [
            $weekStart,
            $weekStart->copy()->addDays(6)->endOfDay()
        ]);
    }

    // Helper methods
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isWorkPunch(): bool
    {
        return $this->punch_type === 'work';
    }

    public function isBreakPunch(): bool
    {
        return $this->punch_type === 'break';
    }

    public function getTotalHours(): float
    {
        if (!$this->clock_out_at) {
            return 0;
        }

        $minutes = $this->clock_in_at->diffInMinutes($this->clock_out_at);
        return round($minutes / 60, 2);
    }

    public function calculateOvertime(): void
    {
        if (!$this->isWorkPunch()) {
            return; // Only work punches get overtime
        }

        $totalHours = $this->getTotalHours();
        $regularHours = $totalHours;
        $overtimeHours = 0;

        // Get active overtime rules
        $rules = OvertimeRule::active()->orderBy('priority')->get();

        foreach ($rules as $rule) {
            if ($rule->type === 'daily' && $rule->daily_threshold) {
                if ($totalHours > $rule->daily_threshold) {
                    $overtimeHours = $totalHours - $rule->daily_threshold;
                    $regularHours = $rule->daily_threshold;
                    break;
                }
            }
        }

        $this->update([
            'regular_hours' => $regularHours,
            'overtime_hours' => $overtimeHours,
        ]);
    }

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

    public function getFormattedClockIn(): string
    {
        return $this->clock_in_at ? $this->clock_in_at->format('g:i A') : '';
    }

    public function getFormattedClockOut(): string
    {
        return $this->clock_out_at ? $this->clock_out_at->format('g:i A') : '';
    }

    public function getFormattedHours(): string
    {
        $totalHours = $this->getTotalHours();
        $hours = floor($totalHours);
        $minutes = ($totalHours - $hours) * 60;

        return sprintf('%d:%02d', $hours, $minutes);
    }

    // Static methods for user status
    public static function getUserActiveWorkPunch($userId): ?self
    {
        return static::forUser($userId)->workPunches()->active()->first();
    }

    public static function getUserActiveBreakPunch($userId): ?self
    {
        return static::forUser($userId)->breakPunches()->active()->first();
    }

    public static function getUserCurrentStatus($userId): array
    {
        $workPunch = static::getUserActiveWorkPunch($userId);
        $breakPunch = static::getUserActiveBreakPunch($userId);

        return [
            'is_clocked_in' => $workPunch !== null,
            'is_on_break' => $breakPunch !== null,
            'current_work_punch' => $workPunch,
            'current_break_punch' => $breakPunch,
        ];
    }
}
