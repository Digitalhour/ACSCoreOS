<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Holiday;
use App\Models\Position;
use App\Models\PtoModels\PtoBlackout;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BlackoutController extends Controller
{
    public function index(): Response
    {
        $blackouts = PtoBlackout::with('position')
            ->when(request('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            })
            ->orderBy('start_date', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('PtoBlackouts/Index', [
            'blackouts' => $blackouts,
            'filters' => request()->only(['search']),
        ]);
    }
    public function toggleStatus(PtoBlackout $ptoBlackout)
    {
        $ptoBlackout->update(['is_active' => !$ptoBlackout->is_active]);

        return response()->json([
            'message' => 'Blackout status updated successfully',
            'is_active' => $ptoBlackout->is_active
        ]);
    }
    public function create(): Response
    {
        return Inertia::render('PtoBlackouts/Create', [
            'departments' => Department::active()->select('id', 'name')->orderBy('name')->get(),
            'positions' => Position::select('id', 'name')->orderBy('name')->get(),
            'users' => User::select('id', 'name', 'email')->orderBy('name')->get(),
            'holidays' => Holiday::active()->thisYear()->select('id', 'name', 'date')->orderBy('date')->get(),
            'ptoTypes' => PtoType::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'position_id' => 'nullable|exists:positions,id',
            'department_ids' => 'nullable|array',
            'department_ids.*' => 'exists:departments,id',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
            'is_company_wide' => 'boolean',
            'is_holiday' => 'boolean',
            'is_strict' => 'boolean',
            'allow_emergency_override' => 'boolean',
            'restriction_type' => 'required|in:full_block,limit_requests,warning_only',
            'max_requests_allowed' => 'nullable|integer|min:1',
            'pto_type_ids' => 'nullable|array',
            'pto_type_ids.*' => 'exists:pto_types,id',
            'is_active' => 'boolean',
        ]);

        PtoBlackout::create($validated);

        return redirect()->route('pto-blackouts.index')
            ->with('success', 'PTO Blackout created successfully!');
    }

    public function show(PtoBlackout $ptoBlackout): Response
    {
        $ptoBlackout->load('position');

        return Inertia::render('PtoBlackouts/Show', [
            'blackout' => $ptoBlackout,
        ]);
    }

    public function edit(PtoBlackout $ptoBlackout): Response
    {
        return Inertia::render('PtoBlackouts/Edit', [
            'blackout' => $ptoBlackout,
            'departments' => Department::active()->select('id', 'name')->orderBy('name')->get(),
            'positions' => Position::select('id', 'name')->orderBy('name')->get(),
            'users' => User::select('id', 'name', 'email')->orderBy('name')->get(),
            'holidays' => Holiday::active()->thisYear()->select('id', 'name', 'date')->orderBy('date')->get(),
            'ptoTypes' => PtoType::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, PtoBlackout $ptoBlackout)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'position_id' => 'nullable|exists:positions,id',
            'department_ids' => 'nullable|array',
            'department_ids.*' => 'exists:departments,id',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
            'is_company_wide' => 'boolean',
            'is_holiday' => 'boolean',
            'is_strict' => 'boolean',
            'allow_emergency_override' => 'boolean',
            'restriction_type' => 'required|in:full_block,limit_requests,warning_only',
            'max_requests_allowed' => 'nullable|integer|min:1',
            'pto_type_ids' => 'nullable|array',
            'pto_type_ids.*' => 'exists:pto_types,id',
            'is_active' => 'boolean',
        ]);

        $ptoBlackout->update($validated);

        return redirect()->route('pto-blackouts.index')
            ->with('success', 'PTO Blackout updated successfully!');
    }

    public function destroy(PtoBlackout $ptoBlackout)
    {
        $ptoBlackout->delete();

        return redirect()->route('pto-blackouts.index')
            ->with('success', 'PTO Blackout deleted successfully!');
    }
}
