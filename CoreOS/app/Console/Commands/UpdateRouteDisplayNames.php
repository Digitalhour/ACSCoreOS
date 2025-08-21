<?php

namespace App\Console\Commands;

use App\Models\RoutePermission;
use App\Services\RouteDiscoveryService;
use Illuminate\Console\Command;

class UpdateRouteDisplayNames extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'routes:update-display-names {--force : Force update even if display_name exists}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update display names for all route permissions to make them more user-friendly';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🔄 Updating route display names...');
        
        $routeService = app(RouteDiscoveryService::class);
        $force = $this->option('force');
        
        $query = RoutePermission::query();
        
        if (!$force) {
            $query->whereNull('display_name');
        }
        
        $routes = $query->get();
        $updated = 0;
        
        $progressBar = $this->output->createProgressBar($routes->count());
        $progressBar->start();
        
        foreach ($routes as $route) {
            $displayName = $this->createDisplayName($route->route_name);
            
            $route->update(['display_name' => $displayName]);
            $updated++;
            $progressBar->advance();
        }
        
        $progressBar->finish();
        $this->newLine();
        
        $this->info("✅ Updated display names for {$updated} routes!");
        
        // Show some examples
        $this->newLine();
        $this->info('📋 Sample improvements:');
        
        $samples = RoutePermission::whereNotNull('display_name')
            ->limit(5)
            ->get(['route_name', 'display_name', 'group_name']);
            
        foreach ($samples as $sample) {
            $this->line("  • {$sample->group_name}: {$sample->route_name} → {$sample->display_name}");
        }
        
        return Command::SUCCESS;
    }
    
    /**
     * Create a user-friendly display name for routes
     */
    protected function createDisplayName(string $routeName): string
    {
        // Remove redundant prefixes
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
            'reorder' => 'Reorder',
            'assign-permission-categories' => 'Assign Permission Categories',
            'assign-roles' => 'Assign Roles',
            'assign-permissions' => 'Assign Permissions',
            'update-route-permissions' => 'Update Route Permissions',
            'sync-routes' => 'Sync Routes',
            'sync-user-roles' => 'Sync User Roles',
            'sync-user-direct-permissions' => 'Sync Direct Permissions',
        ];
        
        // Get the action (usually the last part or combined last parts)
        $action = $this->extractAction($parts);
        $actionDisplay = $actionMappings[$action] ?? ucwords(str_replace(['-', '_'], ' ', $action));
        
        // Get the resource context (everything except the action)
        $resourceParts = $this->extractResourceContext($parts, $action);
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
     * Extract action from route parts, handling complex actions
     */
    protected function extractAction(array $parts): string
    {
        $lastPart = end($parts);
        
        // Handle complex multi-word actions
        if (count($parts) >= 3) {
            $lastTwo = array_slice($parts, -2);
            $combined = implode('-', $lastTwo);
            
            // Check if this is a known complex action
            $complexActions = [
                'assign-permission-categories',
                'update-route-permissions',
                'sync-routes',
                'assign-roles',
                'assign-permissions',
                'sync-user-roles',
                'sync-user-direct-permissions',
                'bulk-assign',
                'bulk-update',
                'user-check',
            ];
            
            if (in_array($combined, $complexActions)) {
                return $combined;
            }
        }
        
        return $lastPart;
    }
    
    /**
     * Extract resource context, excluding the action
     */
    protected function extractResourceContext(array $parts, string $action): array
    {
        // If action is complex (contains multiple words), remove more parts
        $actionParts = explode('-', $action);
        $partsToRemove = count($actionParts);
        
        return array_slice($parts, 0, -$partsToRemove);
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
}