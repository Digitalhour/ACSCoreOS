<?php

namespace App\Models\PtoModels;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PtoRequest extends Model
{
    use HasFactory, LogsActivity;

    /**
     * The activity log options for the model.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->useLogName('Time Off Request')
            ->dontSubmitEmptyLogs();
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'pto_type_id',
        'request_number',
        'start_date',
        'end_date',
        'start_time',
        'end_time',
        'total_days',
        'reason',
        'status',
        'day_options',

        // Enhanced approval fields
        'approval_notes',
        'approved_by_id',
        'approved_at',

        // Enhanced denial fields
        'denial_reason',
        'denied_by_id',
        'denied_at',

        // Enhanced cancellation fields
        'cancellation_reason',
        'cancelled_by_id',
        'cancelled_at',

        // Lifecycle fields
        'submitted_at',
        'status_changed_at',
        'status_changed_by_id',

        // Manager/HR notes
        'manager_notes',
        'hr_notes',

        // Blackout fields
        'blackout_conflicts',
        'blackout_warnings',
        'blackout_warnings_acknowledged',
        'blackout_acknowledged_at',
        'blackout_override_reason',
        'is_emergency_override',
        'override_approved_by_id',
        'override_approved_at',
        'blackout_snapshot',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'total_days' => 'decimal:2',
        'day_options' => 'array',

        // Enhanced datetime casts
        'approved_at' => 'datetime',
        'denied_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'submitted_at' => 'datetime',
        'status_changed_at' => 'datetime',

        // Blackout casts
        'blackout_conflicts' => 'array',
        'blackout_warnings' => 'array',
        'blackout_warnings_acknowledged' => 'boolean',
        'blackout_acknowledged_at' => 'datetime',
        'is_emergency_override' => 'boolean',
        'override_approved_at' => 'datetime',
        'blackout_snapshot' => 'array',
    ];

    /**
     * Get the user that owns the request.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the PTO type for this request.
     */
    public function ptoType(): BelongsTo
    {
        return $this->belongsTo(PtoType::class);
    }

