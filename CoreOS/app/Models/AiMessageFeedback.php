<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiMessageFeedback extends Model
{
    use HasFactory;

    protected $fillable = [
        'message_id',
        'user_id',
        'rating',
        'comment',
    ];

    /**
     * Get the message that owns the feedback.
     */
    public function message()
    {
        return $this->belongsTo(Message::class);
    }

    /**
     * Get the user that provided the feedback.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
