<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoApproval;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use App\Services\BlackoutValidationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PtoRequestController extends Controller
{
    public function __construct(
        private BlackoutValidationService $blackoutService
    ) {}

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
                // Include blackout information
                'has_blackout_conflicts' => $request->hasBlackoutConflicts(),
                'has_blackout_warnings' => $request->hasBlackoutWarnings(),
                'blackout_warnings_acknowledged' => $request->areBlackoutWarningsAcknowledged(),
                'has_emergency_override' => $request->hasEmergencyOverride(),
                'override_approved' => $request->isOverrideApproved(),
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
            'is_emergency_override' => 'nullable|boolean',
            'acknowledge_warnings' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $user = Auth::user();
            $userId = $user->id;
            $isEmergencyOverride = $request->boolean('is_emergency_override');
            $acknowledgeWarnings = $request->boolean('acknowledge_warnings');

            // Generate a unique request number
            $requestNumber = 'PTO-' . $userId . '-' . time();

            // Calculate total days
            $totalDays = $request->total_days ?? $this->calculateTotalDays(
                $request->start_date,
                $request->end_date,
                $request->start_time ?? 'full_day',
                $request->end_time ?? 'full_day'
            );

            // Check PTO balance
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

                // Calculate available balance
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

            DB::transaction(function () use ($request, $user, $requestNumber, $totalDays, $ptoType, $balance, $isEmergencyOverride, $acknowledgeWarnings) {
                // Create the request first
                $ptoRequest = PtoRequest::create([
                    'user_id' => $user->id,
                    'request_number' => $requestNumber,
                    'pto_type_id' => $request->pto_type_id,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'start_time' => $request->start_time ?? 'full_day',
                    'end_time' => $request->end_time ?? 'full_day',
                    'total_days' => $totalDays,
                    'reason' => $request->reason,
                    'status' => 'pending',
                    'day_options' => $request->day_options ?? [],
                ]);

                // Validate and store blackout information using the service
                $blackoutValidation = $this->blackoutService->validateAndStorePtoRequest(
                    $ptoRequest,
                    $isEmergencyOverride
                );

                // Handle warning acknowledgment
                if ($acknowledgeWarnings && $blackoutValidation['has_warnings']) {
                    $this->blackoutService->processBlackoutAcknowledgment($ptoRequest, $user);
                }

                // If there are unresolved conflicts without emergency override, reject
                if ($blackoutValidation['has_conflicts'] && !$isEmergencyOverride) {
                    $ptoRequest->update([
                        'status' => 'denied',
                        'denied_at' => now(),
                        'denial_reason' => 'Request conflicts with blackout periods. Emergency override required.',
                    ]);

                    throw new \Exception('PTO request conflicts with blackout periods.');
                }

                // Create approval chain
                if (class_exists('\App\Services\ApprovalChainService')) {
                    $approvalService = new \App\Services\ApprovalChainService();
                    $approvalService->createApprovalChain($ptoRequest);
                }

                // Update pending balance
                if ($ptoType->uses_balance && $balance) {
                    $balance->pending_balance = ($balance->pending_balance ?? 0) + $totalDays;
                    $balance->save();
                }

                return $ptoRequest;
            });

            // Get the created request with relationships
            $ptoRequest = PtoRequest::with(['user', 'ptoType', 'approvals.approver'])->latest()->first();

            // Prepare response
            $responseData = [
                'data' => $ptoRequest,
                'message' => 'PTO request submitted successfully.'
            ];

            // Get blackout status for response
            $blackoutStatus = $this->blackoutService->getBlackoutStatusSummary($ptoRequest);

            if ($blackoutStatus['has_conflicts'] || $blackoutStatus['has_warnings']) {
                $responseData['blackout_status'] = $blackoutStatus;

                if ($blackoutStatus['has_conflicts']) {
                    $responseData['message'] .= ' Emergency override applied due to blackout conflicts.';
                } elseif ($blackoutStatus['has_warnings']) {
                    $responseData['message'] .= ' Note: Request has blackout period warnings.';
                }
            }

            Log::info("PTO Request created: ID {$ptoRequest->id}, User: {$user->name}, Days: {$totalDays}");

            return response()->json($responseData, 201);

        } catch (\Exception $e) {
            Log::error("Error creating PTO Request: ".$e->getMessage());

            // Handle blackout conflicts specifically
            if (str_contains($e->getMessage(), 'blackout periods')) {
                return response()->json([
                    'error' => $e->getMessage(),
                    'blackout_conflicts' => true,
                ], 422);
            }

            return response()->json([
                'error' => 'Failed to create PTO Request.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Preview blackout conflicts before submission
     */
    public function previewBlackouts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pto_type_id' => 'required|exists:pto_types,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $user = $validated['user_id'] ? User::find($validated['user_id']) : Auth::user();

        $blackoutValidation = $this->blackoutService->validatePtoRequest(
            $user,
            $validated['start_date'],
            $validated['end_date'],
            $validated['pto_type_id']
        );

        return response()->json($blackoutValidation);
    }

    /**
     * Approve emergency override (admin only)
     */
    public function approveOverride(Request $request, PtoRequest $ptoRequest): JsonResponse
    {
        $validated = $request->validate([
            'approved' => 'required|boolean',
            'reason' => 'nullable|string|required_if:approved,false',
        ]);

        $result = $this->blackoutService->processEmergencyOverrideApproval(
            $ptoRequest,
            Auth::user(),
            $validated['approved'],
            $validated['reason'] ?? null
        );

        if ($result['success']) {
            return response()->json([
                'message' => $result['message'],
                'request' => $ptoRequest->fresh()->load(['user', 'ptoType', 'approvals.approver'])
            ]);
        }

        return response()->json([
            'error' => $result['message']
        ], 422);
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
        $ptoTypes = PtoType::select('id', 'name', 'code', 'color')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $ptoTypes
        ]);
    }

    /**
     * Get detailed blackout analysis for admin review
     */
    public function getBlackoutAnalysis(PtoRequest $ptoRequest): JsonResponse
    {
        try {
            // Get detailed analysis
            $adminDetails = $this->blackoutService->getBlackoutDetailsForAdmin($ptoRequest);

            // Get approval recommendation
            $recommendation = $this->blackoutService->getApprovalRecommendation($ptoRequest);

            // Get current status of similar requests during the same blackout periods
            $similarRequests = $this->getSimilarRequestsInBlackoutPeriods($ptoRequest);

            return response()->json([
                'request_id' => $ptoRequest->id,
                'blackout_analysis' => $adminDetails,
                'approval_recommendation' => $recommendation,
                'similar_requests' => $similarRequests,
                'approval_notes' => $ptoRequest->approval_notes,
            ]);

        } catch (\Exception $e) {
            Log::error("Error getting blackout analysis for PTO Request ID {$ptoRequest->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to get blackout analysis.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Get similar requests during the same blackout periods for context
     */
    private function getSimilarRequestsInBlackoutPeriods(PtoRequest $ptoRequest): array
    {
        $user = $ptoRequest->user;

        // Get blackouts that affect this request
        $blackouts = $this->blackoutService->getBlackoutsForUser(
            $user,
            $ptoRequest->start_date->format('Y-m-d'),
            $ptoRequest->end_date->format('Y-m-d')
        );

        $similarRequests = [];

        foreach ($blackouts as $blackout) {
            // Find other requests during this blackout period
            $requests = PtoRequest::with(['user:id,name', 'ptoType:id,name'])
                ->where('id', '!=', $ptoRequest->id)
                ->where(function ($query) use ($blackout) {
                    $query->where('start_date', '<=', $blackout->end_date)
                        ->where('end_date', '>=', $blackout->start_date);
                })
                ->whereIn('status', ['approved', 'pending', 'denied'])
                ->when($blackout->pto_type_ids, function ($query) use ($blackout) {
                    return $query->whereIn('pto_type_id', $blackout->pto_type_ids);
                })
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            if ($requests->isNotEmpty()) {
                $similarRequests[] = [
                    'blackout' => [
                        'name' => $blackout->name,
                        'period' => $blackout->getFormattedDateRangeAttribute(),
                        'restriction_type' => $blackout->restriction_type,
                        'max_requests_allowed' => $blackout->max_requests_allowed,
                    ],
                    'requests' => $requests->map(function ($request) {
                        return [
                            'id' => $request->id,
                            'user_name' => $request->user->name,
                            'pto_type' => $request->ptoType->name,
                            'dates' => $request->start_date->format('M d') . ' - ' . $request->end_date->format('M d, Y'),
                            'total_days' => $request->total_days,
                            'status' => $request->status,
                            'submitted_at' => $request->created_at->format('M d, Y'),
                        ];
                    })->toArray(),
                    'summary' => [
                        'total_requests' => $requests->count(),
                        'approved' => $requests->where('status', 'approved')->count(),
                        'pending' => $requests->where('status', 'pending')->count(),
                        'denied' => $requests->where('status', 'denied')->count(),
                    ],
                ];
            }
        }

        return $similarRequests;
    }

    /**
     * Approve request with blackout override documentation
     */
    public function approveWithBlackoutReview(Request $request, PtoRequest $ptoRequest): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'comments' => 'nullable|string|max:1000',
            'override_justification' => 'nullable|string|max:1000',
            'acknowledge_blackout_risks' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }

        if (!$request->boolean('acknowledge_blackout_risks')) {
            return response()->json([
                'error' => 'Must acknowledge blackout risks before approval'
            ], 422);
        }

        try {
            // Get blackout analysis for documentation
            $adminDetails = $this->blackoutService->getBlackoutDetailsForAdmin($ptoRequest);

            // Build comprehensive approval notes
            $approvalNotes = $ptoRequest->approval_notes ? [$ptoRequest->approval_notes] : [];
            $approvalNotes[] = '';
            $approvalNotes[] = '✅ ADMIN APPROVAL WITH BLACKOUT REVIEW';
            $approvalNotes[] = 'Approved by: ' . Auth::user()->name;
            $approvalNotes[] = 'Approval date: ' . now()->format('M d, Y H:i:s');

            if ($request->filled('override_justification')) {
                $approvalNotes[] = '';
                $approvalNotes[] = '📝 OVERRIDE JUSTIFICATION:';
                $approvalNotes[] = $request->get('override_justification');
            }

            if ($request->filled('comments')) {
                $approvalNotes[] = '';
                $approvalNotes[] = '💬 APPROVAL COMMENTS:';
                $approvalNotes[] = $request->get('comments');
            }

            // Document blackout analysis in approval
            if ($adminDetails['blackout_analysis']['has_conflicts'] || $adminDetails['blackout_analysis']['has_warnings']) {
                $approvalNotes[] = '';
                $approvalNotes[] = '🔍 BLACKOUT ANALYSIS REVIEWED:';

                foreach ($adminDetails['blackout_analysis']['conflicts'] as $conflict) {
                    $approvalNotes[] = "• CONFLICT: {$conflict['blackout_name']} - {$conflict['description']}";
                }

                foreach ($adminDetails['blackout_analysis']['warnings'] as $warning) {
                    $approvalNotes[] = "• WARNING: {$warning['blackout_name']} - {$warning['description']}";
                }
            }

            $approvalNotes[] = '';
            $approvalNotes[] = '✓ Blackout risks acknowledged and reviewed by admin';

            // Perform the approval
            $this->performApproval($ptoRequest, implode("\n", $approvalNotes));

            Log::info("PTO Request approved with blackout review: ID {$ptoRequest->id}, Admin: " . Auth::user()->name);

            return response()->json([
                'message' => 'Request approved successfully with blackout documentation',
                'request' => $ptoRequest->fresh()->load(['user', 'ptoType', 'approvals.approver'])
            ]);

        } catch (\Exception $e) {
            Log::error("Error approving PTO Request with blackout review ID {$ptoRequest->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to approve request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper method to perform the actual approval process
     */
    private function performApproval(PtoRequest $ptoRequest, string $approvalNotes): void
    {
        $approver = Auth::user();

        // Find or create the approval record
        $approval = PtoApproval::updateOrCreate(
            ['pto_request_id' => $ptoRequest->id, 'approver_id' => $approver->id],
            [
                'status' => 'approved',
                'comments' => $approvalNotes,
                'responded_at' => now(),
            ]
        );

        // Update the request
        $ptoRequest->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by_id' => Auth::id(),
            'approval_notes' => $approvalNotes,
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
    }

    /**
     * Display the specified resource.
     */
    public function show(PtoRequest $ptoRequest): JsonResponse
    {
        $ptoRequest->load(['user', 'ptoType', 'approvals.approver', 'overrideApprovedBy']);

        // Include blackout status
        $blackoutStatus = $this->blackoutService->getBlackoutStatusSummary($ptoRequest);

        return response()->json([
            'data' => $ptoRequest,
            'blackout_status' => $blackoutStatus,
        ]);
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
            'is_emergency_override' => 'nullable|boolean',
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

            DB::transaction(function () use ($request, $ptoRequest, $newTotalDays, $ptoType, $balance) {
                // Validate blackout periods for the new dates
                $blackoutValidation = $this->blackoutService->validatePtoRequest(
                    $ptoRequest->user,
                    $request->start_date,
                    $request->end_date,
                    $ptoRequest->pto_type_id,
                    $request->boolean('is_emergency_override')
                );

                // Update the pending balance
                if ($ptoType->uses_balance) {
                    $balance->subtractPendingBalance($ptoRequest->total_days);
                    $balance->addPendingBalance($newTotalDays, $ptoRequest);
                }

                // Update the request
                $ptoRequest->update([
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'start_time' => $request->start_time,
                    'end_time' => $request->end_time,
                    'total_days' => $newTotalDays,
                    'reason' => $request->reason,
                ]);

                // Store updated blackout validation
                $ptoRequest->storeBlackoutValidation($blackoutValidation);
            });

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

    // ... (keep all other existing methods like cancel, cancelOwnRequest, approve, deny, etc. unchanged)

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