    /**
     * Get the user who approved this request.
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    /**
     * Get the user who denied this request.
     */
    public function deniedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'denied_by_id');
    }

    /**
     * Get the user who cancelled this request.
     */
    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by_id');
    }

    /**
     * Get the user who last changed the status.
     */
    public function statusChangedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'status_changed_by_id');
    }

    /**
     * Get the user who approved the blackout override.
     */
    public function overrideApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'override_approved_by_id');
    }

    /**
     * Get the approvals for this request.
     */
    public function approvals(): HasMany
    {
        return $this->hasMany(PtoApproval::class);
    }

    // Existing scope methods...
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeDenied($query)
    {
        return $query->where('status', 'denied');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    // Existing status check methods...
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isDenied(): bool
    {
        return $this->status === 'denied';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * New blackout-related methods
     */

    /**
     * Check if request has blackout conflicts.
     */
    public function hasBlackoutConflicts(): bool
    {
        return !empty($this->blackout_conflicts);
    }

    /**
     * Check if request has blackout warnings.
     */
    public function hasBlackoutWarnings(): bool
    {
        return !empty($this->blackout_warnings);
    }

    /**
     * Check if blackout warnings have been acknowledged.
     */
    public function areBlackoutWarningsAcknowledged(): bool
    {
        return $this->blackout_warnings_acknowledged && !empty($this->blackout_acknowledged_at);
    }

    /**
     * Check if request has an emergency override.
     */
    public function hasEmergencyOverride(): bool
    {
        return $this->is_emergency_override;
    }

    /**
     * Check if emergency override is approved.
     */
    public function isOverrideApproved(): bool
    {
        return $this->is_emergency_override &&
            !empty($this->override_approved_by_id) &&
            !empty($this->override_approved_at);
    }

    /**
     * Store blackout validation results.
     */
    public function storeBlackoutValidation(array $validation): void
    {
        $this->update([
            'blackout_conflicts' => $validation['conflicts'] ?? [],
            'blackout_warnings' => $validation['warnings'] ?? [],
            'blackout_snapshot' => $this->createBlackoutSnapshot($validation),
        ]);
    }

    /**
     * Acknowledge blackout warnings.
     */
    public function acknowledgeBlackoutWarnings(User $user): void
    {
        $this->update([
            'blackout_warnings_acknowledged' => true,
            'blackout_acknowledged_at' => now(),
        ]);
    }

    /**
     * Request emergency override.
     */
    public function requestEmergencyOverride(string $reason): void
    {
        $this->update([
            'is_emergency_override' => true,
            'blackout_override_reason' => $reason,
        ]);
    }

    /**
     * Approve emergency override.
     */
    public function approveEmergencyOverride(User $approver): void
    {
        $this->update([
            'override_approved_by_id' => $approver->id,
            'override_approved_at' => now(),
        ]);
    }

    /**
     * Create a snapshot of blackout data for historical reference.
     */
    private function createBlackoutSnapshot(array $validation): array
    {
        $snapshot = [
            'validation_date' => now()->toISOString(),
            'total_conflicts' => count($validation['conflicts'] ?? []),
            'total_warnings' => count($validation['warnings'] ?? []),
            'blackouts_checked' => [],
        ];

        // Store relevant blackout details
        foreach (array_merge($validation['conflicts'] ?? [], $validation['warnings'] ?? []) as $item) {
            if (isset($item['blackout'])) {
                $blackout = $item['blackout'];
                $snapshot['blackouts_checked'][] = [
                    'id' => $blackout->id,
                    'name' => $blackout->name,
                    'date_range' => $blackout->getFormattedDateRangeAttribute(),
                    'restriction_type' => $blackout->restriction_type,
                    'type' => $item['type'], // 'conflict' or 'warning'
                ];
            }
        }

        return $snapshot;
    }

    /**
     * Get formatted blackout conflicts for display.
     */
    public function getFormattedBlackoutConflicts(): array
    {
        if (empty($this->blackout_conflicts)) {
            return [];
        }

        return collect($this->blackout_conflicts)->map(function ($conflict) {
            return [
                'message' => $conflict['message'] ?? 'Blackout conflict detected',
                'blackout_name' => $conflict['blackout']['name'] ?? 'Unknown',
                'date_range' => $conflict['blackout']['formatted_date_range'] ??
                    ($conflict['restriction_details']['period'] ?? 'Unknown period'),
                'can_override' => $conflict['can_override'] ?? false,
            ];
        })->toArray();
    }

    /**
     * Get formatted blackout warnings for display.
     */
    public function getFormattedBlackoutWarnings(): array
    {
        if (empty($this->blackout_warnings)) {
            return [];
        }

        return collect($this->blackout_warnings)->map(function ($warning) {
            return [
                'message' => $warning['message'] ?? 'Blackout warning',
                'blackout_name' => $warning['blackout']['name'] ?? 'Unknown',
                'date_range' => $warning['blackout']['formatted_date_range'] ??
                    ($warning['restriction_details']['period'] ?? 'Unknown period'),
                'requires_acknowledgment' => true,
            ];
        })->toArray();
    }

    /**
     * Get the status badge color.
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'pending' => 'yellow',
            'approved' => 'green',
            'denied' => 'red',
            'cancelled' => 'gray',
            default => 'gray',
        };
    }

    /**
     * Get modification history for this request.
     */
    public function getModificationHistoryAttribute(): array
    {
        $history = [];

        // Add creation event
        $history[] = [
            'action' => 'created',
            'user' => $this->user?->name ?? 'System',
            'timestamp' => $this->created_at->format('Y-m-d H:i:s'),
            'details' => 'Request created'
        ];

        // Add submission event if different from creation
        if ($this->submitted_at && $this->submitted_at != $this->created_at) {
            $history[] = [
                'action' => 'submitted',
                'user' => $this->user?->name ?? 'System',
                'timestamp' => $this->submitted_at->format('Y-m-d H:i:s'),
                'details' => 'Request officially submitted for review'
            ];
        }

        // Add approval event
        if ($this->approved_at) {
            $history[] = [
                'action' => 'approved',
                'user' => $this->approvedBy?->name ?? 'Unknown',
                'timestamp' => $this->approved_at->format('Y-m-d H:i:s'),
                'details' => $this->approval_notes ?: 'Request approved'
            ];
        }

        // Add denial event
        if ($this->denied_at) {
            $history[] = [
                'action' => 'denied',
                'user' => $this->deniedBy?->name ?? 'Unknown',
                'timestamp' => $this->denied_at->format('Y-m-d H:i:s'),
                'details' => $this->denial_reason ?: 'Request denied'
            ];
        }

        // Add cancellation event
        if ($this->cancelled_at) {
            $history[] = [
                'action' => 'cancelled',
                'user' => $this->cancelledBy?->name ?? 'Unknown',
                'timestamp' => $this->cancelled_at->format('Y-m-d H:i:s'),
                'details' => $this->cancellation_reason ?: 'Request cancelled'
            ];
        }

        // Sort by timestamp
        usort($history, function($a, $b) {
            return strtotime($a['timestamp']) - strtotime($b['timestamp']);
        });

        return $history;
    }
}
