<?php

namespace App\Http\Controllers\Api\PtoApi;

use App\Http\Controllers\Controller;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PtoDetailController extends Controller
{
    /**
     * Get detailed PTO information for a specific user and PTO type
     */
    public function getUserPtoDetails(Request $request, User $user): JsonResponse
    {
        $year = $request->year ?? Carbon::now()->year;
        $ptoTypeId = $request->pto_type_id;

        try {
            // Get the PTO balance
            $balance = PtoBalance::with('ptoType')
                ->where('user_id', $user->id)
                ->where('year', $year)
                ->when($ptoTypeId, function ($query) use ($ptoTypeId) {
                    return $query->where('pto_type_id', $ptoTypeId);
                })
                ->get();

            // Get PTO requests for this user and year
            $ptoRequests = PtoRequest::with(['ptoType', 'approver', 'approvals.approver'])
                ->where('user_id', $user->id)
                ->whereYear('start_date', $year)
                ->when($ptoTypeId, function ($query) use ($ptoTypeId) {
                    return $query->where('pto_type_id', $ptoTypeId);
                })
                ->orderBy('start_date', 'desc')
                ->get()
                ->map(function ($request) {
                    return [
                        'id' => $request->id,
                        'request_number' => $request->request_number,
                        'pto_type' => $request->ptoType->name,
                        'start_date' => $request->start_date,
                        'end_date' => $request->end_date,
                        'total_days' => $request->total_days,
                        'total_hours' => $request->total_hours,
                        'status' => $request->status,
                        'reason' => $request->reason,
                        'denial_reason' => $request->denial_reason,
                        'approver' => $request->approver ? $request->approver->name : null,
                        'approved_at' => $request->approved_at,
                        'denied_at' => $request->denied_at,
                        'submitted_at' => $request->submitted_at,
                        'created_at' => $request->created_at,
                        'is_planned' => $request->start_date > Carbon::now(),
                        'approvals' => $request->approvals->map(function ($approval) {
                            return [
                                'id' => $approval->id,
                                'approver' => $approval->approver->name,
                                'status' => $approval->status,
                                'comments' => $approval->comments,
                                'level' => $approval->level,
                                'responded_at' => $approval->responded_at,
                            ];
                        }),
                    ];
                });

            // Get activity timeline from approvals and status changes
            $activities = collect();

            foreach ($ptoRequests as $request) {
                // Add initial submission
                $activities->push([
                    'id' => 'submit_'.$request['id'],
                    'type' => 'submission',
                    'description' => "PTO request {$request['request_number']} submitted",
                    'user' => $user->name,
                    'created_at' => $request['submitted_at'],
                    'details' => [
                        'request_id' => $request['id'],
                        'days' => $request['total_days'],
                        'reason' => $request['reason'],
                    ]
                ]);

                // Add approval activities
                foreach ($request['approvals'] as $approval) {
                    if ($approval['responded_at']) {
                        $activities->push([
                            'id' => 'approval_'.$approval['id'],
                            'type' => 'approval',
                            'description' => "Request {$approval['status']} by {$approval['approver']}",
                            'user' => $approval['approver'],
                            'created_at' => $approval['responded_at'],
                            'details' => [
                                'request_id' => $request['id'],
                                'status' => $approval['status'],
                                'comments' => $approval['comments'],
                                'level' => $approval['level'],
                            ]
                        ]);
                    }
                }

                // Add final status changes
                if ($request['approved_at']) {
                    $activities->push([
                        'id' => 'final_approve_'.$request['id'],
                        'type' => 'final_approval',
                        'description' => "Request {$request['request_number']} finally approved",
                        'user' => $request['approver'],
                        'created_at' => $request['approved_at'],
                        'details' => [
                            'request_id' => $request['id'],
                            'status' => 'approved',
                        ]
                    ]);
                }

                if ($request['denied_at']) {
                    $activities->push([
                        'id' => 'final_deny_'.$request['id'],
                        'type' => 'final_denial',
                        'description' => "Request {$request['request_number']} denied",
                        'user' => $request['approver'],
                        'created_at' => $request['denied_at'],
                        'details' => [
                            'request_id' => $request['id'],
                            'status' => 'denied',
                            'reason' => $request['denial_reason'],
                        ]
                    ]);
                }
            }

            // Sort activities by date
            $activities = $activities->sortByDesc('created_at')->values();

            // Calculate summary statistics
            $takenRequests = $ptoRequests->where('status', 'approved')->where('is_planned', false);
            $plannedRequests = $ptoRequests->where('status', 'approved')->where('is_planned', true);
            $pendingRequests = $ptoRequests->whereIn('status', ['pending', 'submitted']);

            $summary = [
                'total_taken' => $takenRequests->sum('total_days'),
                'total_planned' => $plannedRequests->sum('total_days'),
                'total_pending' => $pendingRequests->sum('total_days'),
                'requests_count' => $ptoRequests->count(),
                'approved_count' => $ptoRequests->where('status', 'approved')->count(),
                'pending_count' => $pendingRequests->count(),
                'denied_count' => $ptoRequests->where('status', 'denied')->count(),
                'cancelled_count' => $ptoRequests->where('status', 'cancelled')->count(),
            ];

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'department' => $user->profile->department ?? 'N/A',
                ],
                'balances' => $balance->map(function ($bal) {
                    return [
                        'id' => $bal->id,
                        'pto_type' => $bal->ptoType->name,
                        'balance' => $bal->balance,
                        'used_balance' => $bal->used_balance,
                        'pending_balance' => $bal->pending_balance,
                        'available_balance' => max(0, $bal->balance - $bal->pending_balance - $bal->used_balance),
                        'year' => $bal->year,
                    ];
                }),
                'requests' => $ptoRequests->values(),
                'activities' => $activities,
                'summary' => $summary,
                'year' => $year,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get PTO details.',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get approval history for a specific request
     */
    public function getRequestActivities(PtoRequest $request): JsonResponse
    {
        try {
            $activities = collect();

            // Load the request with relationships
            $request->load(['approvals.approver', 'user', 'approver']);

            // Add submission activity
            $activities->push([
                'id' => 'submit_'.$request->id,
                'type' => 'submission',
                'description' => "PTO request {$request->request_number} submitted",
                'user' => $request->user->name,
                'created_at' => $request->submitted_at,
                'details' => [
                    'request_id' => $request->id,
                    'days' => $request->total_days,
                    'reason' => $request->reason,
                ]
            ]);

            // Add approval activities
            foreach ($request->approvals as $approval) {
                if ($approval->responded_at) {
                    $activities->push([
                        'id' => 'approval_'.$approval->id,
                        'type' => 'approval',
                        'description' => "Request {$approval->status} by {$approval->approver->name}",
                        'user' => $approval->approver->name,
                        'created_at' => $approval->responded_at,
                        'details' => [
                            'status' => $approval->status,
                            'comments' => $approval->comments,
                            'level' => $approval->level,
                        ]
                    ]);
                }
            }

            // Add final status changes
            if ($request->approved_at) {
                $activities->push([
                    'id' => 'final_approve_'.$request->id,
                    'type' => 'final_approval',
                    'description' => "Request finally approved",
                    'user' => $request->approver ? $request->approver->name : 'System',
                    'created_at' => $request->approved_at,
                    'details' => [
                        'status' => 'approved',
                    ]
                ]);
            }

            if ($request->denied_at) {
                $activities->push([
                    'id' => 'final_deny_'.$request->id,
                    'type' => 'final_denial',
                    'description' => "Request denied",
                    'user' => $request->approver ? $request->approver->name : 'System',
                    'created_at' => $request->denied_at,
                    'details' => [
                        'status' => 'denied',
                        'reason' => $request->denial_reason,
                    ]
                ]);
            }

            // Sort by date
            $activities = $activities->sortByDesc('created_at')->values();

            return response()->json($activities);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get request activities.',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
