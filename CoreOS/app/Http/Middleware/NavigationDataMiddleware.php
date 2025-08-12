<?php

namespace App\Http\Middleware;

use App\Models\NavigationItem;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NavigationDataMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        // EARLY RETURN: Skip completely for unauthenticated users
        if (!auth()->check()) {
            return $next($request);
        }

        // EARLY RETURN: Skip for API routes
        if ($request->is('api/*')) {
            return $next($request);
        }

        $user = auth()->user();

        try {
            // Get navigation data using the model method
            $headerItems = NavigationItem::getNavigationStructure('header', $user);
            $categoryItems = NavigationItem::getNavigationStructure('category', $user);
            $footerItems = NavigationItem::getNavigationStructure('footer', $user);

            // Convert to array format to ensure proper serialization
            $navigationData = [
                'header' => $headerItems->toArray(),
                'categories' => $categoryItems->toArray(),
                'footer' => $footerItems->toArray(),
            ];

            // Share navigation data with all Inertia pages
            Inertia::share([
                'navigationData' => $navigationData,
            ]);

        } catch (\Exception $e) {
            \Log::error('Navigation Data Middleware Error: ' . $e->getMessage());

            // Fallback to empty navigation structure
            Inertia::share([
                'navigationData' => [
                    'header' => [],
                    'categories' => [],
                    'footer' => [],
                ],
            ]);
        }

        return $next($request);
    }
}
