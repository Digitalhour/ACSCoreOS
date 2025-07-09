<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeClockAudit extends Model
{
    use HasFactory;

    protected $fillable = [
        'time_clock_id',
        'user_id',
        'action',
        'action_timestamp',
        'ip_address',
        'user_agent',
        'device_info',
        'location_data',
        'edited_by',
        'previous_data',
        'new_data',
        'edit_reason',
    ];

    protected $casts = [
        'action_timestamp' => 'datetime',
        'device_info' => 'array',
        'location_data' => 'array',
        'previous_data' => 'array',
        'new_data' => 'array',
    ];

    /**
     * Get the time clock entry that this audit belongs to.
     */
    public function timeClock(): BelongsTo
    {
        return $this->belongsTo(TimeClock::class);
    }

    /**
     * Get the user that performed this action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who edited this entry (for manual edits).
     */
    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'edited_by');
    }

    /**
     * Scopes
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForAction($query, $action)
    {
        return $query->where('action', $action);
    }

    public function scopeForDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('action_timestamp', [$startDate, $endDate]);
    }

    public function scopeManualEdits($query)
    {
        return $query->where('action', 'manual_edit');
    }

    /**
     * Helper methods
     */
    public function isManualEdit(): bool
    {
        return $this->action === 'manual_edit';
    }

    public function getFormattedTimestamp(): string
    {
        return $this->action_timestamp->format('M j, Y g:i A');
    }

    public function getActionLabel(): string
    {
        return match($this->action) {
            'clock_in' => 'Clocked In',
            'clock_out' => 'Clocked Out',
            'break_start' => 'Started Break',
            'break_end' => 'Ended Break',
            'manual_edit' => 'Manual Edit',
            default => ucfirst(str_replace('_', ' ', $this->action)),
        };
    }

    public function getBrowserInfo(): string
    {
        if (!$this->device_info) {
            return 'Unknown';
        }

        $userAgent = $this->device_info['browser'] ?? $this->user_agent ?? '';

        // Simple browser detection
        if (str_contains($userAgent, 'Chrome')) {
            return 'Chrome';
        } elseif (str_contains($userAgent, 'Firefox')) {
            return 'Firefox';
        } elseif (str_contains($userAgent, 'Safari')) {
            return 'Safari';
        } elseif (str_contains($userAgent, 'Edge')) {
            return 'Edge';
        }

        return 'Unknown';
    }

    public function getPlatformInfo(): string
    {
        if (!$this->device_info) {
            return 'Unknown';
        }

        $platform = $this->device_info['platform'] ?? '';

        return match(true) {
            str_contains($platform, 'Windows') => 'Windows',
            str_contains($platform, 'macOS') => 'macOS',
            str_contains($platform, 'Linux') => 'Linux',
            str_contains($platform, 'iOS') => 'iOS',
            str_contains($platform, 'Android') => 'Android',
            default => 'Unknown',
        };
    }
}
