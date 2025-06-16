<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoApproval;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoType;
use App\Models\User;
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
     * Display a listing of the resource with pagination and filters for frontend component.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PtoRequest::with([
            'user:id,name,email',
            'ptoType:id,name,code,color',
            'approvals.approver:id,name',
            'approvedBy:id,name',
            'deniedBy:id,name'
        ]);

        // Apply filters
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('request_number', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status') && $request->get('status') !== 'all') {
            $query->where('status', $request->get('status'));
        }

        if ($request->filled('pto_type') && $request->get('pto_type') !== 'all') {
            $query->where('pto_type_id', $request->get('pto_type'));
        }

        if ($request->filled('user') && $request->get('user') !== 'all') {
            $query->where('user_id', $request->get('user'));
        }

        if ($request->boolean('pending_only')) {
            $query->where('status', 'pending');
        }

        // Order by most recent first
        $query->orderBy('created_at', 'desc');

        // Paginate results
        $perPage = $request->get('per_page', 10);
        $ptoRequests = $query->paginate($perPage);

        // Transform the data to match frontend expectations
        $transformedData = $ptoRequests->getCollection()->map(function ($request) {
            return [
                'id' => $request->id,
                'request_number' => $request->request_number,
                'user' => [
                    'id' => $request->user->id,
                    'name' => $request->user->name,
                    'email' => $request->user->email,
                ],
                'pto_type' => [
                    'id' => $request->ptoType->id,
                    'name' => $request->ptoType->name,
                    'code' => $request->ptoType->code,
                    'color' => $request->ptoType->color,
                ],
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'start_time' => $request->start_time ?? 'full_day',
                'end_time' => $request->end_time ?? 'full_day',
                'total_days' => $request->total_days,
                'reason' => $request->reason,
                'status' => $request->status,
                'denial_reason' => $request->denial_reason,
                'submitted_at' => $request->created_at->format('Y-m-d H:i:s'),
                'approved_at' => $request->approved_at?->format('Y-m-d H:i:s'),
                'denied_at' => $request->denied_at?->format('Y-m-d H:i:s'),
                'approved_by' => $request->approvedBy ? ['name' => $request->approvedBy->name] : null,
                'denied_by' => $request->deniedBy ? ['name' => $request->deniedBy->name] : null,
                'approvals' => $request->approvals->map(function ($approval) {
                    return [
                        'id' => $approval->id,
                        'approver' => [
                            'id' => $approval->approver->id,
                            'name' => $approval->approver->name,
                        ],
                        'status' => $approval->status,
                        'comments' => $approval->comments,
                        'responded_at' => $approval->responded_at?->format('Y-m-d H:i:s'),
                    ];
                }),
            ];
        });

        return response()->json([
            'data' => $transformedData,
            'current_page' => $ptoRequests->currentPage(),
            'last_page' => $ptoRequests->lastPage(),
            'per_page' => $ptoRequests->perPage(),
            'total' => $ptoRequests->total(),
            'from' => $ptoRequests->firstItem(),
            'to' => $ptoRequests->lastItem(),
        ]);
    }

    /**
     * Get user PTO details for overview modal
     */
    public function getUserDetails(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'year' => 'nullable|integer|min:2020|max:2030'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $userId = $request->get('user_id');
        $year = $request->get('year', Carbon::now()->year);

        try {
            // Get user PTO requests for the specified year
            $userRequests = PtoRequest::with(['ptoType:id,name'])
                ->where('user_id', $userId)
                ->whereYear('start_date', $year)
                ->orderBy('start_date', 'desc')
                ->get()
                ->map(function ($request) {
                    return [
                        'id' => $request->id,
                        'start_date' => $request->start_date,
                        'end_date' => $request->end_date,
                        'total_days' => $request->total_days,
                        'status' => $request->status,
                        'pto_type' => [
                            'name' => $request->ptoType->name,
                        ],
                    ];
                });

            // Get user PTO balances for the specified year - matching PtoOverviewController logic
            $ptoTypes = PtoType::orderBy('name')->get();
            $userBalances = PtoBalance::where('user_id', $userId)
                ->where('year', $year)
                ->with('ptoType')
                ->get()
                ->keyBy('pto_type_id');

            $ptoData = $ptoTypes->map(function ($type) use ($userBalances) {
                $balance = $userBalances->get($type->id);

                if (!$balance) {
                    return [
                        'type_id' => $type->id,
                        'type_name' => $type->name,
                        'balance' => 0,
                        'used_balance' => 0,
                        'pending_balance' => 0,
                        'available_balance' => 0,
                        'assigned_balance' => 0,
                    ];
                }

                // Ensure we don't have negative values - exact same logic as PtoOverviewController
                $totalBalance = max(0, $balance->balance);
                $usedBalance = max(0, $balance->used_balance);
                $pendingBalance = max(0, $balance->pending_balance);
                $availableBalance = max(0, $totalBalance - $pendingBalance - $usedBalance);

                // Calculate assigned balance (what they started with) - same as PtoOverviewController
                $assignedBalance = $totalBalance + $usedBalance;

                return [
                    'type_id' => $type->id,
                    'type_name' => $type->name,
                    'balance' => $totalBalance,
                    'used_balance' => $usedBalance,
                    'pending_balance' => $pendingBalance,
                    'available_balance' => $availableBalance,
                    'assigned_balance' => $assignedBalance,
                ];
            });

            return \Inertia\Inertia::render('Admin/PTO/Overview', [
                'userRequests' => $userRequests,
                'ptoData' => $ptoData,

                'ptoTypes' => $ptoTypes,
                'currentYear' => $year,

            ]);

        } catch (\Exception $e) {
            Log::error("Error fetching user PTO details for user {$userId}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch user details.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Get users list for filtering
     */
    public function getUsersList(): JsonResponse
    {
        $users = User::select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return response()->json($users);
    }

    /**
     * Get PTO types for filtering
     */
    public function getPtoTypes(): JsonResponse
    {
        // Check if you have an active scope, if not remove the active() call
        $ptoTypes = PtoType::select('id', 'name', 'code', 'color')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $ptoTypes
        ]);
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
            $requestNumber = 'PTO-' . $userId . '-' . time();

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
            if (class_exists('\App\Services\ApprovalChainService')) {
                $approvalService = new \App\Services\ApprovalChainService();
                $approvalService->createApprovalChain($ptoRequest);
            }

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
     * Approve a PTO request - Updated to match frontend expectations.
     */
    public function approve(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'comments' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }

        try {
            $ptoRequest = PtoRequest::findOrFail($id);

            if ($ptoRequest->status !== 'pending') {
                return response()->json([
                    'error' => 'This request has already been processed'
                ], 422);
            }

            // Get the current user (approver)
            $approver = Auth::user();

            // Find the approval record for this approver
            $approval = PtoApproval::where('pto_request_id', $ptoRequest->id)
                ->where('approver_id', $approver->id)
                ->where('status', 'pending')
                ->first();

            if (!$approval) {
                // If no approval record exists, create one or update the request directly
                $approval = PtoApproval::updateOrCreate(
                    ['pto_request_id' => $ptoRequest->id, 'approver_id' => $approver->id],
                    [
                        'status' => 'approved',
                        'comments' => $request->get('comments'),
                        'responded_at' => now(),
                    ]
                );
            } else {
                // Update existing approval
                $approval->update([
                    'status' => 'approved',
                    'comments' => $request->get('comments'),
                    'responded_at' => now(),
                ]);
            }

            // Update the request
            $ptoRequest->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by_id' => Auth::id(),
            ]);

            // Update the user's balance if needed
            $ptoType = $ptoRequest->ptoType;
            if ($ptoType->uses_balance ?? false) {
                $balance = PtoBalance::where('user_id', $ptoRequest->user_id)
                    ->where('pto_type_id', $ptoRequest->pto_type_id)
                    ->first();

                if ($balance) {
                    $balance->pending_balance = max(0, ($balance->pending_balance ?? 0) - $ptoRequest->total_days);
                    $balance->used_balance = ($balance->used_balance ?? 0) + $ptoRequest->total_days;
                    $balance->save();
                }
            }

            Log::info("PTO Request approved: ID {$ptoRequest->id}, Approver: {$approver->name}");

            return response()->json([
                'message' => 'Request approved successfully',
                'request' => $ptoRequest->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error("Error approving PTO Request ID {$id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to approve request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Deny a PTO request - Updated to match frontend expectations.
     */
    public function deny(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'comments' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }

        try {
            $ptoRequest = PtoRequest::findOrFail($id);

            // Get the current user (approver)
            $approver = Auth::user();

            // Find or create the approval record for this approver
            $approval = PtoApproval::updateOrCreate(
                ['pto_request_id' => $ptoRequest->id, 'approver_id' => $approver->id],
                [
                    'status' => 'denied',
                    'comments' => $request->get('comments'),
                    'responded_at' => now(),
                ]
            );

            // Update the request
            $ptoRequest->update([
                'status' => 'denied',
                'denied_at' => now(),
                'denied_by_id' => Auth::id(),
                'denial_reason' => $request->get('comments'),
            ]);

            // Update the user's pending balance
            $ptoType = $ptoRequest->ptoType;
            if ($ptoType->uses_balance ?? false) {
                $balance = PtoBalance::where('user_id', $ptoRequest->user_id)
                    ->where('pto_type_id', $ptoRequest->pto_type_id)
                    ->first();

                if ($balance) {
                    $balance->pending_balance = max(0, ($balance->pending_balance ?? 0) - $ptoRequest->total_days);
                    $balance->save();
                }
            }

            Log::info("PTO Request denied: ID {$ptoRequest->id}, Approver: {$approver->name}, Reason: {$request->get('comments')}");

            return response()->json([
                'message' => 'Request denied successfully',
                'request' => $ptoRequest->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error("Error denying PTO Request ID {$id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to deny request: ' . $e->getMessage()
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
