<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
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

class HRPtoDashboardController extends Controller {

    public function index(Request $request)
    {
        // Get the current year from request or default to current year
        $currentYear = $request->get('year', date('Y'));

        // Generate available years (current year and last 3 years)
        $availableYears = [];
        for ($i = 0; $i < 4; $i++) {
            $availableYears[] = (int)date('Y') - $i;
        }

        // Get summary statistics for the dashboard
        $stats = [
            'total_requests' => PtoRequest::count(),
            'pending_requests' => PtoRequest::where('status', 'pending')->count(),
            'approved_requests' => PtoRequest::where('status', 'approved')->count(),
            'denied_requests' => PtoRequest::where('status', 'denied')->count(),
            'total_types' => PtoType::count(),
            'total_policies' => PtoPolicy::count(),
            'total_blackouts' => PtoBlackout::count(),
        ];

        // Get users and PTO types for the modal
        $users = User::select('id', 'name', 'email')->orderBy('name')->get();
        $ptoTypes = PtoType::active()->ordered()->select('id', 'name', 'code', 'color')->get();

        // Get overview data - users with their PTO data for the selected year
        $overviewUsers = User::with(['departments'])
            ->select('id', 'name', 'email', 'start_date')
            ->orderBy('name')
            ->get()
            ->map(function ($user) use ($currentYear) {
                // Get PTO data for this user for the selected year
                $ptoData = $this->getUserPtoData($user->id, $currentYear);

                // Handle multiple departments - get first department or concatenate
                $departmentName = 'N/A';
                if ($user->departments->isNotEmpty()) {
                    if ($user->departments->count() === 1) {
                        $departmentName = $user->departments->first()->name;
                    } else {
                        // Multiple departments - concatenate with comma
                        $departmentName = $user->departments->pluck('name')->join(', ');
                    }
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

        // Get PTO types for overview
        $overviewPtoTypes = PtoType::active()
            ->ordered()
            ->select('id', 'name')
            ->get()
            ->map(function ($type) {
                return [
                    'id' => $type->id,
                    'name' => $type->name
                ];
            });

        return Inertia::render('Admin/PTO/HRPtoDashboardView', [
            'title' => 'PTO Administration Dashboard',
            'stats' => $stats,
            'users' => $users,
            'ptoTypes' => $ptoTypes,
            'overviewUsers' => $overviewUsers,
            'overviewPtoTypes' => $overviewPtoTypes,
            'currentYear' => (int)$currentYear,
            'availableYears' => $availableYears,
        ]);
    }

    /**
     * Get PTO data for a specific user and year using PtoBalance model (matching PtoOverviewController)
     */
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

            // Ensure we don't have negative values - exact same logic as PtoOverviewController
            $totalBalance = max(0, $balance->balance);
            $usedBalance = max(0, $balance->used_balance);
            $pendingBalance = max(0, $balance->pending_balance);
            $availableBalance = max(0, $totalBalance - $pendingBalance - $usedBalance);

            // Calculate assigned balance (what they started with) - same as PtoOverviewController
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

    /**
     * Get user PTO request details for the overview component (from PtoRequestController)
     */
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
            // Get user PTO requests for the specified year
            $userRequests = PtoRequest::with(['ptoType:id,name'])
                ->where('user_id', $userId)
                ->whereYear('start_date', $year)
                ->orderBy('start_date', 'desc')
                ->get()
                ->map(function ($request) {
                    return [
                        'id' => $request->id,
                        'start_date' => $request->start_date,
                        'end_date' => $request->end_date,
                        'total_days' => $request->total_days,
                        'status' => $request->status,
                        'pto_type' => [
                            'name' => $request->ptoType->name,
                        ],
                    ];
                });

            // Get user PTO balances for the specified year - matching PtoOverviewController logic
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

                // Ensure we don't have negative values - exact same logic as PtoOverviewController
                $totalBalance = max(0, $balance->balance);
                $usedBalance = max(0, $balance->used_balance);
                $pendingBalance = max(0, $balance->pending_balance);
                $availableBalance = max(0, $totalBalance - $pendingBalance - $usedBalance);

                // Calculate assigned balance (what they started with) - same as PtoOverviewController
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

            return Inertia::render('Admin/PTO/HRPtoDashboardView', [
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
