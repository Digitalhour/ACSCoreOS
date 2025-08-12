<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Permission\Models\Permission;

class RoutePermission extends Model
{
    protected $fillable = [
        'route_name',
        'route_uri',
        'route_methods',
        'controller_class',
        'controller_method',
        'group_name',
        'description',
        'is_protected',
        'is_active',
        'middleware',
    ];

    protected $casts = [
        'route_methods' => 'array',
        'middleware' => 'array',
        'is_protected' => 'boolean',
        'is_active' => 'boolean',
    ];

    /**
     * Get the permissions assigned to this route
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'route_permission_assignments');
    }

    /**
     * Get the roles assigned to this route
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(\Spatie\Permission\Models\Role::class, 'route_role_assignments');
    }

    /**
     * Scope for active routes only
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for protected routes only
     */
    public function scopeProtected($query)
    {
        return $query->where('is_protected', true);
    }

    /**
     * Get routes grouped by their group name
     */
    public static function getGroupedRoutes()
    {
        return static::active()
            ->with(['permissions:id,name,description', 'roles:id,name,description'])
            ->orderBy('group_name')
            ->orderBy('route_name')
            ->get()
            ->groupBy('group_name');
    }

    /**
     * Check if route has any of the given permissions
     */
    public function hasAnyPermission(array $permissions): bool
    {
        return $this->permissions()
            ->whereIn('name', $permissions)
            ->exists();
    }

    /**
     * Check if route has any of the given roles
     */
    public function hasAnyRole(array $roles): bool
    {
        return $this->roles()
            ->whereIn('name', $roles)
            ->exists();
    }

    /**
     * Get route display name (formatted)
     */
    public function getDisplayNameAttribute(): string
    {
        return ucwords(str_replace(['-', '_', '.'], ' ', $this->route_name));
    }

    /**
     * Get HTTP methods as formatted string
     */
    public function getMethodsStringAttribute(): string
    {
        return implode(', ', $this->route_methods ?? []);
    }

    /**
     * Get controller name without namespace
     */
    public function getControllerNameAttribute(): string
    {
        if (!$this->controller_class) {
            return '';
        }

        $parts = explode('\\', $this->controller_class);
        return end($parts);
    }
}
