<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserReportingAssignment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;


class UserHierarchyController extends Controller
{
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
     * If it's slightly in the future (within a tolerance), it caps it at Carbon::now('UTC').
     * This helps avoid validation errors for "almost now" selections from the client.
     */
    private function prepareStartDateForValidation(Request $request): void
    {
        $originalStartDateRequest = $request->input('start_date');
        $startDateForValidation = $originalStartDateRequest;

        if ($originalStartDateRequest) {
            try {
                // Frontend sends YYYY-MM-DD HH:MM:SS UTC.
                $parsedInputDate = Carbon::createFromFormat('Y-m-d H:i:s', $originalStartDateRequest, 'UTC');
                $now = Carbon::now('UTC');

                // If the input date is in the future but within a 2-minute tolerance (120 seconds), cap it at 'now'.
                if ($parsedInputDate->isAfter($now) && $parsedInputDate->diffInSeconds($now) < 120) {
                    $startDateForValidation = $now->toDateTimeString(); // Format as YYYY-MM-DD HH:MM:SS
                    Log::info("Original start date '{$originalStartDateRequest}' was slightly in future, adjusted to '{$startDateForValidation}' for validation.");
                }
            } catch (\Exception $e) {
                // If parsing fails, let the main validator catch the format error.
                Log::warning("Could not parse input start_date '{$originalStartDateRequest}' during pre-processing. Validation will proceed with original value. Error: ".$e->getMessage());
            }
            // Merge the potentially adjusted start_date back into the request for validation.
            $request->merge(['start_date' => $startDateForValidation]);
        }
    }


    /**
     * Assign or update a user's position.
     */
    public function assignPosition(Request $request, User $user): JsonResponse
    {
        $this->prepareStartDateForValidation($request); // Pre-process start_date

        $validator = Validator::make($request->all(), [
            'position_id' => 'required|integer|exists:positions,id',
            'start_date' => 'required|date_format:Y-m-d H:i:s|before_or_equal:now',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Use the validated (and potentially adjusted by prepareStartDateForValidation) start_date
        $newPositionId = $validator->validated()['position_id'];
        $startDateForDb = Carbon::createFromFormat('Y-m-d H:i:s', $validator->validated()['start_date'], 'UTC');

        DB::beginTransaction();
        try {
            $user->currentReportingAssignment()
                ->where('position_id', '!=', $newPositionId) // Only end if position is truly different
                ->update(['end_date' => $startDateForDb->copy()->subSecond()]);

            $user->position_id = $newPositionId;
            $user->save();

            UserReportingAssignment::create([
                'user_id' => $user->id,
                'manager_id' => $user->reports_to_user_id,
                'position_id' => $newPositionId,
                'start_date' => $startDateForDb,
                'end_date' => null,
            ]);

            DB::commit();
            Log::info("Position ID {$newPositionId} assigned to User ID {$user->id}.");
            return response()->json([
                'message' => 'User position updated successfully.',
                'user' => $user->load(['currentPosition', 'manager']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error assigning position to User ID {$user->id}: ".$e->getMessage(),
                ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'error' => 'Failed to assign position.',
                'details' => App::environment('local') ? $e->getMessage() : 'An unexpected error occurred.'
            ], 500);
        }
    }

    /**
     * Assign or update a user's direct manager.
     */
    public function assignManager(Request $request, User $user): JsonResponse
    {
        if (is_null($user->position_id)) {
            Log::warning("Attempted to assign manager to User ID {$user->id} who has no position assigned.");
            return response()->json([
                'errors' => ['user_position' => ['The user must have a position assigned before a manager can be set. Please assign a position to this user first.']]
            ], 422);
        }

        $this->prepareStartDateForValidation($request); // Pre-process start_date

        $validator = Validator::make($request->all(), [
            'manager_id' => 'required|integer|exists:users,id|different:user_id',
            'start_date' => 'required|date_format:Y-m-d H:i:s|before_or_equal:now',
        ], [
            'manager_id.different' => 'A user cannot report to themselves.'
        ]);

        $validator->setData(array_merge($request->all(), ['user_id' => $user->id]));

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Use the validated (and potentially adjusted) start_date
        $newManagerId = $validator->validated()['manager_id'];
        $startDateForDb = Carbon::createFromFormat('Y-m-d H:i:s', $validator->validated()['start_date'], 'UTC');


        $potentialNewManager = User::find($newManagerId);
        if ($potentialNewManager && $potentialNewManager->reports_to_user_id === $user->id) {
            return response()->json(['errors' => ['manager_id' => ['This assignment would create a circular reporting structure.']]],
                422);
        }

        DB::beginTransaction();
        try {
            $user->currentReportingAssignment()
                ->where('manager_id', '!=', $newManagerId) // Only end if manager is truly different
                ->update(['end_date' => $startDateForDb->copy()->subSecond()]);

            $user->reports_to_user_id = $newManagerId;
            $user->save();

            UserReportingAssignment::create([
                'user_id' => $user->id,
                'manager_id' => $newManagerId,
                'position_id' => $user->position_id,
                'start_date' => $startDateForDb,
                'end_date' => null,
            ]);

            DB::commit();
            Log::info("Manager ID {$newManagerId} assigned to User ID {$user->id}.");
            return response()->json([
                'message' => 'User manager updated successfully.',
                'user' => $user->load(['currentPosition', 'manager']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error assigning manager to User ID {$user->id}: ".$e->getMessage(),
                ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'error' => 'Failed to assign manager.',
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
        // Fetch users. Ensure 'position' is included.
        // If 'position' is from a related model (e.g., 'currentPosition()'), eager load it.
        $users = User::with('currentPosition') // Assuming 'currentPosition' is a relationship returning a Position model with a 'name' attribute
        ->get();

        $transformedUsers = $users->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'reports_to_user_id' => $user->reports_to_user_id,
                'avatar' => $user->avatar, // Ensure this field exists and contains a URL or path
                'position' => $user->currentPosition ? $user->currentPosition->name : ($user->position ?? 'N/A'),
                // Example: Fallback to a direct 'position' attribute if 'currentPosition' is null or doesn't exist
            ];
        });

        return response()->json($transformedUsers);
    }

}
