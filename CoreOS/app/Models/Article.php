<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class Article extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'content',
        'status',
        'user_id',
        'published_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reactions(): MorphMany
    {
        return $this->morphMany(Reaction::class, 'reactable');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable')
            ->topLevel()
            ->with(['user', 'replies'])
            ->withCount(['reactions', 'replies'])
            ->orderBy('created_at', 'desc');
    }

    public function allComments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->where('published_at', '<=', now());
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeWithEngagementCounts($query)
    {
        return $query->withCount(['reactions', 'allComments as comments_count']);
    }

    public function isPublished(): bool
    {
        return $this->status === 'published' && $this->published_at <= now();
    }

    public function getReactionsSummary(): array
    {
        $reactionCounts = $this->reactions()
            ->selectRaw('type, count(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type')
            ->toArray();

        $summary = [];
        foreach (Reaction::TYPES as $type => $emoji) {
            if (isset($reactionCounts[$type]) && $reactionCounts[$type] > 0) {
                $summary[] = [
                    'type' => $type,
                    'emoji' => $emoji,
                    'count' => $reactionCounts[$type],
                ];
            }
        }

        return $summary;
    }

    public function getUserReaction($userId): ?Reaction
    {
        return $this->reactions()->where('user_id', $userId)->first();
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($article) {
            if (empty($article->slug)) {
                $article->slug = Str::slug($article->title);
            }
        });

        static::updating(function ($article) {
            if ($article->isDirty('title') && empty($article->getOriginal('slug'))) {
                $article->slug = Str::slug($article->title);
            }
        });
    }
}
