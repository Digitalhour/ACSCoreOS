<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Reaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'reactable_type',
        'reactable_id',
        'type',
    ];

    public const TYPES = [
        'like' => '👍',
        'love' => '❤️',
        'laugh' => '😂',
        'wow' => '😮',
        'sad' => '😢',
        'angry' => '😠',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reactable(): MorphTo
    {
        return $this->morphTo();
    }

    public function getEmojiAttribute(): string
    {
        return self::TYPES[$this->type] ?? '👍';
    }

    public static function getTypesWithEmojis(): array
    {
        return self::TYPES;
    }
}
