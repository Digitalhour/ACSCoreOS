<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoPolicy;
use App\Models\PtoModels\PtoRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserPtoController extends Controller
{
    /**
     * Get the current user's PTO dashboard data.
     */
    public function dashboard(): JsonResponse
    {
        $user = Auth::user();

        // Get user's active policies
        $policies = PtoPolicy::with(['ptoType'])
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->where('effective_date', '<=', now())
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            })
            ->get();

        Log::info("Found {$policies->count()} active policies for user {$user->id}");

        // Get user's current balances
        $balances = PtoBalance::with(['ptoType'])
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('pto_type_id');

        Log::info("Found {$balances->count()} balances for user {$user->id}");

        // Get recent requests
        $recentRequests = PtoRequest::with(['ptoType'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Get pending requests count
        $pendingRequestsCount = PtoRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->count();

        // Get department PTO requests for calendar
        $departmentPtoRequests = $this->getDepartmentPtoRequests($user);

        // Combine policies with their balances
        $ptoData = $policies->map(function ($policy) use ($balances, $user) {
            $balance = $balances->get($policy->pto_type_id);
            $currentBalance = $balance && $balance->balance > 0 ? $balance->balance : $policy->initial_days;

            // Calculate pending PTO requests for this type
            $pendingTotal = PtoRequest::where('user_id', $user->id)
                ->where('pto_type_id', $policy->pto_type_id)
                ->where('status', 'pending')
                ->sum('total_days');

            $availableBalance = $currentBalance - $pendingTotal;

            Log::info("Balance calculation for user {$user->id}, PTO type {$policy->pto_type_id}: current={$currentBalance}, pending={$pendingTotal}, available={$availableBalance}");

            return [
                'policy' => $policy,
                'balance' => $currentBalance,
                'pending_balance' => (float) $pendingTotal,
                'available_balance' => (float) $availableBalance,
                'pto_type' => $policy->ptoType,
                'can_request' => $availableBalance > 0,
                'has_balance_record' => $balance !== null,
            ];
        });

        return response()->json([
            'data' => [
                'pto_data' => $ptoData,
                'recent_requests' => $recentRequests,
                'pending_requests_count' => $pendingRequestsCount,
                'department_pto_requests' => $departmentPtoRequests,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'debug' => [
                    'policies_count' => $policies->count(),
                    'balances_count' => $balances->count(),
                ]
            ]
        ]);
    }

    /**
     * Get department PTO requests for calendar display
     */
    private function getDepartmentPtoRequests(User $user)
    {
        // Get user's department IDs
        $departmentIds = $user->departments()->pluck('departments.id');

        if ($departmentIds->isEmpty()) {
            // If user has no departments, only show their own requests
            return $this->getUserOwnPtoRequests($user);
        }

        // Get all users in the same departments
        $departmentUserIds = DB::table('department_user')
            ->whereIn('department_id', $departmentIds)
            ->pluck('user_id')
            ->unique();

        // Get department colleagues' PTO requests (excluding current user)
        // Only show approved and pending requests for privacy
        // Filter by PTO types that should be shown in department calendar
        $colleagueRequests = PtoRequest::with(['user', 'ptoType'])
            ->whereIn('user_id', $departmentUserIds)
            ->where('user_id', '!=', $user->id) // Exclude current user
            ->whereIn('status', ['approved', 'pending'])
            ->whereHas('ptoType', function ($query) {
                $query->where('show_in_department_calendar', true)
                    ->where('is_active', true);
            })
            ->where('start_date', '>=', now()->subMonths(2)) // Last 2 months
            ->where('end_date', '<=', now()->addMonths(4))   // Next 4 months
            ->orderBy('start_date')
            ->get();

        // Get current user's own PTO requests (always show regardless of calendar setting)
        $userOwnRequests = PtoRequest::with(['user', 'ptoType'])
            ->where('user_id', $user->id)
            ->whereIn('status', ['approved', 'pending'])
            ->whereHas('ptoType', function ($query) {
                $query->where('is_active', true); // Only check if PTO type is active
            })
            ->where('start_date', '>=', now()->subMonths(2)) // Last 2 months
            ->where('end_date', '<=', now()->addMonths(4))   // Next 4 months
            ->get();

        // Combine both collections
        $allRequests = $colleagueRequests->concat($userOwnRequests)
            ->sortBy('start_date')
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
                    'start_date' => $request->start_date->format('Y-m-d'),
                    'end_date' => $request->end_date->format('Y-m-d'),
                    'total_days' => $request->total_days,
                    'status' => $request->status,
                ];
            });

        return $allRequests->values()->toArray();
    }

    /**
     * Get user's own PTO requests for calendar display
     */
    private function getUserOwnPtoRequests(User $user)
    {
        $userOwnRequests = PtoRequest::with(['user', 'ptoType'])
            ->where('user_id', $user->id)
            ->whereIn('status', ['approved', 'pending'])
            ->whereHas('ptoType', function ($query) {
                $query->where('is_active', true); // Only check if PTO type is active
            })
            ->where('start_date', '>=', now()->subMonths(2)) // Last 2 months
            ->where('end_date', '<=', now()->addMonths(4))   // Next 4 months
            ->orderBy('start_date')
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
                    'start_date' => $request->start_date->format('Y-m-d'),
                    'end_date' => $request->end_date->format('Y-m-d'),
                    'total_days' => $request->total_days,
                    'status' => $request->status,
                ];
            });

        return $userOwnRequests->toArray();
    }

    /**
     * Get user's PTO summary for requests.
     */
    public function summary(): JsonResponse
    {
        $user = Auth::user();

        // Get user's active policies with balances
        $policies = PtoPolicy::with(['ptoType'])
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->where('effective_date', '<=', now())
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            })
            ->get();

        // Get current balances
        $balances = PtoBalance::with(['ptoType'])
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('pto_type_id');

        // Format for request form
        $ptoTypes = $policies->map(function ($policy) use ($balances, $user) {
            $balance = $balances->get($policy->pto_type_id);
            // Use 'balance' field and fall back to policy initial days
            $currentBalance = $balance && $balance->balance > 0 ? $balance->balance : $policy->initial_days;

            // Calculate pending PTO requests for this type
            $pendingTotal = PtoRequest::where('user_id', $user->id)
                ->where('pto_type_id', $policy->pto_type_id)
                ->where('status', 'pending')
                ->sum('total_days');

            $availableBalance = $currentBalance - $pendingTotal;

            return [
                'id' => $policy->pto_type_id,
                'name' => $policy->ptoType->name,
                'description' => $policy->ptoType->description,
                'color' => $policy->ptoType->color,
                'code' => $policy->ptoType->code,
                'current_balance' => $availableBalance, // Show available, not total
                'total_balance' => $currentBalance,
                'pending_balance' => $pendingTotal,
                'policy' => [
                    'initial_days' => $policy->initial_days,
                    'annual_accrual_amount' => $policy->annual_accrual_amount,
                    'rollover_enabled' => $policy->rollover_enabled,
                    'max_rollover_days' => $policy->max_rollover_days,
                ],
            ];
        });

        return response()->json([
            'data' => [
                'pto_types' => $ptoTypes->values(),
                'balances' => $balances->values(),
            ]
        ]);
    }

    /**
     * Get user's own PTO requests with cancellation info.
     */
    public function myRequests(Request $request): JsonResponse
    {
        $user = Auth::user();
        $status = $request->get('status');

        $query = PtoRequest::with(['ptoType', 'approvals.approver'])
            ->where('user_id', $user->id);

        // Filter by status if provided
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $requests = $query->orderBy('created_at', 'desc')->get();

        // Add cancellation info to each request
        $requests->transform(function ($ptoRequest) {
            $canCancel = false;
            $cancellationReason = '';

            if ($ptoRequest->status === 'pending') {
                $canCancel = true;
                $cancellationReason = 'You can cancel pending requests';
            } elseif ($ptoRequest->status === 'approved') {
                $startDateTime = Carbon::parse($ptoRequest->start_date)->startOfDay();
                $hoursUntilStart = Carbon::now()->diffInHours($startDateTime, false);

                if ($hoursUntilStart >= 24) {
                    $canCancel = true;
                    $cancellationReason = "You can cancel with {$hoursUntilStart} hours notice";
                } else {
                    $cancellationReason = 'Cannot cancel - less than 24 hours until start';
                }
            } else {
                $cancellationReason = 'Only pending or approved requests can be cancelled';
            }

            $ptoRequest->can_be_cancelled = $canCancel;
            $ptoRequest->cancellation_reason = $cancellationReason;
            $ptoRequest->hours_until_start = $ptoRequest->status === 'approved' ?
                Carbon::now()->diffInHours(Carbon::parse($ptoRequest->start_date)->startOfDay(), false) : null;

            return $ptoRequest;
        });

        return response()->json([
            'data' => $requests,
            'meta' => [
                'count' => $requests->count(),
                'status_filter' => $status ?? 'all',
            ]
        ]);
    }

    /**
     * Create balance from policy if it doesn't exist.
     */
    private function createBalanceFromPolicy(PtoPolicy $policy): void
    {
        try {
            // Check if PtoBalance table has year column
            $hasYearColumn = \Schema::hasColumn('pto_balances', 'year');

            $balanceData = [
                'user_id' => $policy->user_id,
                'pto_type_id' => $policy->pto_type_id,
                'balance' => $policy->initial_days, // Use 'balance' field
                'accrued_balance' => $policy->initial_days,
                'used_balance' => 0,
                'pending_balance' => 0,
                'rollover_balance' => 0,
            ];

            if ($hasYearColumn) {
                $balanceData['year'] = now()->year;
            }

            PtoBalance::create($balanceData);

            Log::info("Created balance for user {$policy->user_id}, PTO type {$policy->pto_type_id}: {$policy->initial_days} days");
        } catch (\Exception $e) {
            Log::error("Failed to create balance from policy: ".$e->getMessage());
        }
    }
}
