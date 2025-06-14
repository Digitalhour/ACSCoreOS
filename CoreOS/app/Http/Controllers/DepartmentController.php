<?php

namespace App\Http\Controllers;

use App\Models\Department;

use App\Models\PtoModels\PtoRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DepartmentController extends Controller
{

    public function dashboard()
    {
        $departments = Department::with('users')->latest()->get();
        $users = User::select('id', 'name', 'email')->get();

        return Inertia::render('Admin/NewAdmin', [
            'departments' => $departments,
            'users' => $users,

        ]);
    }

    public function index()
    {
        $departments = Department::with('users')->latest()->get();
        $users = User::select('id', 'name', 'email')->get();

        return Inertia::render('Departments/Index', [
            'departments' => $departments,
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:departments',
            'description' => 'nullable|string|max:500',
        ]);

        Department::create($request->only(['name', 'description']));

        return redirect()->back()->with('success', 'Departments created successfully.');
    }

    public function update(Request $request, Department $department)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:departments,name,'.$department->id,
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        $department->update($request->only(['name', 'description', 'is_active']));

        return redirect()->back()->with('success', 'Departments updated successfully.');
    }

    public function destroy(Department $department)
    {
        $department->delete();
        return redirect()->back()->with('success', 'Departments deleted successfully.');
    }

    public function assignUsers(Request $request, Department $department)
    {
        $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $department->users()->sync($request->user_ids);

        return redirect()->back()->with('success', 'Users assigned successfully.');
    }
}
