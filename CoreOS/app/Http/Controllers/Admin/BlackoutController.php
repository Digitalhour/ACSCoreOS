<?php

namespace App\Http\Controllers\Admin;

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

class BlackoutController extends Controller
{
    public function index()
    {
        $blackouts = PtoBlackout::with(['position'])
            ->orderBy('is_recurring', 'desc')
            ->orderBy('start_date', 'desc')
            ->paginate(15);

        // Transform blackouts to include department and user names
        $blackouts->getCollection()->transform(function ($blackout) {
            return [
                'id' => $blackout->id,
                'name' => $blackout->name,
                'description' => $blackout->description,
                'start_date' => $blackout->start_date,
                'end_date' => $blackout->end_date,
                'is_recurring' => $blackout->is_recurring,
                'recurring_days' => $blackout->recurring_days,
                'recurring_start_date' => $blackout->recurring_start_date,
                'recurring_end_date' => $blackout->recurring_end_date,
                'recurring_day_names' => $blackout->getRecurringDayNames(),
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

        try {
            $departments = Department::where('is_active', true)->orderBy('name')->get(['id', 'name']);
            $positions = Position::orderBy('name')->get(['id', 'name']);
            $ptoTypes = PtoType::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'color']);
            $users = User::orderBy('name')->get(['id', 'name', 'email']);
            $holidays = Holiday::where('is_active', true)->whereYear('date', now()->year)->orderBy('date')->get(['id', 'name', 'date']);
        } catch (\Exception $e) {
            \Log::error('Error loading blackout data: ' . $e->getMessage());
            // Provide empty collections as fallback
            $departments = collect([]);
            $positions = collect([]);
            $ptoTypes = collect([]);
            $users = collect([]);
            $holidays = collect([]);
        }

        return Inertia::render('Admin/PTO/Blackouts/Index', [
            'blackouts' => $blackouts,
            'departments' => $departments,
            'positions' => $positions,
            'ptoTypes' => $ptoTypes,
            'users' => $users,
            'holidays' => $holidays,
        ]);
    }

    public function store(Request $request)
    {
        // Base validation rules
        $rules = [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_company_wide' => 'boolean',
            'is_holiday' => 'boolean',
            'is_strict' => 'boolean',
            'allow_emergency_override' => 'boolean',
            'restriction_type' => 'required|in:full_block,limit_requests,warning_only',
            'max_requests_allowed' => 'nullable|integer|min:0',
            'pto_type_ids' => 'nullable|array',
            'pto_type_ids.*' => 'exists:pto_types,id',
            'is_active' => 'boolean',
            'is_recurring' => 'boolean',
        ];

        // Add recurring or date range validation based on type
        if ($request->boolean('is_recurring')) {
            $rules['recurring_days'] = 'required|array|min:1';
            $rules['recurring_days.*'] = 'integer|between:0,6';
            $rules['recurring_start_date'] = 'nullable|date';
            $rules['recurring_end_date'] = 'nullable|date|after_or_equal:recurring_start_date';
        } else {
            $rules['start_date'] = 'required|date';
            $rules['end_date'] = 'required|date|after_or_equal:start_date';
        }

        // Only add scope validation rules when NOT company wide
        if (!$request->boolean('is_company_wide')) {
            $rules['position_id'] = 'nullable|exists:positions,id';
            $rules['department_ids'] = 'nullable|array';
            $rules['department_ids.*'] = 'exists:departments,id';
            $rules['user_ids'] = 'nullable|array';
            $rules['user_ids.*'] = 'exists:users,id';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        try {
            // Prepare data for creation
            $data = $request->only([
                'name', 'description', 'is_company_wide', 'is_holiday', 'is_strict',
                'allow_emergency_override', 'restriction_type', 'max_requests_allowed',
                'pto_type_ids', 'is_active', 'is_recurring'
            ]);

            // Handle recurring vs date range blackouts
            if ($request->boolean('is_recurring')) {
                $data['recurring_days'] = $request->get('recurring_days');
                $data['recurring_start_date'] = $request->get('recurring_start_date');
                $data['recurring_end_date'] = $request->get('recurring_end_date');
                $data['start_date'] = null;
                $data['end_date'] = null;
            } else {
                $data['start_date'] = $request->get('start_date');
                $data['end_date'] = $request->get('end_date');
                $data['recurring_days'] = null;
                $data['recurring_start_date'] = null;
                $data['recurring_end_date'] = null;
            }

            // Only include scope fields when NOT company wide
            if ($request->boolean('is_company_wide')) {
                // For company wide, explicitly set these to null
                $data['position_id'] = null;
                $data['department_ids'] = null;
                $data['user_ids'] = null;
            } else {
                // For non-company wide, include the scope fields
                $data['position_id'] = $request->get('position_id');
                $data['department_ids'] = $request->get('department_ids');
                $data['user_ids'] = $request->get('user_ids');
            }

            \Log::info('Creating blackout with data:', $data);

            $blackout = PtoBlackout::create($data);

            return redirect()->route('admin.blackouts.index')
                ->with('success', 'Blackout period created successfully.');
        } catch (\Exception $e) {
            \Log::error('Error creating blackout: ' . $e->getMessage());
            \Log::error('Request data: ' . json_encode($request->all()));

            return back()->withErrors(['error' => 'Failed to create blackout period: ' . $e->getMessage()])->withInput();
        }
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
                'is_recurring' => $blackout->is_recurring,
                'recurring_days' => $blackout->recurring_days ?? [],
                'recurring_start_date' => $blackout->recurring_start_date,
                'recurring_end_date' => $blackout->recurring_end_date,
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
        // Base validation rules
        $rules = [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_company_wide' => 'boolean',
            'is_holiday' => 'boolean',
            'is_strict' => 'boolean',
            'allow_emergency_override' => 'boolean',
            'restriction_type' => 'required|in:full_block,limit_requests,warning_only',
            'max_requests_allowed' => 'nullable|integer|min:0',
            'pto_type_ids' => 'nullable|array',
            'pto_type_ids.*' => 'exists:pto_types,id',
            'is_active' => 'boolean',
            'is_recurring' => 'boolean',
        ];

        // Add recurring or date range validation based on type
        if ($request->boolean('is_recurring')) {
            $rules['recurring_days'] = 'required|array|min:1';
            $rules['recurring_days.*'] = 'integer|between:0,6';
            $rules['recurring_start_date'] = 'nullable|date';
            $rules['recurring_end_date'] = 'nullable|date|after_or_equal:recurring_start_date';
        } else {
            $rules['start_date'] = 'required|date';
            $rules['end_date'] = 'required|date|after_or_equal:start_date';
        }

        // Only add scope validation rules when NOT company wide
        if (!$request->boolean('is_company_wide')) {
            $rules['position_id'] = 'nullable|exists:positions,id';
            $rules['department_ids'] = 'nullable|array';
            $rules['department_ids.*'] = 'exists:departments,id';
            $rules['user_ids'] = 'nullable|array';
            $rules['user_ids.*'] = 'exists:users,id';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        try {
            // Prepare data for update
            $data = $request->only([
                'name', 'description', 'is_company_wide', 'is_holiday', 'is_strict',
                'allow_emergency_override', 'restriction_type', 'max_requests_allowed',
                'pto_type_ids', 'is_active', 'is_recurring'
            ]);

            // Handle recurring vs date range blackouts
            if ($request->boolean('is_recurring')) {
                $data['recurring_days'] = $request->get('recurring_days');
                $data['recurring_start_date'] = $request->get('recurring_start_date');
                $data['recurring_end_date'] = $request->get('recurring_end_date');
                $data['start_date'] = null;
                $data['end_date'] = null;
            } else {
                $data['start_date'] = $request->get('start_date');
                $data['end_date'] = $request->get('end_date');
                $data['recurring_days'] = null;
                $data['recurring_start_date'] = null;
                $data['recurring_end_date'] = null;
            }

            // Only include scope fields when NOT company wide
            if ($request->boolean('is_company_wide')) {
                // For company wide, explicitly set these to null
                $data['position_id'] = null;
                $data['department_ids'] = null;
                $data['user_ids'] = null;
            } else {
                // For non-company wide, include the scope fields
                $data['position_id'] = $request->get('position_id');
                $data['department_ids'] = $request->get('department_ids');
                $data['user_ids'] = $request->get('user_ids');
            }

            \Log::info('Updating blackout with data:', $data);

            $blackout->update($data);

            return redirect()->route('admin.blackouts.index')
                ->with('success', 'Blackout period updated successfully.');
        } catch (\Exception $e) {
            \Log::error('Error updating blackout: ' . $e->getMessage());
            \Log::error('Request data: ' . json_encode($request->all()));
            return back()->withErrors(['error' => 'Failed to update blackout period: ' . $e->getMessage()])->withInput();
        }
    }

    public function destroy(PtoBlackout $blackout)
    {
        $blackout->delete();

        return redirect()->route('admin.blackouts.index')
            ->with('success', 'Blackout period deleted successfully.');
    }

    /**
     * Get blackouts for a specific user and date range
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

        try {
            $user = User::with(['departments', 'position'])->findOrFail($request->user_id);
            $startDate = $request->start_date;
            $endDate = $request->end_date;
            $ptoTypeId = $request->pto_type_id;

            // Get both regular overlapping blackouts and recurring blackouts
            $regularBlackouts = PtoBlackout::active()
                ->where('is_recurring', false)
                ->overlapping($startDate, $endDate)
                ->get();

            $recurringBlackouts = PtoBlackout::active()
                ->where('is_recurring', true)
                ->get()
                ->filter(function ($blackout) use ($startDate, $endDate) {
                    return $blackout->overlapsWithRecurringDays($startDate, $endDate);
                });

            $allBlackouts = $regularBlackouts->merge($recurringBlackouts);

            $filteredBlackouts = $allBlackouts->filter(function ($blackout) use ($user, $ptoTypeId) {
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
                        'is_recurring' => $blackout->is_recurring,
                        'recurring_days' => $blackout->recurring_days,
                        'recurring_day_names' => $blackout->getRecurringDayNames(),
                        'restriction_type' => $blackout->restriction_type,
                        'is_strict' => $blackout->is_strict,
                        'allow_emergency_override' => $blackout->allow_emergency_override,
                        'type' => $blackout->restriction_type === 'full_block' ? 'conflict' : 'warning',
                        'can_override' => $blackout->allow_emergency_override,
                        'message' => $this->getBlackoutMessage($blackout),
                    ];
                });

            return response()->json(['blackouts' => $filteredBlackouts]);
        } catch (\Exception $e) {
            \Log::error('Error getting blackouts for user: ' . $e->getMessage());
            return response()->json(['blackouts' => []], 200);
        }
    }

    private function getBlackoutMessage($blackout)
    {
        if ($blackout->is_recurring) {
            $days = implode(', ', $blackout->getRecurringDayNames());
            switch ($blackout->restriction_type) {
                case 'full_block':
                    return "PTO requests are blocked on: {$days} for {$blackout->name}";
                case 'limit_requests':
                    return "Limited PTO requests on: {$days} for {$blackout->name}";
                case 'warning_only':
                    return "Note: Your request includes {$days} which are restricted for: {$blackout->name}";
                default:
                    return "Recurring blackout on {$days}: {$blackout->name}";
            }
        }

        switch ($blackout->restriction_type) {
            case 'full_block':
                return "PTO requests are blocked during: {$blackout->name} ({$blackout->getFormattedDateRangeAttribute()})";
            case 'limit_requests':
                return "Limited PTO requests during: {$blackout->name}. Check with your manager for availability.";
            case 'warning_only':
                return "Note: Your request falls during a restricted period: {$blackout->name} ({$blackout->getFormattedDateRangeAttribute()})";
            default:
                return "Blackout period: {$blackout->name}";
        }
    }

    private function blackoutAppliesToUser($blackout, $user)
    {
        // Company-wide blackouts apply to everyone
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

        // Check departments - handle case where departments relationship might not be loaded
        if ($blackout->department_ids) {
            try {
                $userDepartmentIds = $user->departments ? $user->departments->pluck('id')->toArray() : [];
                if (array_intersect($blackout->department_ids, $userDepartmentIds)) {
                    return true;
                }
            } catch (\Exception $e) {
                \Log::warning('Error checking department blackouts for user ' . $user->id . ': ' . $e->getMessage());
            }
        }

        return false;
    }
}
