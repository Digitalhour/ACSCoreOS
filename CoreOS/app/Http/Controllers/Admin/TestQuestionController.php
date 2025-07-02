<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Test;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TestQuestionController extends Controller
{
    public function create(Test $test)
    {
        return Inertia::render('Admin/TestQuestions/Create', [
            'test' => $test->load('module')
        ]);
    }

    public function store(Request $request, Test $test)
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

        $validated['questionable_type'] = Test::class;
        $validated['questionable_id'] = $test->id;

        $question = Question::create($validated);

        return redirect()->route('admin.modules.tests.show', [$test->module, $test])
            ->with('success', 'Question created successfully');
    }

    public function edit(Test $test, Question $question)
    {
        return Inertia::render('Admin/TestQuestions/Edit', [
            'test' => $test->load('module'),
            'question' => $question
        ]);
    }

    public function update(Request $request, Test $test, Question $question)
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

        return redirect()->route('admin.modules.tests.show', [$test->module, $test])
            ->with('success', 'Question updated successfully');
    }

    public function destroy(Test $test, Question $question)
    {
        $question->delete();

        return redirect()->route('admin.modules.tests.show', [$test->module, $test])
            ->with('success', 'Question deleted successfully');
    }
}
