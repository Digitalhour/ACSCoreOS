<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\Position;
use App\Models\PtoModels\PtoBlackout;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PtoBlackoutController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PtoBlackout::with('position');

        // Filter by position if provided
        if ($request->has('position_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('position_id', $request->position_id)
                    ->orWhere('is_company_wide', true);
            });
        }

        // Filter by company-wide if provided
        if ($request->has('is_company_wide')) {
            $query->where('is_company_wide', filter_var($request->is_company_wide, FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by holiday if provided
        if ($request->has('is_holiday')) {
            $query->where('is_holiday', filter_var($request->is_holiday, FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by date range if provided
        if ($request->has('start_date')) {
            $query->where('end_date', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->where('start_date', '<=', $request->end_date);
        }

        $ptoBlackouts = $query->orderBy('start_date', 'asc')->get();
        return response()->json($ptoBlackouts);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'position_id' => 'nullable|exists:positions,id',
            'is_company_wide' => 'boolean',
            'is_holiday' => 'boolean',
            'is_strict' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // If position_id is null and is_company_wide is false, return an error
            if (!$request->position_id && !filter_var($request->is_company_wide ?? false, FILTER_VALIDATE_BOOLEAN)) {
                return response()->json([
                    'error' => 'A blackout must either be company-wide or associated with a position.'
                ], 422);
            }

            // Verify that the position exists if provided
            if ($request->position_id) {
                $position = Position::findOrFail($request->position_id);
            }

            $ptoBlackout = PtoBlackout::create($request->all());

            Log::info("PTO Blackout created: ID {$ptoBlackout->id}, Name: {$ptoBlackout->name}, Start: {$ptoBlackout->start_date}, End: {$ptoBlackout->end_date}");
            return response()->json($ptoBlackout->load('position'), 201);
        } catch (\Exception $e) {
            Log::error("Error creating PTO Blackout: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to create PTO Blackout.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(PtoBlackout $ptoBlackout): JsonResponse
    {
        return response()->json($ptoBlackout->load('position'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PtoBlackout $ptoBlackout): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'position_id' => 'nullable|exists:positions,id',
            'is_company_wide' => 'boolean',
            'is_holiday' => 'boolean',
            'is_strict' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // If position_id is null and is_company_wide is false, return an error
            if (!$request->position_id && !filter_var($request->is_company_wide ?? false, FILTER_VALIDATE_BOOLEAN)) {
                return response()->json([
                    'error' => 'A blackout must either be company-wide or associated with a position.'
                ], 422);
            }

            // Verify that the position exists if provided
            if ($request->position_id) {
                $position = Position::findOrFail($request->position_id);
            }

            $ptoBlackout->update($request->all());

            Log::info("PTO Blackout updated: ID {$ptoBlackout->id}, Name: {$ptoBlackout->name}, Start: {$ptoBlackout->start_date}, End: {$ptoBlackout->end_date}");
            return response()->json($ptoBlackout->load('position'));
        } catch (\Exception $e) {
            Log::error("Error updating PTO Blackout ID {$ptoBlackout->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to update PTO Blackout.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(PtoBlackout $ptoBlackout): JsonResponse
    {
        try {
            $ptoBlackoutName = $ptoBlackout->name;
            $ptoBlackoutId = $ptoBlackout->id;
            $ptoBlackout->delete();

            Log::info("PTO Blackout deleted: ID {$ptoBlackoutId}, Name: {$ptoBlackoutName}");
            return response()->json(['message' => "PTO Blackout '{$ptoBlackoutName}' deleted successfully."], 200);
        } catch (\Exception $e) {
            Log::error("Error deleting PTO Blackout ID {$ptoBlackout->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to delete PTO Blackout.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Check if a date range overlaps with any blackout periods for a user.
     */
    public function checkOverlap(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $user = \App\Models\User::findOrFail($request->user_id);
            $positionId = $user->position_id;

            // Get blackouts that overlap with the date range and are either company-wide or for the user's position
            $overlappingBlackouts = PtoBlackout::where(function ($query) use ($positionId) {
                $query->where('position_id', $positionId)
                    ->orWhere('is_company_wide', true);
            })
                ->where(function ($query) use ($request) {
                    $query->where('start_date', '<=', $request->end_date)
                        ->where('end_date', '>=', $request->start_date);
                })
                ->get();

            $hasStrictBlackout = $overlappingBlackouts->contains('is_strict', true);

            return response()->json([
                'overlaps' => $overlappingBlackouts->count() > 0,
                'has_strict_blackout' => $hasStrictBlackout,
                'blackouts' => $overlappingBlackouts,
            ]);
        } catch (\Exception $e) {
            Log::error("Error checking blackout overlap: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to check blackout overlap.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Get holidays for a specific year.
     */
    public function getHolidays(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'year' => 'required|integer|min:2000|max:2100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $year = $request->year;
            $startDate = Carbon::createFromDate($year, 1, 1)->startOfDay();
            $endDate = Carbon::createFromDate($year, 12, 31)->endOfDay();

            $holidays = PtoBlackout::where('is_holiday', true)
                ->where(function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('start_date', [$startDate, $endDate])
                        ->orWhereBetween('end_date', [$startDate, $endDate])
                        ->orWhere(function ($query) use ($startDate, $endDate) {
                            $query->where('start_date', '<=', $startDate)
                                ->where('end_date', '>=', $endDate);
                        });
                })
                ->orderBy('start_date', 'asc')
                ->get();

            return response()->json($holidays);
        } catch (\Exception $e) {
            Log::error("Error getting holidays for year {$request->year}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to get holidays.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }
}
