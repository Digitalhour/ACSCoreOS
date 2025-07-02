<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\Quiz;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QuizController extends Controller
{
    public function create(Lesson $lesson)
    {
        return Inertia::render('Admin/Quizzes/Create', [
            'lesson' => $lesson->load('module')
        ]);
    }

    public function store(Request $request, Lesson $lesson)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'time_limit' => 'nullable|integer|min:1',
            'passing_score' => 'integer|min:0|max:100',
            'randomize_questions' => 'boolean',
            'show_results_immediately' => 'boolean'
        ]);

        $validated['lesson_id'] = $lesson->id;

        $quiz = Quiz::create($validated);

        return redirect()->route('admin.modules.lessons.show', [$lesson->module, $lesson])
            ->with('success', 'Quiz created successfully');
    }

    public function show(Lesson $lesson, Quiz $quiz)
    {
        $quiz->load('questions');

        return Inertia::render('Admin/Quizzes/Show', [
            'lesson' => $lesson->load('module'),
            'quiz' => $quiz
        ]);
    }

    public function edit(Lesson $lesson, Quiz $quiz)
    {
        return Inertia::render('Admin/Quizzes/Edit', [
            'lesson' => $lesson->load('module'),
            'quiz' => $quiz
        ]);
    }

    public function update(Request $request, Lesson $lesson, Quiz $quiz)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'time_limit' => 'nullable|integer|min:1',
            'passing_score' => 'integer|min:0|max:100',
            'randomize_questions' => 'boolean',
            'show_results_immediately' => 'boolean'
        ]);

        $quiz->update($validated);

        return redirect()->route('admin.lessons.quizzes.show', [$lesson, $quiz])
            ->with('success', 'Quiz updated successfully');
    }

    public function destroy(Lesson $lesson, Quiz $quiz)
    {
        $quiz->delete();

        return redirect()->route('admin.modules.lessons.show', [$lesson->module, $lesson])
            ->with('success', 'Quiz deleted successfully');
    }
}
