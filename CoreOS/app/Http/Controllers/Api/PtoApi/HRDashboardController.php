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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class HRDashboardController extends Controller
{
    public function index(Request $request)
    {
        $currentYear = $request->get('year', date('Y'));

        $availableYears = [];
        for ($i = 0; $i < 4; $i++) {
            $availableYears[] = (int)date('Y') - $i;
        }

        $stats = [
            'total_requests' => PtoRequest::count(),
            'pending_requests' => PtoRequest::where('status', 'pending')->count(),
            'approved_requests' => PtoRequest::where('status', 'approved')->count(),
            'denied_requests' => PtoRequest::where('status', 'denied')->count(),
            'total_types' => PtoType::count(),
            'total_policies' => PtoPolicy::count(),
            'total_blackouts' => PtoBlackout::count(),
        ];
        $year = $request->year ?? Carbon::now()->year;
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
        $ptoTypes = PtoType::active()->ordered()->select('id', 'name', 'code', 'color')->get();

        $overviewUsers = User::with(['departments'])
            ->select('id', 'name', 'email', 'start_date')
            ->orderBy('name')
            ->get()
            ->map(function ($user) use ($currentYear) {
                $ptoData = $this->getUserPtoData($user->id, $currentYear);

                $departmentName = 'N/A';
                if ($user->departments->isNotEmpty()) {
                    $departmentName = $user->departments->count() === 1
                        ? $user->departments->first()->name
                        : $user->departments->pluck('name')->join(', ');
                }

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'department' => $departmentName,
                    'start_date' => $user->start_date?->format('Y-m-d') ?? '',
                    'pto_data' => $ptoData
                ];
            });

        $overviewPtoTypes = PtoType::active()
            ->ordered()
            ->select('id', 'name')
            ->get()
            ->map(fn($type) => [
                'id' => $type->id,
                'name' => $type->name
            ]);

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
                    'departments' => $blackout->departments(),
                    'users' => $blackout->users(),
                    'is_company_wide' => $blackout->is_company_wide,
                    'is_holiday' => $blackout->is_holiday,
                    'is_strict' => $blackout->is_strict,
                    'allow_emergency_override' => $blackout->allow_emergency_override,
                    'restriction_type' => $blackout->restriction_type,
                    'max_requests_allowed' => $blackout->max_requests_allowed,
                    'is_active' => $blackout->is_active,
                ];
            });
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
                'start_date' => $user->profile->start_date ?? "N/A",
                'pto_data' => $ptoData,
                'total_balance' => max(0, $ptoData->sum('balance')),
                'total_used' => max(0, $ptoData->sum('used_balance')),
                'total_available' => max(0, $ptoData->sum('available_balance')),
                'total_assigned' => max(0, $ptoData->sum('assigned_balance')),
            ];
        });
        $departments = Department::active()->orderBy('name')->get();
        // Get available years
        $availableYears = PtoBalance::selectRaw('DISTINCT year')
            ->orderBy('year', 'desc')
            ->pluck('year');
        return Inertia::render('human-resources/HRDashboardView', [
            'title' => 'PTO Administration Dashboard',
            'stats' => $stats,
            'users' => $users,
            'ptoTypes' => $ptoTypes,
            'Blackouts' => $blackouts,
            'overviewUsers' => $overviewUsers,
            'overviewPtoTypes' => $overviewPtoTypes,
            'currentYear' => (int)$currentYear,
            'availableYears' => $availableYears,
        ]);
    }

    private function getUserPtoData($userId, $year)
    {
        $ptoTypes = PtoType::orderBy('name')->get();
        $userBalances = PtoBalance::where('user_id', $userId)
            ->where('year', $year)
            ->with('ptoType')
            ->get()
            ->keyBy('pto_type_id');

        return $ptoTypes->map(function ($type) use ($userBalances) {
            $balance = $userBalances->get($type->id);

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
    }

    public function getUserDetails(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'year' => 'nullable|integer|min:2020|max:2030'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $userId = $request->get('user_id');
        $year = $request->get('year', Carbon::now()->year);

        try {
            $userRequests = PtoRequest::with(['ptoType:id,name'])
                ->where('user_id', $userId)
                ->whereYear('start_date', $year)
                ->orderBy('start_date', 'desc')
                ->get()
                ->map(fn($request) => [
                    'id' => $request->id,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'total_days' => $request->total_days,
                    'status' => $request->status,
                    'pto_type' => [
                        'name' => $request->ptoType->name,
                    ],
                ]);

            $ptoTypes = PtoType::orderBy('name')->get();
            $userBalances = PtoBalance::where('user_id', $userId)
                ->where('year', $year)
                ->with('ptoType')
                ->get()
                ->keyBy('pto_type_id');

            $ptoData = $ptoTypes->map(function ($type) use ($userBalances) {
                $balance = $userBalances->get($type->id);

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

            return Inertia::render('Admin/PTO/HRDashboardView', [
                'userRequests' => $userRequests,
                'ptoData' => $ptoData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch user details.',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}
