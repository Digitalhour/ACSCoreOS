<?php

namespace App\Http\Controllers;

use App\Models\PtoModels\PtoApproval;
use App\Models\PtoModels\PtoBalance;
use App\Models\PtoModels\PtoRequest;
use App\Models\PtoModels\PtoType;
use App\Models\User;
use App\Services\BlackoutValidationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class DepartmentTimeOffController extends Controller
{
    public function __construct(
        private BlackoutValidationService $blackoutService
    ) {}

    public function dashboard()
    {
        $user = Auth::user();
        $currentYear = Carbon::now()->year;

        Log::info("Department dashboard accessed by user: {$user->id} ({$user->name})");

        // Get all PTO requests that this user should be able to see
        $requests = $this->getDepartmentPtoRequests($user);

        Log::info("Found {$requests->count()} total requests for user {$user->id}");

        // Get department PTO requests for calendar
        $departmentPtoRequests = $this->getDepartmentCalendarRequests($user, $currentYear);

        return Inertia::render('DepartmentTimeOffDashboard', [
            'requests' => $requests,
            'department_pto_requests' => $departmentPtoRequests,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * Get all PTO requests that the current user should be able to see
     */
    private function getDepartmentPtoRequests(User $user)
    {
        $query = PtoRequest::with([
            'user:id,name,email,reports_to_user_id',
            'ptoType:id,name,code,color,multi_level_approval',
            'approvals.approver:id,name,email'
        ]);

        // Get user IDs that this manager/supervisor should be able to see
        $visibleUserIds = $this->getVisibleUserIds($user);

        Log::info("User {$user->id} can see requests from users: " . implode(', ', $visibleUserIds));

        // Filter requests to only show those from visible users
        $query->whereIn('user_id', $visibleUserIds);

        // Also include requests where current user is specifically assigned as approver
        $query->orWhere(function($subQuery) use ($user) {
            $subQuery->whereHas('approvals', function($approvalQuery) use ($user) {
                $approvalQuery->where('approver_id', $user->id);
            });
        });

        $requests = $query->orderBy('created_at', 'desc')->get();

        return $requests->map(function ($request) use ($user) {
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
                'start_date' => $request->start_date->format('Y-m-d'),
                'end_date' => $request->end_date->format('Y-m-d'),
                'total_days' => (float) $request->total_days,
                'reason' => $request->reason,
                'status' => $request->status,
                'submitted_at' => $request->created_at->format('Y-m-d H:i:s'),
                'requires_multi_level_approval' => (bool) ($request->ptoType->multi_level_approval ?? false),
                // Add blackout information
                'has_blackout_conflicts' => $request->hasBlackoutConflicts(),
                'has_blackout_warnings' => $request->hasBlackoutWarnings(),
                'has_emergency_override' => $request->hasEmergencyOverride(),
                'override_approved' => $request->isOverrideApproved(),
                'approvals' => $request->approvals->map(function ($approval) {
                    return [
                        'id' => $approval->id,
                        'approver' => [
                            'id' => $approval->approver->id,
                            'name' => $approval->approver->name,
                            'email' => $approval->approver->email,
                        ],
                        'status' => $approval->status,
                        'comments' => $approval->comments,
                        'level' => $approval->level,
                        'sequence' => $approval->sequence,
                        'responded_at' => $approval->responded_at?->format('Y-m-d H:i:s'),
                    ];
                })->toArray(),
                // Add flag for current user approval capability
                'current_user_can_approve' => $this->canCurrentUserApprove($request, $user),
            ];
        });
    }

    /**
     * Check if current user can approve this specific request
     */
    private function canCurrentUserApprove(PtoRequest $request, User $user): bool
    {
        // Check regular approval flow
        $hasRegularApproval = $request->approvals()
            ->where('approver_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        // For requests with blackout conflicts, also check if user can approve emergency overrides
        if ($request->hasBlackoutConflicts() && $request->hasEmergencyOverride()) {
            // Check if user has authority to approve emergency overrides
            // This could be based on role, permission, or being a manager
            $canApproveOverride = $this->canApproveEmergencyOverride($user, $request);
            return $hasRegularApproval || $canApproveOverride;
        }

        return $hasRegularApproval;
    }

    /**
     * Check if user can approve emergency overrides
     */
    private function canApproveEmergencyOverride(User $user, PtoRequest $request): bool
    {
        // Check if user is in the approval chain (any level)
        $isInApprovalChain = $request->approvals()
            ->where('approver_id', $user->id)
            ->exists();

        // Check if user is manager of the request user or in their hierarchy
        $isManagerInHierarchy = $this->isManagerInHierarchy($user, $request->user);

        return $isInApprovalChain || $isManagerInHierarchy;
    }

    /**
     * Check if user is in the management hierarchy of the request user
     */
    private function isManagerInHierarchy(User $manager, User $employee): bool
    {
        $currentUser = $employee;
        $maxLevels = 5; // Prevent infinite loops
        $level = 0;

        while ($currentUser->reports_to_user_id && $level < $maxLevels) {
            if ($currentUser->reports_to_user_id === $manager->id) {
                return true;
            }
            $currentUser = User::find($currentUser->reports_to_user_id);
            if (!$currentUser) {
                break;
            }
            $level++;
        }

        return false;
    }

    /**
     * Get user IDs that the current user can see PTO requests for
     */
    private function getVisibleUserIds(User $user): array
    {
        $userIds = collect();

        // 1. Always include the current user's own requests
        $userIds->push($user->id);

        // 2. Include direct reports (people who report to this user)
        $directReports = User::where('reports_to_user_id', $user->id)->pluck('id');
        if ($directReports->isNotEmpty()) {
            Log::info("User {$user->id} has direct reports: " . $directReports->implode(', '));
            $userIds = $userIds->merge($directReports);
        }

        // 3. Include department members if user is a department manager/head
        if ($this->isUserDepartmentManager($user)) {
            Log::info("User {$user->id} is identified as a department manager");

            // Get all users in the same departments as this user
            $departmentUserIds = DB::table('department_user as du1')
                ->join('department_user as du2', 'du1.department_id', '=', 'du2.department_id')
                ->where('du1.user_id', $user->id)
                ->pluck('du2.user_id');

            if ($departmentUserIds->isNotEmpty()) {
                Log::info("User {$user->id} can see department members: " . $departmentUserIds->implode(', '));
                $userIds = $userIds->merge($departmentUserIds);
            }
        }

        // 4. Include users where this person is assigned as an approver
        $approverUserIds = DB::table('pto_approvals')
            ->join('pto_requests', 'pto_approvals.pto_request_id', '=', 'pto_requests.id')
            ->where('pto_approvals.approver_id', $user->id)
            ->pluck('pto_requests.user_id');

        if ($approverUserIds->isNotEmpty()) {
            Log::info("User {$user->id} is approver for users: " . $approverUserIds->implode(', '));
            $userIds = $userIds->merge($approverUserIds);
        }

        $finalUserIds = $userIds->unique()->toArray();
        Log::info("Final visible user IDs for user {$user->id}: " . implode(', ', $finalUserIds));

        return $finalUserIds;
    }

    /**
     * Check if user is a department manager/head
     */
    private function isUserDepartmentManager(User $user): bool
    {
        // Method 1: Check by role (if you're using roles/permissions)
        if (method_exists($user, 'hasRole')) {
            $managerRoles = ['manager', 'department_head', 'supervisor', 'admin', 'hr'];
            foreach ($managerRoles as $role) {
                if ($user->hasRole($role)) {
                    Log::info("User {$user->id} has manager role: {$role}");
                    return true;
                }
            }
        }

//        // Method 2: Check by permission
//        if (method_exists($user, 'can')) {
//            $permissions = ['manage_department_pto', 'approve_pto', 'manage_team'];
//            foreach ($permissions as $permission) {
//                if ($user->can($permission)) {
//                    Log::info("User {$user->id} has manager permission: {$permission}");
//                    return true;
//                }
//            }
//        }

        // Method 3: Check if user has direct reports
        $hasDirectReports = User::where('reports_to_user_id', $user->id)->exists();
        if ($hasDirectReports) {
            Log::info("User {$user->id} has direct reports, considered manager");
            return true;
        }

        // Method 4: Check if user has any pending approvals (fallback)
        $hasApprovals = PtoApproval::where('approver_id', $user->id)->exists();
        if ($hasApprovals) {
            Log::info("User {$user->id} has approval records, considered manager");
            return true;
        }

        Log::info("User {$user->id} is not identified as a department manager");
        return false;
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

        try {
            DB::transaction(function () use ($approval, $request, $ptoRequest, $user) {
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
                        'approved_by_id' => $user->id,
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
            });

            Log::info("PTO Request approved: ID {$ptoRequest->id}, Approver: {$user->name}");
            return back()->with('success', 'Request approved successfully!');

        } catch (\Exception $e) {
            Log::error("Error approving PTO Request ID {$ptoRequest->id}: " . $e->getMessage());
            return back()->with('error', 'Failed to approve request. Please try again.');
        }
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

        try {
            DB::transaction(function () use ($approval, $request, $ptoRequest, $user) {
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
                    'denied_by_id' => $user->id,
                    'denial_reason' => $request->comments,
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
            });

            Log::info("PTO Request denied: ID {$ptoRequest->id}, Approver: {$user->name}");
            return back()->with('success', 'Request denied successfully!');

        } catch (\Exception $e) {
            Log::error("Error denying PTO Request ID {$ptoRequest->id}: " . $e->getMessage());
            return back()->with('error', 'Failed to deny request. Please try again.');
        }
    }

    /**
     * Approve emergency override
     */
    public function approveOverride(Request $request, PtoRequest $ptoRequest)
    {
        $request->validate([
            'approved' => 'required|boolean',
            'reason' => 'nullable|string',
        ]);

        if (!$ptoRequest->hasEmergencyOverride()) {
            return back()->with('error', 'No emergency override found for this request.');
        }

        try {
            $result = $this->blackoutService->processEmergencyOverrideApproval(
                $ptoRequest,
                Auth::user(),
                $request->boolean('approved'),
                $request->get('reason')
            );

            if ($result['success']) {
                return back()->with('success', $result['message']);
            } else {
                return back()->with('error', $result['message']);
            }
        } catch (\Exception $e) {
            Log::error("Error processing emergency override for PTO Request ID {$ptoRequest->id}: " . $e->getMessage());
            return back()->with('error', 'Failed to process emergency override.');
        }
    }

    /**
     * Get department PTO requests for calendar view.
     */
    private function getDepartmentCalendarRequests(User $user, int $year): array
    {
        // Get users that this manager can see
        $visibleUserIds = $this->getVisibleUserIds($user);

        // Get PTO type IDs that should be shown in department calendar
        $showablePtoTypeIds = PtoType::where('show_in_department_calendar', 1)
            ->where('is_active', 1)
            ->pluck('id')
            ->toArray();

        // Get department PTO requests
        $allRequests = PtoRequest::with(['user', 'ptoType'])
            ->whereIn('user_id', $visibleUserIds)
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
                'start_date' => $request->start_date->format('Y-m-d'),
                'end_date' => $request->end_date->format('Y-m-d'),
                'total_days' => (float) $request->total_days,
                'status' => $request->status,
            ];
        })->toArray();
    }
}
