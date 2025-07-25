<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'commentable_type',
        'commentable_id',
        'parent_id',
        'content',
        'edited_at',
    ];

    protected $casts = [
        'edited_at' => 'datetime',
    ];

    protected $with = ['user:id,name,email,avatar'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id')
            ->with(['user', 'replies'])
            ->withCount('reactions')
            ->orderBy('created_at', 'asc');
    }

    public function reactions(): MorphMany
    {
        return $this->morphMany(Reaction::class, 'reactable');
    }

    public function scopeTopLevel($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeWithRepliesCount($query)
    {
        return $query->withCount('replies');
    }

    public function scopeWithReactionsCount($query)
    {
        return $query->withCount('reactions');
    }

    public function hasBeenEdited(): bool
    {
        return !is_null($this->edited_at);
    }

    public function isReply(): bool
    {
        return !is_null($this->parent_id);
    }

    public function getDepthAttribute(): int
    {
        $depth = 0;
        $parent = $this->parent;

        while ($parent) {
            $depth++;
            $parent = $parent->parent;
        }

        return $depth;
    }
}
