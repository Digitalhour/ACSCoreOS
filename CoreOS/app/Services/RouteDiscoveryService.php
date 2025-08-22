<?php

namespace App\Services;

use App\Models\RoutePermission;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Illuminate\Support\Str;

class RouteDiscoveryService
{
    /**
     * Routes to exclude from discovery
     */
    protected array $excludedPatterns = [
        'api/*',
        '_ignition/*',
        'telescope/*',
        'horizon/*',
        'debugbar/*',
        'livewire/*',
        '*.json',
        '*.css',
        '*.js',
        '*.ico',
        '*.png',
        '*.jpg',
        '*.gif',
        '*.svg',
        '*.woff*',
        'generated::*',
    ];

    /**
     * Middleware that indicates a route should be excluded
     */
    protected array $excludedMiddleware = [
        'api',
        'throttle',
    ];

    /**
     * Discover and sync all routes
     */
    public function syncRoutes(): array
    {
        $routes = $this->discoverRoutes();
        $stats = [
            'discovered' => count($routes),
            'new' => 0,
            'updated' => 0,
            'deactivated' => 0,
        ];

        $currentRouteNames = collect($routes)->pluck('route_name')->toArray();

        // Deactivate routes that no longer exist
        $deactivated = RoutePermission::whereNotIn('route_name', $currentRouteNames)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        $stats['deactivated'] = $deactivated;

        // Process discovered routes
        foreach ($routes as $routeData) {
            $existing = RoutePermission::where('route_name', $routeData['route_name'])->first();

            if ($existing) {
                // Update existing route
                $existing->update([
                    'route_uri' => $routeData['route_uri'],
                    'route_methods' => $routeData['route_methods'],
                    'controller_class' => $routeData['controller_class'],
                    'controller_method' => $routeData['controller_method'],
                    'group_name' => $routeData['group_name'],
                    'middleware' => $routeData['middleware'],
                    'is_active' => true,
                ]);
                $stats['updated']++;
            } else {
                // Create new route
                RoutePermission::create($routeData);
                $stats['new']++;
            }
        }

        return $stats;
    }

    /**
     * Discover all application routes
     */
    public function discoverRoutes(): array
    {
        $discoveredRoutes = [];
        $routes = RouteFacade::getRoutes();

        foreach ($routes as $route) {
            if ($this->shouldExcludeRoute($route)) {
                continue;
            }

            $routeData = $this->extractRouteData($route);
            if ($routeData) {
                $discoveredRoutes[] = $routeData;
            }
        }

        return $discoveredRoutes;
    }

    /**
     * Extract route data for storage
     */
    protected function extractRouteData(Route $route): ?array
    {
        $name = $route->getName();
        if (!$name) {
            return null;
        }

        $action = $route->getAction();
        $controllerClass = null;
        $controllerMethod = null;

        // Extract controller info
        if (isset($action['controller'])) {
            [$controllerClass, $controllerMethod] = Str::parseCallback($action['controller']);
        }

        return [
            'route_name' => $name,
            'route_uri' => $route->uri(),
            'route_methods' => $route->methods(),
            'controller_class' => $controllerClass,
            'controller_method' => $controllerMethod,
            'group_name' => $this->determineGroupName($name, $controllerClass),
            'description' => $this->createDisplayName($name, $controllerMethod),
            'middleware' => $this->getCleanMiddleware($route),
            'is_protected' => $this->shouldProtectRoute($route),
            'is_active' => true,
        ];
    }

