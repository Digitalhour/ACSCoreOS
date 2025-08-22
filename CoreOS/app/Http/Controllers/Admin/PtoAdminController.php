<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\PtoModels\PtoApproval;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PtoAdminController extends Controller
{

    /**
     * Display the PTO types admin page.
     */
    public function types()
    {
        return Inertia::render('human-resources/PtoTypesView', [
            'title' => 'PTO Types Administration',
        ]);
    }


    /**
     * Display the PTO requests admin page.
     */
    public function requests()
    {
        $filters = request()->only(['search', 'status', 'pto_type', 'user', 'department', 'pending_only']);

        $query = PtoRequest::with([
            'user:id,name,email', 'user.departments:id,name', 'ptoType:id,name,code,color', 'approvedBy:id,name', 'deniedBy:id,name',
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
        } elseif (!empty($filters['pending_only'])) {
            $query->where('status', 'pending');
        }

        if (!empty($filters['department'])) {
            $query->whereHas('user.departments', function ($departmentQuery) use ($filters) {
                $departmentQuery->where('departments.id', $filters['department']);
            });
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
        $departments = Department::where('is_active', true)->select('id', 'name')->orderBy('name')->get();

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

        return Inertia::render('human-resources/PtoRequestsView', [
            'title' => 'PTO Requests Administration',
            'ptoRequests' => $ptoRequests,
            'users' => $users,
            'allPtoTypes' => $allPtoTypes,
            'filteredPtoTypes' => $filteredPtoTypes,
            'departments' => $departments,
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
     * Display the PTO Blackouts admin page.
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
     * Approve a PTO request - handles both simple and multi-level approval.
     */
    public function approveRequest(Request $request, PtoRequest $ptoRequest)
    {
        $request->validate([
            'comments' => 'nullable|string|max:500',
        ]);

        $approverId = Auth::id();

        try {
            // Check if request is still pending
            if ($ptoRequest->status !== 'pending') {
                return redirect()->back()->with('info', 'This request is no longer pending approval.');
            }

            DB::beginTransaction();

            // Check if this PTO type uses multi-level approval
            if ($ptoRequest->ptoType->multi_level_approval) {
                // Multi-level approval workflow
                $approval = PtoApproval::where('pto_request_id', $ptoRequest->id)
                    ->where('approver_id', $approverId)
                    ->where('status', 'pending')
                    ->first();

                if (!$approval) {
                    DB::rollBack();
                    return redirect()->back()->with('error', 'You are not authorized to approve this request or it has already been processed.');
                }

                // Update the current user's approval
                $approval->update([
                    'status' => 'approved',
                    'comments' => $request->comments,
                    'responded_at' => now(),
                ]);

                Log::info('Individual approval recorded', [
                    'approval_id' => $approval->id,
                    'approver_id' => $approverId,
                    'pto_request_id' => $ptoRequest->id
                ]);

                // Check if there are any more pending approvals
                $pendingApprovals = PtoApproval::where('pto_request_id', $ptoRequest->id)
                    ->where('status', 'pending')
                    ->count();

                Log::info('Pending approvals remaining', ['count' => $pendingApprovals]);

                // If no more pending approvals, approve the entire request
                if ($pendingApprovals === 0) {
                    $this->finalizeApproval($ptoRequest, $approverId);
                }

                DB::commit();

                $message = $pendingApprovals === 0
                    ? "PTO request for {$ptoRequest->user->name} has been fully approved and processed."
                    : "Your approval has been recorded. {$pendingApprovals} more approval(s) needed.";

                return redirect()->back()->with('success', $message);

            } else {
                // Simple approval workflow (no multi-level)
                $this->finalizeApproval($ptoRequest, $approverId);
                DB::commit();

                return redirect()->back()->with('success', "PTO request for {$ptoRequest->user->name} has been approved successfully.");
            }

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error approving PTO request: '.$ptoRequest->id, [
                'error' => $e->getMessage(),
                'user_id' => $approverId,
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->back()->with('error', 'Failed to approve PTO request. Please try again.');
        }
    }

    /**
     * Finalize the approval process and deduct balance.
     */
    private function finalizeApproval(PtoRequest $ptoRequest, int $approverId)
    {
        // Update the main request to approved
        $ptoRequest->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by_id' => $approverId,
        ]);

        // Only deduct balance if the PTO type uses balance tracking
        if ($ptoRequest->ptoType->uses_balance) {
            // Find or create the user's PTO balance for this type and year
            $year = Carbon::parse($ptoRequest->start_date)->year;
            $ptoBalance = PtoBalance::firstOrCreate(
                [
                    'user_id' => $ptoRequest->user_id,
                    'pto_type_id' => $ptoRequest->pto_type_id,
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
                $ptoRequest->total_days,
                'PTO approved and taken - ' . ($ptoRequest->reason ?: 'No reason provided'),
                auth()->user()
            );

            // Link the transaction to the PTO request
            $ptoTransaction->update(['pto_request_id' => $ptoRequest->id]);

            Log::info('PTO balance deducted', [
                'transaction_id' => $ptoTransaction->id,
                'balance_after' => $ptoBalance->fresh()->balance
            ]);
        }

        Log::info('PTO request fully approved', [
            'pto_request_id' => $ptoRequest->id,
            'approved_by' => $approverId,
        ]);
    }

    /**
     * Deny a PTO request - handles both simple and multi-level approval.
     */
    public function denyRequest(Request $request, PtoRequest $ptoRequest)
    {
        $request->validate([
            'comments' => 'required|string|max:500',
        ]);

        $approverId = Auth::id();

        try {
            // Check if request is still pending
            if ($ptoRequest->status !== 'pending') {
                return redirect()->back()->with('info', 'This request is no longer pending approval.');
            }

            DB::beginTransaction();

            // Check if this PTO type uses multi-level approval
            if ($ptoRequest->ptoType->multi_level_approval) {
                // Multi-level approval workflow
                $approval = PtoApproval::where('pto_request_id', $ptoRequest->id)
                    ->where('approver_id', $approverId)
                    ->where('status', 'pending')
                    ->first();

                if (!$approval) {
                    DB::rollBack();
                    return redirect()->back()->with('error', 'You are not authorized to deny this request or it has already been processed.');
                }

                // Update the current user's approval
                $approval->update([
                    'status' => 'denied',
                    'comments' => $request->comments,
                    'responded_at' => now(),
                ]);

                // Mark all other pending approvals as denied (one denial stops the chain)
                PtoApproval::where('pto_request_id', $ptoRequest->id)
                    ->where('status', 'pending')
                    ->where('id', '!=', $approval->id)
                    ->update(['status' => 'denied']);
            }

            // Update the main request to denied
            $ptoRequest->update([
                'status' => 'denied',
                'denied_at' => now(),
                'denied_by_id' => $approverId,
                'denial_reason' => $request->comments,
            ]);

            DB::commit();

            Log::info('PTO request denied successfully', [
                'pto_request_id' => $ptoRequest->id,
                'denied_by' => $approverId,
                'reason' => $request->comments
            ]);

            return redirect()->back()->with('success', "PTO request for {$ptoRequest->user->name} has been denied.");

        } catch (\Exception $e) {
            DB::rollBack();

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
        // Add debugging
        Log::info('Historical PTO submission started', [
            'request_data' => $request->all(),
            'user_id' => auth()->id(),
        ]);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'pto_type_id' => 'required|exists:pto_types,id',
            'start_date' => 'required|date|before_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date|before_or_equal:today',
            'reason' => 'nullable|string|max:500',
        ]);

        Log::info('Validation passed', ['validated_data' => $validated]);

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

            Log::info('Calculated total days', ['total_days' => $totalDays]);

            // Generate historical PTO request number: PTO-For{UserID}-By{RequesterID}-{Timestamp}
            $requestNumber = 'PTO-For' . $validated['user_id'] . '-By' . auth()->id() . '-' . time();

            Log::info('Generated historical PTO request number', ['request_number' => $requestNumber]);

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

            Log::info('PTO request created', [
                'pto_request_id' => $ptoRequest->id,
                'pto_request' => $ptoRequest->toArray()
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

                Log::info('PTO balance found/created', [
                    'balance_id' => $ptoBalance->id,
                    'current_balance' => $ptoBalance->balance,
                    'year' => $year
                ]);

                // Deduct the balance using the model method
                $ptoTransaction = $ptoBalance->subtractBalance(
                    $totalDays,
                    'Historical PTO taken - ' . ($validated['reason'] ?: 'No reason provided'),
                    auth()->user()
                );

                // Link the transaction to the PTO request
                $ptoTransaction->update(['pto_request_id' => $ptoRequest->id]);

                Log::info('PTO transaction created and linked', [
                    'transaction_id' => $ptoTransaction->id,
                    'transaction' => $ptoTransaction->toArray()
                ]);
            } else {
                Log::info('PTO type does not use balance, skipping balance deduction');
            }

            DB::commit();

            Log::info('Historical PTO submission completed successfully', [
                'pto_request_id' => $ptoRequest->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Historical PTO request submitted successfully.',
                'data' => [
                    'pto_request' => $ptoRequest,
                ]
            ]);

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
