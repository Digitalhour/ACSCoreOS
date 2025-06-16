<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Holiday;
use App\Models\Position;
use App\Models\PtoModels\PtoBlackout;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PtoBlackoutController extends Controller
{
    public function index(): Response
    {
        $blackouts = PtoBlackout::with('position')
            ->orderBy('start_date', 'desc')
            ->get()
            ->map(function ($blackout) {
                return [
                    'id' => $blackout->id,
                    'name' => $blackout->name,
                    'description' => $blackout->description,
                    'start_date' => $blackout->start_date->format('Y-m-d'),
                    'end_date' => $blackout->end_date->format('Y-m-d'),
                    'formatted_date_range' => $blackout->formatted_date_range,
                    'position' => $blackout->position ? [
                        'id' => $blackout->position->id,
                        'name' => $blackout->position->name,
                    ] : null,
                    'departments' => $blackout->departments()->select('id', 'name')->get(),
                    'users' => $blackout->users()->select('id', 'name')->get(),
                    'is_company_wide' => $blackout->is_company_wide,
                    'is_holiday' => $blackout->is_holiday,
                    'is_strict' => $blackout->is_strict,
                    'allow_emergency_override' => $blackout->allow_emergency_override,
                    'restriction_type' => $blackout->restriction_type,
                    'max_requests_allowed' => $blackout->max_requests_allowed,
                    'is_active' => $blackout->is_active,
                ];
            });

        return Inertia::render('PtoBlackouts/Index', [
            'blackouts' => $blackouts
        ]);
    }

    public function create(): Response
    {
        $departments = Department::active()->select('id', 'name')->orderBy('name')->get();
        $positions = Position::select('id', 'name')->orderBy('name')->get();
        $users = User::select('id', 'name', 'email')->orderBy('name')->get();
        $holidays = Holiday::active()->thisYear()->select('id', 'name', 'date')->orderBy('date')->get();
        $ptoTypes = PtoType::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('PtoBlackouts/Create', [
            'departments' => $departments,
            'positions' => $positions,
            'users' => $users,
            'holidays' => $holidays,
            'ptoTypes' => $ptoTypes,
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
        ]);

        PtoBlackout::create($validated);

        return redirect()->route('pto-blackouts.index')
            ->with('message', 'PTO Blackout created successfully!');
    }

    public function show(PtoBlackout $ptoBlackout): Response
    {
        $blackout = [
            'id' => $ptoBlackout->id,
            'name' => $ptoBlackout->name,
            'description' => $ptoBlackout->description,
            'start_date' => $ptoBlackout->start_date->format('Y-m-d'),
            'end_date' => $ptoBlackout->end_date->format('Y-m-d'),
            'formatted_date_range' => $ptoBlackout->formatted_date_range,
            'position' => $ptoBlackout->position,
            'departments' => $ptoBlackout->departments(),
            'users' => $ptoBlackout->users(),
            'is_company_wide' => $ptoBlackout->is_company_wide,
            'is_holiday' => $ptoBlackout->is_holiday,
            'is_strict' => $ptoBlackout->is_strict,
            'allow_emergency_override' => $ptoBlackout->allow_emergency_override,
            'restriction_type' => $ptoBlackout->restriction_type,
            'max_requests_allowed' => $ptoBlackout->max_requests_allowed,
            'pto_type_ids' => $ptoBlackout->pto_type_ids,
            'is_active' => $ptoBlackout->is_active,
        ];

        return Inertia::render('PtoBlackouts/Show', [
            'blackout' => $blackout
        ]);
    }

    public function edit(PtoBlackout $ptoBlackout): Response
    {
        $departments = Department::active()->select('id', 'name')->orderBy('name')->get();
        $positions = Position::select('id', 'name')->orderBy('name')->get();
        $users = User::select('id', 'name', 'email')->orderBy('name')->get();
        $holidays = Holiday::active()->thisYear()->select('id', 'name', 'date')->orderBy('date')->get();
        $ptoTypes = PtoType::select('id', 'name')->orderBy('name')->get();

        $blackout = [
            'id' => $ptoBlackout->id,
            'name' => $ptoBlackout->name,
            'description' => $ptoBlackout->description,
            'start_date' => $ptoBlackout->start_date->format('Y-m-d'),
            'end_date' => $ptoBlackout->end_date->format('Y-m-d'),
            'position_id' => $ptoBlackout->position_id,
            'department_ids' => $ptoBlackout->department_ids ?? [],
            'user_ids' => $ptoBlackout->user_ids ?? [],
            'is_company_wide' => $ptoBlackout->is_company_wide,
            'is_holiday' => $ptoBlackout->is_holiday,
            'is_strict' => $ptoBlackout->is_strict,
            'allow_emergency_override' => $ptoBlackout->allow_emergency_override,
            'restriction_type' => $ptoBlackout->restriction_type,
            'max_requests_allowed' => $ptoBlackout->max_requests_allowed,
            'pto_type_ids' => $ptoBlackout->pto_type_ids ?? [],
            'is_active' => $ptoBlackout->is_active,
        ];

        return Inertia::render('PtoBlackouts/Edit', [
            'blackout' => $blackout,
            'departments' => $departments,
            'positions' => $positions,
            'users' => $users,
            'holidays' => $holidays,
            'ptoTypes' => $ptoTypes,
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
        ]);

        $ptoBlackout->update($validated);

        return redirect()->route('pto-blackouts.index')
            ->with('message', 'PTO Blackout updated successfully!');
    }

    public function destroy(PtoBlackout $ptoBlackout)
    {
        $ptoBlackout->delete();

        return redirect()->route('pto-blackouts.index')
            ->with('message', 'PTO Blackout deleted successfully!');
    }

    public function checkConflicts(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'user_id' => 'required|exists:users,id',
        ]);

        $user = User::find($request->user_id);
        $blackouts = PtoBlackout::active()
            ->overlapping($request->start_date, $request->end_date)
            ->where(function ($query) use ($user) {
                $query->where('is_company_wide', true)
                    ->orWhere('position_id', $user->position_id)
                    ->orWhereJsonContains('department_ids', $user->departments()->pluck('id')->toArray())
                    ->orWhereJsonContains('user_ids', $user->id);
            })
            ->get();

        return response()->json($blackouts);
    }

    public function getBlackoutsForUser(User $user)
    {
        $blackouts = PtoBlackout::active()
            ->where(function ($query) use ($user) {
                $query->where('is_company_wide', true)
                    ->orWhere('position_id', $user->position_id)
                    ->orWhereJsonContains('user_ids', $user->id);

                // Check department blackouts
                $departmentIds = $user->departments()->pluck('id')->toArray();
                foreach ($departmentIds as $deptId) {
                    $query->orWhereJsonContains('department_ids', $deptId);
                }
            })
            ->get();

        return response()->json($blackouts);
    }

    public function toggleStatus(PtoBlackout $ptoBlackout)
    {
        $ptoBlackout->update(['is_active' => !$ptoBlackout->is_active]);

        return response()->json([
            'message' => 'Blackout status updated successfully',
            'is_active' => $ptoBlackout->is_active
        ]);
    }
}
