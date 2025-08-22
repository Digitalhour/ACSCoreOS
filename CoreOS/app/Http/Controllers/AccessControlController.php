<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Permission;
use App\Models\RoutePermission;
use App\Models\User;
use App\Services\RouteDiscoveryService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class AccessControlController extends Controller
{
    protected RouteDiscoveryService $routeService;

    public function __construct(RouteDiscoveryService $routeService)
    {
        $this->routeService = $routeService;
    }

    public function index()
    {
        $users = User::with(['roles:id,name,description', 'departments:id,name', 'permissions:id,name,description'])
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                $user->department = $user->departments->first()?->name ?? 'No Department';
                $user->direct_permissions = $user->permissions;
                return $user;
            });

        $roles = Role::with('permissions:id,name,description')
            ->select('id', 'name', 'description')
            ->orderBy('name')
            ->get();

        // Load permissions with their categories
        $permissions = Permission::with('categories:id,name,color,icon')
            ->select('id', 'name', 'description')
            ->orderBy('name')
            ->get();

        // Load categories with permission counts
        $categories = Category::withCount('permissions')
            ->active()
            ->ordered()
            ->get();

        $departments = \App\Models\Department::select('id', 'name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $routeGroups = RoutePermission::with([
            'permissions:id,name,description',
            'roles:id,name,description'
        ])
            ->active()
            ->orderBy('group_name')
            ->orderBy('route_name')
            ->get()
            ->groupBy('group_name');

        $routeStats = $this->routeService->getRouteStats();

        return Inertia::render('AccessControlPage', [
            'users' => $users,
            'roles' => $roles,
            'permissions' => $permissions,
            'categories' => $categories,
            'departments' => $departments,
            'routeGroups' => $routeGroups,
            'routeStats' => $routeStats,
        ]);
    }

