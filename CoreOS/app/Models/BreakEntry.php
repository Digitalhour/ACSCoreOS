<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class BreakEntry extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'time_entry_id',
        'user_id',
        'break_start',
        'break_end',
        'duration_minutes',
        'break_type',
        'break_label',
        'notes',
        'start_ip',
        'end_ip',
        'start_location',
        'end_location',
        'status',
        'adjustment_reason',
        'adjusted_by_user_id',
        'adjusted_at',
    ];

    protected $casts = [
        'break_start' => 'datetime',
        'break_end' => 'datetime',
        'duration_minutes' => 'decimal:2',
        'start_location' => 'array',
        'end_location' => 'array',
        'adjusted_at' => 'datetime',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->useLogName('Break Entries')
            ->dontSubmitEmptyLogs();
    }

    public function timeEntry(): BelongsTo
    {
        return $this->belongsTo(TimeEntry::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function adjustedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adjusted_by_user_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && is_null($this->break_end);
    }

    public function endBreak($metadata = []): bool
    {
        if (!$this->isActive()) {
            return false;
        }

        $endTime = now();
        $duration = $this->break_start->diffInMinutes($endTime);

        return $this->update([
            'break_end' => $endTime,
            'duration_minutes' => $duration,
            'status' => 'completed',
            'end_ip' => $metadata['ip'] ?? null,
            'end_location' => $metadata['location'] ?? null,
        ]);
    }

    public function getFormattedDuration(): string
    {
        if (!$this->break_end) {
            $duration = $this->break_start->diffInMinutes(now());
        } else {
            $duration = $this->duration_minutes ?? $this->break_start->diffInMinutes($this->break_end);
        }

        $hours = floor($duration / 60);
        $minutes = $duration % 60;

        return sprintf('%d:%02d', $hours, $minutes);
    }

    public static function getBreakTypes(): array
    {
        return [
            'lunch' => 'Lunch Break',
            'personal' => 'Personal Break',
            'rest' => 'Rest Break',
            'extended' => 'Extended Break',
            'other' => 'Other',
        ];
    }
}
