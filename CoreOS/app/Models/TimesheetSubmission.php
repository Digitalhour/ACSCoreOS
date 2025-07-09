<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class TimesheetSubmission extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'user_id',
        'week_start_date',
        'week_end_date',
        'total_hours',
        'regular_hours',
        'overtime_hours',
        'break_hours',
        'status',
        'submitted_at',
        'submitted_by_user_id',
        'self_submitted',
        'submission_notes',
        'legal_acknowledgment',
        'approved_at',
        'approved_by_user_id',
        'approval_notes',
        'rejected_at',
        'rejected_by_user_id',
        'rejection_reason',
        'locked_at',
        'locked_by_user_id',
        'lock_reason',
        'time_entry_ids',
        'summary_data',
    ];

    protected $casts = [
        'week_start_date' => 'date',
        'week_end_date' => 'date',
        'total_hours' => 'decimal:2',
        'regular_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'break_hours' => 'decimal:2',
        'self_submitted' => 'boolean',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'locked_at' => 'datetime',
        'time_entry_ids' => 'array',
        'summary_data' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->useLogName('Timesheet Submissions')
            ->dontSubmitEmptyLogs();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function lockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by_user_id');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeSubmitted($query)
    {
        return $query->where('status', 'submitted');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeLocked($query)
    {
        return $query->where('status', 'locked');
    }

    public function isPending(): bool
    {
        return $this->status === 'submitted';
    }

    public function isLocked(): bool
    {
        return $this->status === 'locked';
    }

    public function canEdit(): bool
    {
        return in_array($this->status, ['draft', 'rejected']);
    }

    public static function createForWeek(User $user, Carbon $weekStart): self
    {
        $weekEnd = $weekStart->copy()->endOfWeek();

        // Get time entries for the week
        $timeEntries = TimeEntry::forUser($user->id)
            ->forDateRange($weekStart, $weekEnd)
            ->completed()
            ->get();

        $totalHours = $timeEntries->sum('total_hours');
        $regularHours = $timeEntries->sum('regular_hours');
        $overtimeHours = $timeEntries->sum('overtime_hours');

        // Calculate total break hours
        $breakMinutes = $timeEntries->sum(function ($entry) {
            return $entry->getTotalBreakMinutes();
        });
        $breakHours = round($breakMinutes / 60, 2);

        // Create daily summary
        $summaryData = [];
        $currentDate = $weekStart->copy();

        while ($currentDate <= $weekEnd) {
            $dayEntries = $timeEntries->filter(function ($entry) use ($currentDate) {
                return $entry->clock_in_time->isSameDay($currentDate);
            });

            $summaryData[] = [
                'date' => $currentDate->format('Y-m-d'),
                'day_name' => $currentDate->format('l'),
                'total_hours' => $dayEntries->sum('total_hours'),
                'regular_hours' => $dayEntries->sum('regular_hours'),
                'overtime_hours' => $dayEntries->sum('overtime_hours'),
                'break_minutes' => $dayEntries->sum(function ($entry) {
                    return $entry->getTotalBreakMinutes();
                }),
                'entries_count' => $dayEntries->count(),
            ];

            $currentDate->addDay();
        }

        // Use updateOrCreate to handle existing submissions
        $submission = self::updateOrCreate([
            'user_id' => $user->id,
            'week_start_date' => $weekStart->startOfWeek(),
        ], [
            'week_end_date' => $weekEnd->endOfWeek(),
            'total_hours' => $totalHours,
            'regular_hours' => $regularHours,
            'overtime_hours' => $overtimeHours,
            'break_hours' => $breakHours,
            'time_entry_ids' => $timeEntries->pluck('id')->toArray(),
            'summary_data' => $summaryData,
            'status' => 'draft',
        ]);

        return $submission;
    }

    public function getWeekDisplay(): string
    {
        return $this->week_start_date->format('M d') . ' - ' . $this->week_end_date->format('M d, Y');
    }
}
