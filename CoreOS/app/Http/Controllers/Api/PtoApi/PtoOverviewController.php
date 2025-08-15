<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoBlackout;
use App\Models\PtoModels\PtoPolicy;
use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PtoOverviewController extends Controller
{
    /**
     * Display the HR Dashboard view (Inertia)
     */
    public function index(Request $request)
    {
        $year = $request->year ?? Carbon::now()->year;

        // Get all PTO types
        $ptoTypes = PtoType::orderBy('name')->get();

        // Get all users with their PTO balances for the specified year
        $users = User::with([
            'ptoBalances' => function ($query) use ($year) {
                $query->where('year', $year)->with('ptoType');
            },
            'departments'
        ])
            ->whereHas('ptoBalances', function ($query) use ($year) {
                $query->where('year', $year);
            })
            ->orderBy('name')
            ->get();

        // Format the data for the frontend
        $userData = $users->map(function ($user) use ($ptoTypes) {
            $balancesByType = $user->ptoBalances->keyBy('pto_type_id');

            $ptoData = $ptoTypes->map(function ($type) use ($balancesByType) {
                $balance = $balancesByType->get($type->id);

                if (!$balance) {
                    return [
                        'type_id' => $type->id,
                        'type_name' => $type->name,
                        'balance' => 0,
                        'used_balance' => 0,
                        'pending_balance' => 0,
                        'available_balance' => 0,
                    ];
                }

                // Ensure we don't have negative values
                $totalBalance = max(0, $balance->balance);
                $usedBalance = max(0, $balance->used_balance);
                $pendingBalance = max(0, $balance->pending_balance);
                $availableBalance = max(0, $totalBalance - $pendingBalance - $usedBalance);

                // Calculate assigned balance (what they started with)
                // This would be balance + used_balance (assuming no adjustments)
                $assignedBalance = $totalBalance + $usedBalance;

                return [
                    'type_id' => $type->id,
                    'type_name' => $type->name,
                    'balance' => $totalBalance,
                    'used_balance' => $usedBalance,
                    'pending_balance' => $pendingBalance,
                    'available_balance' => $availableBalance,
                    'assigned_balance' => $assignedBalance,
                ];
            });

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'department' => $user->departments->first()->name ?? 'N/A',
                'start_date' => $user->start_date ?? $user->created_at->format('Y-m-d'),
                'pto_data' => $ptoData,
                'total_balance' => max(0, $ptoData->sum('balance')),
                'total_used' => max(0, $ptoData->sum('used_balance')),
                'total_available' => max(0, $ptoData->sum('available_balance')),
                'total_assigned' => max(0, $ptoData->sum('assigned_balance')),
            ];
        });

        $stats = [
            'total_requests' => PtoRequest::count(),
            'pending_requests' => PtoRequest::where('status', 'pending')->count(),
            'approved_requests' => PtoRequest::where('status', 'approved')->count(),
            'denied_requests' => PtoRequest::where('status', 'denied')->count(),
            'total_types' => PtoType::count(),
            'total_policies' => PtoPolicy::count(),
            'total_blackouts' => PtoBlackout::count(),
        ];

        $departments = Department::active()->orderBy('name')->get();

        // Get available years
        $availableYears = PtoBalance::selectRaw('DISTINCT year')
            ->orderBy('year', 'desc')
            ->pluck('year');

        return Inertia::render('human-resources/HR-Dashboard', [
            'users' => $userData,
            'ptoTypes' => $ptoTypes,
            'currentYear' => $year,
            'availableYears' => $availableYears,
            'departments' => $departments,
            'stats' => $stats,
        ]);
    }

    /**
     * Get HR Dashboard data for API consumption
     */
    public function getDashboardData(Request $request): JsonResponse
    {
        try {
            $year = $request->year ?? Carbon::now()->year;
            $currentMonth = Carbon::now()->month;
            $currentYear = Carbon::now()->year;

            // Get all PTO types
            $ptoTypes = PtoType::active()->orderBy('name')->get();

            // Get all users with their PTO balances for the specified year
            $users = User::with([
                'ptoBalances' => function ($query) use ($year) {
                    $query->where('year', $year)->with('ptoType');
                },
                'departments'
            ])
                ->whereHas('ptoBalances', function ($query) use ($year) {
                    $query->where('year', $year);
                })
                ->orderBy('name')
                ->get();

            // Format the user data
            $userData = $users->map(function ($user) use ($ptoTypes) {
                $balancesByType = $user->ptoBalances->keyBy('pto_type_id');

                $ptoData = $ptoTypes->map(function ($type) use ($balancesByType) {
                    $balance = $balancesByType->get($type->id);

                    if (!$balance) {
                        return [
                            'type_id' => $type->id,
                            'type_name' => $type->name,
                            'balance' => 0,
                            'used_balance' => 0,
                            'pending_balance' => 0,
                            'available_balance' => 0,
                            'assigned_balance' => 0,
                        ];
                    }

                    $totalBalance = max(0, $balance->balance);
                    $usedBalance = max(0, $balance->used_balance);
                    $pendingBalance = max(0, $balance->pending_balance);
                    $availableBalance = max(0, $totalBalance - $pendingBalance - $usedBalance);
                    $assignedBalance = $totalBalance + $usedBalance;

                    return [
                        'type_id' => $type->id,
                        'type_name' => $type->name,
                        'balance' => $totalBalance,
                        'used_balance' => $usedBalance,
                        'pending_balance' => $pendingBalance,
                        'available_balance' => $availableBalance,
                        'assigned_balance' => $assignedBalance,
                    ];
                });

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'department' => $user->departments->first()->name ?? 'N/A',
                    'start_date' => $user->start_date ?? $user->created_at->format('Y-m-d'),
                    'pto_data' => $ptoData,
                    'total_balance' => max(0, $ptoData->sum('balance')),
                    'total_used' => max(0, $ptoData->sum('used_balance')),
                    'total_available' => max(0, $ptoData->sum('available_balance')),
                    'total_assigned' => max(0, $ptoData->sum('assigned_balance')),
                ];
            });

            // Calculate stats with additional metrics for dashboard
            $currentMonthRequests = PtoRequest::whereMonth('created_at', $currentMonth)
                ->whereYear('created_at', $currentYear)
                ->count();

            $approvedDaysThisMonth = PtoRequest::where('status', 'approved')
                ->whereMonth('approved_at', $currentMonth)
                ->whereYear('approved_at', $currentYear)
                ->sum('total_days');

            $stats = [
                'total_requests' => PtoRequest::count(),
                'pending_requests' => PtoRequest::where('status', 'pending')->count(),
                'approved_requests' => PtoRequest::where('status', 'approved')->count(),
                'denied_requests' => PtoRequest::where('status', 'denied')->count(),
                'total_types' => PtoType::count(),
                'total_policies' => PtoPolicy::count(),
                'total_blackouts' => PtoBlackout::count(),
                'total_employees' => $userData->count(),
                'requests_this_month' => $currentMonthRequests,
                'approved_days_this_month' => $approvedDaysThisMonth,
            ];

            // Get departments
            $departments = Department::active()->orderBy('name')->get();

            // Get available years
            $availableYears = PtoBalance::selectRaw('DISTINCT year')
                ->orderBy('year', 'desc')
                ->pluck('year');

            // Get recent activities (last 10 activities)
            $recentActivities = collect();

            // Get recent requests (submissions)
            $recentRequests = PtoRequest::with(['user', 'ptoType'])
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get();

            foreach ($recentRequests as $request) {
                $recentActivities->push([
                    'id' => 'request_' . $request->id,
                    'type' => 'request_submitted',
                    'description' => "PTO request {$request->request_number} submitted for {$request->total_days} days",
                    'user_name' => $request->user->name,
                    'created_at' => $request->created_at->toISOString(),
                ]);
            }

            // Get recent approvals
            $recentApprovals = PtoRequest::with(['user', 'approvedBy'])
                ->where('status', 'approved')
                ->whereNotNull('approved_at')
                ->orderBy('approved_at', 'desc')
                ->take(5)
                ->get();

            foreach ($recentApprovals as $request) {
                $recentActivities->push([
                    'id' => 'approval_' . $request->id,
                    'type' => 'request_approved',
                    'description' => "PTO request {$request->request_number} approved for {$request->user->name}",
                    'user_name' => $request->approvedBy->name ?? 'System',
                    'created_at' => $request->approved_at->toISOString(),
                ]);
            }

            // Sort activities by date and limit
            $recentActivities = $recentActivities->sortByDesc('created_at')->take(10)->values();

            // Calculate top PTO types by usage
            $topPtoTypes = $ptoTypes->map(function ($type) use ($userData) {
                $totalUsed = $userData->sum(function ($user) use ($type) {
                    $typeData = collect($user['pto_data'])->firstWhere('type_id', $type->id);
                    return $typeData ? $typeData['used_balance'] : 0;
                });

                return [
                    'name' => $type->name,
                    'code' => $type->code,
                    'color' => $type->color,
                    'request_count' => $totalUsed,
                ];
            })->sortByDesc('request_count')->take(5)->values();

            // Calculate department breakdown
            $departmentBreakdown = $departments->map(function ($dept) use ($userData) {
                $deptUsers = $userData->filter(function ($user) use ($dept) {
                    return $user['department'] === $dept->name;
                });

                $pendingRequests = PtoRequest::whereHas('user', function ($query) use ($dept) {
                    $query->whereHas('departments', function ($deptQuery) use ($dept) {
                        $deptQuery->where('departments.id', $dept->id);
                    });
                })->where('status', 'pending')->count();

                return [
                    'department' => $dept->name,
                    'employee_count' => $deptUsers->count(),
                    'pending_requests' => $pendingRequests,
                ];
            })->values();

            return response()->json([
                'users' => $userData->values(),
                'ptoTypes' => $ptoTypes,
                'currentYear' => $year,
                'availableYears' => $availableYears,
                'departments' => $departments,
                'stats' => $stats,
                'top_pto_types' => $topPtoTypes,
                'recent_activities' => $recentActivities,
                'department_breakdown' => $departmentBreakdown,
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching HR Dashboard data: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to load dashboard data.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Get dashboard stats only
     */
    public function getStats(Request $request): JsonResponse
    {
        try {
            $days = $request->days ?? 30;
            $startDate = Carbon::now()->subDays($days)->startOfDay();
            $currentMonth = Carbon::now()->month;
            $currentYear = Carbon::now()->year;

            // Calculate stats for the specified time period
            $requestsInPeriod = PtoRequest::where('created_at', '>=', $startDate)->count();
            $approvedInPeriod = PtoRequest::where('status', 'approved')
                ->where('approved_at', '>=', $startDate)
                ->count();

            $approvedDaysInPeriod = PtoRequest::where('status', 'approved')
                ->where('approved_at', '>=', $startDate)
                ->sum('total_days');

            // Monthly stats
            $requestsThisMonth = PtoRequest::whereMonth('created_at', $currentMonth)
                ->whereYear('created_at', $currentYear)
                ->count();

            $approvedDaysThisMonth = PtoRequest::where('status', 'approved')
                ->whereMonth('approved_at', $currentMonth)
                ->whereYear('approved_at', $currentYear)
                ->sum('total_days');

            $stats = [
                'total_employees' => User::whereHas('ptoBalances')->count(),
                'active_pto_policies' => PtoPolicy::where('is_active', true)->count(),
                'pending_requests' => PtoRequest::where('status', 'pending')->count(),
                'requests_this_month' => $requestsThisMonth,
                'approved_days_this_month' => $approvedDaysThisMonth,
                'requests_in_period' => $requestsInPeriod,
                'approved_in_period' => $approvedInPeriod,
                'approved_days_in_period' => $approvedDaysInPeriod,
                'total_requests' => PtoRequest::count(),
                'approved_requests' => PtoRequest::where('status', 'approved')->count(),
                'denied_requests' => PtoRequest::where('status', 'denied')->count(),
                'total_types' => PtoType::count(),
                'total_policies' => PtoPolicy::count(),
                'total_blackouts' => PtoBlackout::count(),
            ];

            return response()->json($stats);

        } catch (\Exception $e) {
            Log::error("Error fetching dashboard stats: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to load dashboard stats.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Display the PTO Calendar view (Inertia)
     */
    public function ptoCalendar(Request $request)
    {
        $year = $request->year ?? Carbon::now()->year;
        $month = $request->month ?? Carbon::now()->month;

        // Get available years from PTO requests
        $availableYears = PtoRequest::selectRaw('DISTINCT YEAR(start_date) as year')
            ->orderBy('year', 'desc')
            ->pluck('year');

        // Get all PTO types for the legend
        $ptoTypes = PtoType::orderBy('name')->get();

        return Inertia::render('human-resources/PTO-Calendar.tsx', [
            'currentYear' => $year,
            'currentMonth' => $month,
            'availableYears' => $availableYears,
            'ptoTypes' => $ptoTypes,
        ]);
    }

    /**
     * Get PTO Calendar data for API consumption
     */
    public function getCalendarData(Request $request): JsonResponse
    {
        try {
            $year = $request->year ?? Carbon::now()->year;
            $month = $request->month ?? null;

            // Build the query for approved PTO requests
            $query = PtoRequest::with(['user', 'ptoType'])
                ->where('status', 'approved');

            // Filter by year
            $query->whereYear('start_date', '<=', $year)
                ->whereYear('end_date', '>=', $year);

            // If month is specified, filter by month
            if ($month) {
                $query->where(function ($q) use ($year, $month) {
                    // Include requests that start in this month
                    $q->where(function ($subQ) use ($year, $month) {
                        $subQ->whereYear('start_date', $year)
                            ->whereMonth('start_date', $month);
                    })
                        // Or end in this month
                        ->orWhere(function ($subQ) use ($year, $month) {
                            $subQ->whereYear('end_date', $year)
                                ->whereMonth('end_date', $month);
                        })
                        // Or span across this month
                        ->orWhere(function ($subQ) use ($year, $month) {
                            $subQ->where('start_date', '<=', Carbon::create($year, $month, 1)->startOfMonth())
                                ->where('end_date', '>=', Carbon::create($year, $month, 1)->endOfMonth());
                        });
                });
            }

            $ptoRequests = $query->orderBy('start_date')->get();

            // Format the data for calendar display
            $calendarEvents = [];

            foreach ($ptoRequests as $request) {
                // Create date range for this request
                $startDate = Carbon::parse($request->start_date);
                $endDate = Carbon::parse($request->end_date);

                // Generate events for each day in the range
                $currentDate = $startDate->copy();
                while ($currentDate->lte($endDate)) {
                    // Skip if filtering by month and this date is not in the target month
                    if ($month && $currentDate->month != $month) {
                        $currentDate->addDay();
                        continue;
                    }

                    // Skip if filtering by year and this date is not in the target year
                    if ($currentDate->year != $year) {
                        $currentDate->addDay();
                        continue;
                    }

                    $dateString = $currentDate->format('Y-m-d');

                    if (!isset($calendarEvents[$dateString])) {
                        $calendarEvents[$dateString] = [];
                    }

                    $calendarEvents[$dateString][] = [
                        'id' => $request->id,
                        'request_number' => $request->request_number,
                        'user_id' => $request->user_id,
                        'user_name' => $request->user->name,
                        'user_email' => $request->user->email,
                        'pto_type_id' => $request->pto_type_id,
                        'pto_type_name' => $request->ptoType->name,
                        'pto_type_code' => $request->ptoType->code,
                        'pto_type_color' => $request->ptoType->color ?? '#3b82f6',
                        'start_date' => $request->start_date->format('Y-m-d'),
                        'end_date' => $request->end_date->format('Y-m-d'),
                        'total_days' => $request->total_days,
                        'reason' => $request->reason,
                        'is_start_date' => $currentDate->equalTo($startDate),
                        'is_end_date' => $currentDate->equalTo($endDate),
                        'is_single_day' => $startDate->equalTo($endDate),
                    ];

                    $currentDate->addDay();
                }
            }

            // Get summary statistics for the requested period
            $totalRequests = $ptoRequests->count();
            $totalDays = $ptoRequests->sum('total_days');
            $uniqueUsers = $ptoRequests->pluck('user_id')->unique()->count();

            // Get PTO type breakdown
            $ptoTypeBreakdown = $ptoRequests->groupBy('pto_type_id')->map(function ($requests, $typeId) {
                $firstRequest = $requests->first();
                return [
                    'type_id' => $typeId,
                    'type_name' => $firstRequest->ptoType->name,
                    'type_code' => $firstRequest->ptoType->code,
                    'type_color' => $firstRequest->ptoType->color ?? '#3b82f6',
                    'request_count' => $requests->count(),
                    'total_days' => $requests->sum('total_days'),
                ];
            })->values();

            return response()->json([
                'events' => $calendarEvents,
                'summary' => [
                    'total_requests' => $totalRequests,
                    'total_days' => $totalDays,
                    'unique_users' => $uniqueUsers,
                ],
                'pto_type_breakdown' => $ptoTypeBreakdown,
                'current_year' => $year,
                'current_month' => $month,
            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching PTO Calendar data: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to load calendar data.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }











}
