<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Module;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ModuleController extends Controller
{
    public function index()
    {
        $modules = Module::with(['lessons', 'test', 'enrollments'])
            ->orderBy('order')
            ->get()
            ->map(function($module) {
                $module->lessons_count = $module->lessons->count();
                $module->enrollments_count = $module->enrollments->count();
                $module->has_test = $module->test !== null;
                return $module;
            });

        return Inertia::render('Admin/Modules/Index', [
            'modules' => $modules
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Modules/Create');
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
            $validated['thumbnail'] = $path; // Store path, not URL
        }

        $module = Module::create($validated);

        return redirect()->route('admin.modules.show', $module)
            ->with('success', 'Module created successfully');
    }

    public function show(Module $module)
    {
        $module->load([
            'lessons' => function($query) {
                $query->orderBy('order')->with(['contents', 'quiz']);
            },
            'test.questions',
            'enrollments.user'
        ]);

        return Inertia::render('Admin/Modules/Show', [
            'module' => $module
        ]);
    }

    public function edit(Module $module)
    {
        return Inertia::render('Admin/Modules/Edit', [
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

        // Handle thumbnail upload
        if ($request->hasFile('thumbnail')) {
            // Delete old thumbnail
            if ($module->thumbnail) {
                Storage::disk('s3')->delete($module->thumbnail);
            }
            $path = $request->file('thumbnail')->store('modules/thumbnails', 's3');
            $validated['thumbnail'] = $path;
        } else {
            // Remove thumbnail from validated data to preserve existing thumbnail
            unset($validated['thumbnail']);
        }

        $module->update($validated);

        return redirect()->route('admin.modules.show', $module)
            ->with('success', 'Module updated successfully');
    }

    public function destroy(Module $module)
    {
        // Delete thumbnail
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
}
