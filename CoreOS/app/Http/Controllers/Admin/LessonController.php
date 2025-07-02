<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\Module;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LessonController extends Controller
{
    public function create(Module $module)
    {
        return Inertia::render('Admin/Lessons/Create', [
            'module' => $module
        ]);
    }

    public function store(Request $request, Module $module)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'integer|min:0',
            'is_active' => 'boolean'
        ]);

        $validated['module_id'] = $module->id;

        $lesson = Lesson::create($validated);

        return redirect()->route('admin.modules.show', $module)
            ->with('success', 'Lesson created successfully');
    }

    public function show(Module $module, Lesson $lesson)
    {
        $lesson->load(['contents', 'quiz.questions']);

        return Inertia::render('Admin/Lessons/Show', [
            'module' => $module,
            'lesson' => $lesson
        ]);
    }

    public function edit(Module $module, Lesson $lesson)
    {
        return Inertia::render('Admin/Lessons/Edit', [
            'module' => $module,
            'lesson' => $lesson
        ]);
    }

    public function update(Request $request, Module $module, Lesson $lesson)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order' => 'integer|min:0',
            'is_active' => 'boolean'
        ]);

        $lesson->update($validated);

        return redirect()->route('admin.modules.lessons.show', [$module, $lesson])
            ->with('success', 'Lesson updated successfully');
    }

    public function destroy(Module $module, Lesson $lesson)
    {
        $lesson->delete();

        return redirect()->route('admin.modules.show', $module)
            ->with('success', 'Lesson deleted successfully');
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'lessons' => 'required|array',
            'lessons.*.id' => 'required|exists:lessons,id',
            'lessons.*.order' => 'required|integer|min:0'
        ]);

        foreach ($validated['lessons'] as $lessonData) {
            Lesson::where('id', $lessonData['id'])
                ->update(['order' => $lessonData['order']]);
        }

        return response()->json(['success' => true]);
    }
}
