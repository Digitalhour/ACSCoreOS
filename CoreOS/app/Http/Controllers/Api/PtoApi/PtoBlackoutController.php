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
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class PtoBlackoutController extends Controller
{
    public function index()
    {
        $blackouts = PtoBlackout::with(['position'])
            ->orderBy('start_date', 'desc')
            ->paginate(15);

        // Transform Blackouts to include department and user names
        $transformedBlackouts = $blackouts->through(function ($blackout) {
            return [
                'id' => $blackout->id,
                'name' => $blackout->name,
                'description' => $blackout->description,
                'start_date' => $blackout->start_date,
                'end_date' => $blackout->end_date,
                'formatted_date_range' => $blackout->getFormattedDateRangeAttribute(),
                'position' => $blackout->position ? $blackout->position->name : null,
                'departments' => $blackout->departments()->pluck('name')->toArray(),
                'users' => $blackout->users()->pluck('name')->toArray(),
                'pto_types' => $blackout->pto_type_ids ? PtoType::whereIn('id', $blackout->pto_type_ids)->pluck('name')->toArray() : [],
                'is_company_wide' => $blackout->is_company_wide,
                'is_holiday' => $blackout->is_holiday,
                'is_strict' => $blackout->is_strict,
                'allow_emergency_override' => $blackout->allow_emergency_override,
                'restriction_type' => $blackout->restriction_type,
                'max_requests_allowed' => $blackout->max_requests_allowed,
                'is_active' => $blackout->is_active,
                'created_at' => $blackout->created_at,
                'updated_at' => $blackout->updated_at,
            ];
        });

        $departments = Department::active()->orderBy('name')->get(['id', 'name']);
        $positions = Position::orderBy('name')->get(['id', 'name']);
        $ptoTypes = PtoType::active()->orderBy('name')->get(['id', 'name', 'code', 'color']);
        $users = User::orderBy('name')->get(['id', 'name', 'email']);
        $holidays = Holiday::active()->thisYear()->orderBy('date')->get(['id', 'name', 'date']);

        return Inertia::render('Admin/PTO/Blackouts/Index', [
            'Blackouts' => $transformedBlackouts,
            'departments' => $departments,
            'positions' => $positions,
            'ptoTypes' => $ptoTypes,
            'users' => $users,
            'holidays' => $holidays,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
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
            'max_requests_allowed' => 'nullable|integer|min:0',
            'pto_type_ids' => 'nullable|array',
            'pto_type_ids.*' => 'exists:pto_types,id',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        PtoBlackout::create($request->all());

        return redirect()->route('admin.Blackouts.index')
            ->with('success', 'Blackout period created successfully.');
    }

    public function show(PtoBlackout $blackout)
    {
        $blackout->load(['position']);

        return response()->json([
            'blackout' => [
                'id' => $blackout->id,
                'name' => $blackout->name,
                'description' => $blackout->description,
                'start_date' => $blackout->start_date,
                'end_date' => $blackout->end_date,
                'position_id' => $blackout->position_id,
                'department_ids' => $blackout->department_ids ?? [],
                'user_ids' => $blackout->user_ids ?? [],
                'is_company_wide' => $blackout->is_company_wide,
                'is_holiday' => $blackout->is_holiday,
                'is_strict' => $blackout->is_strict,
                'allow_emergency_override' => $blackout->allow_emergency_override,
                'restriction_type' => $blackout->restriction_type,
                'max_requests_allowed' => $blackout->max_requests_allowed,
                'pto_type_ids' => $blackout->pto_type_ids ?? [],
                'is_active' => $blackout->is_active,
            ]
        ]);
    }

    public function update(Request $request, PtoBlackout $blackout)
    {
        $validator = Validator::make($request->all(), [
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
            'max_requests_allowed' => 'nullable|integer|min:0',
            'pto_type_ids' => 'nullable|array',
            'pto_type_ids.*' => 'exists:pto_types,id',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $blackout->update($request->all());

        return redirect()->route('admin.Blackouts.index')
            ->with('success', 'Blackout period updated successfully.');
    }

    public function destroy(PtoBlackout $blackout)
    {
        $blackout->delete();

        return redirect()->route('admin.Blackouts.index')
            ->with('success', 'Blackout period deleted successfully.');
    }

    /**
     * Get Blackouts for a specific user and date range
     */
    public function getBlackoutsForUser(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'pto_type_id' => 'nullable|exists:pto_types,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::with(['departments', 'position'])->findOrFail($request->user_id);
        $startDate = $request->start_date;
        $endDate = $request->end_date;
        $ptoTypeId = $request->pto_type_id;

        $blackouts = PtoBlackout::active()
            ->overlapping($startDate, $endDate)
            ->get()
            ->filter(function ($blackout) use ($user, $ptoTypeId) {
                // Check if blackout applies to this user
                if (!$this->blackoutAppliesToUser($blackout, $user)) {
                    return false;
                }

                // Check if PTO type is excluded from this blackout
                if ($ptoTypeId && $blackout->pto_type_ids && !in_array($ptoTypeId, $blackout->pto_type_ids)) {
                    return false;
                }

                return true;
            })
            ->map(function ($blackout) {
                return [
                    'id' => $blackout->id,
                    'name' => $blackout->name,
                    'description' => $blackout->description,
                    'start_date' => $blackout->start_date,
                    'end_date' => $blackout->end_date,
                    'restriction_type' => $blackout->restriction_type,
                    'is_strict' => $blackout->is_strict,
                    'allow_emergency_override' => $blackout->allow_emergency_override,
                ];
            });

        return response()->json(['Blackouts' => $blackouts]);
    }

    private function blackoutAppliesToUser($blackout, $user)
    {
        // Company-wide Blackouts apply to everyone
        if ($blackout->is_company_wide) {
            return true;
        }

        // Check specific user IDs
        if ($blackout->user_ids && in_array($user->id, $blackout->user_ids)) {
            return true;
        }

        // Check position
        if ($blackout->position_id && $user->position_id == $blackout->position_id) {
            return true;
        }

        // Check departments
        if ($blackout->department_ids) {
            $userDepartmentIds = $user->departments->pluck('id')->toArray();
            if (array_intersect($blackout->department_ids, $userDepartmentIds)) {
                return true;
            }
        }

        return false;
    }
}
