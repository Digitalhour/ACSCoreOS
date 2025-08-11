<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AccessControlController extends Controller
{
    public function index()
    {
        $users = User::with(['roles:id,name,description', 'departments:id,name', 'permissions:id,name,description'])
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                // Get primary department name for grouping
                $user->department = $user->departments->first()?->name ?? 'No Department';
                $user->direct_permissions = $user->permissions;
                return $user;
            });

        $roles = Role::with('permissions:id,name,description')
            ->select('id', 'name', 'description')
            ->orderBy('name')
            ->get();

        $permissions = Permission::select('id', 'name', 'description')
            ->orderBy('name')
            ->get();

        $departments = \App\Models\Department::select('id', 'name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return Inertia::render('AccessControlPage', [
            'users' => $users,
            'roles' => $roles,
            'permissions' => $permissions,
            'departments' => $departments,
        ]);
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

    // Permission Management
    public function storePermission(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name',
            'description' => 'nullable|string|max:1000',
        ]);

        Permission::create([
            'name' => $validated['name'],
            'description' => $validated['description'],
            'guard_name' => 'web'
        ]);

        return redirect()->back()->with('success', 'Permission created successfully!');
    }

    public function updatePermission(Request $request, Permission $permission)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name,'.$permission->id,
            'description' => 'nullable|string|max:1000',
        ]);

        $permission->update($validated);
        return redirect()->back()->with('success', 'Permission updated successfully!');
    }

    public function destroyPermission(Permission $permission)
    {
        $permission->roles()->detach();
        \DB::table('model_has_permissions')
            ->where('permission_id', $permission->id)
            ->delete();

        $permission->delete();
        return redirect()->back()->with('success', 'Permission deleted successfully!');
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

    public function bulkAssignPermissions(Request $request)
    {
        $validated = $request->validate([
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id',
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        foreach ($validated['role_ids'] as $roleId) {
            $role = Role::findOrFail($roleId);
            $role->permissions()->sync($validated['permission_ids']);
        }

        return redirect()->back()->with('success', 'Permissions assigned to ' . count($validated['role_ids']) . ' roles');
    }

    /**
     * Export user-role matrix to CSV
     */
    public function export()
    {
        $users = User::with('roles:id,name,description')
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        $roles = Role::select('id', 'name', 'description')
            ->orderBy('name')
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="user-role-matrix.csv"',
        ];

        $callback = function() use ($users, $roles) {
            $file = fopen('php://output', 'w');

            $header = ['User', 'Email'];
            foreach ($roles as $role) {
                $header[] = $role->name;
            }
            fputcsv($file, $header);

            foreach ($users as $user) {
                $row = [$user->name, $user->email];

                foreach ($roles as $role) {
                    $hasRole = $user->roles->contains('id', $role->id);
                    $row[] = $hasRole ? 'Yes' : 'No';
                }

                fputcsv($file, $row);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
