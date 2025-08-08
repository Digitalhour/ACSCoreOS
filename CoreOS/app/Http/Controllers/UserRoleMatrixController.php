<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserRoleMatrixController extends Controller
{
    public function index()
    {
        $users = User::with(['roles:id,name', 'departments:id,name'])
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                // Get primary department name for grouping (first assigned department)
                $user->department = $user->departments->first()?->name ?? 'No Department';
                return $user;
            });

        $roles = Role::select('id', 'name')
            ->orderBy('name')
            ->get();

        $departments = \App\Models\Department::select('id', 'name')
            ->where('is_active', true) // Only active departments if you have this field
            ->orderBy('name')
            ->get();

        return Inertia::render('UserRoleMatrixPage', [
            'users' => $users,
            'roles' => $roles,
            'departments' => $departments,
        ]);
    }

    /**
     * Update the user-role matrix
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

            foreach ($matrix as $userId => $roles) {
                $user = User::findOrFail($userId);

                // Get role IDs where value is true
                $roleIds = collect($roles)
                    ->filter(fn($assigned) => $assigned === true)
                    ->keys()
                    ->toArray();

                // Sync roles for this user
                $user->syncRoles($roleIds);
            }

            \DB::commit();

            return redirect()->back()->with('success', 'User role assignments updated successfully!');

        } catch (\Exception $e) {
            \DB::rollback();

            return redirect()->back()->with('error', 'Failed to update user roles: ' . $e->getMessage());
        }
    }

    /**
     * Create a new user
     */
    public function storeUser(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'department_id' => 'nullable|exists:departments,id',
        ]);

        $validated['password'] = \Hash::make('password'); // Default password

        $user = User::create($validated);

        // Assign to department using your existing method
        if ($validated['department_id']) {
            $department = \App\Models\Department::findOrFail($validated['department_id']);
            $department->users()->attach($user->id, [
                'assigned_at' => now(),
            ]);
        }

        return redirect()->back()->with('success', 'User created successfully!');
    }

    /**
     * Bulk assign roles to multiple users
     */
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
                    // Add roles without removing existing ones
                    $user->roles()->syncWithoutDetaching($validated['role_ids']);
                } else {
                    // Remove specified roles
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

    /**
     * Export user-role matrix to CSV
     */
    public function export()
    {
        $users = User::with('roles:id,name')
            ->select('id', 'name', 'email', 'department')
            ->orderBy('department')
            ->orderBy('name')
            ->get();

        $roles = Role::select('id', 'name')
            ->orderBy('name')
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="user-role-matrix.csv"',
        ];

        $callback = function() use ($users, $roles) {
            $file = fopen('php://output', 'w');

            // Header row
            $header = ['User', 'Email', 'Department'];
            foreach ($roles as $role) {
                $header[] = $role->name;
            }
            fputcsv($file, $header);

            // Data rows
            foreach ($users as $user) {
                $row = [$user->name, $user->email, $user->department ?? ''];

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
