<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoBlackout;
use App\Models\PtoModels\PtoPolicy;
use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoType;
use App\Models\PtoModels\PtoTransaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PtoAdminController extends Controller
{

    /**
     * Display the PTO types admin page.
     */
    public function types()
    {
        return Inertia::render('Admin/PTO/AdminPtoTypesView', [
            'title' => 'PTO Types Administration',
        ]);
    }

    /**
     * Display the PTO policies admin page.
     */
    public function policies()
    {
        return Inertia::render('Admin/PTO/AdminPtoPoliciesView', [
            'title' => 'PTO Policies Administration',
        ]);
    }

    /**
     * Display the PTO requests admin page.
     */
    public function requests()
    {
        $filters = request()->only(['search', 'status', 'pto_type', 'user', 'pending_only']);

        $query = PtoRequest::with([
            'user:id,name,email', 'ptoType:id,name,code,color', 'approvedBy:id,name', 'deniedBy:id,name',
            'approvals.approver:id,name'
        ])
            ->orderBy('submitted_at', 'desc');

        // Apply filters
        if (!empty($filters['user'])) {
            $query->where('user_id', $filters['user']);
        }

        if (!empty($filters['pto_type'])) {
            $query->where('pto_type_id', $filters['pto_type']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['pending_only'])) {
            $query->where('status', 'pending');
        }

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->whereHas('user', function ($userQuery) use ($filters) {
                    $userQuery->where('name', 'like', '%'.$filters['search'].'%')
                        ->orWhere('email', 'like', '%'.$filters['search'].'%');
                })
                    ->orWhereHas('ptoType', function ($typeQuery) use ($filters) {
                        $typeQuery->where('name', 'like', '%'.$filters['search'].'%');
                    })
                    ->orWhere('request_number', 'like', '%'.$filters['search'].'%')
                    ->orWhere('reason', 'like', '%'.$filters['search'].'%');
            });
        }

        $ptoRequests = $query->paginate(15)->withQueryString();

        $users = User::select('id', 'name', 'email')->orderBy('name')->get();
        $allPtoTypes = PtoType::active()->ordered()->select('id', 'name', 'code', 'color')->get();

        // Get filtered PTO types for the selected user
        $filteredPtoTypes = [];
        if (!empty($filters['user'])) {
            $user = User::find($filters['user']);
            if ($user) {
                $activePolicies = $user->activePtoPolicies()
                    ->with([
                        'ptoType' => function ($query) {
                            $query->where('is_active', true);
                        }
                    ])
                    ->get();

                $filteredPtoTypes = $activePolicies->pluck('ptoType')
                    ->filter()
                    ->unique('id')
                    ->map(function ($ptoType) {
                        return [
                            'id' => $ptoType->id,
                            'name' => $ptoType->name,
                            'code' => $ptoType->code,
                            'color' => $ptoType->color,
                        ];
                    })
                    ->sortBy('name')
                    ->values();
            }
        }

        return Inertia::render('Admin/PTO/AdminPtoRequestsView', [
            'title' => 'PTO Requests Administration',
            'ptoRequests' => $ptoRequests,
            'users' => $users,
            'allPtoTypes' => $allPtoTypes,
            'filteredPtoTypes' => $filteredPtoTypes,
            'filters' => $filters,
        ]);
    }

    /**
     * Display the PTO balances admin page.
     */
    public function balances()
    {
        return Inertia::render('Admin/PTO/AdminPtoBalancesView', [
            'title' => 'PTO Balances Administration',
        ]);
    }

    /**
     * Display the PTO blackouts admin page.
     */
    public function blackouts()
    {
        return Inertia::render('PTO/AdminPtoBlackoutsView', [
            'title' => 'PTO Blackouts Administration',
        ]);
    }

    /**
     * Display the PTO dashboard admin page.
     */
    public function dashboard()
    {
        // Get summary statistics for the dashboard
        $stats = [
            'total_requests' => PtoRequest::count(),
            'pending_requests' => PtoRequest::where('status', 'pending')->count(),
            'approved_requests' => PtoRequest::where('status', 'approved')->count(),
            'denied_requests' => PtoRequest::where('status', 'denied')->count(),
            'total_types' => PtoType::count(),
            'total_policies' => PtoPolicy::count(),
            'total_blackouts' => PtoBlackout::count(),
        ];

        // Get users and PTO types for the modal
        $users = User::select('id', 'name', 'email')->orderBy('name')->get();
        $ptoTypes = PtoType::active()->ordered()->select('id', 'name', 'code', 'color')->get();

        return Inertia::render('Admin/PTO/AdminPtoDashboardView', [
            'title' => 'PTO Administration Dashboard',
            'stats' => $stats,
            'users' => $users,
            'ptoTypes' => $ptoTypes,
        ]);
    }

    /**
     * Get the PTO types associated with a specific user (for AJAX calls).
     */
    public function getPtoTypesForUser($userId)
    {
        try {
            $user = User::findOrFail($userId);

            $activePolicies = $user->activePtoPolicies()
                ->with([
                    'ptoType' => function ($query) {
                        $query->where('is_active', true);
                    }
                ])
                ->get();

            $ptoTypes = $activePolicies->pluck('ptoType')
                ->filter()
                ->unique('id')
                ->map(function ($ptoType) {
                    return [
                        'id' => $ptoType->id,
                        'name' => $ptoType->name,
                        'code' => $ptoType->code,
                        'color' => $ptoType->color,
                    ];
                })
                ->sortBy('name')
                ->values();

            return response()->json($ptoTypes);

        } catch (\Exception $e) {
            Log::error('Error fetching PTO types for user: '.$userId, [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $userId
            ]);

            return response()->json([]);
        }
    }

    /**
     * Approve a PTO request.
     */
    public function approveRequest(Request $request, PtoRequest $ptoRequest)
    {
        $request->validate([
            'comments' => 'nullable|string|max:500',
        ]);

        $approverId = Auth::id();

        try {
            // Get the next approval(s) that are pending
            $pendingApprovals = $ptoRequest->getNextPendingApprovals();

            if ($pendingApprovals->isEmpty()) {
                return redirect()->back()->with('info', 'This request is no longer pending approval.');
            }

            // Find the specific approval record for the current user within the next pending level
            $currentUserApproval = $pendingApprovals->firstWhere('approver_id', $approverId);

            if (!$currentUserApproval) {
                return redirect()->back()->with('error', 'You are not authorized to approve this request at this time.');
            }

            // Update the current user's approval step
            $currentUserApproval->update([
                'status' => 'approved',
                'comments' => $request->comments,
                'responded_at' => now(),
            ]);

            // After approval, re-check if the request is now fully approved
            if ($ptoRequest->fresh()->isFullyApproved()) {
                // If all approvals are done, update the main request
                $ptoRequest->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approved_by_id' => $approverId, // Final approver
                ]);

                // TODO: Trigger balance deductions and notifications here
            }

            return redirect()->back()->with('success', "Approval recorded successfully for {$ptoRequest->user->name}'s request.");

        } catch (\Exception $e) {
            Log::error('Error approving PTO request: '.$ptoRequest->id, [
                'error' => $e->getMessage(),
                'user_id' => $approverId,
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->back()->with('error', 'Failed to approve PTO request. Please try again.');
        }
    }

    /**
     * Deny a PTO request.
     */
    public function denyRequest(Request $request, PtoRequest $ptoRequest)
    {
        $request->validate([
            'comments' => 'required|string|max:500',
        ]);

        $approverId = Auth::id();

        try {
            // Any authorized approver in the current pending step can deny the whole request
            $pendingApprovals = $ptoRequest->getNextPendingApprovals();
            $currentUserApproval = $pendingApprovals->firstWhere('approver_id', $approverId);

            if (!$currentUserApproval) {
                return redirect()->back()->with('error', 'You are not authorized to deny this request at this time.');
            }

            // A single denial rejects the entire request chain.
            $ptoRequest->update([
                'status' => 'denied',
                'denied_at' => now(),
                'denied_by_id' => $approverId,
                'denial_reason' => $request->comments,
            ]);

            // Update all approval steps to reflect the denial.
            $ptoRequest->approvals()->update(['status' => 'denied']);

            // Log the specific comment on the denier's approval record
            $currentUserApproval->update([
                'comments' => $request->comments,
                'responded_at' => now(),
            ]);

            return redirect()->back()->with('success', "PTO request for {$ptoRequest->user->name} has been denied.");

        } catch (\Exception $e) {
            Log::error('Error denying PTO request: '.$ptoRequest->id, [
                'error' => $e->getMessage(),
                'user_id' => $approverId,
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->back()->with('error', 'Failed to deny PTO request. Please try again.');
        }
    }

    /**
     * Submit historical PTO request for a user.
     */
    public function submitHistoricalPto(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'pto_type_id' => 'required|exists:pto_types,id',
            'start_date' => 'required|date|before_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date|before_or_equal:today',
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            // Calculate total days (excluding weekends)
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);
            $totalDays = 0;

            $current = $startDate->copy();
            while ($current->lte($endDate)) {
                if (!$current->isWeekend()) {
                    $totalDays++;
                }
                $current->addDay();
            }

            // Create the PTO request
            $ptoRequest = PtoRequest::create([
                'user_id' => $request->user_id,
                'pto_type_id' => $request->pto_type_id,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'total_days' => $totalDays,
                'reason' => $request->reason ?? '',
                'status' => 'approved',
                'submitted_at' => now(),
                'approved_at' => now(),
                'approved_by_id' => auth()->id(),
            ]);

            return redirect()->back()->with('success', 'Historical PTO request submitted successfully.');

        } catch (\Exception $e) {
            Log::error('Error submitting historical PTO request', [
                'error' => $e->getMessage(),
                'request_data' => $request->all(),
                'user_id' => auth()->id(),
            ]);

            return redirect()->back()->with('error', 'Failed to submit historical PTO request. Please try again.');
        }
    }
}