// Category Management Methods
    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|regex:/^#[0-9A-F]{6}$/i',
            'icon' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        $validated['color'] = $validated['color'] ?? '#6366f1';

        Category::create($validated);

        return redirect()->back()->with('success', 'Category created successfully!');
    }

    public function updateCategory(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id,
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|regex:/^#[0-9A-F]{6}$/i',
            'icon' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);

        return redirect()->back()->with('success', 'Category updated successfully!');
    }

    public function destroyCategory(Category $category)
    {
        // Detach all permissions before deleting
        $category->permissions()->detach();

        $category->delete();

        return redirect()->back()->with('success', 'Category deleted successfully!');
    }


    /**
     * Update the role-permission matrix
     */
    public function updateRolePermissionMatrix(Request $request)
    {
        $validated = $request->validate([
            'matrix' => 'required|array',
            'matrix.*' => 'array',
            'matrix.*.*' => 'boolean',
        ]);

        try {
            \DB::beginTransaction();

            foreach ($validated['matrix'] as $roleId => $permissions) {
                $role = Role::findOrFail($roleId);
                $permissionIds = collect($permissions)
                    ->filter(fn($assigned) => $assigned === true)
                    ->keys()
                    ->toArray();
                $role->permissions()->sync($permissionIds);
            }

            \DB::commit();
            return redirect()->back()->with('success', 'Role permissions updated successfully!');

        } catch (\Exception $e) {
            \DB::rollback();
            return redirect()->back()->with('error', 'Failed to update permissions: ' . $e->getMessage());
        }
    }

    /**
     * Update the user-role matrix
     */
    public function updateUserRoleMatrix(Request $request)
    {
        $validated = $request->validate([
            'matrix' => 'required|array',
            'matrix.*' => 'array',
            'matrix.*.*' => 'boolean',
        ]);

        try {
            \DB::beginTransaction();

            foreach ($validated['matrix'] as $userId => $roles) {
                $user = User::findOrFail($userId);
                $roleIds = collect($roles)
                    ->filter(fn($assigned) => $assigned === true)
                    ->keys()
                    ->toArray();
                $user->syncRoles($roleIds);
            }

            \DB::commit();
            return redirect()->back()->with('success', 'User roles updated successfully!');

        } catch (\Exception $e) {
            \DB::rollback();
            return redirect()->back()->with('error', 'Failed to update user roles: ' . $e->getMessage());
        }
    }

    /**
     * Update route-permission assignments
     */
    public function updateRoutePermissions(Request $request)
    {
        $validated = $request->validate([
            'assignments' => 'required|array',
            'assignments.*' => 'array',
            'assignments.*.route_id' => 'required|exists:route_permissions,id',
            'assignments.*.permission_ids' => 'present|array',
            'assignments.*.permission_ids.*' => 'exists:permissions,id',
            'assignments.*.role_ids' => 'present|array',        // ADD THIS
            'assignments.*.role_ids.*' => 'exists:roles,id',    // ADD THIS
            'assignments.*.is_protected' => 'boolean',
        ]);

        try {
            \DB::beginTransaction();

            foreach ($validated['assignments'] as $assignment) {
                $routePermission = RoutePermission::findOrFail($assignment['route_id']);

                // Update route protection status
                $routePermission->update([
                    'is_protected' => $assignment['is_protected'] ?? true
                ]);

                // Sync permissions
                $routePermission->permissions()->sync($assignment['permission_ids']);

                // Sync roles - ADD THIS LINE
                $routePermission->roles()->sync($assignment['role_ids']);
            }

            \DB::commit();
            return redirect()->back()->with('success', 'Route permissions and roles updated successfully!');

        } catch (\Exception $e) {
            \DB::rollback();
            return redirect()->back()->with('error', 'Failed to update route permissions: ' . $e->getMessage());
        }
    }

    /**
     * Update user's direct permissions
     */
    public function updateUserPermissions(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'permissions' => 'present|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        try {
            $user = User::findOrFail($validated['user_id']);

            // Get current direct permissions (not from roles)
            $currentDirectPermissions = $user->getDirectPermissions();

            // Get permissions that should be directly assigned
            $newPermissionIds = $validated['permissions'];
            $newPermissions = Permission::whereIn('id', $newPermissionIds)->get();

            // Remove old direct permissions
            foreach ($currentDirectPermissions as $permission) {
                $user->revokePermissionTo($permission);
            }

            // Add new direct permissions
            foreach ($newPermissions as $permission) {
                $user->givePermissionTo($permission);
            }

            return redirect()->back()->with('success', 'User permissions updated successfully!');

        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to update user permissions: ' . $e->getMessage());
        }
    }

    /**
     * Sync routes from application
     */
    public function syncRoutes()
    {
        try {
            $stats = $this->routeService->syncRoutes();

            $message = sprintf(
                'Routes synced successfully! New: %d, Updated: %d, Deactivated: %d',
                $stats['new'],
                $stats['updated'],
                $stats['deactivated']
            );

            return back()->with('success', $message);

        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to sync routes: ' . $e->getMessage());
        }
    }

    /**
     * Update route details
     */
    public function updateRoute(Request $request, RoutePermission $routePermission)
    {
        $validated = $request->validate([
            'description' => 'nullable|string|max:1000',
            'is_protected' => 'boolean',
        ]);

        $routePermission->update($validated);

        return redirect()->back()->with('success', 'Route updated successfully!');
    }

    // Permission Management
    public function storePermission(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name',
            'description' => 'nullable|string|max:1000',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'exists:categories,id',
        ]);

        $permission = Permission::create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'guard_name' => 'web'
        ]);

        // Attach categories if provided
        if (!empty($validated['category_ids'])) {
            $permission->categories()->attach($validated['category_ids']);
        }

        return redirect()->back()->with('success', 'Permission created successfully!');
    }

    public function updatePermission(Request $request, Permission $permission)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name,' . $permission->id,
            'description' => 'nullable|string|max:1000',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'exists:categories,id',
        ]);

        $permission->update([
            'name' => $validated['name'],
            'description' => $validated['description'],
        ]);

        // Sync categories
        $categoryIds = $validated['category_ids'] ?? [];
        $permission->categories()->sync($categoryIds);

        return redirect()->back()->with('success', 'Permission updated successfully!');
    }

    public function destroyPermission(Permission $permission)
    {
        // Detach categories
        $permission->categories()->detach();

        // Detach from roles
        $permission->roles()->detach();

        // Remove direct user permissions
        \DB::table('model_has_permissions')
            ->where('permission_id', $permission->id)
            ->delete();

        $permission->delete();

        return redirect()->back()->with('success', 'Permission deleted successfully!');
    }
    public function bulkUpdateRoutePermissions(Request $request)
    {
        $validated = $request->validate([
            'route_ids' => 'required|array',
            'route_ids.*' => 'exists:route_permissions,id',
            'permission_ids' => 'present|array',
            'permission_ids.*' => 'exists:permissions,id',
            'role_ids' => 'present|array',           // Add this line
            'role_ids.*' => 'exists:roles,id',      // Add this line
            'is_protected' => 'boolean',
        ]);

        try {
            \DB::beginTransaction();

            foreach ($validated['route_ids'] as $routeId) {
                $routePermission = RoutePermission::findOrFail($routeId);

                if (isset($validated['is_protected'])) {
                    $routePermission->update(['is_protected' => $validated['is_protected']]);
                }

                if (isset($validated['permission_ids'])) {
                    $routePermission->permissions()->sync($validated['permission_ids']);
                }

                // Add this block for roles
                if (isset($validated['role_ids'])) {
                    $routePermission->roles()->sync($validated['role_ids']);
                }
            }

            \DB::commit();
            return back()->with('success', 'Route permissions and roles updated for ' . count($validated['route_ids']) . ' routes');

        } catch (\Exception $e) {
            \DB::rollback();
            return redirect()->back()->with('error', 'Failed to update route permissions: ' . $e->getMessage());
        }
    }

