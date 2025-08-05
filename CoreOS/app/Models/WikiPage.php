<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class WikiPage extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'content',
        'excerpt',
        'featured_image',
        'status',
        'wiki_chapter_id',
        'user_id',
        'sort_order',
        'version',
        'metadata',
        'published_at',
        'view_count',
    ];

    protected $casts = [
        'metadata' => 'array',
        'published_at' => 'datetime',
    ];

    protected $with = ['user'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(WikiChapter::class, 'wiki_chapter_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(WikiPageVersion::class)->orderBy('version_number', 'desc');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(WikiAttachment::class);
    }

    public function views(): HasMany
    {
        return $this->hasMany(WikiPageView::class);
    }

    // Scopes
    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    public function scopeSearch($query, $search)
    {
        return $query->whereFullText(['name', 'content', 'excerpt'], $search)
            ->orWhere('name', 'like', "%{$search}%");
    }

    // Accessors
    public function getReadingTimeAttribute(): int
    {
        $wordCount = str_word_count(strip_tags($this->content));
        return max(1, (int) ceil($wordCount / 200));
    }

    public function getExcerptAttribute($value): string
    {
        if ($value) {
            return $value;
        }

        return Str::limit(strip_tags($this->content), 150);
    }

    // Mutators
    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = $value;
        if (empty($this->attributes['slug'])) {
            $this->attributes['slug'] = Str::slug($value);
        }
    }

    public function setSlugAttribute($value): void
    {
        $this->attributes['slug'] = Str::slug($value);
    }

    // Route key name
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    // Helper methods
    public function isPublished(): bool
    {
        return $this->status === 'published'
            && $this->published_at
            && $this->published_at <= now();
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function canBeEditedBy(User $user): bool
    {
        return $this->user_id === $user->id || $user->hasRole('admin');
    }

    public function getFeaturedImageUrl(): ?string
    {
        if (!$this->featured_image) {
            return null;
        }

        try {
            return Storage::disk('s3')->temporaryUrl(
                $this->featured_image,
                now()->addHours(24)
            );
        } catch (\Exception $e) {
            return null;
        }
    }

    public function publish(): void
    {
        $this->update([
            'status' => 'published',
            'published_at' => $this->published_at ?: now(),
        ]);
    }

    public function unpublish(): void
    {
        $this->update([
            'status' => 'draft',
            'published_at' => null,
        ]);
    }

    public function createVersion(string $changeSummary = null): WikiPageVersion
    {
        // Get the next version number
        $nextVersion = $this->versions()->max('version_number') + 1;

        $version = $this->versions()->create([
            'name' => $this->name,
            'content' => $this->content,
            'excerpt' => $this->excerpt,
            'featured_image' => $this->featured_image,
            'version_number' => $nextVersion,
            'change_summary' => $changeSummary,
            'user_id' => auth()->id(),
            'metadata' => $this->metadata,
        ]);

        // Update the page's version number
        $this->update(['version' => $nextVersion]);

        return $version;
    }

    public function incrementVersion(): void
    {
        $this->increment('version');
    }

    public function recordView(?User $user = null, ?string $ipAddress = null, ?string $userAgent = null): void
    {
        $this->views()->create([
            'user_id' => $user?->id,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'viewed_at' => now(),
        ]);

        $this->increment('view_count');
    }

    public function getFullSlug(): string
    {
        return $this->chapter->book->slug . '/' . $this->chapter->slug . '/' . $this->slug;
    }
}
