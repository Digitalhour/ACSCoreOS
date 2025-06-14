<?php

namespace App\Services;

use App\Models\PtoModels\PtoApproval;
use App\Models\PtoModels\PtoRequest;

class ApprovalChainService
{
    /**
     * Create the approval chain for a given PTO request based on its type's rules.
     *
     * @param PtoRequest $ptoRequest The PTO request to generate an approval chain for.
     */
    public function createApprovalChain(PtoRequest $ptoRequest): void
    {
        $ptoType = $ptoRequest->ptoType;
        $requestingUser = $ptoRequest->user;
        $approvers = collect();

        if (!$ptoType->multi_level_approval) {
            // Single-level approval: only the direct manager, if they exist.
            if ($requestingUser->reports_to_user_id) {
                $approvers->push($requestingUser->reports_to_user_id);
            }
        } else {
            // Multi-level approval: apply custom rules.

            // 1. Add hierarchy approver (manager) unless explicitly disabled.
            if (!$ptoType->disable_hierarchy_approval && $requestingUser->reports_to_user_id) {
                $approvers->push($requestingUser->reports_to_user_id);
            }

            // 2. Add any specific approvers defined on the PTO type.
            if (!empty($ptoType->specific_approvers)) {
                foreach ($ptoType->specific_approvers as $approverId) {
                    $approvers->push($approverId);
                }
            }
        }

        // Ensure approvers are unique and the user is not approving their own request.
        $uniqueApproverIds = $approvers->unique()->filter(function ($id) use ($requestingUser) {
            return $id !== $requestingUser->id;
        });

        // If no approvers are found after checking the hierarchy and specific approvers,
        // assign it to a default fallback approver to prevent it from being auto-approved.
        // NOTE: This assumes a user with ID 1 is a system administrator or a designated
        // primary approver. This fallback should be made configurable in a future update.
        if ($uniqueApproverIds->isEmpty()) {
            $fallbackApproverId = 1;
            $uniqueApproverIds->push($fallbackApproverId);
        }

        // Create PtoApproval records for each unique approver.
        // For simplicity, we'll keep them all at the same level for now.
        $level = 1;
        $sequence = 1;
        foreach ($uniqueApproverIds as $approverId) {
            PtoApproval::create([
                'pto_request_id' => $ptoRequest->id,
                'approver_id' => $approverId,
                'status' => 'pending',
                'level' => $level,
                'sequence' => $sequence++,
                'is_required' => true,
            ]);
        }
    }
}
