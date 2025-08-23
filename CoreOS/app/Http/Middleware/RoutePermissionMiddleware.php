<?php

namespace App\Http\Middleware;

use App\Models\RoutePermission;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RoutePermissionMiddleware
{
    /**
     * Routes that should never be checked for permissions
     */
    protected array $excludedRoutes = [
        'login',
        'register',
        'password.*',
        'verification.*',
        'logout',
        'auth.logout',
        'workos.logout',
        'home',
        'dashboard',
        'auth.*',
        'workos.*',
        'access-control.*',  // Exclude all access control routes
        'broadcasting.*',    // Exclude broadcasting auth routes
        '_ignition.*',
        'telescope.*',
        'horizon.*',
        'debugbar.*',
        'pto.*',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip for unauthenticated users - let auth middleware handle
        if (!Auth::check()) {
            return $next($request);
        }

        // SPECIFIC: Skip logout route to prevent redirect loops
        if ($request->route()?->getName() === 'logout' ||
            $request->is('logout') ||
            ($request->method() === 'POST' && $request->path() === 'logout')) {
            return $next($request);
        }

        $user = Auth::user();
        $routeName = $request->route()?->getName();

        // Skip if route has no name
        if (!$routeName) {
            return $next($request);
        }

        // Skip excluded routes (auth, system routes, etc.)
        foreach ($this->excludedRoutes as $excludedPattern) {
            if (fnmatch($excludedPattern, $routeName)) {
                return $next($request);
            }
        }

        // Skip if this is a WorkOS callback or auth-related route
        if (str_contains($request->path(), 'auth/') ||
            str_contains($request->path(), 'login') ||
            str_contains($request->path(), 'logout') ||
            str_contains($request->path(), 'workos') ||
            $request->is('logout') ||
            $request->is('auth/logout')) {
            return $next($request);
        }

        // Get route permission configuration
        $routePermission = RoutePermission::where('route_name', $routeName)
            ->where('is_active', true)
            ->first();

        // If route is not in our system or not protected, allow access
        if (!$routePermission || !$routePermission->is_protected) {
            return $next($request);
        }

        // If route has no permissions or roles assigned, check if user is super admin
        if ($routePermission->permissions->isEmpty() && $routePermission->roles->isEmpty()) {
            if ($this->isSuperAdmin($user)) {
                return $next($request);
            }

            // Log access attempt to unprotected route
            Log::warning('Access attempt to route without permissions or roles', [
                'route' => $routeName,
                'user_id' => $user->id,
                'user_email' => $user->email,
            ]);

            return $this->denyAccess($request, 'This route has not been configured with permissions or roles.');
        }

        // Check if user has any of the required permissions OR roles
        $requiredPermissions = $routePermission->permissions->pluck('name')->toArray();
        $requiredRoles = $routePermission->roles->pluck('name')->toArray();

        $hasPermission = !empty($requiredPermissions) && $user->hasAnyPermission($requiredPermissions);
        $hasRole = !empty($requiredRoles) && $user->hasAnyRole($requiredRoles);

        if ($hasPermission || $hasRole) {
            return $next($request);
        }

        // Log unauthorized access attempt
        Log::warning('Unauthorized route access attempt', [
            'route' => $routeName,
            'required_permissions' => $requiredPermissions,
            'required_roles' => $requiredRoles,
            'user_id' => $user->id,
            'user_email' => $user->email,
            'user_permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
            'user_roles' => $user->getRoleNames()->toArray(),
        ]);

        return $this->denyAccess($request, 'You do not have permission to access this resource.');
    }

    /**
     * Check if user is super admin (customize this logic as needed)
     */
    protected function isSuperAdmin($user): bool
    {
        // You can customize this logic based on your needs
        return $user->hasRole('Super Admin') ||
            $user->hasRole('Administrator') ||
            $user->email === config('app.super_admin_email');
    }

    /**
     * Handle access denial
     */
    protected function denyAccess(Request $request, string $message): Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'error' => 'Forbidden'
            ], 403);
        }

        // For Inertia requests, redirect with error
        if ($request->header('X-Inertia')) {
            return redirect()->back()->with('error', $message);
        }

        // For regular web requests
        abort(403, $message);
    }
}
