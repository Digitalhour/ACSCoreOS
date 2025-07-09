<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Timesheet extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'week_start_date',
        'week_end_date',
        'status',
        'submitted_at',
        'submitted_by',
        'approved_at',
        'approved_by',
        'processed_at',
        'processed_by',
        'withdrawn_at',
        'withdrawn_by',
        'total_hours',
        'regular_hours',
        'overtime_hours',
        'break_hours',
        'notes',
        'manager_notes',
        'payroll_notes',
        'withdrawal_reason',
        'legal_acknowledgment',
    ];

    protected $casts = [
        'week_start_date' => 'date',
        'week_end_date' => 'date',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'processed_at' => 'datetime',
        'withdrawn_at' => 'datetime',
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
     * Get the user who submitted this timesheet.
     */
    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /**
     * Get the user who approved this timesheet.
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get the user who processed this timesheet.
     */
    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    /**
     * Get the user who withdrew this timesheet.
     */
    public function withdrawnBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'withdrawn_by');
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

    public function canBeWithdrawn(): bool
    {
        return $this->isSubmitted();
    }

    public function canBeEdited(): bool
    {
        return $this->isDraft() || $this->isSubmitted();
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

        $totalHours = 0;
        $regularHours = 0;
        $overtimeHours = 0;
        $breakHours = 0;

        foreach ($timeClocks as $timeClock) {
            $totalHours += $timeClock->getTotalHours();
            $regularHours += $timeClock->regular_hours;
            $overtimeHours += $timeClock->overtime_hours;
            $breakHours += $timeClock->break_duration;
        }

        $this->update([
            'total_hours' => $totalHours,
            'regular_hours' => $regularHours,
            'overtime_hours' => $overtimeHours,
            'break_hours' => $breakHours,
        ]);
    }

    /**
     * Submit the timesheet
     */
    public function submit(int $submittedBy, bool $legalAcknowledgment = true): bool
    {
        if (!$this->isDraft()) {
            return false;
        }

        $this->calculateTotals();

        return $this->update([
            'status' => 'submitted',
            'submitted_at' => now(),
            'submitted_by' => $submittedBy,
            'legal_acknowledgment' => $legalAcknowledgment,
        ]);
    }

    /**
     * Withdraw the timesheet back to draft
     */
    public function withdraw(int $withdrawnBy, string $reason): bool
    {
        if (!$this->canBeWithdrawn()) {
            return false;
        }

        return $this->update([
            'status' => 'draft',
            'submitted_at' => null,
            'submitted_by' => null,
            'withdrawn_at' => now(),
            'withdrawn_by' => $withdrawnBy,
            'withdrawal_reason' => $reason,
            'legal_acknowledgment' => false,
        ]);
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

        return $this->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $approvedBy,
            'manager_notes' => $managerNotes,
        ]);
    }

    /**
     * Process the timesheet (payroll action)
     */
    public function process(int $processedBy, ?string $payrollNotes = null): bool
    {
        if (!$this->isApproved()) {
            return false;
        }

        return $this->update([
            'status' => 'processed',
            'processed_at' => now(),
            'processed_by' => $processedBy,
            'payroll_notes' => $payrollNotes,
        ]);
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
