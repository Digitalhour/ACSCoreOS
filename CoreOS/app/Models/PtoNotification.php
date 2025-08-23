<?php

namespace App\Models;

use App\Models\PtoModels\PtoRequest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PtoNotification extends Model
{
    protected $fillable = [
        'user_id',
        'pto_request_id',
        'type',
        'title',
        'message',
        'data',
        'is_read',
        'read_at',
        'email_sent',
        'email_sent_at',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'email_sent' => 'boolean',
        'read_at' => 'datetime',
        'email_sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ptoRequest(): BelongsTo
    {
        return $this->belongsTo(PtoRequest::class);
    }

    public function markAsRead(): void
    {
        $this->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
    }
}
