<?php

namespace App\Http\Controllers;

use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoApproval;
use App\Models\PtoModels\PtoType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DepartmentTimeOffController extends Controller
{
    public function dashboard()
    {
        $user = Auth::user();
        $currentYear = Carbon::now()->year;

        // Debug: Check if user has any approval records
        $approvalCount = PtoApproval::where('approver_id', $user->id)->count();
        \Log::info("User {$user->id} has {$approvalCount} approval records");

        // Get all PTO requests where current user is an approver OR the requester
        $requests = PtoRequest::with([
            'user:id,name,email',
            'ptoType:id,name,code,color,multi_level_approval',
            'approvals.approver:id,name,email'
        ])
            ->where(function($query) use ($user) {
                $query->whereHas('approvals', function($subQuery) use ($user) {
                    $subQuery->where('approver_id', $user->id);
                })->orWhere('user_id', $user->id);
            })
            ->orderBy('submitted_at', 'desc')
            ->get();

        \Log::info("Found {$requests->count()} requests for user {$user->id}");

        $mappedRequests = $requests->map(function ($request) {
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
                'requires_multi_level_approval' => $request->ptoType->multi_level_approval ?? false,
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

        // Get department PTO requests for calendar
        $departmentPtoRequests = $this->getDepartmentPtoRequests($user, $currentYear);

        return Inertia::render('DepartmentTimeOffDashboard', [
            'requests' => $mappedRequests,
            'department_pto_requests' => $departmentPtoRequests,
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

    /**
     * Get department PTO requests for calendar view.
     */
    private function getDepartmentPtoRequests($user, int $year): array
    {
        // Get users from the same departments as the approver
        $departmentUserIds = DB::table('department_user')
            ->whereIn('department_id', function ($query) use ($user) {
                $query->select('department_id')
                    ->from('department_user')
                    ->where('user_id', $user->id);
            })
            ->pluck('user_id')
            ->toArray();

        // Get PTO type IDs that should be shown in department calendar
        $showablePtoTypeIds = PtoType::where('show_in_department_calendar', 1)
            ->where('is_active', 1)
            ->pluck('id')
            ->toArray();

        // Get department PTO requests
        $allRequests = PtoRequest::with(['user', 'ptoType'])
            ->whereIn('user_id', $departmentUserIds)
            ->whereIn('status', ['approved', 'pending'])
            ->whereIn('pto_type_id', $showablePtoTypeIds)
            ->whereYear('start_date', $year)
            ->get();

        return $allRequests->map(function ($request) {
            return [
                'id' => $request->id,
                'user' => [
                    'id' => $request->user->id,
                    'name' => $request->user->name,
                ],
                'pto_type' => [
                    'id' => $request->ptoType->id,
                    'name' => $request->ptoType->name,
                    'color' => $request->ptoType->color,
                    'code' => $request->ptoType->code,
                ],
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'total_days' => (float) $request->total_days,
                'status' => $request->status,
            ];
        })->toArray();
    }
}
