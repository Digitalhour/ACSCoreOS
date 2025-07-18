<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Timesheet extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'week_start_date',
        'week_end_date',
        'status',
        'total_hours',
        'regular_hours',
        'overtime_hours',
        'break_hours',
        'notes',
        'legal_acknowledgment',
    ];

    protected $casts = [
        'week_start_date' => 'date',
        'week_end_date' => 'date',
        'total_hours' => 'decimal:2',
        'regular_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'break_hours' => 'decimal:2',
        'legal_acknowledgment' => 'boolean',
    ];

    /**
     * Get the user that owns this timesheet.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all actions for this timesheet.
     */
    public function actions(): HasMany
    {
        return $this->hasMany(TimesheetAction::class)->orderBy('created_at', 'asc');
    }

    /**
     * Get the latest action for this timesheet.
     */
    public function latestAction(): HasOne
    {
        return $this->hasOne(TimesheetAction::class)->latestOfMany();
    }

    /**
     * Get the submission action.
     */
    public function submissionAction(): HasOne
    {
        return $this->hasOne(TimesheetAction::class)
            ->where('action', TimesheetAction::ACTION_SUBMITTED)
            ->latestOfMany();
    }

    /**
     * Get the approval action.
     */
    public function approvalAction(): HasOne
    {
        return $this->hasOne(TimesheetAction::class)
            ->where('action', TimesheetAction::ACTION_APPROVED)
            ->latestOfMany();
    }

    /**
     * Get the rejection action.
     */
    public function rejectionAction(): HasOne
    {
        return $this->hasOne(TimesheetAction::class)
            ->where('action', TimesheetAction::ACTION_REJECTED)
            ->latestOfMany();
    }

    /**
     * Get the processing action.
     */
    public function processingAction(): HasOne
    {
        return $this->hasOne(TimesheetAction::class)
            ->where('action', TimesheetAction::ACTION_PROCESSED)
            ->latestOfMany();
    }

    /**
     * Get the withdrawal action.
     */
    public function withdrawalAction(): HasOne
    {
        return $this->hasOne(TimesheetAction::class)
            ->where('action', TimesheetAction::ACTION_WITHDRAWN)
            ->latestOfMany();
    }

    /**
     * Get the time clock entries for this timesheet.
     */
    public function timeClocks(): HasMany
    {
        return $this->hasMany(TimeClock::class);
    }

    /**
     * Scopes
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForWeek($query, Carbon $weekStart)
    {
        return $query->where('week_start_date', $weekStart->startOfWeek(Carbon::SUNDAY));
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
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

    public function scopeProcessed($query)
    {
        return $query->where('status', 'processed');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeForDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('week_start_date', [$startDate, $endDate]);
    }

    public function scopeRequiringApproval($query)
    {
        return $query->where('status', 'submitted');
    }

    public function scopeRequiringProcessing($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Status check methods
     */
    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isSubmitted(): bool
    {
        return $this->status === 'submitted';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isProcessed(): bool
    {
        return $this->status === 'processed';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    public function canBeWithdrawn(): bool
    {
        return $this->isSubmitted();
    }

    public function canBeEdited(): bool
    {
        return $this->isDraft() || $this->isSubmitted();
    }

    public function canBeRejected(): bool
    {
        return $this->isSubmitted() || $this->isApproved();
    }

    public function canBeResubmitted(): bool
    {
        return $this->isRejected();
    }

    /**
     * Helper methods
     */
    public function getStatusLabel(): string
    {
        return match($this->status) {
            'draft' => 'Draft',
            'submitted' => 'Submitted',
            'approved' => 'Approved',
            'processed' => 'Processed',
            'rejected' => 'Rejected',
            default => ucfirst($this->status),
        };
    }

    public function getStatusColor(): string
    {
        return match($this->status) {
            'draft' => 'bg-gray-100 text-gray-800',
            'submitted' => 'bg-blue-100 text-blue-800',
            'approved' => 'bg-green-100 text-green-800',
            'processed' => 'bg-purple-100 text-purple-800',
            'rejected' => 'bg-red-100 text-red-800',
            default => 'bg-gray-100 text-gray-800',
        };
    }

    public function getWeekLabel(): string
    {
        return $this->week_start_date->format('M j') . ' - ' . $this->week_end_date->format('M j, Y');
    }

    public function getFormattedHours(string $type = 'total'): string
    {
        $hours = match($type) {
            'total' => $this->total_hours,
            'regular' => $this->regular_hours,
            'overtime' => $this->overtime_hours,
            'break' => $this->break_hours,
            default => $this->total_hours,
        };

        $h = floor($hours);
        $m = round(($hours - $h) * 60);
        return sprintf('%d:%02d', $h, $m);
    }

    /**
     * Calculate and update timesheet totals from time clock entries
     */
    public function calculateTotals(): void
    {
        $timeClocks = $this->timeClocks()->completed()->get();

        $totalWorkHours = 0;
        $totalBreakHours = 0;
        $regularHours = 0;
        $overtimeHours = 0;

        // Calculate total work hours for the week
        foreach ($timeClocks as $timeClock) {
            if ($timeClock->punch_type === 'work') {
                $totalWorkHours += $timeClock->getTotalHours();
            } else {
                $totalBreakHours += $timeClock->getTotalHours();
            }
        }

        // Apply 40-hour weekly overtime rule
        if ($totalWorkHours > 40) {
            $regularHours = 40;
            $overtimeHours = $totalWorkHours - 40;
        } else {
            $regularHours = $totalWorkHours;
            $overtimeHours = 0;
        }

        $this->update([
            'total_hours' => $totalWorkHours,
            'regular_hours' => $regularHours,
            'overtime_hours' => $overtimeHours,
            'break_hours' => $totalBreakHours,
        ]);
    }

    /**
     * Submit the timesheet
     */
    public function submit(int $submittedBy, bool $legalAcknowledgment = true, ?string $notes = null): bool
    {
        if (!$this->isDraft() && !$this->isRejected()) {
            return false;
        }

        $this->calculateTotals();

        // Update timesheet status and legal acknowledgment
        $success = $this->update([
            'status' => 'submitted',
            'legal_acknowledgment' => $legalAcknowledgment,
        ]);

        if ($success) {
            // Create submission action
            TimesheetAction::createAction(
                $this->id,
                $submittedBy,
                TimesheetAction::ACTION_SUBMITTED,
                $notes
            );
        }

        return $success;
    }

    /**
     * Withdraw the timesheet back to draft
     */
    public function withdraw(int $withdrawnBy, string $reason): bool
    {
        if (!$this->canBeWithdrawn()) {
            return false;
        }

        $success = $this->update([
            'status' => 'draft',
            'legal_acknowledgment' => false,
        ]);

        if ($success) {
            // Create withdrawal action
            TimesheetAction::createAction(
                $this->id,
                $withdrawnBy,
                TimesheetAction::ACTION_WITHDRAWN,
                $reason
            );
        }

        return $success;
    }

    /**
     * Approve the timesheet (manager action)
     */
    public function approve(int $approvedBy, ?string $managerNotes = null): bool
    {
        if (!$this->isSubmitted()) {
            return false;
        }

        $this->calculateTotals();

        $success = $this->update([
            'status' => 'approved',
        ]);

        if ($success) {
            // Create approval action
            TimesheetAction::createAction(
                $this->id,
                $approvedBy,
                TimesheetAction::ACTION_APPROVED,
                $managerNotes
            );
        }

        return $success;
    }

    /**
     * Reject the timesheet (manager/payroll action)
     */
    public function reject(int $rejectedBy, string $rejectionReason, ?string $rejectionNotes = null): bool
    {
        if (!$this->canBeRejected()) {
            return false;
        }

        $success = $this->update([
            'status' => 'rejected',
        ]);

        if ($success) {
            // Create rejection action with metadata
            TimesheetAction::createAction(
                $this->id,
                $rejectedBy,
                TimesheetAction::ACTION_REJECTED,
                $rejectionNotes,
                [
                    'rejection_reason' => $rejectionReason,
                    'rejection_notes' => $rejectionNotes,
                ]
            );
        }

        return $success;
    }

    /**
     * Process the timesheet (payroll action)
     */
    public function process(int $processedBy, ?string $payrollNotes = null): bool
    {
        if (!$this->isApproved() && !$this->isDraft() && !$this->isSubmitted()) {
            return false;
        }

        $success = $this->update([
            'status' => 'processed',
        ]);

        if ($success) {
            // Create processing action
            TimesheetAction::createAction(
                $this->id,
                $processedBy,
                TimesheetAction::ACTION_PROCESSED,
                $payrollNotes
            );
        }

        return $success;
    }

    /**
     * Accessor methods for backward compatibility
     */
    public function getSubmittedAtAttribute()
    {
        return $this->submissionAction?->created_at;
    }

    public function getSubmittedByAttribute()
    {
        return $this->submissionAction?->user_id;
    }

    public function getApprovedAtAttribute()
    {
        return $this->approvalAction?->created_at;
    }

    public function getApprovedByAttribute()
    {
        return $this->approvalAction?->user_id;
    }

    public function getProcessedAtAttribute()
    {
        return $this->processingAction?->created_at;
    }

    public function getProcessedByAttribute()
    {
        return $this->processingAction?->user_id;
    }

    public function getRejectedAtAttribute()
    {
        return $this->rejectionAction?->created_at;
    }

    public function getRejectedByAttribute()
    {
        return $this->rejectionAction?->user_id;
    }

    public function getWithdrawnAtAttribute()
    {
        return $this->withdrawalAction?->created_at;
    }

    public function getWithdrawnByAttribute()
    {
        return $this->withdrawalAction?->user_id;
    }

    public function getManagerNotesAttribute()
    {
        return $this->approvalAction?->notes;
    }

    public function getPayrollNotesAttribute()
    {
        return $this->processingAction?->notes;
    }

    public function getWithdrawalReasonAttribute()
    {
        return $this->withdrawalAction?->notes;
    }

    public function getRejectionReasonAttribute()
    {
        return $this->rejectionAction?->metadata['rejection_reason'] ?? null;
    }

    public function getRejectionNotesAttribute()
    {
        return $this->rejectionAction?->metadata['rejection_notes'] ?? null;
    }

    /**
     * Relationship accessors for backward compatibility
     */
    public function getSubmittedByRelationAttribute()
    {
        return $this->submissionAction?->user;
    }

    public function getApprovedByRelationAttribute()
    {
        return $this->approvalAction?->user;
    }

    public function getProcessedByRelationAttribute()
    {
        return $this->processingAction?->user;
    }

    public function getRejectedByRelationAttribute()
    {
        return $this->rejectionAction?->user;
    }

    public function getWithdrawnByRelationAttribute()
    {
        return $this->withdrawalAction?->user;
    }

    /**
     * Get or create a timesheet for a specific week
     */
    public static function getOrCreateForWeek(int $userId, Carbon $weekStart): Timesheet
    {
        $weekStart = $weekStart->copy()->startOfWeek(Carbon::SUNDAY);
        $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SATURDAY);

        return static::firstOrCreate([
            'user_id' => $userId,
            'week_start_date' => $weekStart,
        ], [
            'week_end_date' => $weekEnd,
            'status' => 'draft',
        ]);
    }

    /**
     * Get available weeks for submission (current and past weeks)
     */
    public static function getAvailableWeeks(int $userId, int $weekCount = 12): array
    {
        $weeks = [];
        $currentWeek = Carbon::now()->startOfWeek(Carbon::SUNDAY);

        for ($i = 0; $i < $weekCount; $i++) {
            $weekStart = $currentWeek->copy()->subWeeks($i);
            $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SATURDAY);

            $timesheet = static::forUser($userId)->forWeek($weekStart)->first();

            $weeks[] = [
                'week_start' => $weekStart,
                'week_end' => $weekEnd,
                'timesheet' => $timesheet,
                'label' => $weekStart->format('M j') . ' - ' . $weekEnd->format('M j, Y'),
                'is_current' => $i === 0,
            ];
        }

        return $weeks;
    }

    /**
     * Auto-assign time clocks to timesheet when created
     */
    public function assignTimeClocks(): void
    {
        TimeClock::forUser($this->user_id)
            ->whereNull('timesheet_id')
            ->whereBetween('clock_in_at', [
                $this->week_start_date->startOfDay(),
                $this->week_end_date->endOfDay()
            ])
            ->update(['timesheet_id' => $this->id]);
    }

    /**
     * Boot method to handle model events
     */
    protected static function boot()
    {
        parent::boot();

        static::created(function ($timesheet) {
            $timesheet->assignTimeClocks();
        });
    }
}
