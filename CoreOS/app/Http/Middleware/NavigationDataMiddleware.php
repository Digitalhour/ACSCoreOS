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
        \Log::info('NavigationDataMiddleware running', [
            'path' => $request->path(),
            'authenticated' => auth()->check(),
            'is_api' => $request->is('api/*'),
        ]);

        // Only add navigation data for authenticated users and non-API routes
        if (auth()->check() && !$request->is('api/*')) {
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

                // Debug: Log navigation data (remove in production)
                \Log::info('Navigation Data Generated:', [
                    'header_count' => count($navigationData['header']),
                    'category_count' => count($navigationData['categories']),
                    'footer_count' => count($navigationData['footer']),
                    'user_id' => $user->id,
                ]);

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
        }

        return $next($request);
    }
}
