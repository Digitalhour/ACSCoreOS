<?php
namespace App\Http\Controllers\HumanResources;
use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Models\Test;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TestController extends Controller
{
    public function create(Module $module)
    {
        return Inertia::render('human-resources/Training/Tests/Create', [
            'module' => $module
        ]);
    }

    public function store(Request $request, Module $module)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'time_limit' => 'nullable|integer|min:1',
            'passing_score' => 'integer|min:0|max:100',
            'randomize_questions' => 'boolean',
            'show_results_immediately' => 'boolean'
        ]);

        $validated['module_id'] = $module->id;

        $test = Test::create($validated);

        return redirect()->route('admin.modules.show', $module)
            ->with('success', 'Test created successfully');
    }

    public function show(Module $module, Test $test)
    {
        $test->load('questions');

        return Inertia::render('human-resources/Training/Tests/Show', [
            'module' => $module,
            'test' => $test
        ]);
    }

    public function edit(Module $module, Test $test)
    {
        return Inertia::render('human-resources/Training/Tests/Edit', [
            'module' => $module,
            'test' => $test
        ]);
    }

    public function update(Request $request, Module $module, Test $test)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'time_limit' => 'nullable|integer|min:1',
            'passing_score' => 'integer|min:0|max:100',
            'randomize_questions' => 'boolean',
            'show_results_immediately' => 'boolean'
        ]);

        $test->update($validated);

        return redirect()->route('admin.modules.tests.show', [$module, $test])
            ->with('success', 'Test updated successfully');
    }

    public function destroy(Module $module, Test $test)
    {
        $test->delete();

        return redirect()->route('admin.modules.show', $module)
            ->with('success', 'Test deleted successfully');
    }
}
