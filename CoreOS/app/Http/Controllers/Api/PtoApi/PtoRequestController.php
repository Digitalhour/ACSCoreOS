<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoApproval;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoType;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PtoRequestController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PtoRequest::with(['user', 'ptoType', 'approvals.approver']);

        // Filter by user if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by PTO type if provided
        if ($request->has('pto_type_id')) {
            $query->where('pto_type_id', $request->pto_type_id);
        }

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range if provided
        if ($request->has('start_date')) {
            $query->where('start_date', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->where('end_date', '<=', $request->end_date);
        }

        $ptoRequests = $query->orderBy('created_at', 'desc')->get();

        // Add cancellation info to each request
        $ptoRequests->transform(function ($request) {
//            $request->can_be_cancelled = $request->canBeCancelled();
//            $request->hours_until_start = $request->hoursUntilStart();
            return $request;
        });

        return response()->json($ptoRequests);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pto_type_id' => 'required|exists:pto_types,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_time' => 'nullable|in:full_day,morning,afternoon',
            'end_time' => 'nullable|in:full_day,morning,afternoon',
            'total_days' => 'nullable|numeric|min:0.5',
            'day_options' => 'nullable|array',
            'reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $user = Auth::user(); // Get current authenticated user
            $userId = $user->id;

            // Generate a unique request number to satisfy the NOT NULL constraint.
            $requestNumber = 'PTO-U' . $userId . '-' . time();

            // Use the frontend calculated total days if provided, otherwise calculate
            $totalDays = $request->total_days ?? $this->calculateTotalDays(
                $request->start_date,
                $request->end_date,
                $request->start_time ?? 'full_day',
                $request->end_time ?? 'full_day'
            );

            // Check if the user has enough balance
            $ptoType = PtoType::findOrFail($request->pto_type_id);
            if ($ptoType->uses_balance) {
                $balance = PtoBalance::where('user_id', $userId)
                    ->where('pto_type_id', $request->pto_type_id)
                    ->first();

                if (!$balance) {
                    return response()->json([
                        'error' => 'No PTO balance found for this PTO type.'
                    ], 422);
                }

                // Calculate available balance (current balance minus pending requests)
                $pendingTotal = PtoRequest::where('user_id', $userId)
                    ->where('pto_type_id', $request->pto_type_id)
                    ->where('status', 'pending')
                    ->sum('total_days');

                $availableBalance = $balance->balance - $pendingTotal;

                if ($availableBalance < $totalDays && !$ptoType->negative_allowed) {
                    return response()->json([
                        'error' => 'Insufficient PTO balance.',
                        'available' => (float) $availableBalance,
                        'current_balance' => (float) $balance->balance,
                        'pending_requests' => (float) $pendingTotal,
                        'requested' => $totalDays
                    ], 422);
                }
            }

            // Create the request
            $ptoRequest = new PtoRequest([
                'user_id' => $userId,
                'request_number' => $requestNumber,
                'pto_type_id' => $request->pto_type_id,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'start_time' => $request->start_time ?? 'full_day',
                'end_time' => $request->end_time ?? 'full_day',
                'total_days' => $totalDays,
                'reason' => $request->reason,
                'status' => 'pending',
                'requires_multi_level_approval' => $ptoType->multi_level_approval ?? false,
            ]);

            $ptoRequest->save();

            // Create approval chain using the service
            $approvalService = new \App\Services\ApprovalChainService();
            $approvalService->createApprovalChain($ptoRequest);

            // Update the user's pending balance (simplified for now)
            if ($ptoType->uses_balance && $balance) {
                $balance->pending_balance = ($balance->pending_balance ?? 0) + $totalDays;
                $balance->save();
            }

            Log::info("PTO Request created: ID {$ptoRequest->id}, User: {$user->name}, Days: {$totalDays}");
            return response()->json([
                'data' => $ptoRequest->load(['user', 'ptoType', 'approvals.approver']),
                'message' => 'PTO request submitted successfully.'
            ], 201);
        } catch (\Exception $e) {
            Log::error("Error creating PTO Request: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to create PTO Request.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(PtoRequest $ptoRequest): JsonResponse
    {
        return response()->json($ptoRequest->load(['user', 'ptoType', 'approvals.approver']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PtoRequest $ptoRequest): JsonResponse
    {
        // Only allow updates if the request is pending
        if ($ptoRequest->status !== 'pending') {
            return response()->json([
                'error' => 'Cannot update a PTO request that is not pending.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_time' => 'required|in:full_day,morning,afternoon',
            'end_time' => 'required|in:full_day,morning,afternoon',
            'reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Calculate new total days
            $newTotalDays = $this->calculateTotalDays(
                $request->start_date,
                $request->end_date,
                $request->start_time,
                $request->end_time
            );

            // Check if the user has enough balance for the new total
            $ptoType = $ptoRequest->ptoType;
            if ($ptoType->uses_balance) {
                $balance = PtoBalance::where('user_id', $ptoRequest->user_id)
                    ->where('pto_type_id', $ptoRequest->pto_type_id)
                    ->where('year', Carbon::parse($request->start_date)->year)
                    ->first();

                // Adjust for the existing pending balance
                $adjustedBalance = $balance->balance + $ptoRequest->total_days;

                if ($adjustedBalance < $newTotalDays && !$ptoType->negative_allowed) {
                    return response()->json([
                        'error' => 'Insufficient PTO balance.',
                        'available' => $adjustedBalance,
                        'requested' => $newTotalDays
                    ], 422);
                }
            }

            // Update the pending balance
            if ($ptoType->uses_balance) {
                $balance->subtractPendingBalance($ptoRequest->total_days);
                $balance->addPendingBalance($newTotalDays, $ptoRequest);
            }

            // Update the request
            $ptoRequest->start_date = $request->start_date;
            $ptoRequest->end_date = $request->end_date;
            $ptoRequest->start_time = $request->start_time;
            $ptoRequest->end_time = $request->end_time;
            $ptoRequest->total_days = $newTotalDays;
            $ptoRequest->reason = $request->reason;
            $ptoRequest->save();

            Log::info("PTO Request updated: ID {$ptoRequest->id}, User: {$ptoRequest->user->name}, Days: {$newTotalDays}");
            return response()->json($ptoRequest->load(['user', 'ptoType', 'approvals.approver']));
        } catch (\Exception $e) {
            Log::error("Error updating PTO Request ID {$ptoRequest->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to update PTO Request.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Cancel a PTO request by an authorized user (admin/manager).
     */
    public function cancel(PtoRequest $ptoRequest): JsonResponse
    {
        // Only allow cancellation if the request is pending
        if ($ptoRequest->status !== 'pending') {
            return response()->json([
                'error' => 'Cannot cancel a PTO request that is not pending.'
            ], 422);
        }

        try {
            // Update the pending balance
            $ptoType = $ptoRequest->ptoType;
            if ($ptoType->uses_balance) {
                $balance = PtoBalance::where('user_id', $ptoRequest->user_id)
                    ->where('pto_type_id', $ptoRequest->pto_type_id)
                    ->where('year', Carbon::parse($ptoRequest->start_date)->year)
                    ->first();

                $balance->subtractPendingBalance($ptoRequest->total_days);
            }

            // Update the request status
            $ptoRequest->status = 'cancelled';
            $ptoRequest->save();

            Log::info("PTO Request cancelled: ID {$ptoRequest->id}, User: {$ptoRequest->user->name}");
            return response()->json(['message' => 'PTO request cancelled successfully.']);
        } catch (\Exception $e) {
            Log::error("Error cancelling PTO Request ID {$ptoRequest->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to cancel PTO Request.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Cancel user's own PTO request.
     */
    public function cancelOwnRequest(PtoRequest $ptoRequest): JsonResponse
    {
        $currentUser = Auth::user();

        // Check if the user owns this request
        if ($ptoRequest->user_id !== $currentUser->id) {
            return response()->json([
                'error' => 'You can only cancel your own PTO requests.'
            ], 403);
        }

        // Allow cancellation if pending OR approved within 24 hours of start date
        $canCancel = false;
        $reason = '';

        if ($ptoRequest->status === 'pending') {
            $canCancel = true;
            $reason = 'pending request';
        } elseif ($ptoRequest->status === 'approved') {
            $startDateTime = Carbon::parse($ptoRequest->start_date)->startOfDay();
            $hoursUntilStart = Carbon::now()->diffInHours($startDateTime, false);

            if ($hoursUntilStart >= 24) {
                $canCancel = true;
                $reason = 'approved request with 24+ hours notice';
            } else {
                return response()->json([
                    'error' => 'You can only cancel approved requests with at least 24 hours notice before the start date.'
                ], 422);
            }
        } else {
            return response()->json([
                'error' => 'You can only cancel pending or approved PTO requests.'
            ], 422);
        }

        try {
            // Update the balance based on current status
            $ptoType = $ptoRequest->ptoType;
            if ($ptoType->uses_balance) {
                $balance = PtoBalance::where('user_id', $ptoRequest->user_id)
                    ->where('pto_type_id', $ptoRequest->pto_type_id)
                    ->first();

                if ($balance) {
                    if ($ptoRequest->status === 'pending') {
                        // Remove from pending balance (return to available)
                        $balance->pending_balance = max(0, ($balance->pending_balance ?? 0) - $ptoRequest->total_days);
                        $balance->save();
                        Log::info("Returned {$ptoRequest->total_days} pending days to available balance for user {$ptoRequest->user_id}");
                    } elseif ($ptoRequest->status === 'approved') {
                        // Return used days back to balance
                        $balance->balance = $balance->balance + $ptoRequest->total_days;
                        $balance->used_balance = max(0, ($balance->used_balance ?? 0) - $ptoRequest->total_days);
                        $balance->save();
                        Log::info("Returned {$ptoRequest->total_days} used days to balance for user {$ptoRequest->user_id} after cancelling approved request");
                    }
                }
            }

            // When a user cancels a request, the pending approval steps are no longer needed.
            // Deleting them is the cleanest way to handle this without violating the
            // 'status' CHECK constraint on the pto_approvals table.
            PtoApproval::where('pto_request_id', $ptoRequest->id)
                ->where('status', 'pending')
                ->delete();

            // Update the request status
            $ptoRequest->update([
                'status' => 'cancelled',
                'reason' => 'Cancelled by the user ' . Auth::user()->name, // Using cancellation_reason field
                'deleted_at' => now(),
            ]);

            Log::info("PTO Request self-cancelled: ID {$ptoRequest->id}, User: {$currentUser->name}");

            return response()->json([
                'message' => 'PTO request cancelled successfully.',
                'data' => $ptoRequest->load(['user', 'ptoType', 'approvals.approver'])
            ]);
        } catch (\Exception $e) {
            Log::error("Error self-cancelling PTO Request ID {$ptoRequest->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to cancel PTO request.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Approve a PTO request.
     */
    public function approve(Request $request, PtoRequest $ptoRequest): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'comments' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Get the current user (approver)
            $approver = Auth::user();

            // Find the approval record for this approver
            $approval = PtoApproval::where('pto_request_id', $ptoRequest->id)
                ->where('approver_id', $approver->id)
                ->where('status', 'pending')
                ->first();

            if (!$approval) {
                return response()->json([
                    'error' => 'No pending approval found for this request and approver.'
                ], 422);
            }

            // Approve the request
            $approval->approve($request->comments);

            // Check if all required approvals are complete
            $pendingApprovals = PtoApproval::where('pto_request_id', $ptoRequest->id)
                ->where('status', 'pending')
                ->count();

            if ($pendingApprovals === 0) {
                // All approvals are complete, update the request status
                $ptoRequest->status = 'approved';
                $ptoRequest->save();

                // Update the user's balance
                $ptoType = $ptoRequest->ptoType;
                if ($ptoType->uses_balance) {
                    $balance = PtoBalance::where('user_id', $ptoRequest->user_id)
                        ->where('pto_type_id', $ptoRequest->pto_type_id)
                        ->where('year', Carbon::parse($ptoRequest->start_date)->year)
                        ->first();

                    $balance->subtractPendingBalance($ptoRequest->total_days);
                    $balance->subtractBalance($ptoRequest->total_days, "PTO Request #{$ptoRequest->id}");
                }
            }

            Log::info("PTO Request approval: ID {$ptoRequest->id}, Approver: {$approver->name}, Status: approved");
            return response()->json(['message' => 'PTO request approved successfully.']);
        } catch (\Exception $e) {
            Log::error("Error approving PTO Request ID {$ptoRequest->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to approve PTO Request.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Deny a PTO request.
     */
    public function deny(Request $request, PtoRequest $ptoRequest): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'comments' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Get the current user (approver)
            $approver = Auth::user();

            // Find the approval record for this approver
            $approval = PtoApproval::where('pto_request_id', $ptoRequest->id)
                ->where('approver_id', $approver->id)
                ->where('status', 'pending')
                ->first();

            if (!$approval) {
                return response()->json([
                    'error' => 'No pending approval found for this request and approver.'
                ], 422);
            }

            // Deny the request
            $approval->deny($request->comments);

            // Update the request status
            $ptoRequest->status = 'denied';
            $ptoRequest->denial_reason = $request->comments;
            $ptoRequest->save();

            // Update the user's pending balance
            $ptoType = $ptoRequest->ptoType;
            if ($ptoType->uses_balance) {
                $balance = PtoBalance::where('user_id', $ptoRequest->user_id)
                    ->where('pto_type_id', $ptoRequest->pto_type_id)
                    ->where('year', Carbon::parse($ptoRequest->start_date)->year)
                    ->first();

                $balance->subtractPendingBalance($ptoRequest->total_days);
            }

            Log::info("PTO Request denial: ID {$ptoRequest->id}, Approver: {$approver->name}, Reason: {$request->comments}");
            return response()->json(['message' => 'PTO request denied successfully.']);
        } catch (\Exception $e) {
            Log::error("Error denying PTO Request ID {$ptoRequest->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to deny PTO Request.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Calculate the total number of days for a PTO request.
     */
    private function calculateTotalDays(string $startDate, string $endDate, string $startTime, string $endTime): float
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        // If it's the same day
        if ($start->isSameDay($end)) {
            if ($startTime === 'full_day' && $endTime === 'full_day') {
                return 1.0;
            } elseif (($startTime === 'morning' && $endTime === 'morning') ||
                ($startTime === 'afternoon' && $endTime === 'afternoon')) {
                return 0.5;
            } elseif ($startTime === 'morning' && $endTime === 'afternoon') {
                return 1.0;
            } else {
                // Invalid combination
                return 0.0;
            }
        }

        // Multiple days
        $totalDays = 0.0;

        // First day
        if ($startTime === 'full_day') {
            $totalDays += 1.0;
        } elseif ($startTime === 'morning') {
            $totalDays += 1.0;
        } elseif ($startTime === 'afternoon') {
            $totalDays += 0.5;
        }

        // Days in between (all full days)
        $current = $start->copy()->addDay();
        while ($current->lt($end)) {
            if (!$current->isWeekend()) {
                $totalDays += 1.0;
            }
            $current->addDay();
        }

        // Last day
        if ($endTime === 'full_day') {
            $totalDays += 1.0;
        } elseif ($endTime === 'morning') {
            $totalDays += 0.5;
        } elseif ($endTime === 'afternoon') {
            $totalDays += 1.0;
        }

        return $totalDays;
    }
}
