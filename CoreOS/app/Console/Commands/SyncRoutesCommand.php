<?php

namespace App\Console\Commands;

use App\Services\RouteDiscoveryService;
use Illuminate\Console\Command;

class SyncRoutesCommand extends Command
{
    protected $signature = 'routes:sync
                           {--force : Force sync even if no changes detected}
                           {--dry-run : Show what would be synced without making changes}';

    protected $description = 'Discover and sync application routes with permissions system';

    protected RouteDiscoveryService $routeService;

    public function __construct(RouteDiscoveryService $routeService)
    {
        parent::__construct();
        $this->routeService = $routeService;
    }

    public function handle(): int
    {
        $this->info('🔍 Discovering application routes...');

        if ($this->option('dry-run')) {
            return $this->handleDryRun();
        }

        try {
            $stats = $this->routeService->syncRoutes();

            $this->newLine();
            $this->info('✅ Route synchronization completed!');
            $this->newLine();

            $this->displayStats($stats);

            if ($stats['new'] > 0 || $stats['updated'] > 0 || $stats['deactivated'] > 0) {
                $this->newLine();
                $this->warn('💡 Don\'t forget to assign permissions to new routes in the Access Control interface!');
            }

            return 0;

        } catch (\Exception $e) {
            $this->error('❌ Error during route synchronization: ' . $e->getMessage());
            return 1;
        }
    }

    protected function handleDryRun(): int
    {
        $routes = $this->routeService->discoverRoutes();

        $this->info("Found {count($routes)} discoverable routes:");
        $this->newLine();

        $groupedRoutes = collect($routes)->groupBy('group_name');

        foreach ($groupedRoutes as $groupName => $groupRoutes) {
            $this->line("<fg=cyan>📁 {$groupName}</>");

            foreach ($groupRoutes as $route) {
                $methods = implode('|', $route['route_methods']);
                $protection = $route['is_protected'] ? '🔒' : '🔓';

                $this->line("   {$protection} <fg=yellow>{$route['route_name']}</> [{$methods}] {$route['route_uri']}");

                if ($route['controller_class']) {
                    $controller = class_basename($route['controller_class']);
                    $this->line("      └─ {$controller}@{$route['controller_method']}");
                }
            }
            $this->newLine();
        }

        $this->info('🔍 This was a dry run. Use --force to actually sync the routes.');
        return 0;
    }

    protected function displayStats(array $stats): void
    {
        $headers = ['Metric', 'Count'];
        $rows = [
            ['Routes Discovered', $stats['discovered']],
            ['New Routes Added', $stats['new']],
            ['Routes Updated', $stats['updated']],
            ['Routes Deactivated', $stats['deactivated']],
        ];

        $this->table($headers, $rows);

        // Additional statistics
        $routeStats = $this->routeService->getRouteStats();

        $this->newLine();
        $this->info('📊 Current Route Statistics:');

        $summaryRows = [
            ['Total Routes', $routeStats['total_routes']],
            ['Active Routes', $routeStats['active_routes']],
            ['Protected Routes', $routeStats['protected_routes']],
            ['Routes with Permissions', $routeStats['routes_with_permissions']],
            ['Route Groups', $routeStats['total_groups']],
        ];

        $this->table($headers, $summaryRows);
    }
}
