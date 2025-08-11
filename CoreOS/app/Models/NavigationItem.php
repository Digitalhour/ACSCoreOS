<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NavigationItem extends Model
{
    protected $fillable = [
        'title',
        'href',
        'icon',
        'description',
        'parent_id',
        'type',
        'sort_order',
        'is_active',
        'roles',
        'permissions',
    ];

    protected $casts = [
        'roles' => 'array',
        'permissions' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Get the parent navigation item
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(NavigationItem::class, 'parent_id');
    }

    /**
     * Get the child navigation items
     */
    public function children(): HasMany
    {
        return $this->hasMany(NavigationItem::class, 'parent_id')
            ->where('is_active', true)
            ->orderBy('sort_order');
    }

    /**
     * Scope for active items only
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for specific type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope for parent items only (categories)
     */
    public function scopeParents($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Scope for child items only
     */
    public function scopeChildren($query)
    {
        return $query->whereNotNull('parent_id');
    }

    /**
     * Get items ordered by sort_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('title');
    }

    /**
     * Check if user can access this navigation item
     */
    public function canAccess($user): bool
    {
        // If no restrictions, allow access
        if (empty($this->roles) && empty($this->permissions)) {
            return true;
        }

        // Check roles
        if (!empty($this->roles)) {
            $userRoles = $user->roles ? $user->roles->pluck('name')->toArray() : [];
            $hasRole = !empty(array_intersect($this->roles, $userRoles));
            if ($hasRole) {
                return true;
            }
        }

        // Check permissions
        if (!empty($this->permissions)) {
            $userPermissions = $user->permissions ? $user->permissions->pluck('name')->toArray() : [];
            $hasPermission = !empty(array_intersect($this->permissions, $userPermissions));
            if ($hasPermission) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get navigation structure for a specific type
     */
    public static function getNavigationStructure(string $type, $user = null)
    {
        $items = static::active()
            ->ofType($type)
            ->parents()
            ->with(['children' => function ($query) {
                $query->active()->ordered();
            }])
            ->ordered()
            ->get();

        if (!$user) {
            return $items;
        }

        // Filter items based on user permissions
        return $items->filter(function ($item) use ($user) {
            if (!$item->canAccess($user)) {
                return false;
            }

            // Filter children as well
            $item->children = $item->children->filter(function ($child) use ($user) {
                return $child->canAccess($user);
            });

            // Only show parent if it has accessible children or has no children requirement
            return $item->children->count() > 0 || $item->href !== '#';
        })->values();
    }
}
