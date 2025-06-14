<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoApproval;
use App\Models\PtoModels\PtoRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class DELETEPtoApprovalController extends Controller
{
    /**
     * Get approval dashboard data for the current user.
     */
    public function dashboard(): JsonResponse
    {
        $user = Auth::user();

        // Get requests that need approval from this user
        $requestsNeedingApproval = PtoRequest::with([
            'user:id,name,email',
            'ptoType:id,name,code,color',
            'approvals.approver:id,name,email'
        ])
            ->whereHas('approvals', function ($query) use ($user) {
                $query->where('approver_id', $user->id);
            })
            ->orderBy('submitted_at', 'desc')
            ->get();

        // Also get requests from direct reports for context
        $subordinateRequests = PtoRequest::with([
            'user:id,name,email',
            'ptoType:id,name,code,color',
            'approvals.approver:id,name,email'
        ])
            ->whereHas('user', function ($query) use ($user) {
                $query->where('reports_to_user_id', $user->id);
            })
            ->orderBy('submitted_at', 'desc')
            ->limit(20)
            ->get();

        // Combine and deduplicate
        $allRequests = $requestsNeedingApproval->merge($subordinateRequests)->unique('id');

        return response()->json([
            'data' => $allRequests->values(),
            'meta' => [
                'pending_approval_count' => $requestsNeedingApproval->where('status', 'pending')->count(),
                'total_requests' => $allRequests->count(),
            ]
        ]);
    }

    /**
     * Get all requests that need approval from the current user.
     */
    public function pendingApprovals(): JsonResponse
    {
        $user = Auth::user();

        $requests = PtoRequest::with([
            'user:id,name,email',
            'ptoType:id,name,code,color',
            'approvals.approver:id,name,email'
        ])
            ->whereHas('approvals', function ($query) use ($user) {
                $query->where('approver_id', $user->id)
                    ->where('status', 'pending');
            })
            ->where('status', 'pending')
            ->orderBy('submitted_at', 'asc')
            ->get();

        return response()->json([
            'data' => $requests,
            'meta' => [
                'count' => $requests->count(),
            ]
        ]);
    }

    /**
     * Approve a PTO request.
     */
    public function approve(Request $request, PtoRequest $ptoRequest): JsonResponse
    {
        $request->validate([
            'comments' => 'nullable|string|max:1000'
        ]);

        $currentUser = Auth::user();

        // Find the approval record for the current user
        $approval = PtoApproval::where('pto_request_id', $ptoRequest->id)
            ->where('approver_id', $currentUser->id)
            ->where('status', 'pending')
            ->first();

        if (!$approval) {
            return response()->json([
                'error' => 'You do not have permission to approve this request or it has already been processed.'
            ], 403);
        }

        try {
            // Update the approval record
            $approval->update([
                'status' => 'approved',
                'comments' => $request->comments,
                'responded_at' => now(),
            ]);

            // Check if this completes the approval process
            $this->checkAndCompleteApproval($ptoRequest);

            Log::info("PTO Request {$ptoRequest->id} approved by user {$currentUser->id}");

            return response()->json([
                'message' => 'PTO request approved successfully.',
                'data' => $ptoRequest->load(['approvals.approver'])
            ]);

        } catch (\Exception $e) {
            Log::error("Error approving PTO request {$ptoRequest->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to approve PTO request.'
            ], 500);
        }
    }

    /**
     * Deny a PTO request.
     */
    public function deny(Request $request, PtoRequest $ptoRequest): JsonResponse
    {
        $request->validate([
            'comments' => 'required|string|max:1000'
        ]);

        $currentUser = Auth::user();

        // Find the approval record for the current user
        $approval = PtoApproval::where('pto_request_id', $ptoRequest->id)
            ->where('approver_id', $currentUser->id)
            ->where('status', 'pending')
            ->first();

        if (!$approval) {
            return response()->json([
                'error' => 'You do not have permission to deny this request or it has already been processed.'
            ], 403);
        }

        try {
            // Update the approval record
            $approval->update([
                'status' => 'denied',
                'comments' => $request->comments,
                'responded_at' => now(),
            ]);

            // Deny the entire request
            $ptoRequest->update([
                'status' => 'denied',
                'denial_reason' => $request->comments,
                'denied_at' => now(),
                'denied_by_id' => $currentUser->id,
            ]);

            // Cancel any remaining pending approvals
            PtoApproval::where('pto_request_id', $ptoRequest->id)
                ->where('status', 'pending')
                ->update(['status' => 'cancelled']);

            // Return pending balance to available balance
            $ptoType = $ptoRequest->ptoType;
            if ($ptoType->uses_balance) {
                $balance = \App\Models\PtoModels\PtoBalance::where('user_id', $ptoRequest->user_id)
                    ->where('pto_type_id', $ptoRequest->pto_type_id)
                    ->first();

                if ($balance) {
                    // Remove from pending balance (return to available)
                    $balance->pending_balance = max(0, ($balance->pending_balance ?? 0) - $ptoRequest->total_days);
                    $balance->save();

                    \Log::info("Returned {$ptoRequest->total_days} days to available balance for user {$ptoRequest->user_id} after denial");
                }
            }

            Log::info("PTO Request {$ptoRequest->id} denied by user {$currentUser->id}");

            return response()->json([
                'message' => 'PTO request denied successfully.',
                'data' => $ptoRequest->load(['approvals.approver'])
            ]);

        } catch (\Exception $e) {
            Log::error("Error denying PTO request {$ptoRequest->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to deny PTO request.'
            ], 500);
        }
    }

    /**
     * Check if approval process is complete and update request status.
     */
    private function checkAndCompleteApproval(PtoRequest $ptoRequest): void
    {
        $ptoType = $ptoRequest->ptoType;

        if (!$ptoType->multi_level_approval) {
            // Single level approval - mark as approved and update balance
            $this->completeApprovalAndUpdateBalance($ptoRequest);
            return;
        }

        // Multi-level approval logic
        $allApprovals = PtoApproval::where('pto_request_id', $ptoRequest->id)->get();
        $pendingApprovals = $allApprovals->where('status', 'pending');

        // For now, require all approvals to be completed
        if ($pendingApprovals->isEmpty()) {
            $this->completeApprovalAndUpdateBalance($ptoRequest);
        }
    }

    /**
     * Complete approval and update user's PTO balance.
     */
    private function completeApprovalAndUpdateBalance(PtoRequest $ptoRequest): void
    {
        $ptoRequest->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by_id' => Auth::id(),
        ]);

        // Update the user's PTO balance
        $ptoType = $ptoRequest->ptoType;
        if ($ptoType->uses_balance) {
            $balance = \App\Models\PtoModels\PtoBalance::where('user_id', $ptoRequest->user_id)
                ->where('pto_type_id', $ptoRequest->pto_type_id)
                ->first();

            if ($balance) {
                // Remove from pending balance
                $balance->pending_balance = max(0, ($balance->pending_balance ?? 0) - $ptoRequest->total_days);

                // Deduct from actual balance
                $balance->balance = max(0, $balance->balance - $ptoRequest->total_days);

                // Update used balance
                $balance->used_balance = ($balance->used_balance ?? 0) + $ptoRequest->total_days;

                $balance->save();

                \Log::info("Updated PTO balance for user {$ptoRequest->user_id}: deducted {$ptoRequest->total_days} days, new balance: {$balance->balance}");
            }
        }
    }

    /**
     * Get approval chain for a request.
     */
    public function getApprovalChain(PtoRequest $ptoRequest): JsonResponse
    {
        $approvals = PtoApproval::with(['approver:id,name,email'])
            ->where('pto_request_id', $ptoRequest->id)
            ->orderBy('level')
            ->orderBy('sequence')
            ->get();

        return response()->json([
            'data' => $approvals
        ]);
    }

    /**
     * Get requests that require the current user's approval.
     */
    public function myApprovals(Request $request): JsonResponse
    {
        $user = Auth::user();
        $status = $request->get('status', 'pending');

        $query = PtoRequest::with([
            'user:id,name,email',
            'ptoType:id,name,code,color',
            'approvals.approver:id,name,email'
        ])
            ->whereHas('approvals', function ($q) use ($user, $status) {
                $q->where('approver_id', $user->id);
                if ($status !== 'all') {
                    $q->where('status', $status);
                }
            });

        if ($status === 'pending') {
            $query->where('status', 'pending');
        }

        $requests = $query->orderBy('submitted_at', 'desc')->get();

        return response()->json([
            'data' => $requests,
            'meta' => [
                'count' => $requests->count(),
                'status_filter' => $status,
            ]
        ]);
    }
}
