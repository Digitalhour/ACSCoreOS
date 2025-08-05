<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class WikiBook extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'cover_image',
        'status',
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

    public function chapters(): HasMany
    {
        return $this->hasMany(WikiChapter::class)->orderBy('sort_order');
    }

    public function publishedChapters(): HasMany
    {
        return $this->chapters()->published();
    }

    public function pages(): \Illuminate\Database\Eloquent\Relations\HasManyThrough
    {
        return $this->hasManyThrough(WikiPage::class, WikiChapter::class);
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

    // Mutators - Remove these, using events instead
    // public function setNameAttribute($value): void
    // {
    //     $this->attributes['name'] = $value;
    //     if (empty($this->attributes['slug'])) {
    //         $this->attributes['slug'] = $this->generateUniqueSlug($value);
    //     }
    // }
    //
    // public function setSlugAttribute($value): void
    // {
    //     $this->attributes['slug'] = $this->generateUniqueSlug($value);
    // }

    // Route key name
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    protected static function booted(): void
    {
        static::creating(function (WikiBook $book) {
            $book->slug = $book->generateUniqueSlug($book->name);
        });

        static::updating(function (WikiBook $book) {
            if ($book->isDirty('name')) {
                $book->slug = $book->generateUniqueSlug($book->name);
            }
        });
    }

    // Helper methods
    public function generateUniqueSlug(string $value): string
    {
        $baseSlug = Str::slug($value);
        $slug = $baseSlug;
        $counter = 1;

        // Only check against non-soft-deleted records, excluding current record if updating
        while ($this->slugExists($slug)) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    private function slugExists(string $slug): bool
    {
        $query = static::where('slug', $slug)->whereNull('deleted_at');

        // Exclude current record if we're updating
        if ($this->exists) {
            $query->where('id', '!=', $this->id);
        }

        return $query->exists();
    }

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

    public function getCoverImageUrl(): ?string
    {
        if (!$this->cover_image) {
            return null;
        }

        try {
            return Storage::disk('s3')->temporaryUrl(
                $this->cover_image,
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

    public function getChapterCount(): int
    {
        return $this->chapters()->count();
    }

    public function getPageCount(): int
    {
        return $this->pages()->count();
    }
}
