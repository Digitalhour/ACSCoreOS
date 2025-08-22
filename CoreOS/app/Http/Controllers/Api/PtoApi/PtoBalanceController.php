<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PtoBalanceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PtoBalance::with(['user', 'ptoType']);

        // Filter by user if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by PTO type if provided
        if ($request->has('pto_type_id')) {
            $query->where('pto_type_id', $request->pto_type_id);
        }

        // Filter by year if provided
        if ($request->has('year')) {
            $query->where('year', $request->year);
        } else {
            // Default to current year
            $query->where('year', Carbon::now()->year);
        }

        $ptoBalances = $query->get();
        return response()->json($ptoBalances);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'pto_type_id' => 'required|exists:pto_types,id',
            'balance' => 'required|numeric|min:0',
            'year' => 'required|integer|min:2000|max:2100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Check if a balance already exists for this user, PTO type, and year
            $existingBalance = PtoBalance::where('user_id', $request->user_id)
                ->where('pto_type_id', $request->pto_type_id)
                ->where('year', $request->year)
                ->first();

            if ($existingBalance) {
                return response()->json([
                    'error' => 'A balance already exists for this user, PTO type, and year.'
                ], 422);
            }

            // Verify that the user and PTO type exist
            $user = User::findOrFail($request->user_id);
            $ptoType = PtoType::findOrFail($request->pto_type_id);

            $ptoBalance = PtoBalance::create([
                'user_id' => $request->user_id,
                'pto_type_id' => $request->pto_type_id,
                'balance' => $request->balance,
                'pending_balance' => 0,
                'used_balance' => 0,
                'year' => $request->year,
            ]);

            // Create a transaction record for this initial balance
            $ptoBalance->addBalance($request->balance, 'Initial balance');

            Log::info("PTO Balance created: ID {$ptoBalance->id}, User: {$user->name}, Type: {$ptoType->name}, Balance: {$request->balance}");
            return response()->json($ptoBalance->load(['user', 'ptoType']), 201);
        } catch (\Exception $e) {
            Log::error("Error creating PTO Balance: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to create PTO Balance.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(PtoBalance $ptoBalance): JsonResponse
    {
        return response()->json($ptoBalance->load(['user', 'ptoType']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PtoBalance $ptoBalance): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'balance' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $oldBalance = $ptoBalance->balance;
            $newBalance = $request->balance;
            $difference = $newBalance - $oldBalance;

            if ($difference != 0) {
                // Update the balance
                $ptoBalance->balance = $newBalance;
                $ptoBalance->save();

                // Create a transaction record for this adjustment
                $ptoBalance->addBalance($difference, 'Manual balance adjustment');
            }

            Log::info("PTO Balance updated: ID {$ptoBalance->id}, User: {$ptoBalance->user->name}, Type: {$ptoBalance->ptoType->name}, New Balance: {$newBalance}");
            return response()->json($ptoBalance->load(['user', 'ptoType']));
        } catch (\Exception $e) {
            Log::error("Error updating PTO Balance ID {$ptoBalance->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to update PTO Balance.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Reset balances for a new year.
     */
    public function resetForNewYear(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'year' => 'required|integer|min:2000|max:2100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $year = $request->year;
            $previousYear = $year - 1;

            // Get all users with PTO balances from the previous year
            $previousBalances = PtoBalance::where('year', $previousYear)->get();
            $resetCount = 0;

            foreach ($previousBalances as $previousBalance) {
                // Check if a balance already exists for the new year
                $existingBalance = PtoBalance::where('user_id', $previousBalance->user_id)
                    ->where('pto_type_id', $previousBalance->pto_type_id)
                    ->where('year', $year)
                    ->first();

                if ($existingBalance) {
                    continue; // Skip if a balance already exists
                }

                // Get the PTO type
                $ptoType = $previousBalance->ptoType;

                // Get the user's policy for this PTO type
                $policy = $previousBalance->user->ptoPolicies()
                    ->where('pto_type_id', $ptoType->id)
                    ->first();

                if (!$policy) {
                    continue; // Skip if no policy is found
                }

                // Calculate the new balance
                $newBalance = $policy->annual_accrual_amount;

                // Add bonus days based on tenure
                $userStartDate = $previousBalance->user->profile->start_date ?? null;
                if ($userStartDate) {
                    $yearsOfService = Carbon::parse($userStartDate)->diffInYears(Carbon::createFromDate($year, 1, 1));
                    $newBalance += ($policy->bonus_days_per_year * $yearsOfService);
                }

                // Add rollover if enabled
                if ($policy->rollover_enabled && $ptoType->carryover_allowed) {
                    $rolloverAmount = min(
                        $previousBalance->balance,
                        $policy->max_rollover_days ?? $previousBalance->balance
                    );
                    $newBalance += $rolloverAmount;
                }

                // Create the new balance
                $ptoBalance = PtoBalance::create([
                    'user_id' => $previousBalance->user_id,
                    'pto_type_id' => $previousBalance->pto_type_id,
                    'balance' => $newBalance,
                    'pending_balance' => 0,
                    'used_balance' => 0,
                    'year' => $year,
                ]);

                // Create a transaction record for this reset
                $ptoBalance->addBalance($newBalance, "Annual reset for {$year}");

                $resetCount++;
            }

            Log::info("PTO Balances reset for year {$year}: {$resetCount} balances created");
            return response()->json(['message' => "{$resetCount} PTO balances reset for year {$year}"]);
        } catch (\Exception $e) {
            Log::error("Error resetting PTO Balances for year {$request->year}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to reset PTO Balances.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Get a user's PTO balance summary.
     */
    public function getUserBalanceSummary(Request $request, User $user): JsonResponse
    {
        try {
            $year = $request->year ?? Carbon::now()->year;

            $balances = PtoBalance::with('ptoType')
                ->where('user_id', $user->id)
                ->where('year', $year)
                ->get();

            $summary = [];
            foreach ($balances as $balance) {
                $summary[] = [
                    'pto_type' => $balance->ptoType->name,
                    'balance' => $balance->balance,
                    'pending_balance' => $balance->pending_balance,
                    'used_balance' => $balance->used_balance,
                    'available_balance' => $balance->balance - $balance->used_balance - $balance->pending_balance,
                    'year' => $balance->year,
                ];
            }

            return response()->json($summary);
        } catch (\Exception $e) {
            Log::error("Error getting PTO Balance summary for User ID {$user->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to get PTO Balance summary.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }
}
