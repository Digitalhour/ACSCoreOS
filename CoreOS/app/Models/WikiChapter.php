<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class WikiChapter extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'status',
        'wiki_book_id',
        'user_id',
        'sort_order',
        'metadata',
        'published_at',
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

    public function book(): BelongsTo
    {
        return $this->belongsTo(WikiBook::class, 'wiki_book_id');
    }

    public function pages(): HasMany
    {
        return $this->hasMany(WikiPage::class)->orderBy('sort_order');
    }

    public function publishedPages(): HasMany
    {
        return $this->pages()->published();
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
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%");
        });
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

    public function getPageCount(): int
    {
        return $this->pages()->count();
    }

    public function getFullSlug(): string
    {
        return $this->book->slug . '/' . $this->slug;
    }
}