// Search categories
    public function searchCategories(Request $request)
    {
        $query = Category::withCount('permissions');

        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%')
                ->orWhere('description', 'like', '%' . $request->search . '%');
        }

        return response()->json([
            'data' => $query->active()->ordered()->limit(50)->get()
        ]);
    }
    // Role Management
    public function storeRole(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'description' => 'nullable|string|max:1000',
        ]);

        Role::create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'guard_name' => 'web'
        ]);

        return redirect()->back()->with('success', 'Role created successfully!');
    }

    public function updateRole(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,'.$role->id,
            'description' => 'nullable|string|max:1000',
        ]);

        $role->update([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'guard_name' => 'web'
        ]);

        return redirect()->back()->with('success', 'Role updated successfully!');
    }

    public function destroyRole(Role $role)
    {
        $role->permissions()->detach();
        \DB::table('model_has_roles')
            ->where('role_id', $role->id)
            ->delete();

        $role->delete();
        return redirect()->back()->with('success', 'Role deleted successfully!');
    }

    // User Management
    public function storeUser(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'department_id' => 'nullable|exists:departments,id',
        ]);

        $validated['password'] = \Hash::make('password');
        $user = User::create($validated);

        if ($validated['department_id']) {
            $department = \App\Models\Department::findOrFail($validated['department_id']);
            $department->users()->attach($user->id, [
                'assigned_at' => now(),
            ]);
        }

        return redirect()->back()->with('success', 'User created successfully!');
    }

    // Search endpoints
    public function searchPermissions(Request $request)
    {
        $query = Permission::select('id', 'name', 'description');

        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        return response()->json([
            'data' => $query->limit(50)->get()
        ]);
    }

    public function searchRoles(Request $request)
    {
        $query = Role::with('permissions:id,name,description')->select('id', 'name', 'description');

        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        return response()->json([
            'data' => $query->limit(50)->get()
        ]);
    }

    public function searchUsers(Request $request)
    {
        $query = User::with(['roles:id,name,description', 'permissions:id,name,description'])
            ->select('id', 'name');

        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $users = $query->limit(50)->get()->map(function ($user) {
            $user->direct_permissions = $user->permissions;
            return $user;
        });

        return response()->json([
            'data' => $users
        ]);
    }

    public function searchRoutes(Request $request)
    {
        $query = RoutePermission::with('permissions:id,name,description')
            ->active();

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('route_name', 'like', '%' . $request->search . '%')
                    ->orWhere('route_uri', 'like', '%' . $request->search . '%')
                    ->orWhere('group_name', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->group) {
            $query->where('group_name', $request->group);
        }

        return response()->json([
            'data' => $query->limit(50)->get()
        ]);
    }

    // Bulk operations
    public function bulkAssignRoles(Request $request)
    {
        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id',
            'action' => 'required|in:assign,remove'
        ]);

        try {
            \DB::beginTransaction();

            foreach ($validated['user_ids'] as $userId) {
                $user = User::findOrFail($userId);

                if ($validated['action'] === 'assign') {
                    $user->roles()->syncWithoutDetaching($validated['role_ids']);
                } else {
                    $user->roles()->detach($validated['role_ids']);
                }
            }

            \DB::commit();

            $action = $validated['action'] === 'assign' ? 'assigned to' : 'removed from';
            $message = "Roles {$action} " . count($validated['user_ids']) . " users successfully!";

            return redirect()->back()->with('success', $message);

        } catch (\Exception $e) {
            \DB::rollback();
            return redirect()->back()->with('error', 'Failed to update user roles: ' . $e->getMessage());
        }
    }

    public function bulkAssignPermissionCategories(Request $request)
    {
        $validated = $request->validate([
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'exists:permissions,id',
            'category_ids' => 'required|array',
            'category_ids.*' => 'exists:categories,id',
            'action' => 'required|in:assign,remove,replace'
        ]);

        try {
            \DB::beginTransaction();

            foreach ($validated['permission_ids'] as $permissionId) {
                $permission = Permission::findOrFail($permissionId);

                switch ($validated['action']) {
                    case 'assign':
                        $permission->categories()->syncWithoutDetaching($validated['category_ids']);
                        break;
                    case 'remove':
                        $permission->categories()->detach($validated['category_ids']);
                        break;
                    case 'replace':
                        $permission->categories()->sync($validated['category_ids']);
                        break;
                }
            }

            \DB::commit();

            $action = match($validated['action']) {
                'assign' => 'assigned to',
                'remove' => 'removed from',
                'replace' => 'replaced for',
            };

            $message = "Categories {$action} " . count($validated['permission_ids']) . " permissions successfully!";

            return redirect()->back()->with('success', $message);

        } catch (\Exception $e) {
            \DB::rollback();
            return redirect()->back()->with('error', 'Failed to update permission categories: ' . $e->getMessage());
        }
    }


}
