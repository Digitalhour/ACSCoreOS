<?php

namespace App\Http\Controllers\Api\PtoApi;
use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoType;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;


class PTOSubmitHistoricalController extends Controller

{

    public function submitHistoricalPto(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'pto_type_id' => 'required|exists:pto_types,id',
            'start_date' => 'required|date|before_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date|before_or_equal:today',
            'reason' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();
        try {
            // Calculate total days (excluding weekends)
            $startDate = Carbon::parse($validated['start_date']);
            $endDate = Carbon::parse($validated['end_date']);
            $totalDays = 0;

            $current = $startDate->copy();
            while ($current->lte($endDate)) {
                if (!$current->isWeekend()) {
                    $totalDays++;
                }
                $current->addDay();
            }

            // Generate historical PTO request number
            $requestNumber = 'PTO-HISTORICAL-U' . $validated['user_id'] . '-' . time();


            // Create the PTO request with the historical request number
            $ptoRequest = PtoRequest::create([
                'request_number' => $requestNumber,
                'user_id' => $validated['user_id'],
                'pto_type_id' => $validated['pto_type_id'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'total_days' => $totalDays,
                'reason' => $validated['reason'] ?? '',
                'status' => 'approved',
                'submitted_at' => now(),
                'approved_at' => now(),
                'approved_by_id' => auth()->id(),
            ]);


            // Get the PTO type to check if it uses balance
            $ptoType = PtoType::find($validated['pto_type_id']);

            if ($ptoType && $ptoType->uses_balance) {
                // Find or create the user's PTO balance for this type and year
                $year = Carbon::parse($validated['start_date'])->year;
                $ptoBalance = PtoBalance::firstOrCreate(
                    [
                        'user_id' => $validated['user_id'],
                        'pto_type_id' => $validated['pto_type_id'],
                        'year' => $year,
                    ],
                    [
                        'balance' => 0,
                        'pending_balance' => 0,
                        'used_balance' => 0,
                    ]
                );



                // Deduct the balance using the model method
                $ptoTransaction = $ptoBalance->subtractBalance(
                    $totalDays,
                    'Historical PTO taken - ' . ($validated['reason'] ?: 'No reason provided'),
                    auth()->user()
                );

                // Link the transaction to the PTO request
                $ptoTransaction->update(['pto_request_id' => $ptoRequest->id]);


            } else {
                Log::info('PTO type does not use balance, skipping balance deduction');
            }

            DB::commit();




        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error submitting historical PTO request', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $validated,
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit historical PTO request: ' . $e->getMessage()
            ], 500);
        }
    }


}
