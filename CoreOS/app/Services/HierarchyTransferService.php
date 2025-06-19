<?php

namespace App\Services;

use App\Models\PtoModels\PtoApproval;
use App\Models\PtoModels\PtoRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HierarchyTransferService
{
    /**
     * Transfer only pending approvals when a user's manager changes
     */
    public function transferPendingApprovalsOnManagerChange(User $user, ?int $oldManagerId, ?int $newManagerId): array
    {
        if (!$newManagerId) {
            return ['transferred' => 0];
        }

        try {
            $processedCount = 0;

            // Process this user's pending requests
            $processedCount += $this->processUserManagerChange($user->id, $oldManagerId, $newManagerId);

            // Process subordinates' pending requests
            $subordinateIds = User::where('reports_to_user_id', $user->id)->pluck('id');
            foreach ($subordinateIds as $subordinateId) {
                $processedCount += $this->processUserManagerChange($subordinateId, $oldManagerId, $newManagerId);
            }

            Log::info("Processed {$processedCount} approval records when manager changed from {$oldManagerId} to {$newManagerId} for user {$user->id}");

            return ['transferred' => $processedCount];

        } catch (\Exception $e) {
            Log::error("Error processing manager change for user {$user->id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Process manager change for a specific user's PTO requests
     */
    private function processUserManagerChange(int $userId, ?int $oldManagerId, int $newManagerId): int
    {
        return DB::transaction(function () use ($userId, $oldManagerId, $newManagerId) {
            $processedCount = 0;

            // Get all pending PTO requests for this user
            $pendingRequests = PtoRequest::where('user_id', $userId)
                ->where('status', 'pending')
                ->with('approvals')
                ->get();

            foreach ($pendingRequests as $request) {
                if ($oldManagerId) {
                    // Case 1: Transfer existing approval from old manager to new manager
                    $updated = PtoApproval::where('pto_request_id', $request->id)
                        ->where('approver_id', $oldManagerId)
                        ->where('status', 'pending')
                        ->update(['approver_id' => $newManagerId]);

                    $processedCount += $updated;
                } else {
                    // Case 2: No previous manager - create new approval record
                    $existingApproval = PtoApproval::where('pto_request_id', $request->id)
                        ->where('approver_id', $newManagerId)
                        ->first();

                    if (!$existingApproval) {
                        // Determine the appropriate level
                        $maxLevel = $request->approvals()->max('level') ?? 0;
                        $level = max(1, $maxLevel + 1);

                        PtoApproval::create([
                            'pto_request_id' => $request->id,
                            'approver_id' => $newManagerId,
                            'status' => 'pending',
                            'level' => $level,
                            'sequence' => $level,
                        ]);

                        $processedCount++;
                    }
                }

                // Ensure the new manager is in the approval chain
                $this->ensureManagerInApprovalChain($request, $newManagerId);
            }

            return $processedCount;
        });
    }

    /**
     * Ensure the manager is properly set up in the approval chain
     */
    private function ensureManagerInApprovalChain(PtoRequest $request, int $managerId): void
    {
        $hasManagerApproval = PtoApproval::where('pto_request_id', $request->id)
            ->where('approver_id', $managerId)
            ->exists();

        if (!$hasManagerApproval) {
            $maxLevel = PtoApproval::where('pto_request_id', $request->id)->max('level') ?? 0;
            $level = $maxLevel + 1;

            PtoApproval::create([
                'pto_request_id' => $request->id,
                'approver_id' => $managerId,
                'status' => 'pending',
                'level' => $level,
                'sequence' => $level,
            ]);
        }
    }

    /**
     * Transfer all pending approvals from one user to another (for position changes)
     */
    public function transferAllPendingApprovals(int $fromUserId, int $toUserId): array
    {
        try {
            $updated = PtoApproval::where('approver_id', $fromUserId)
                ->where('status', 'pending')
                ->update(['approver_id' => $toUserId]);

            Log::info("Transferred {$updated} pending approvals from user {$fromUserId} to {$toUserId}");

            return ['transferred' => $updated];

        } catch (\Exception $e) {
            Log::error("Error transferring pending approvals from {$fromUserId} to {$toUserId}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get summary of pending approvals that would be affected
     */
    public function getPendingApprovalsSummary(User $user): array
    {
        $affectedUserIds = $this->getAffectedUserIds($user);

        $pendingApprovals = PtoApproval::whereHas('ptoRequest', function($query) use ($affectedUserIds) {
            $query->whereIn('user_id', $affectedUserIds)
                ->where('status', 'pending');
        })
            ->where('status', 'pending')
            ->with(['ptoRequest.user', 'approver'])
            ->get();

        return [
            'total_pending_approvals' => $pendingApprovals->count(),
            'affected_requests' => $pendingApprovals->pluck('pto_request_id')->unique()->count(),
            'affected_users' => $affectedUserIds,
        ];
    }

    /**
     * Get user IDs that would be affected by this user's hierarchy change
     */
    private function getAffectedUserIds(User $user): array
    {
        $userIds = [$user->id];

        // Add direct reports
        $directReports = User::where('reports_to_user_id', $user->id)->pluck('id')->toArray();
        $userIds = array_merge($userIds, $directReports);

        return array_unique($userIds);
    }
}
