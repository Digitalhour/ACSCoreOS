<?php

namespace App\Http\Controllers\HumanResources;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Module;
use App\Models\ModuleAssignment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ModuleController extends Controller
{
    public function index()
    {
        $modules = Module::with(['lessons', 'test', 'enrollments', 'assignments'])
            ->orderBy('order')
            ->get()
            ->map(function($module) {
                $module->lessons_count = $module->lessons->count();
                $module->enrollments_count = $module->enrollments->count();
                $module->has_test = $module->test !== null;
                $module->assignment_summary = $module->getAssignmentSummary();
                return $module;
            });

        return Inertia::render('human-resources/Training/Modules/Index', [
            'modules' => $modules
        ]);
    }

    public function create()
    {
        return Inertia::render('human-resources/Training/Modules/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'thumbnail' => 'nullable|image|max:2048',
            'sequential_lessons' => 'boolean',
            'quiz_required' => 'boolean',
            'test_required' => 'boolean',
            'passing_score' => 'integer|min:0|max:100',
            'allow_retakes' => 'boolean',
            'is_active' => 'boolean',
            'order' => 'integer|min:0'
        ]);

        if ($request->hasFile('thumbnail')) {
            $path = $request->file('thumbnail')->store('modules/thumbnails', 's3');
            $validated['thumbnail'] = $path;
        }

        $module = Module::create($validated);

        return redirect()->route('admin.modules.show', $module)
            ->with('success', 'Module created successfully');
    }



    public function edit(Module $module)
    {
        return Inertia::render('human-resources/Training/Modules/Edit', [
            'module' => $module
        ]);
    }

    public function update(Request $request, Module $module)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'thumbnail' => 'nullable|image|max:2048',
            'sequential_lessons' => 'boolean',
            'quiz_required' => 'boolean',
            'test_required' => 'boolean',
            'passing_score' => 'integer|min:0|max:100',
            'allow_retakes' => 'boolean',
            'is_active' => 'boolean',
            'order' => 'integer|min:0'
        ]);

        if ($request->hasFile('thumbnail')) {
            if ($module->thumbnail) {
                Storage::disk('s3')->delete($module->thumbnail);
            }
            $path = $request->file('thumbnail')->store('modules/thumbnails', 's3');
            $validated['thumbnail'] = $path;
        } else {
            unset($validated['thumbnail']);
        }

        $module->update($validated);

        return redirect()->route('admin.modules.show', $module)
            ->with('success', 'Module updated successfully');
    }

    public function destroy(Module $module)
    {
        if ($module->thumbnail) {
            Storage::disk('s3')->delete($module->thumbnail);
        }

        $module->delete();

        return redirect()->route('admin.modules.index')
            ->with('success', 'Module deleted successfully');
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'modules' => 'required|array',
            'modules.*.id' => 'required|exists:modules,id',
            'modules.*.order' => 'required|integer|min:0'
        ]);

        foreach ($validated['modules'] as $moduleData) {
            Module::where('id', $moduleData['id'])
                ->update(['order' => $moduleData['order']]);
        }

        return response()->json(['success' => true]);
    }



    public function storeAssignment(Request $request, Module $module)
    {
        $validated = $request->validate([
            'assignment_type' => 'required|in:everyone,user,department,hierarchy',
            'assignable_id' => 'nullable|integer|required_unless:assignment_type,everyone',
        ]);

        // Validate assignable_id based on assignment_type
        if ($validated['assignment_type'] !== 'everyone') {
            switch ($validated['assignment_type']) {
                case 'user':
                    $request->validate(['assignable_id' => 'exists:users,id']);
                    break;
                case 'department':
                    $request->validate(['assignable_id' => 'exists:departments,id']);
                    break;
                case 'hierarchy':
                    $request->validate(['assignable_id' => 'exists:users,id']);
                    break;
            }
        }

        // Check if assignment already exists
        $existingAssignment = ModuleAssignment::where([
            'module_id' => $module->id,
            'assignment_type' => $validated['assignment_type'],
            'assignable_id' => $validated['assignable_id']
        ])->first();

        if ($existingAssignment) {
            return back()->with('error', 'This assignment already exists.');
        }

        ModuleAssignment::create([
            'module_id' => $module->id,
            'assignment_type' => $validated['assignment_type'],
            'assignable_id' => $validated['assignment_type'] === 'everyone' ? null : $validated['assignable_id'],
        ]);

        return back()->with('success', 'Assignment added successfully.');
    }

    public function destroyAssignment(Module $module, ModuleAssignment $assignment)
    {
        if ($assignment->module_id !== $module->id) {
            return back()->with('error', 'Assignment does not belong to this module.');
        }

        $assignment->delete();

        return back()->with('success', 'Assignment removed successfully.');
    }
    public function show(Module $module)
    {
        $module->load([
            'lessons' => function($query) {
                $query->orderBy('order')->with(['contents', 'quiz']);
            },
            'test.questions',
            'enrollments.user',
            'assignments.user' => function($query) {
                $query->select('id', 'name', 'email', 'avatar');
            },
            'assignments.department' => function($query) {
                $query->select('id', 'name');
            },
            'assignments.manager' => function($query) {
                $query->select('id', 'name', 'email', 'avatar');
            }
        ]);

        // Manually set assignable for each assignment to ensure it's available
        foreach ($module->assignments as $assignment) {
            switch ($assignment->assignment_type) {
                case 'user':
                    $assignment->assignable = $assignment->user;
                    break;
                case 'department':
                    $assignment->assignable = $assignment->department;
                    break;
                case 'hierarchy':
                    $assignment->assignable = $assignment->manager;
                    break;
                default:
                    $assignment->assignable = null;
                    break;
            }
        }

        return Inertia::render('human-resources/Training/Modules/Show', [
            'module' => $module,
            'assignmentSummary' => $module->getAssignmentSummary()
        ]);
    }
    public function assignments(Module $module)
    {
        $assignments = $module->assignments()
            ->with([
                'user' => function($query) {
                    $query->select('id', 'name', 'email', 'avatar');
                },
                'department' => function($query) {
                    $query->select('id', 'name');
                },
                'manager' => function($query) {
                    $query->select('id', 'name', 'email', 'avatar');
                }
            ])
            ->get();

        // Manually set assignable for each assignment to ensure it's available
        foreach ($assignments as $assignment) {
            switch ($assignment->assignment_type) {
                case 'user':
                    $assignment->assignable = $assignment->user;
                    break;
                case 'department':
                    $assignment->assignable = $assignment->department;
                    break;
                case 'hierarchy':
                    $assignment->assignable = $assignment->manager;
                    break;
                default:
                    $assignment->assignable = null;
                    break;
            }
        }

        $users = User::select('id', 'name', 'email', 'avatar')->orderBy('name')->get();
        $departments = Department::select('id', 'name')->active()->orderBy('name')->get();
        $managers = User::whereHas('subordinates')->select('id', 'name', 'email', 'avatar')->orderBy('name')->get();

        return Inertia::render('human-resources/Training/Modules/Assignments', [
            'module' => $module,
            'assignments' => $assignments,
            'users' => $users,
            'departments' => $departments,
            'managers' => $managers
        ]);
    }

}
