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
        ]) // Eager load roles and direct permissions with only id and name
        ->select('id', 'name')
            ->get()
            ->map(function ($user) {
                // Spatie's `permissions` relationship on User model gets direct permissions.
                // `getAllPermissions` gets all permissions (direct + via roles).
                // For managing *direct* permissions, we want the `permissions` relationship.
                $user->direct_permissions = $user->permissions->pluck('name'); // Get names of direct permissions
                // Roles are already plucked if you define the relationship columns correctly as above
                // If not, you might need: $user->roles = $user->roles->pluck('name');
                return $user;
            });

        return Inertia::render('RolesPermissionsPage', [
            'permissions' => Permission::select('id', 'name')->get(), // Send all available permissions
            'roles' => Role::with('permissions:id,name')->select('id', 'name')->get(), // Roles with their permissions
            'users' => $users,
        ]);
    }

    public function storePermission(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name',
        ]);

        Permission::create($validated);

        return redirect()->back();
    }

    public function updatePermission(Request $request, Permission $permission)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name,'.$permission->id,
        ]);

        $permission->update($validated);

        return redirect()->back();
    }

    public function destroyPermission(Permission $permission)
    {
        $permission->delete();

        return redirect()->back();
    }

    public function storeRole(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
        ]);

        // Create with explicit guard_name
        Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web'
        ]);

        return redirect()->back();
    }

    public function updateRole(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,'.$role->id,
        ]);

        // Update with explicit guard_name
        $role->update([
            'name' => $validated['name'],
            'guard_name' => 'web'
        ]);

        return redirect()->back();
    }

    public function destroyRole(Role $role)
    {
        // First detach all permissions to avoid foreign key constraints
        $role->permissions()->detach();

        // Now safe to delete the role
        $role->delete();

        return redirect()->back();
    }

    public function updateRolePermissions(Request $request)
    {
        $validated = $request->validate([
            'role_id' => 'required|exists:roles,id',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = Role::findOrFail($validated['role_id']);

        // Sync permissions (will detach all existing and attach only the provided ones)
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

        // Add the new role (if not already assigned)
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
        $user->syncRoles($validated['roles']); // This syncs roles by ID or name

        return redirect()->back()->with('success', 'User roles updated successfully!');
    }

    public function syncUserDirectPermissions(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'permissions' => 'present|array',      // 'present' ensures the key exists, even if empty array
            'permissions.*' => 'exists:permissions,id', // Validate each item is an existing permission ID
        ]);

        $user = User::findOrFail($validated['user_id']);

        // Use syncPermissions to make the user's direct permissions exactly what's in the array.
        // This will revoke any direct permissions not in $validated['permissions'] and assign new ones.
        $user->syncPermissions($validated['permissions']); // Syncs by ID or name

        return redirect()->back()->with('success', 'User direct permissions updated successfully!');
    }


    public function removeUserRole(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
        ]);

        $user = User::findOrFail($validated['user_id']);

        // Remove the specified role from user
        $user->roles()->detach($validated['role_id']);

        return redirect()->back();
    }
}
