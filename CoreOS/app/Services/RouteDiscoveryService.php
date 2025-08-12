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
        // Try to extract from route name (e.g., emergency-contacts.index -> Emergency Contacts)
        $parts = explode('.', $routeName);
        if (count($parts) > 1) {
            $resource = $parts[0];
            return $this->formatGroupName($resource);
        }

        // Fallback to controller name
        if ($controllerClass) {
            $controllerName = class_basename($controllerClass);
            $resource = str_replace('Controller', '', $controllerName);
            return $this->formatGroupName(Str::kebab($resource));
        }

        // Final fallback
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
