<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Quiz;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QuestionController extends Controller
{
    public function create(Quiz $quiz)
    {
        return Inertia::render('Admin/Questions/Create', [
            'quiz' => $quiz->load('lesson.module')
        ]);
    }

    public function store(Request $request, Quiz $quiz)
    {
        $validated = $request->validate([
            'type' => 'required|in:multiple_choice,true_false,short_answer',
            'question' => 'required|string',
            'options' => 'nullable|array',
            'options.*' => 'string',
            'correct_answers' => 'required|array',
            'correct_answers.*' => 'string',
            'explanation' => 'nullable|string',
            'points' => 'integer|min:1',
            'order' => 'integer|min:0'
        ]);

        $validated['questionable_type'] = Quiz::class;
        $validated['questionable_id'] = $quiz->id;

        $question = Question::create($validated);

        return redirect()->route('admin.lessons.quizzes.show', [$quiz->lesson, $quiz])
            ->with('success', 'Question created successfully');
    }

    public function edit(Quiz $quiz, Question $question)
    {
        return Inertia::render('Admin/Questions/Edit', [
            'quiz' => $quiz->load('lesson.module'),
            'question' => $question
        ]);
    }

    public function update(Request $request, Quiz $quiz, Question $question)
    {
        $validated = $request->validate([
            'type' => 'required|in:multiple_choice,true_false,short_answer',
            'question' => 'required|string',
            'options' => 'nullable|array',
            'options.*' => 'string',
            'correct_answers' => 'required|array',
            'correct_answers.*' => 'string',
            'explanation' => 'nullable|string',
            'points' => 'integer|min:1',
            'order' => 'integer|min:0'
        ]);

        $question->update($validated);

        return redirect()->route('admin.lessons.quizzes.show', [$quiz->lesson, $quiz])
            ->with('success', 'Question updated successfully');
    }

    public function destroy(Quiz $quiz, Question $question)
    {
        $question->delete();

        return redirect()->route('admin.lessons.quizzes.show', [$quiz->lesson, $quiz])
            ->with('success', 'Question deleted successfully');
    }
}
