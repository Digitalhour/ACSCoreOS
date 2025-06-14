<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PtoOverviewController extends Controller
{
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

        return Inertia::render('Admin/PTO/Overview', [
            'users' => $userData,
            'ptoTypes' => $ptoTypes,
            'currentYear' => $year,
            'availableYears' => $availableYears,
            'departments' => $departments,
        ]);
    }
}
