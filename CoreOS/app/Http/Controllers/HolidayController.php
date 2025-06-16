<?php

namespace App\Http\Controllers;

use App\Models\Holiday;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HolidayController extends Controller
{
    public function index(): Response
    {
        $holidays = Holiday::active()
            ->orderBy('date', 'asc')
            ->get()
            ->map(function ($holiday) {
                return [
                    'id' => $holiday->id,
                    'name' => $holiday->name,
                    'date' => $holiday->date->format('Y-m-d'),
                    'formatted_date' => $holiday->formatted_date,
                    'description' => $holiday->description,
                    'type' => $holiday->type,
                    'is_recurring' => $holiday->is_recurring,
                    'is_upcoming' => $holiday->is_upcoming,
                ];
            });

        return Inertia::render('Holidays/Index', [
            'holidays' => $holidays
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Holidays/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'type' => 'required|in:public,company,custom',
            'is_recurring' => 'boolean'
        ]);

        Holiday::create($validated);

        return redirect()->route('holidays.index')
            ->with('message', 'Holiday created successfully!');
    }

    public function show(Holiday $holiday): Response
    {
        return Inertia::render('Holidays/Show', [
            'holiday' => [
                'id' => $holiday->id,
                'name' => $holiday->name,
                'date' => $holiday->date->format('Y-m-d'),
                'formatted_date' => $holiday->formatted_date,
                'description' => $holiday->description,
                'type' => $holiday->type,
                'is_recurring' => $holiday->is_recurring,
                'is_upcoming' => $holiday->is_upcoming,
            ]
        ]);
    }

    public function edit(Holiday $holiday): Response
    {
        return Inertia::render('Holidays/Edit', [
            'holiday' => [
                'id' => $holiday->id,
                'name' => $holiday->name,
                'date' => $holiday->date->format('Y-m-d'),
                'description' => $holiday->description,
                'type' => $holiday->type,
                'is_recurring' => $holiday->is_recurring,
            ]
        ]);
    }

    public function update(Request $request, Holiday $holiday)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'type' => 'required|in:public,company,custom',
            'is_recurring' => 'boolean'
        ]);

        $holiday->update($validated);

        return redirect()->route('holidays.index')
            ->with('message', 'Holiday updated successfully!');
    }

    public function destroy(Holiday $holiday)
    {
        $holiday->delete();

        return redirect()->route('holidays.index')
            ->with('message', 'Holiday deleted successfully!');
    }

    /**
     * Get holidays for PTO calculation
     */
    public function getHolidaysForRange(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $holidays = Holiday::active()
            ->whereBetween('date', [$request->start_date, $request->end_date])
            ->get()
            ->map(function ($holiday) {
                return [
                    'date' => $holiday->date->format('Y-m-d'),
                    'name' => $holiday->name,
                    'type' => $holiday->type,
                ];
            });

        return response()->json($holidays);
    }
}
