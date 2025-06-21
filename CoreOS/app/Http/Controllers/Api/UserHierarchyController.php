<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeReportingAssignment;
use App\Models\User;
use App\Services\HierarchyTransferService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class UserHierarchyController extends Controller
{
    public function __construct(
        private HierarchyTransferService $hierarchyTransferService
    ) {}

    /**
     * List users with their current position and manager names.
     */
    public function getUsersWithHierarchyInfo(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'per_page' => 'nullable|integer|min:5|max:100',
            'page' => 'nullable|integer|min:1',
            'search' => 'nullable|string|max:255',
            'position_id' => 'nullable|integer|exists:positions,id',
            'manager_id' => 'nullable|integer|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $query = User::with(['currentPosition:id,name', 'manager:id,name,email']);

        if ($request->filled('search')) {
            $searchTerm = '%'.$request->input('search').'%';
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', $searchTerm)
                    ->orWhere('email', 'like', $searchTerm);
            });
        }

        if ($request->filled('position_id')) {
            $query->where('position_id', $request->input('position_id'));
        }

        if ($request->filled('manager_id')) {
            $query->where('reports_to_user_id', $request->input('manager_id'));
        }

        $perPage = $request->input('per_page', 15);
        $users = $query->orderBy('name')->paginate($perPage);

        return response()->json($users);
    }

    /**
     * Pre-processes the start_date from the request.
     */
    private function prepareStartDateForValidation(Request $request): void
    {
        $originalStartDateRequest = $request->input('start_date');
        $startDateForValidation = $originalStartDateRequest;

        if ($originalStartDateRequest) {
            try {
                $parsedInputDate = Carbon::createFromFormat('Y-m-d H:i:s', $originalStartDateRequest, 'UTC');
                $now = Carbon::now('UTC');

                if ($parsedInputDate->isAfter($now) && $parsedInputDate->diffInSeconds($now) < 120) {
                    $startDateForValidation = $now->toDateTimeString();
                    Log::info("Original start date '{$originalStartDateRequest}' was slightly in future, adjusted to '{$startDateForValidation}' for validation.");
                }
            } catch (\Exception $e) {
                Log::warning("Could not parse input start_date '{$originalStartDateRequest}' during pre-processing. Validation will proceed with original value. Error: ".$e->getMessage());
            }
            $request->merge(['start_date' => $startDateForValidation]);
        }
    }

    /**
     * Assign or update a user's position.
     */
    public function assignPosition(Request $request, $userId)
    {
        $request->validate([
            'position_id' => 'required|exists:positions,id',
            'start_date' => 'required|date_format:Y-m-d H:i:s',
        ]);

        try {
            DB::beginTransaction();

            $user = User::findOrFail($userId);
            $newPositionId = $request->position_id;
            $startDateForDb = Carbon::createFromFormat('Y-m-d H:i:s', $request->start_date, 'UTC');

            // Close existing reporting assignments for different positions
            $user->currentReportingAssignment()
                ->where('position_id', '!=', $newPositionId)
                ->update(['end_date' => $startDateForDb->copy()->subSecond()]);

            // Update user's position
            $user->position_id = $newPositionId;
            $user->save();

            // Create new reporting assignment
            EmployeeReportingAssignment::create([
                'user_id' => $user->id,
                'manager_id' => $user->reports_to_user_id,
                'position_id' => $newPositionId,
                'start_date' => $startDateForDb,
                'end_date' => null,
            ]);

            DB::commit();

            Log::info("Position assigned successfully", [
                'user_id' => $userId,
                'position_id' => $newPositionId,
                'start_date' => $request->start_date
            ]);

            return redirect()->back()->with('success', 'Position assigned successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Position assignment failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to assign position: ' . $e->getMessage());
        }
    }

    public function assignManager(Request $request, $userId)
    {
        $request->validate([
            'manager_id' => 'required|exists:users,id',
            'start_date' => 'required|date_format:Y-m-d H:i:s',
        ]);

        try {
            DB::beginTransaction();

            $user = User::findOrFail($userId);
            $newManagerId = $request->manager_id;
            $startDateForDb = Carbon::createFromFormat('Y-m-d H:i:s', $request->start_date, 'UTC');

            // Prevent self-assignment
            if ($userId == $newManagerId) {
                return redirect()->back()->with('error', 'User cannot be their own manager.');
            }

            // Check for circular reporting
            $potentialNewManager = User::find($newManagerId);
            if ($potentialNewManager && $potentialNewManager->reports_to_user_id == $userId) {
                return redirect()->back()->with('error', 'This assignment would create a circular reporting structure.');
            }

            // Close existing reporting assignments for different managers
            $user->currentReportingAssignment()
                ->where('manager_id', '!=', $newManagerId)
                ->update(['end_date' => $startDateForDb->copy()->subSecond()]);

            // Update user's manager
            $user->reports_to_user_id = $newManagerId;
            $user->save();

            // Create new reporting assignment
            EmployeeReportingAssignment::create([
                'user_id' => $user->id,
                'manager_id' => $newManagerId,
                'position_id' => $user->position_id,
                'start_date' => $startDateForDb,
                'end_date' => null,
            ]);

            DB::commit();

            Log::info("Manager assigned successfully", [
                'user_id' => $userId,
                'manager_id' => $newManagerId,
                'start_date' => $request->start_date
            ]);

            return redirect()->back()->with('success', 'Manager assigned successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Manager assignment failed: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to assign manager: ' . $e->getMessage());
        }
    }


    /**
     * Transfer all pending approvals from one user to another
     */
    public function transferApprovals(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'from_user_id' => 'required|integer|exists:users,id',
            'to_user_id' => 'required|integer|exists:users,id|different:from_user_id',
            'reason' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $fromUserId = $request->input('from_user_id');
        $toUserId = $request->input('to_user_id');
        $reason = $request->input('reason', 'Manual transfer');

        try {
            $result = $this->hierarchyTransferService->transferAllPendingApprovals(
                $fromUserId,
                $toUserId,
                $reason
            );

            return response()->json([
                'message' => "Successfully transferred {$result['transferred']} pending approvals.",
                'transferred_count' => $result['transferred'],
                'errors' => $result['errors']
            ]);

        } catch (\Exception $e) {
            Log::error("Error in manual approval transfer from {$fromUserId} to {$toUserId}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to transfer approvals.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Get summary of approvals that would be affected by hierarchy changes
     */
    public function getApprovalTransferPreview(User $user): JsonResponse
    {
        try {
            $summary = $this->hierarchyTransferService->getPendingApprovalsSummary($user);
            return response()->json($summary);
        } catch (\Exception $e) {
            Log::error("Error getting approval transfer preview for user {$user->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to get approval preview.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Rebuild approval chains for affected users
     */
    public function rebuildApprovalChains(User $user): JsonResponse
    {
        try {
            $result = $this->hierarchyTransferService->rebuildApprovalChains($user);

            return response()->json([
                'message' => "Successfully rebuilt {$result['rebuilt']} approval chains.",
                'rebuilt_count' => $result['rebuilt'],
                'errors' => $result['errors']
            ]);

        } catch (\Exception $e) {
            Log::error("Error rebuilding approval chains for user {$user->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to rebuild approval chains.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Get a user's hierarchy details (manager, subordinates, assignment history).
     */
    public function getUserHierarchyDetails(User $user): JsonResponse
    {
        $user->load([
            'currentPosition:id,name',
            'manager:id,name,email',
            'subordinates:id,name,email',
            'subordinates.currentPosition:id,name',
            'reportingAssignments' => function ($query) {
                $query->with(['position:id,name', 'manager:id,name,email'])->orderBy('start_date', 'desc');
            }
        ]);
        return response()->json($user);
    }

    /**
     * Get a list of users who can be assigned as a manager to the given user.
     */
    public function getAssignableManagers(User $user): JsonResponse
    {
        $excludedIds = $this->getSubordinateIdsRecursive($user, [$user->id]);

        $assignableManagers = User::whereNotIn('id', $excludedIds)
            ->orderBy('name')
            ->select('id', 'name', 'email')
            ->get();
        return response()->json($assignableManagers);
    }

    private function getSubordinateIdsRecursive(User $manager, array $excludedIds = []): array
    {
        $directSubordinates = $manager->subordinates()->get();
        foreach ($directSubordinates as $subordinate) {
            if (!in_array($subordinate->id, $excludedIds)) {
                $excludedIds[] = $subordinate->id;
                $excludedIds = $this->getSubordinateIdsRecursive($subordinate, $excludedIds);
            }
        }
        return array_unique($excludedIds);
    }

    public function getHierarchy()
    {
        $users = User::with('currentPosition')
            ->get();

        $transformedUsers = $users->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'reports_to_user_id' => $user->reports_to_user_id,
                'avatar' => $user->avatar,
                'position' => $user->currentPosition ? $user->currentPosition->name : ($user->position ?? 'N/A'),
            ];
        });

        return response()->json($transformedUsers);
    }
}
