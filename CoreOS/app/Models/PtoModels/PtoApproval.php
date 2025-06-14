<?php

namespace App\Models\PtoModels;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PtoApproval extends Model
{
    use HasFactory;

    protected $fillable = [
        'pto_request_id',
        'approver_id',
        'status',
        'comments',
        'level',
        'sequence',
        'is_required',
        'is_parallel',
        'delegated_to_id',
        'responded_at',
        'reminder_sent_at',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'is_parallel' => 'boolean',
        'responded_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
    ];

    /**
     * Get the PTO request that this approval belongs to.
     */
    public function ptoRequest(): BelongsTo
    {
        return $this->belongsTo(PtoRequest::class);
    }

    /**
     * Get the user who is assigned as the approver.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    /**
     * Get the user this approval was delegated to.
     */
    public function delegatedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegated_to_id');
    }
}
