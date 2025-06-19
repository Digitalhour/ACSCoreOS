<?php

namespace App\Http\Controllers;

use App\Models\Holiday;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use App\Services\BlackoutValidationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class EmployeePtoController extends Controller
{
    public function __construct(
        private BlackoutValidationService $blackoutService
    ) {}

    /**
     * Display the user PTO dashboard.
     */
    public function index(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date|after_or_equal:start_date',
            'pto_type_id' => 'nullable|exists:pto_types,id',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $holidaysInRange = [];
        $blackoutConflicts = [];
        $blackoutWarnings = [];

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $holidaysInRange = Holiday::active()
                ->whereBetween('date', [$request->start_date, $request->end_date])
                ->get()
                ->map(function ($holiday) {
                    return [
                        'date'           => $holiday->date->format('Y-m-d'),
                        'name'           => $holiday->name,
                        'type'           => $holiday->type,
                        'formatted_date' => $holiday->date->format('M d, Y'),
                    ];
                });
        }

        // Handle blackout checking using the service
        if ($request->filled(['start_date', 'end_date', 'pto_type_id', 'user_id'])) {
            $user = User::findOrFail($request->user_id);
            $validation = $this->blackoutService->validatePtoRequest(
                $user,
                $request->start_date,
                $request->end_date,
                $request->pto_type_id
            );

            $blackoutConflicts = $validation['conflicts'] ?? [];
            $blackoutWarnings = $validation['warnings'] ?? [];
        }

        $user = Auth::user();
        $currentYear = Carbon::now()->year;

        // Get user's PTO data with balances and policies
        $ptoData = $this->getUserPtoData($user, $currentYear);

        // Get recent PTO requests
        $recentRequests = $this->getRecentRequests($user);

        // Get pending requests count
        $pendingRequestsCount = PtoRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->count();

        // Get department PTO requests for calendar
        $departmentPtoRequests = $this->getDepartmentPtoRequests($user, $currentYear);

        // Get PTO types for the request form
        $ptoTypes = $this->getPtoTypesWithBalances($user, $currentYear);

        // Get upcoming holidays for the current year
        $upcomingHolidays = Holiday::active()
            ->where('date', '>=', now())
            ->whereYear('date', $currentYear)
            ->orderBy('date')
            ->limit(10)
            ->get()
            ->map(function ($holiday) {
                return [
                    'id' => $holiday->id,
                    'name' => $holiday->name,
                    'date' => $holiday->date->format('Y-m-d'),
                    'formatted_date' => $holiday->date->format('M d, Y'),
                    'type' => $holiday->type,
                ];
            });

        return Inertia::render('Employee/EmployeePtoDashboard', [
            'pto_data' => $ptoData,
            'recent_requests' => $recentRequests,
            'pending_requests_count' => $pendingRequestsCount,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'department_pto_requests' => $departmentPtoRequests,
            'pto_types' => $ptoTypes,
            'upcoming_holidays' => $upcomingHolidays,
            'holidays' => $holidaysInRange,
            'blackout_conflicts' => $blackoutConflicts,
            'blackout_warnings' => $blackoutWarnings,
        ]);
    }

    /**
     * Store a new PTO request.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'pto_type_id' => 'required|exists:pto_types,id',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'total_days' => 'required|numeric|min:0',
            'reason' => 'nullable|string|max:1000',
            'day_options' => 'required|array',
            'day_options.*.date' => 'required|date',
            'day_options.*.type' => 'required|in:full,half',
            'is_emergency_override' => 'nullable|boolean',
            'acknowledge_warnings' => 'nullable|boolean',
        ]);

        // Calculate actual PTO days (excluding holidays)
        $actualPtoDays = $this->calculatePtoDaysExcludingHolidays(
            $validated['start_date'],
            $validated['end_date'],
            $validated['day_options']
        );

        // Update validated data with actual PTO days
        $validated['total_days'] = $actualPtoDays;

        // Check if user has enough balance
        $ptoType = PtoType::findOrFail($validated['pto_type_id']);
        $currentYear = Carbon::now()->year;

        $balance = PtoBalance::where('user_id', $user->id)
            ->where('pto_type_id', $ptoType->id)
            ->where('year', $currentYear)
            ->first();

        $availableBalance = 0;
        if ($balance) {
            $availableBalance = $balance->balance - $balance->pending_balance;
        } else {
            // Check if user has a policy for this PTO type
            $policies = $user->activePtoPolicies()->where('pto_type_id', $ptoType->id)->get();
            if ($policies->isNotEmpty()) {
                $availableBalance = $policies->first()->annual_accrual_amount ?? 0;
            }
        }

        if ($validated['total_days'] > $availableBalance) {
            return back()->withErrors([
                'total_days' => "Insufficient PTO balance. Available: {$availableBalance} days, Required: {$validated['total_days']} days (holidays excluded)."
            ]);
        }

        // Validate business days
        $this->validateBusinessDays($validated['day_options']);

        // Generate request number
        $requestNumber = 'PTO-U' . $user->id . '-' . time();

        DB::beginTransaction();

        try {
            // Create the request
            $ptoRequest = PtoRequest::create([
                'user_id' => $user->id,
                'pto_type_id' => $validated['pto_type_id'],
                'request_number' => $requestNumber,
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'total_days' => $validated['total_days'],
                'reason' => $validated['reason'],
                'status' => 'pending',
                'submitted_at' => now(),
            ]);

            // Validate and store blackout information using the service
            $blackoutValidation = $this->blackoutService->validateAndStorePtoRequest(
                $ptoRequest,
                $validated['is_emergency_override'] ?? false
            );

            // Handle warning acknowledgment
            if ($validated['acknowledge_warnings'] ?? false) {
                $this->blackoutService->processBlackoutAcknowledgment($ptoRequest, $user);
            }

            // If there are unresolved conflicts without emergency override, reject
            if ($blackoutValidation['has_conflicts'] && !($validated['is_emergency_override'] ?? false)) {
                // Check if any conflicts allow override
                $canOverride = collect($blackoutValidation['conflicts'])->some('can_override');

                if ($canOverride) {
                    DB::rollBack();
                    return back()->withErrors([
                        'blackout_conflicts' => $blackoutValidation['conflicts'],
                        'error' => 'Your request conflicts with blackout periods. Please enable emergency override if this is urgent.',
                        'can_override' => true,
                    ])->withInput();
                } else {
                    // Auto-reject strict blackouts
                    $ptoRequest->update([
                        'status' => 'denied',
                        'denied_at' => now(),
                        'denial_reason' => 'Request conflicts with strict blackout periods that do not allow override.',
                    ]);

                    DB::commit();

                    return redirect()->route('pto.dashboard')->withErrors([
                        'error' => 'Request was automatically rejected due to blackout period conflicts.'
                    ]);
                }
            }

            // Update pending balance
            if ($balance) {
                $balance->increment('pending_balance', $validated['total_days']);
            } else {
                // Create balance record if it doesn't exist
                PtoBalance::create([
                    'user_id' => $user->id,
                    'pto_type_id' => $validated['pto_type_id'],
                    'year' => $currentYear,
                    'balance' => $availableBalance - $validated['total_days'],
                    'pending_balance' => $validated['total_days'],
                    'used_balance' => 0,
                ]);
            }

            // Create approval records if needed
            $this->createApprovalRecords($ptoRequest, $ptoType);

            DB::commit();

            // Determine success message based on blackout status
            $successMessage = 'PTO request submitted successfully! Holidays in your date range were automatically excluded.';

            if ($validated['is_emergency_override'] ?? false) {
                $successMessage = 'PTO request submitted with emergency override! Your manager will be notified of the urgent circumstances.';
            } elseif ($blackoutValidation['has_warnings']) {
                $successMessage .= ' Note: Your request has blackout period warnings.';
            }

            return redirect()->route('pto.dashboard')->with('success', $successMessage);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error creating PTO request', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'validated_data' => $validated
            ]);

            return back()->withErrors(['error' => 'Failed to submit PTO request. Please try again.']);
        }
    }

    /**
     * Cancel a PTO request.
     */
    public function cancel(Request $request, PtoRequest $ptoRequest)
    {
        $user = Auth::user();

        // Ensure user owns this request
        if ($ptoRequest->user_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        // Check if request can be cancelled
        if (!$this->canCancelRequest($ptoRequest)) {
            return back()->withErrors(['error' => 'This request cannot be cancelled.']);
        }

        DB::beginTransaction();

        try {
            // Store the original status before updating
            $originalStatus = $ptoRequest->status;

            // Update request status
            $ptoRequest->update([
                'status' => 'cancelled',
                'reason' => 'Cancelled by user ' . $user->name . ($user->isImpersonated() ? ' (impersonated)' : '')
            ]);

            // Return days to balance
            $balance = PtoBalance::where('user_id', $user->id)
                ->where('pto_type_id', $ptoRequest->pto_type_id)
                ->where('year', Carbon::now()->year)
                ->first();

            if ($balance) {
                if ($originalStatus === 'pending') {
                    // For pending requests, just remove from pending balance
                    $balance->decrement('pending_balance', $ptoRequest->total_days);
                } elseif ($originalStatus === 'approved') {
                    // For approved requests, return days to available balance and remove from used balance
                    $balance->increment('balance', $ptoRequest->total_days);
                    $balance->decrement('used_balance', $ptoRequest->total_days);
                }
            } else {
                // If no balance record exists, create one with the returned days
                if ($originalStatus === 'pending' || $originalStatus === 'approved') {
                    $policy = $user->activePtoPolicies()->where('pto_type_id', $ptoRequest->pto_type_id)->first();
                    $initialBalance = $policy ? $policy->annual_accrual_amount : 0;

                    PtoBalance::create([
                        'user_id' => $user->id,
                        'pto_type_id' => $ptoRequest->pto_type_id,
                        'year' => Carbon::now()->year,
                        'balance' => $initialBalance + ($originalStatus === 'approved' ? $ptoRequest->total_days : 0),
                        'pending_balance' => 0,
                        'used_balance' => 0,
                    ]);
                }
            }

            DB::commit();

            Log::info('PTO request cancelled successfully', [
                'request_id' => $ptoRequest->id,
                'user_id' => $user->id,
                'original_status' => $originalStatus,
                'days_returned' => $ptoRequest->total_days
            ]);

            return redirect()->route('pto.dashboard')->with('success', 'PTO request cancelled successfully!');

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error cancelling PTO request', [
                'error' => $e->getMessage(),
                'request_id' => $ptoRequest->id,
                'user_id' => $user->id
            ]);

            return back()->withErrors(['error' => 'Failed to cancel PTO request. Please try again.']);
        }
    }

    /**
     * Calculate PTO days excluding holidays
     */
    private function calculatePtoDaysExcludingHolidays($startDate, $endDate, $dayOptions)
    {
        // Get holidays in the date range
        $holidays = Holiday::getHolidaysInRange($startDate, $endDate);

        $totalDays = 0.0;

        foreach ($dayOptions as $dayOption) {
            $date = Carbon::parse($dayOption['date'])->format('Y-m-d');

            // Skip if it's a holiday
            if (in_array($date, $holidays)) {
                continue;
            }

            // Add the day value based on type
            $totalDays += ($dayOption['type'] === 'full') ? 1.0 : 0.5;
        }

        return $totalDays;
    }

    /**
     * Create approval records for the PTO request based on the PTO type configuration.
     */
    private function createApprovalRecords(PtoRequest $ptoRequest, PtoType $ptoType): void
    {
        if (!$ptoType->multi_level_approval) {
            // Simple approval - just manager approval
            $manager = $ptoRequest->user->manager;
            if ($manager) {
                $ptoRequest->approvals()->create([
                    'approver_id' => $manager->id,
                    'level' => 1,
                    'sequence' => 1,
                    'status' => 'pending',
                ]);
            }
        } else {
            // Multi-level approval workflow
            $approvers = [];

            // Add manager if not disabled
            if (!$ptoType->disable_hierarchy_approval) {
                $manager = $ptoRequest->user->manager;
                if ($manager) {
                    $approvers[] = ['user_id' => $manager->id, 'level' => 1];
                }
            }

            // Add specific approvers
            if ($ptoType->specific_approvers && count($ptoType->specific_approvers) > 0) {
                foreach ($ptoType->specific_approvers as $index => $approverId) {
                    $approvers[] = [
                        'user_id' => $approverId,
                        'level' => $ptoType->disable_hierarchy_approval ? 1 : 2
                    ];
                }
            }

            // Create approval records
            foreach ($approvers as $index => $approver) {
                $ptoRequest->approvals()->create([
                    'approver_id' => $approver['user_id'],
                    'level' => $approver['level'],
                    'sequence' => $index + 1,
                    'status' => 'pending',
                ]);
            }
        }
    }

    /**
     * Get user's PTO data with balances and policies.
     */
    private function getUserPtoData(User $user, int $year): array
    {
        $ptoData = [];

        // Get all active PTO types
        $ptoTypes = PtoType::where('is_active', true)->get();

        foreach ($ptoTypes as $ptoType) {
            // Get balance record for this year
            $balance = PtoBalance::where('user_id', $user->id)
                ->where('pto_type_id', $ptoType->id)
                ->where('year', $year)
                ->first();

            // Get policy for this PTO type
            $policy = $user->activePtoPolicies()->where('pto_type_id', $ptoType->id)->first();

            if ($balance) {
                // User has a balance record
                $ptoData[] = [
                    'pto_type' => [
                        'id' => $ptoType->id,
                        'name' => $ptoType->name,
                        'description' => $ptoType->description,
                        'color' => $ptoType->color,
                        'code' => $ptoType->code,
                    ],
                    'balance' => (float) $balance->balance,
                    'pending_balance' => (float) $balance->pending_balance,
                    'available_balance' => (float) ($balance->balance - $balance->pending_balance),
                    'policy' => $policy ? [
                        'initial_days' => $policy->initial_days ?? 0,
                        'annual_accrual_amount' => $policy->annual_accrual_amount ?? 0,
                        'rollover_enabled' => $policy->rollover_enabled ?? false,
                        'max_rollover_days' => $policy->max_rollover_days,
                    ] : null,
                    'can_request' => true,
                    'has_balance_record' => true,
                ];
            } elseif ($policy) {
                // User has policy but no balance record - use policy defaults
                $ptoData[] = [
                    'pto_type' => [
                        'id' => $ptoType->id,
                        'name' => $ptoType->name,
                        'description' => $ptoType->description,
                        'color' => $ptoType->color,
                        'code' => $ptoType->code,
                    ],
                    'balance' => (float) $policy->annual_accrual_amount,
                    'pending_balance' => 0.0,
                    'available_balance' => (float) $policy->annual_accrual_amount,
                    'policy' => [
                        'initial_days' => $policy->initial_days ?? 0,
                        'annual_accrual_amount' => $policy->annual_accrual_amount ?? 0,
                        'rollover_enabled' => $policy->rollover_enabled ?? false,
                        'max_rollover_days' => $policy->max_rollover_days,
                    ],
                    'can_request' => true,
                    'has_balance_record' => false,
                ];
            }
        }

        return $ptoData;
    }

    /**
     * Get recent PTO requests for the user.
     */
    private function getRecentRequests(User $user): array
    {
        return PtoRequest::with(['ptoType'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($request) {
                return [
                    'id' => $request->id,
                    'request_number' => $request->request_number,
                    'pto_type' => [
                        'id' => $request->ptoType->id,
                        'name' => $request->ptoType->name,
                        'color' => $request->ptoType->color,
                        'code' => $request->ptoType->code,
                    ],
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'total_days' => (float) $request->total_days,
                    'reason' => $request->reason,
                    'status' => $request->status,
                    'submitted_at' => $request->submitted_at ?? $request->created_at,
                    'created_at' => $request->created_at,
                    'can_be_cancelled' => $this->canCancelRequest($request),
                    'cancellation_reason' => $request->cancellation_reason,
                    'denial_reason' => $request->denial_reason,
                    // Include blackout information
                    'has_blackout_conflicts' => $request->hasBlackoutConflicts(),
                    'has_blackout_warnings' => $request->hasBlackoutWarnings(),
                    'has_emergency_override' => $request->hasEmergencyOverride(),
                    'override_approved' => $request->isOverrideApproved(),
                ];
            })
            ->toArray();
    }

    /**
     * Get department PTO requests for calendar view.
     */
    private function getDepartmentPtoRequests(User $user, int $year): array
    {
        // Get users from the same departments
        $departmentUserIds = DB::table('department_user')
            ->whereIn('department_id', function ($query) use ($user) {
                $query->select('department_id')
                    ->from('department_user')
                    ->where('user_id', $user->id);
            })
            ->pluck('user_id')
            ->toArray();

        // Get PTO type IDs that should be shown in department calendar
        $showablePtoTypeIds = PtoType::where('show_in_department_calendar', 1)
            ->where('is_active', 1)
            ->pluck('id')
            ->toArray();

        // Get department colleagues' PTO requests (excluding current user)
        $colleagueRequests = PtoRequest::with(['user', 'ptoType'])
            ->whereIn('user_id', $departmentUserIds)
            ->where('user_id', '!=', $user->id) // Exclude current user
            ->whereIn('status', ['approved', 'pending'])
            ->whereIn('pto_type_id', $showablePtoTypeIds) // Only show PTO types marked for department calendar
            ->whereYear('start_date', $year)
            ->get();

        // Get current user's own PTO requests (always show regardless of calendar setting)
        $userOwnRequests = PtoRequest::with(['user', 'ptoType'])
            ->where('user_id', $user->id)
            ->whereIn('status', ['approved', 'pending'])
            ->whereHas('ptoType', function ($query) {
                $query->where('is_active', 1);
            })
            ->whereYear('start_date', $year)
            ->get();

        // Combine both collections
        $allRequests = $colleagueRequests->concat($userOwnRequests);

        return $allRequests->map(function ($request) {
            return [
                'id' => $request->id,
                'user' => [
                    'id' => $request->user->id,
                    'name' => $request->user->name,
                ],
                'pto_type' => [
                    'id' => $request->ptoType->id,
                    'name' => $request->ptoType->name,
                    'color' => $request->ptoType->color,
                    'code' => $request->ptoType->code,
                ],
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'total_days' => (float) $request->total_days,
                'status' => $request->status,
            ];
        })->toArray();
    }

    /**
     * Get PTO types with current balances for request form.
     */
    private function getPtoTypesWithBalances(User $user, int $year): array
    {
        $ptoTypes = PtoType::where('is_active', true)->get();

        return $ptoTypes->map(function ($ptoType) use ($user, $year) {
            // Get balance or use policy default
            $balance = PtoBalance::where('user_id', $user->id)
                ->where('pto_type_id', $ptoType->id)
                ->where('year', $year)
                ->first();

            $currentBalance = 0;

            if ($balance) {
                $currentBalance = $balance->balance - $balance->pending_balance;
            } else {
                $policy = $user->activePtoPolicies()->where('pto_type_id', $ptoType->id)->first();
                if ($policy) {
                    $currentBalance = $policy->annual_accrual_amount ?? 0;
                }
            }

            return [
                'id' => $ptoType->id,
                'name' => $ptoType->name,
                'description' => $ptoType->description,
                'color' => $ptoType->color,
                'code' => $ptoType->code,
                'current_balance' => (float) $currentBalance,
                'policy' => $this->getUserPolicyForType($user, $ptoType->id),
            ];
        })->toArray();
    }

    /**
     * Get user policy for a specific PTO type.
     */
    private function getUserPolicyForType(User $user, int $ptoTypeId): ?array
    {
        $policy = $user->activePtoPolicies()->where('pto_type_id', $ptoTypeId)->first();

        if (!$policy) {
            return null;
        }

        return [
            'initial_days' => $policy->initial_days ?? 0,
            'annual_accrual_amount' => $policy->annual_accrual_amount ?? 0,
            'rollover_enabled' => $policy->rollover_enabled ?? false,
            'max_rollover_days' => $policy->max_rollover_days,
        ];
    }

    /**
     * Check if a request can be cancelled.
     */
    private function canCancelRequest(PtoRequest $request): bool
    {
        if ($request->status === 'pending') {
            return true;
        }

        if ($request->status === 'approved') {
            $startDateTime = Carbon::parse($request->start_date);
            $now = Carbon::now();
            $hoursUntilStart = $now->diffInHours($startDateTime, false);
            return $hoursUntilStart >= 24;
        }

        return false;
    }

    /**
     * Validate that all selected days are business days.
     */
    private function validateBusinessDays(array $dayOptions): void
    {
        foreach ($dayOptions as $dayOption) {
            $date = Carbon::parse($dayOption['date']);
            if ($date->isWeekend()) {
                throw new \InvalidArgumentException('Weekend days are not allowed for PTO requests.');
            }
        }
    }
}
