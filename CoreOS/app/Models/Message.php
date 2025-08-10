<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

// Import Auth facade

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'role',
        'content',
        'timestamp',
    ];

    protected $casts = [
        'timestamp' => 'datetime',
    ];

    /**
     * Get the feedback for this message provided by the currently authenticated user.
     */
    public function userFeedback() // Renamed from feedback()
    {
        // Ensure App\Models\AiMessageFeedback is the correct namespace and model name
        return $this->hasOne(\App\Models\AiMessageFeedback::class)->where('user_id', Auth::id());
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * Get all feedback entries for this message (e.g., for admin view).
     * This is different from userFeedback which is specific to the auth user.
     */
    public function allFeedback()
    {
        return $this->hasMany(\App\Models\AiMessageFeedback::class);
    }
}
