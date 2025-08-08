<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RolePermissionController extends Controller
{
    public function index()
    {
        $users = User::with([
            'roles:id,name', 'permissions:id,name'
        ])
            ->select('id', 'name')
            ->get()
            ->map(function ($user) {
                $user->direct_permissions = $user->permissions->pluck('name');
                return $user;
            });

        return Inertia::render('RoleMatrixPage', [
            'permissions' => Permission::select('id', 'name')->orderBy('name')->get(),
            'roles' => Role::with('permissions:id,name')->select('id', 'name')->orderBy('name')->get(),
            'users' => $users,
        ]);
    }

    /**
     * Update the role-permission matrix
     */
    public function updateMatrix(Request $request)
    {
        $validated = $request->validate([
            'matrix' => 'required|array',
            'matrix.*' => 'array',
            'matrix.*.*' => 'boolean',
        ]);

        $matrix = $validated['matrix'];

        try {
            \DB::beginTransaction();

            foreach ($matrix as $roleId => $permissions) {
                $role = Role::findOrFail($roleId);

                // Get permission IDs where value is true
                $permissionIds = collect($permissions)
                    ->filter(fn($assigned) => $assigned === true)
                    ->keys()
                    ->toArray();

                // Sync permissions for this role
                $role->permissions()->sync($permissionIds);
            }

            \DB::commit();

            return redirect()->back()->with('success', 'Role permissions matrix updated successfully!');

        } catch (\Exception $e) {
            \DB::rollback();

            return redirect()->back()->with('error', 'Failed to update permissions matrix: ' . $e->getMessage());
        }
    }

    // Add search endpoints for large datasets
    public function searchPermissions(Request $request)
    {
        $query = Permission::select('id', 'name');

        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        return response()->json([
            'data' => $query->limit(50)->get()
        ]);
    }

    public function searchRoles(Request $request)
    {
        $query = Role::with('permissions:id,name')->select('id', 'name');

        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        return response()->json([
            'data' => $query->limit(50)->get()
        ]);
    }

    public function searchUsers(Request $request)
    {
        $query = User::with(['roles:id,name', 'permissions:id,name'])
            ->select('id', 'name');

        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $users = $query->limit(50)->get()->map(function ($user) {
            $user->direct_permissions = $user->permissions->pluck('name');
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
        ]);

        foreach ($validated['user_ids'] as $userId) {
            $user = User::findOrFail($userId);
            $user->syncRoles($validated['role_ids']);
        }

        return redirect()->back()->with('success', 'Roles assigned to ' . count($validated['user_ids']) . ' users');
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

    // Original methods remain the same
    public function storePermission(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name',
        ]);

        Permission::create($validated);
        return redirect()->back()->with('success', 'Permission created successfully!');
    }

    public function updatePermission(Request $request, Permission $permission)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name,'.$permission->id,
        ]);

        $permission->update($validated);
        return redirect()->back()->with('success', 'Permission updated successfully!');
    }

    public function destroyPermission(Permission $permission)
    {
        // Remove permission from all roles first
        $permission->roles()->detach();

        // Remove direct permission assignments from users
        \DB::table('model_has_permissions')
            ->where('permission_id', $permission->id)
            ->delete();

        $permission->delete();
        return redirect()->back()->with('success', 'Permission deleted successfully!');
    }

    public function storeRole(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
        ]);

        Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web'
        ]);

        return redirect()->back()->with('success', 'Role created successfully!');
    }

    public function updateRole(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,'.$role->id,
        ]);

        $role->update([
            'name' => $validated['name'],
            'guard_name' => 'web'
        ]);

        return redirect()->back()->with('success', 'Role updated successfully!');
    }

    public function destroyRole(Role $role)
    {
        // Remove all permissions from role
        $role->permissions()->detach();

        // Remove role from all users
        \DB::table('model_has_roles')
            ->where('role_id', $role->id)
            ->delete();

        $role->delete();
        return redirect()->back()->with('success', 'Role deleted successfully!');
    }

    public function updateRolePermissions(Request $request)
    {
        $validated = $request->validate([
            'role_id' => 'required|exists:roles,id',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = Role::findOrFail($validated['role_id']);
        $role->permissions()->sync($validated['permissions'] ?? []);

        return redirect()->back();
    }

    public function assignUserRole(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
        ]);

        $user = User::findOrFail($validated['user_id']);
        $user->roles()->syncWithoutDetaching([$validated['role_id']]);

        return redirect()->back();
    }

    public function syncUserRoles(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'roles' => 'present|array',
            'roles.*' => 'exists:roles,id',
        ]);

        $user = User::findOrFail($validated['user_id']);
        $user->syncRoles($validated['roles']);

        return redirect()->back()->with('success', 'User roles updated successfully!');
    }

    public function syncUserDirectPermissions(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'permissions' => 'present|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $user = User::findOrFail($validated['user_id']);
        $user->syncPermissions($validated['permissions']);

        return redirect()->back()->with('success', 'User direct permissions updated successfully!');
    }

    public function removeUserRole(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
        ]);

        $user = User::findOrFail($validated['user_id']);
        $user->roles()->detach($validated['role_id']);

        return redirect()->back();
    }
}
