<?php

namespace App\Http\Controllers;

use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoApproval;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PtoApprovalController extends Controller
{
    public function dashboard()
    {
        $user = Auth::user();

        // Get all PTO requests where current user is an approver
        $requests = PtoRequest::with([
            'user:id,name,email',
            'ptoType:id,name,code,color',
            'approvals.approver:id,name,email'
        ])
            ->whereHas('approvals', function($query) use ($user) {
                $query->where('approver_id', $user->id);
            })
            ->orderBy('submitted_at', 'desc')
            ->get()
            ->map(function ($request) {
                return [
                    'id' => $request->id,
                    'request_number' => $request->request_number,
                    'user' => $request->user,
                    'pto_type' => $request->ptoType,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'total_days' => $request->total_days,
                    'reason' => $request->reason,
                    'status' => $request->status,
                    'submitted_at' => $request->submitted_at,
                    'requires_multi_level_approval' => $request->requires_multi_level_approval,
                    'approvals' => $request->approvals->map(function ($approval) {
                        return [
                            'id' => $approval->id,
                            'approver' => $approval->approver,
                            'status' => $approval->status,
                            'comments' => $approval->comments,
                            'level' => $approval->level,
                            'sequence' => $approval->sequence,
                            'responded_at' => $approval->responded_at,
                        ];
                    })->toArray(),
                ];
            });

        return Inertia::render('PtoMangerDashboard', [
            'requests' => $requests,
        ]);
    }

    public function approve(Request $request, PtoRequest $ptoRequest)
    {
        $request->validate([
            'comments' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();

        // Find the current user's pending approval for this request
        $approval = PtoApproval::where('pto_request_id', $ptoRequest->id)
            ->where('approver_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if (!$approval) {
            return back()->with('error', 'You are not authorized to approve this request or it has already been processed.');
        }

        DB::transaction(function () use ($approval, $request, $ptoRequest) {
            // Update the approval
            $approval->update([
                'status' => 'approved',
                'comments' => $request->comments,
                'responded_at' => now(),
            ]);

            // Check if this is the final approval needed
            $pendingApprovals = PtoApproval::where('pto_request_id', $ptoRequest->id)
                ->where('status', 'pending')
                ->count();

            // If no more pending approvals, approve the entire request
            if ($pendingApprovals === 0) {
                $ptoRequest->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                ]);
            }
        });

        return back()->with('success', 'Request approved successfully!');
    }

    public function deny(Request $request, PtoRequest $ptoRequest)
    {
        $request->validate([
            'comments' => 'required|string|max:1000',
        ]);

        $user = Auth::user();

        // Find the current user's pending approval for this request
        $approval = PtoApproval::where('pto_request_id', $ptoRequest->id)
            ->where('approver_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if (!$approval) {
            return back()->with('error', 'You are not authorized to deny this request or it has already been processed.');
        }

        DB::transaction(function () use ($approval, $request, $ptoRequest) {
            // Update the approval
            $approval->update([
                'status' => 'denied',
                'comments' => $request->comments,
                'responded_at' => now(),
            ]);

            // Deny the entire request (one denial stops the chain)
            $ptoRequest->update([
                'status' => 'denied',
                'denied_at' => now(),
            ]);
        });

        return back()->with('success', 'Request denied successfully!');
    }
}
