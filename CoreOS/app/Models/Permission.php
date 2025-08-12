<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'guard_name',
    ];

    // Explicitly define the table name to ensure we're using the right one
    protected $table = 'permissions';

    /**
     * Get the categories that this permission belongs to.
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_permission')
            ->withTimestamps()
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    /**
     * Get the first category for this permission (for display purposes).
     */
    public function getPrimaryCategoryAttribute(): ?Category
    {
        return $this->categories()->first();
    }

    /**
     * Check if permission belongs to a specific category.
     */
    public function belongsToCategory(int $categoryId): bool
    {
        return $this->categories()->where('category_id', $categoryId)->exists();
    }

    /**
     * Scope to get permissions by category.
     */
    public function scopeByCategory($query, int $categoryId)
    {
        return $query->whereHas('categories', function ($query) use ($categoryId) {
            $query->where('category_id', $categoryId);
        });
    }

    /**
     * Scope to get permissions without any category.
     */
    public function scopeUncategorized($query)
    {
        return $query->whereDoesntHave('categories');
    }
}
