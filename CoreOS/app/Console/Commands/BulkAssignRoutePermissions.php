<?php

namespace App\Console\Commands;

use App\Models\Permission;
use App\Models\RoutePermission;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Role;

class BulkAssignRoutePermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'routes:bulk-assign 
                           {--group= : Assign permissions to specific route group}
                           {--permission= : Permission to assign}
                           {--role= : Role to assign}
                           {--list-groups : List all available route groups}
                           {--smart : Use smart assignment based on logical groupings}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Bulk assign permissions and roles to route groups for easier management';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if ($this->option('list-groups')) {
            return $this->listGroups();
        }

        if ($this->option('smart')) {
            return $this->smartAssignment();
        }

        $group = $this->option('group');
        $permission = $this->option('permission');
        $role = $this->option('role');

        if (!$group) {
            $this->error('Please specify a group with --group option or use --list-groups to see available groups');
            return Command::FAILURE;
        }

        if (!$permission && !$role) {
            $this->error('Please specify either --permission or --role to assign');
            return Command::FAILURE;
        }

        return $this->assignToGroup($group, $permission, $role);
    }

    /**
     * List all available route groups
     */
    protected function listGroups(): int
    {
        $groups = RoutePermission::active()
            ->selectRaw('group_name, COUNT(*) as route_count')
            ->groupBy('group_name')
            ->orderBy('group_name')
            ->get();

        $this->info('📋 Available Route Groups:');
        $this->newLine();

        foreach ($groups as $group) {
            $this->line("  • {$group->group_name} ({$group->route_count} routes)");
        }

        return Command::SUCCESS;
    }

    /**
     * Smart assignment based on logical groupings
     */
    protected function smartAssignment(): int
    {
        $this->info('🧠 Performing smart route permission assignment...');

        // Define logical permission assignments
        $assignments = [
            'Human Resources' => ['hr.access', 'employees.manage', 'pto.manage'],
            'PTO Management' => ['pto.manage', 'hr.access'],
            'Time & Attendance' => ['hr.access'],
            'Access Control' => ['roles.manage', 'admin.access'],
            'Administration' => ['admin.access'],
            'User Management' => ['hr.access', 'employees.manage'],
            'Warehouse Operations' => ['warehouse.access'],
            'Parts Database' => ['warehouse.access'],
            'Training & Learning' => ['training.access', 'hr.access'],
            'AI Assistant' => [], // Open to all
            'Wiki & Documentation' => [], // Open to all
            'Dashboard' => [], // Open to all
            'Personal Settings' => [], // Open to all
            'Payroll & Finance' => ['finance.access', 'hr.access'],
            'Analytics & Tracking' => ['admin.access'],
        ];

        $updated = 0;

        foreach ($assignments as $groupName => $permissionNames) {
            $routes = RoutePermission::where('group_name', $groupName)->get();
            
            if ($routes->isEmpty()) {
                continue;
            }

            $permissions = Permission::whereIn('name', $permissionNames)->get();
            
            if ($permissions->isEmpty() && !empty($permissionNames)) {
                $this->warn("  ⚠️  Permissions not found for {$groupName}: " . implode(', ', $permissionNames));
                continue;
            }

            foreach ($routes as $route) {
                $route->permissions()->sync($permissions->pluck('id'));
                $updated++;
            }

            $this->info("  ✅ {$groupName}: {$routes->count()} routes → " . implode(', ', $permissionNames));
        }

        $this->newLine();
        $this->info("🎉 Smart assignment completed! Updated {$updated} route permissions.");

        return Command::SUCCESS;
    }

    /**
     * Assign permission/role to specific group
     */
    protected function assignToGroup(string $groupName, ?string $permissionName, ?string $roleName): int
    {
        $routes = RoutePermission::where('group_name', $groupName)->get();

        if ($routes->isEmpty()) {
            $this->error("No routes found for group: {$groupName}");
            return Command::FAILURE;
        }

        $updated = 0;

        if ($permissionName) {
            $permission = Permission::where('name', $permissionName)->first();
            if (!$permission) {
                $this->error("Permission '{$permissionName}' not found");
                return Command::FAILURE;
            }

            foreach ($routes as $route) {
                $route->permissions()->syncWithoutDetaching([$permission->id]);
                $updated++;
            }

            $this->info("✅ Assigned permission '{$permissionName}' to {$updated} routes in '{$groupName}'");
        }

        if ($roleName) {
            $role = Role::where('name', $roleName)->first();
            if (!$role) {
                $this->error("Role '{$roleName}' not found");
                return Command::FAILURE;
            }

            foreach ($routes as $route) {
                $route->roles()->syncWithoutDetaching([$role->id]);
                $updated++;
            }

            $this->info("✅ Assigned role '{$roleName}' to {$updated} routes in '{$groupName}'");
        }

        return Command::SUCCESS;
    }
}