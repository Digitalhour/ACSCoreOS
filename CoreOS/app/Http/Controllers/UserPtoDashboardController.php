<?php

namespace App\Http\Controllers;

use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class UserPtoDashboardController extends Controller
{
    /**
     * Display the user PTO dashboard.
     */
    public function index(Request $request)
    {
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

        $dashboardData = [
            'pto_data' => $ptoData,
            'recent_requests' => $recentRequests,
            'pending_requests_count' => $pendingRequestsCount,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'department_pto_requests' => $departmentPtoRequests,
        ];

        $summaryData = [
            'pto_types' => $ptoTypes,
        ];

        return Inertia::render('employee/UserPtoDashboard', [
            'dashboardData' => $dashboardData,
            'summaryData' => $summaryData,
        ]);
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
            $policy = $user->getPolicyForPtoType($ptoType->id);

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

        return PtoRequest::with(['user', 'ptoType'])
            ->whereIn('user_id', $departmentUserIds)
            ->whereIn('status', ['approved', 'pending'])
            ->whereYear('start_date', $year)
            ->get()
            ->map(function ($request) {
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
            })
            ->toArray();
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
                $policy = $user->getPolicyForPtoType($ptoType->id);
                if ($policy) {
                    $currentBalance = $policy->annual_accrual_amount;
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
        $policy = $user->getPolicyForPtoType($ptoTypeId);

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
}
