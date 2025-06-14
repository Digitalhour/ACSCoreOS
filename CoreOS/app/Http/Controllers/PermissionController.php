<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    /**
     * Display a listing of permissions.
     */
    public function index()
    {
        $permissions = Permission::all();

        return Inertia::render('PermissionManager', [
            'permissions' => $permissions,
            'users' => User::all(),
        ]);
    }

    /**
     * Store a newly created permission.
     */
    public function store(Request $request)
    {
        $request->validate(['name' => 'required|string|unique:permissions,name']);

        $permission = Permission::create(['name' => $request->name]);

        return redirect()->back();
    }

    /**
     * Assign an existing permission to a user.
     */
    public function assign(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'permission' => 'required|string|exists:permissions,name',
        ]);

        $user = User::findOrFail($request->user_id);
        $user->givePermissionTo($request->permission);

        return redirect()->back();
    }

    /**
     * Update the specified permission.
     */
    public function update(Request $request, Permission $permission)
    {
        $request->validate(['name' => 'required|string|unique:permissions,name,'.$permission->id]);

        $permission->update(['name' => $request->name]);

        return redirect()->back();
    }

    /**
     * Remove the specified permission.
     */
    public function destroy(Permission $permission)
    {
        $permission->delete();

        return redirect()->back();
    }

    /**
     * Bulk delete all permissions.
     */
//    public function destroyAll()
//    {
//        Permission::query()->delete();
//
//        return redirect()->back();
//    }
}
