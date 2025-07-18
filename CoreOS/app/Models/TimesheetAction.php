<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimesheetAction extends Model
{
    use HasFactory;

    protected $fillable = [
        'timesheet_id',
        'user_id',
        'action',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    const ACTION_SUBMITTED = 'submitted';
    const ACTION_APPROVED = 'approved';
    const ACTION_REJECTED = 'rejected';
    const ACTION_PROCESSED = 'processed';
    const ACTION_WITHDRAWN = 'withdrawn';

    /**
     * Get the timesheet this action belongs to
     */
    public function timesheet(): BelongsTo
    {
        return $this->belongsTo(Timesheet::class);
    }

    /**
     * Get the user who performed this action
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to filter by action type
     */
    public function scopeOfType($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope to get the latest action for each timesheet
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Get formatted action label
     */
    public function getActionLabelAttribute(): string
    {
        return match($this->action) {
            self::ACTION_SUBMITTED => 'Submitted',
            self::ACTION_APPROVED => 'Approved',
            self::ACTION_REJECTED => 'Rejected',
            self::ACTION_PROCESSED => 'Processed',
            self::ACTION_WITHDRAWN => 'Withdrawn',
            default => ucfirst($this->action),
        };
    }

    /**
     * Get rejection reason from metadata
     */
    public function getRejectionReasonAttribute(): ?string
    {
        return $this->metadata['rejection_reason'] ?? null;
    }

    /**
     * Get rejection notes from metadata
     */
    public function getRejectionNotesAttribute(): ?string
    {
        return $this->metadata['rejection_notes'] ?? null;
    }

    /**
     * Check if this is a specific action type
     */
    public function isSubmission(): bool
    {
        return $this->action === self::ACTION_SUBMITTED;
    }

    public function isApproval(): bool
    {
        return $this->action === self::ACTION_APPROVED;
    }

    public function isRejection(): bool
    {
        return $this->action === self::ACTION_REJECTED;
    }

    public function isProcessing(): bool
    {
        return $this->action === self::ACTION_PROCESSED;
    }

    public function isWithdrawal(): bool
    {
        return $this->action === self::ACTION_WITHDRAWN;
    }

    /**
     * Create a timesheet action
     */
    public static function createAction(
        int $timesheetId,
        int $userId,
        string $action,
        ?string $notes = null,
        array $metadata = []
    ): self {
        return static::create([
            'timesheet_id' => $timesheetId,
            'user_id' => $userId,
            'action' => $action,
            'notes' => $notes,
            'metadata' => $metadata,
        ]);
    }
}
