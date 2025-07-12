<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TimeClockBreak extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'time_clock_id',
        'user_id',
        'break_type_id',
        'break_start_at',
        'break_end_at',
        'duration_minutes',
        'status',
        'notes',
    ];

    protected $casts = [
        'break_start_at' => 'datetime',
        'break_end_at' => 'datetime',
        'duration_minutes' => 'decimal:2',
    ];

    public function timeClock(): BelongsTo
    {
        return $this->belongsTo(TimeClock::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function breakType(): BelongsTo
    {
        return $this->belongsTo(BreakType::class);
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

    // Helper methods
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function endBreak(): bool
    {
        if ($this->isCompleted()) {
            return false;
        }

        $endTime = now();
        $durationMinutes = $this->break_start_at->diffInMinutes($endTime);

        return $this->update([
            'break_end_at' => $endTime,
            'duration_minutes' => $durationMinutes,
            'status' => 'completed',
        ]);
    }

    public function validateTimes($newStartTime = null, $newEndTime = null): array
    {
        $errors = [];

        $startTime = $newStartTime ? Carbon::parse($newStartTime) : $this->break_start_at;
        $endTime = $newEndTime ? Carbon::parse($newEndTime) : $this->break_end_at;

        if (!$startTime) {
            $errors[] = 'Break start time is required';
            return $errors;
        }

        if ($endTime && $startTime >= $endTime) {
            $errors[] = 'Break end time must be after start time';
        }

        // Validate against parent time clock
        $timeClock = $this->timeClock;
        if ($timeClock) {
            if ($startTime < $timeClock->clock_in_at) {
                $errors[] = 'Break cannot start before clock in time';
            }

            if ($timeClock->clock_out_at && $startTime >= $timeClock->clock_out_at) {
                $errors[] = 'Break cannot start after clock out time';
            }

            if ($endTime && $timeClock->clock_out_at && $endTime > $timeClock->clock_out_at) {
                $errors[] = 'Break cannot end after clock out time';
            }
        }

        // Check for overlaps with other breaks in same punch
        $otherBreaks = static::where('time_clock_id', $this->time_clock_id)
            ->where('id', '!=', $this->id)
            ->get();

        foreach ($otherBreaks as $otherBreak) {
            $otherStart = $otherBreak->break_start_at;
            $otherEnd = $otherBreak->break_end_at ?: now();

            if ($startTime < $otherEnd && ($endTime ? $endTime > $otherStart : true)) {
                $errors[] = 'Break overlaps with another break period';
                break;
            }
        }

        return $errors;
    }

    public function getDurationHours(): float
    {
        return round($this->duration_minutes / 60, 2);
    }

    public function getFormattedDuration(): string
    {
        $hours = floor($this->duration_minutes / 60);
        $minutes = $this->duration_minutes % 60;
        return sprintf('%d:%02d', $hours, $minutes);
    }
}