    /**
     * Determine if route should be excluded
     */
    protected function shouldExcludeRoute(Route $route): bool
    {
        $uri = $route->uri();
        $name = $route->getName();

        // Exclude routes without names
        if (!$name) {
            return true;
        }

        // Check excluded patterns
        foreach ($this->excludedPatterns as $pattern) {
            if (Str::is($pattern, $uri) || Str::is($pattern, $name)) {
                return true;
            }
        }

        // Check middleware
        $middleware = $route->gatherMiddleware();
        foreach ($this->excludedMiddleware as $excludedMw) {
            if (in_array($excludedMw, $middleware)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine group name for a route
     */
    protected function determineGroupName(string $routeName, ?string $controllerClass): string
    {
        // Use custom mapping for better grouping
        $customMappings = [
            'hr' => 'Human Resources',
            'hrs' => 'Human Resources',
            'pto' => 'PTO Management',
            'time-clock' => 'Time & Attendance',
            'billy' => 'AI Assistant',
            'wiki' => 'Wiki',
            'blog' => 'Company News',
            'admin' => 'Administration',
            'access-control' => 'Access Control',
            'user-management' => 'User Management',
            'warehouse' => 'Warehouse Operations',
            'parts' => 'Parts Database',
            'training' => 'Training & Learning',
            'vibetrack' => 'Analytics & Tracking',
            'payroll' => 'Payroll & Finance',
            'emergency-contacts' => 'Personal Settings',
            'settings' => 'System Settings',
            'departments' => 'Organization',
            'holidays' => 'Organization',
            'team' => 'Organization',
            'tags' => 'Company Documents',
            'folders' => 'Company Documents',
            'documents' => 'Company Documents',
        ];

        // Extract primary resource from route name
        $parts = explode('.', $routeName);
        if (count($parts) > 1) {
            $primaryResource = $parts[0];

            // Check for custom mapping first
            if (isset($customMappings[$primaryResource])) {
                return $customMappings[$primaryResource];
            }

            return $this->formatGroupName($primaryResource);
        }

        // Fallback to controller-based grouping with mappings
        if ($controllerClass) {
            $controllerName = class_basename($controllerClass);

            // Controller-specific mappings
            $controllerMappings = [
                'HREmployeesController' => 'Human Resources',
                'BillyAIController' => 'AI Assistant',
                'AccessControlController' => 'Access Control',
                'RolePermissionController' => 'Access Control',
                'TimeClockController' => 'Time & Attendance',
                'PayrollTimeClockController' => 'Payroll & Finance',
                'ManagerTimeClockController' => 'Time & Attendance',
                'EmployeePtoController' => 'PTO Management',
                'PtoAdminController' => 'PTO Management',
                'TrainingController' => 'Training & Learning',
                'WikiController' => 'Wiki & Documentation',
                'PartsController' => 'Parts Database',
                'WarehouseController' => 'Warehouse Operations',
                'DashboardController' => 'Dashboard',
            ];

            if (isset($controllerMappings[$controllerName])) {
                return $controllerMappings[$controllerName];
            }

            $resource = str_replace('Controller', '', $controllerName);
            return $this->formatGroupName(Str::kebab($resource));
        }

        return 'General';
    }

    /**
     * Format group name for display
     */
    protected function formatGroupName(string $name): string
    {
        return ucwords(str_replace(['-', '_'], ' ', $name));
    }

    /**
     * Create a user-friendly display name for routes
     */
    protected function createDisplayName(string $routeName, ?string $controllerMethod): string
    {
        // Remove redundant prefixes (e.g., access-control.access-control.* -> access-control.*)
        $cleanRouteName = $this->removeRedundantPrefixes($routeName);

        // Split into parts
        $parts = explode('.', $cleanRouteName);

        // Action mappings for better display names
        $actionMappings = [
            'index' => 'View',
            'show' => 'View Details',
            'create' => 'Create',
            'store' => 'Save',
            'edit' => 'Edit',
            'update' => 'Update',
            'destroy' => 'Delete',
            'restore' => 'Restore',
            'approve' => 'Approve',
            'deny' => 'Deny',
            'cancel' => 'Cancel',
            'sync' => 'Synchronize',
            'export' => 'Export',
            'import' => 'Import',
            'upload' => 'Upload',
            'download' => 'Download',
            'assign' => 'Assign',
            'bulk' => 'Bulk Operations',
            'search' => 'Search',
        ];

        // Get the action (usually the last part)
        $action = end($parts);
        $actionDisplay = $actionMappings[$action] ?? ucwords(str_replace(['-', '_'], ' ', $action));

        // Get the resource context (everything except the action)
        $resourceParts = array_slice($parts, 0, -1);
        $resourceContext = implode(' ', array_map(function($part) {
            return ucwords(str_replace(['-', '_'], ' ', $part));
        }, $resourceParts));

        // Combine for final display name
        if (empty($resourceContext)) {
            return $actionDisplay;
        }

        return "{$actionDisplay} {$resourceContext}";
    }

    /**
     * Remove redundant prefixes from route names
     */
    protected function removeRedundantPrefixes(string $routeName): string
    {
        // Pattern: prefix.prefix.rest -> prefix.rest
        $parts = explode('.', $routeName);

        if (count($parts) >= 3 && $parts[0] === $parts[1]) {
            array_splice($parts, 1, 1); // Remove duplicate
        }

        return implode('.', $parts);
    }

    /**
     * Get clean middleware list (exclude common ones)
     */
    protected function getCleanMiddleware(Route $route): array
    {
        $middleware = $route->gatherMiddleware();

        // Remove common middleware that doesn't affect permissions
        $commonMiddleware = ['web', 'auth', 'verified', 'throttle'];

        return array_values(array_filter($middleware, function ($mw) use ($commonMiddleware) {
            // Handle middleware with parameters (e.g., "throttle:60,1")
            $mwName = explode(':', $mw)[0];
            return !in_array($mwName, $commonMiddleware);
        }));
    }

    /**
     * Determine if route should be protected by default
     */
    protected function shouldProtectRoute(Route $route): bool
    {
        $middleware = $route->gatherMiddleware();

        // If route has auth middleware, it should be protected
        if (in_array('auth', $middleware)) {
            return true;
        }

        // If route has custom middleware, likely needs protection
        $customMiddleware = $this->getCleanMiddleware($route);
        if (!empty($customMiddleware)) {
            return true;
        }

        // GET routes to public resources might not need protection
        $methods = $route->methods();
        if (in_array('GET', $methods) && count($methods) === 1) {
            return false;
        }

        // Default to protected for non-GET routes
        return true;
    }

    /**
     * Get route statistics
     */
    public function getRouteStats(): array
    {
        return [
            'total_routes' => RoutePermission::count(),
            'active_routes' => RoutePermission::active()->count(),
            'protected_routes' => RoutePermission::protected()->count(),
            'routes_with_permissions' => RoutePermission::whereHas('permissions')->count(),
            'total_groups' => RoutePermission::active()->distinct('group_name')->count(),
        ];
    }
}
