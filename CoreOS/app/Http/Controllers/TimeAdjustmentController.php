<?php

namespace App\Http\Controllers;

use App\Models\BreakEntry;
use App\Models\TimeAdjustment;
use App\Models\TimeEntry;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TimeAdjustmentController extends Controller
{
    /**
     * Get time adjustments for the current user
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $adjustments = TimeAdjustment::where('user_id', $user->id)
            ->with(['timeEntry', 'breakEntry', 'requestedBy', 'approvedBy', 'rejectedBy'])
            ->when($request->filled('status'), function ($query) use ($request) {
                return $query->where('status', $request->status);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'adjustments' => $adjustments->items(),
            'pagination' => [
                'current_page' => $adjustments->currentPage(),
                'last_page' => $adjustments->lastPage(),
                'per_page' => $adjustments->perPage(),
                'total' => $adjustments->total(),
            ],
        ]);
    }

    /**
     * Get pending adjustments for manager/admin review
     */
    public function getPendingAdjustments(Request $request): JsonResponse
    {
        $currentUser = Auth::user();

        // Get users this manager can see
        $visibleUserIds = $currentUser->getVisibleUsers()->pluck('id');

        $adjustments = TimeAdjustment::with([
            'user',
            'timeEntry',
            'breakEntry',
            'requestedBy',
            'approvedBy',
            'rejectedBy'
        ])
            ->whereIn('user_id', $visibleUserIds)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'adjustments' => $adjustments->items(),
            'pagination' => [
                'current_page' => $adjustments->currentPage(),
                'last_page' => $adjustments->lastPage(),
                'per_page' => $adjustments->perPage(),
                'total' => $adjustments->total(),
            ],
        ]);
    }

    /**
     * Request a missed punch adjustment
     */
    public function requestMissedPunch(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date',
            'clock_in_time' => 'required|date_format:H:i',
            'clock_out_time' => 'required|date_format:H:i|after:clock_in_time',
            'reason' => 'required|string|max:1000',
            'employee_notes' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();
        $date = Carbon::parse($request->date);
        $clockInTime = $date->copy()->setTimeFromTimeString($request->clock_in_time);
        $clockOutTime = $date->copy()->setTimeFromTimeString($request->clock_out_time);

        // Check if there's already an entry for this date
        $existingEntry = TimeEntry::where('user_id', $user->id)
            ->whereDate('clock_in_time', $date->format('Y-m-d'))
            ->first();

        if ($existingEntry) {
            return response()->json([
                'error' => 'There is already a time entry for this date. Please use time correction instead.',
            ], 422);
        }

        // Calculate hours
        $totalMinutes = $clockInTime->diffInMinutes($clockOutTime);
        $totalHours = round($totalMinutes / 60, 2);

        try {
            $adjustment = TimeAdjustment::create([
                'user_id' => $user->id,
                'adjustment_type' => 'missed_punch',
                'adjusted_clock_in' => $clockInTime,
                'adjusted_clock_out' => $clockOutTime,
                'adjusted_hours' => $totalHours,
                'reason' => $request->reason,
                'employee_notes' => $request->employee_notes,
                'requested_by_user_id' => $user->id,
                'status' => 'pending',
            ]);

            Log::info("Missed punch adjustment requested: User {$user->name} (ID: {$user->id}) for {$date->format('Y-m-d')}");

            return response()->json([
                'message' => 'Missed punch adjustment requested successfully',
                'adjustment' => $adjustment->load(['requestedBy']),
            ], 201);

        } catch (\Exception $e) {
            Log::error("Failed to create missed punch adjustment for user {$user->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to create adjustment request. Please try again.',
            ], 500);
        }
    }

    /**
     * Request a time correction for existing entry
     */
    public function requestTimeCorrection(Request $request): JsonResponse
    {
        $request->validate([
            'time_entry_id' => 'required|exists:time_entries,id',
            'adjusted_clock_in' => 'nullable|date',
            'adjusted_clock_out' => 'nullable|date',
            'reason' => 'required|string|max:1000',
            'employee_notes' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();
        $timeEntry = TimeEntry::findOrFail($request->time_entry_id);

        // Check if user owns this time entry
        if ($timeEntry->user_id !== $user->id) {
            return response()->json([
                'error' => 'You can only request corrections for your own time entries.',
            ], 403);
        }

        // Validate that at least one time is being adjusted
        if (!$request->adjusted_clock_in && !$request->adjusted_clock_out) {
            return response()->json([
                'error' => 'You must specify at least one time to adjust.',
            ], 422);
        }

        try {
            // Store original data
            $originalData = [
                'clock_in_time' => $timeEntry->clock_in_time,
                'clock_out_time' => $timeEntry->clock_out_time,
                'total_hours' => $timeEntry->total_hours,
                'regular_hours' => $timeEntry->regular_hours,
                'overtime_hours' => $timeEntry->overtime_hours,
            ];

            // Calculate new hours if both times are provided
            $adjustedHours = null;
            if ($request->adjusted_clock_in && $request->adjusted_clock_out) {
                $clockIn = Carbon::parse($request->adjusted_clock_in);
                $clockOut = Carbon::parse($request->adjusted_clock_out);

                if ($clockOut <= $clockIn) {
                    return response()->json([
                        'error' => 'Clock out time must be after clock in time.',
                    ], 422);
                }

                $totalBreakMinutes = $timeEntry->getTotalBreakMinutes();
                $totalMinutes = $clockIn->diffInMinutes($clockOut);
                $workMinutes = $totalMinutes - $totalBreakMinutes;
                $adjustedHours = round($workMinutes / 60, 2);
            }

            $adjustment = TimeAdjustment::create([
                'user_id' => $user->id,
                'time_entry_id' => $timeEntry->id,
                'adjustment_type' => 'time_correction',
                'original_data' => $originalData,
                'adjusted_clock_in' => $request->adjusted_clock_in ? Carbon::parse($request->adjusted_clock_in) : null,
                'adjusted_clock_out' => $request->adjusted_clock_out ? Carbon::parse($request->adjusted_clock_out) : null,
                'adjusted_hours' => $adjustedHours,
                'reason' => $request->reason,
                'employee_notes' => $request->employee_notes,
                'requested_by_user_id' => $user->id,
                'status' => 'pending',
            ]);

            Log::info("Time correction requested: User {$user->name} (ID: {$user->id}) for time entry {$timeEntry->id}");

            return response()->json([
                'message' => 'Time correction requested successfully',
                'adjustment' => $adjustment->load(['timeEntry', 'requestedBy']),
            ], 201);

        } catch (\Exception $e) {
            Log::error("Failed to create time correction for user {$user->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to create adjustment request. Please try again.',
            ], 500);
        }
    }

    /**
     * Request a break adjustment
     */
    public function requestBreakAdjustment(Request $request): JsonResponse
    {
        $request->validate([
            'break_entry_id' => 'required|exists:break_entries,id',
            'adjusted_break_start' => 'nullable|date',
            'adjusted_break_end' => 'nullable|date',
            'reason' => 'required|string|max:1000',
            'employee_notes' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();
        $breakEntry = BreakEntry::findOrFail($request->break_entry_id);

        // Check if user owns this break entry
        if ($breakEntry->user_id !== $user->id) {
            return response()->json([
                'error' => 'You can only request adjustments for your own break entries.',
            ], 403);
        }

        try {
            // Store original data
            $originalData = [
                'break_start' => $breakEntry->break_start,
                'break_end' => $breakEntry->break_end,
                'duration_minutes' => $breakEntry->duration_minutes,
            ];

            $adjustment = TimeAdjustment::create([
                'user_id' => $user->id,
                'break_entry_id' => $breakEntry->id,
                'adjustment_type' => 'break_adjustment',
                'original_data' => $originalData,
                'reason' => $request->reason,
                'employee_notes' => $request->employee_notes,
                'requested_by_user_id' => $user->id,
                'status' => 'pending',
            ]);

            Log::info("Break adjustment requested: User {$user->name} (ID: {$user->id}) for break entry {$breakEntry->id}");

            return response()->json([
                'message' => 'Break adjustment requested successfully',
                'adjustment' => $adjustment->load(['breakEntry', 'requestedBy']),
            ], 201);

        } catch (\Exception $e) {
            Log::error("Failed to create break adjustment for user {$user->id}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to create adjustment request. Please try again.',
            ], 500);
        }
    }

    /**
     * Approve an adjustment request
     */
    public function approve(Request $request, $adjustmentId): JsonResponse
    {
        $request->validate([
            'approval_notes' => 'nullable|string|max:1000',
        ]);

        $adjustment = TimeAdjustment::findOrFail($adjustmentId);

        if ($adjustment->status !== 'pending') {
            return response()->json([
                'error' => 'This adjustment has already been processed.',
            ], 422);
        }

        try {
            DB::transaction(function () use ($adjustment, $request) {
                // Apply the adjustment based on type
                switch ($adjustment->adjustment_type) {
                    case 'missed_punch':
                        $this->applyMissedPunchAdjustment($adjustment);
                        break;

                    case 'time_correction':
                        $this->applyTimeCorrectionAdjustment($adjustment);
                        break;

                    case 'break_adjustment':
                        $this->applyBreakAdjustment($adjustment);
                        break;
                }

                // Update adjustment record
                $adjustment->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approved_by_user_id' => Auth::id(),
                    'approval_notes' => $request->approval_notes,
                ]);
            });

            Log::info("Time adjustment approved: ID {$adjustment->id}, User: {$adjustment->user->name}, Approved by: ".Auth::user()->name);

            return response()->json([
                'message' => 'Adjustment approved successfully',
                'adjustment' => $adjustment->fresh()->load(['user', 'approvedBy']),
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to approve adjustment ID {$adjustmentId}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to approve adjustment. Please try again.',
            ], 500);
        }
    }

    /**
     * Reject an adjustment request
     */
    public function reject(Request $request, $adjustmentId): JsonResponse
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $adjustment = TimeAdjustment::findOrFail($adjustmentId);

        if ($adjustment->status !== 'pending') {
            return response()->json([
                'error' => 'This adjustment has already been processed.',
            ], 422);
        }

        try {
            $adjustment->update([
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejected_by_user_id' => Auth::id(),
                'rejection_reason' => $request->rejection_reason,
            ]);

            Log::info("Time adjustment rejected: ID {$adjustment->id}, User: {$adjustment->user->name}, Rejected by: ".Auth::user()->name);

            return response()->json([
                'message' => 'Adjustment rejected successfully',
                'adjustment' => $adjustment->fresh()->load(['user', 'rejectedBy']),
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to reject adjustment ID {$adjustmentId}: ".$e->getMessage());
            return response()->json([
                'error' => 'Failed to reject adjustment. Please try again.',
            ], 500);
        }
    }

    /**
     * Get adjustment types
     */
    public function getAdjustmentTypes(): JsonResponse
    {
        return response()->json(TimeAdjustment::getAdjustmentTypes());
    }

    /**
     * Manager direct time correction (bypasses approval process)
     */
    public function managerTimeCorrection(Request $request): RedirectResponse
    {
        $request->validate([
            'time_entry_id' => 'required|exists:time_entries,id',
            'adjustment_type' => 'required|in:time_correction,missed_punch,break_adjustment,manual_entry',
            'adjusted_clock_in' => 'required|date',
            'adjusted_clock_out' => 'nullable|date',
            'adjusted_hours' => 'nullable|numeric|min:0',
            'reason' => 'required|string|max:1000',
            'employee_notes' => 'nullable|string|max:1000',
            'original_data' => 'required|array',
        ]);

        $currentUser = Auth::user();
        $timeEntry = TimeEntry::findOrFail($request->time_entry_id);

        // Check if current user can manage this employee
        $visibleUserIds = $currentUser->getVisibleUsers()->pluck('id');

        if (!$visibleUserIds->contains($timeEntry->user_id)) {
            return back()->withErrors(['message' => 'You do not have permission to edit this time entry.']);
        }

        // Validate times if both are provided
        if ($request->adjusted_clock_in && $request->adjusted_clock_out) {
            $clockIn = Carbon::parse($request->adjusted_clock_in);
            $clockOut = Carbon::parse($request->adjusted_clock_out);

            if ($clockOut <= $clockIn) {
                return back()->withErrors(['message' => 'Clock out time must be after clock in time.']);
            }
        }

        try {
            DB::transaction(function () use ($request, $timeEntry, $currentUser) {
                // Store original data for audit trail
                $originalData = [
                    'clock_in_time' => $timeEntry->clock_in_time,
                    'clock_out_time' => $timeEntry->clock_out_time,
                    'total_hours' => $timeEntry->total_hours,
                    'regular_hours' => $timeEntry->regular_hours,
                    'overtime_hours' => $timeEntry->overtime_hours,
                ];

                // Create adjustment record for audit trail
                $adjustment = TimeAdjustment::create([
                    'user_id' => $timeEntry->user_id,
                    'time_entry_id' => $timeEntry->id,
                    'adjustment_type' => $request->adjustment_type,
                    'original_data' => $originalData,
                    'adjusted_clock_in' => $request->adjusted_clock_in ? Carbon::parse($request->adjusted_clock_in) : null,
                    'adjusted_clock_out' => $request->adjusted_clock_out ? Carbon::parse($request->adjusted_clock_out) : null,
                    'adjusted_hours' => $request->adjusted_hours,
                    'reason' => $request->reason,
                    'employee_notes' => $request->employee_notes,
                    'requested_by_user_id' => $currentUser->id,
                    'approved_by_user_id' => $currentUser->id,
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approval_notes' => 'Direct manager adjustment',
                ]);

                // Apply the changes to the time entry
                $updates = [
                    'status' => 'adjusted',
                    'adjustment_reason' => "Time adjusted by manager: {$currentUser->name}",
                    'adjusted_by_user_id' => $currentUser->id,
                    'adjusted_at' => now(),
                ];

                if ($request->adjusted_clock_in) {
                    $updates['clock_in_time'] = Carbon::parse($request->adjusted_clock_in);
                }

                if ($request->adjusted_clock_out) {
                    $updates['clock_out_time'] = Carbon::parse($request->adjusted_clock_out);
                }

                $timeEntry->update($updates);

                // Recalculate hours based on new times
                $timeEntry->recalculateHours();

                Log::info("Manager time correction applied: Entry ID {$timeEntry->id}, Employee: {$timeEntry->user->name}, Manager: {$currentUser->name}");
            });

            return back()->with('success', 'Time entry updated successfully');

        } catch (\Exception $e) {
            Log::error("Failed to apply manager time correction for entry {$timeEntry->id}: " . $e->getMessage());

            return back()->withErrors(['message' => 'Failed to update time entry. Please try again.']);
        }
    }

    /**
     * Create missed punch entry for manager
     */
    public function managerCreateMissedPunch(Request $request): RedirectResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'clock_in_time' => 'required',
            'clock_out_time' => 'nullable',
            'reason' => 'required|string|max:1000',
            'employee_notes' => 'nullable|string|max:1000',
        ]);

        $currentUser = Auth::user();
        $targetUser = User::findOrFail($request->user_id);

        // Check permissions
        if (!$this->canManageUser($currentUser, $targetUser)) {
            return back()->withErrors(['message' => 'You do not have permission to create entries for this user.']);
        }

        $date = Carbon::parse($request->date);
        $clockInTime = Carbon::parse($request->clock_in_time);
        $clockOutTime = $request->clock_out_time ? Carbon::parse($request->clock_out_time) : null;

        // Check for existing entries on this date
        $existingEntry = TimeEntry::where('user_id', $targetUser->id)
            ->whereDate('clock_in_time', $date->format('Y-m-d'))
            ->first();

        if ($existingEntry) {
            return back()->withErrors(['message' => 'There is already a time entry for this date.']);
        }

        try {
            DB::transaction(function () use ($request, $targetUser, $currentUser, $clockInTime, $clockOutTime, $date) {
                // Calculate hours if both times provided
                $totalHours = 0;
                if ($clockOutTime) {
                    $totalMinutes = $clockInTime->diffInMinutes($clockOutTime);
                    $totalHours = round($totalMinutes / 60, 2);
                }

                // Create the time entry
                $timeEntry = TimeEntry::create([
                    'user_id' => $targetUser->id,
                    'clock_in_time' => $clockInTime,
                    'clock_out_time' => $clockOutTime,
                    'total_hours' => $totalHours,
                    'status' => 'adjusted',
                    'adjustment_reason' => "Created by manager: {$currentUser->name}",
                    'adjusted_by_user_id' => $currentUser->id,
                    'adjusted_at' => now(),
                    'clock_in_ip' => request()->ip(),
                    'clock_out_ip' => $clockOutTime ? request()->ip() : null,
                    'clock_in_device' => 'Manager Entry',
                    'clock_out_device' => $clockOutTime ? 'Manager Entry' : null,
                ]);

                // Create adjustment record for audit
                TimeAdjustment::create([
                    'user_id' => $targetUser->id,
                    'time_entry_id' => $timeEntry->id,
                    'adjustment_type' => 'manual_entry',
                    'adjusted_clock_in' => $clockInTime,
                    'adjusted_clock_out' => $clockOutTime,
                    'adjusted_hours' => $totalHours,
                    'reason' => $request->reason,
                    'employee_notes' => $request->employee_notes,
                    'requested_by_user_id' => $currentUser->id,
                    'approved_by_user_id' => $currentUser->id,
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approval_notes' => 'Manager created entry',
                ]);

                // Recalculate hours
                $timeEntry->recalculateHours();

                Log::info("Manager created missed punch entry: Entry ID {$timeEntry->id}, Employee: {$targetUser->name}, Manager: {$currentUser->name}");
            });

            return back()->with('success', 'Time entry created successfully');

        } catch (\Exception $e) {
            Log::error("Failed to create missed punch entry: " . $e->getMessage());

            return back()->withErrors(['message' => 'Failed to create time entry. Please try again.']);
        }
    }

    /**
     * Check if user can manage another user's time entries
     */
    private function canManageUser(User $manager, User $employee): bool
    {
        // Get all users the manager can see
        $visibleUserIds = $manager->getVisibleUsers()->pluck('id');

        return $visibleUserIds->contains($employee->id);
    }

    /**
     * Apply missed punch adjustment by creating a new time entry
     */
    private function applyMissedPunchAdjustment(TimeAdjustment $adjustment): void
    {
        $metadata = $this->getAdjustmentMetadata($adjustment);

        // Create the missing time entry
        $timeEntry = TimeEntry::create([
            'user_id' => $adjustment->user_id,
            'clock_in_time' => $adjustment->adjusted_clock_in,
            'clock_out_time' => $adjustment->adjusted_clock_out,
            'total_hours' => $adjustment->adjusted_hours,
            'status' => 'adjusted',
            'adjustment_reason' => "Missed punch adjustment approved by ".Auth::user()->name,
            'adjusted_by_user_id' => Auth::id(),
            'adjusted_at' => now(),
            'clock_in_ip' => $metadata['ip'],
            'clock_out_ip' => $metadata['ip'],
            'clock_in_device' => $metadata['device'],
            'clock_out_device' => $metadata['device'],
        ]);

        // Calculate regular/overtime hours
        $timeEntry->recalculateHours();
    }

    /**
     * Apply time correction adjustment to existing time entry
     */
    private function applyTimeCorrectionAdjustment(TimeAdjustment $adjustment): void
    {
        $timeEntry = $adjustment->timeEntry;

        $updates = [
            'status' => 'adjusted',
            'adjustment_reason' => "Time correction approved by ".Auth::user()->name,
            'adjusted_by_user_id' => Auth::id(),
            'adjusted_at' => now(),
        ];

        if ($adjustment->adjusted_clock_in) {
            $updates['clock_in_time'] = $adjustment->adjusted_clock_in;
        }

        if ($adjustment->adjusted_clock_out) {
            $updates['clock_out_time'] = $adjustment->adjusted_clock_out;
        }

        $timeEntry->update($updates);

        // Recalculate hours based on new times
        $timeEntry->recalculateHours();
    }

    /**
     * Apply break adjustment to existing break entry
     */
    private function applyBreakAdjustment(TimeAdjustment $adjustment): void
    {
        $breakEntry = $adjustment->breakEntry;

        // For now, just mark as adjusted - specific break time adjustments can be implemented later
        $breakEntry->update([
            'status' => 'adjusted',
            'adjustment_reason' => "Break adjustment approved by ".Auth::user()->name,
            'adjusted_by_user_id' => Auth::id(),
            'adjusted_at' => now(),
        ]);

        // Recalculate the parent time entry hours
        $breakEntry->timeEntry->recalculateHours();
    }

    /**
     * Get metadata for adjustment
     */
    private function getAdjustmentMetadata(TimeAdjustment $adjustment): array
    {
        return [
            'ip' => request()->ip(),
            'device' => 'System Adjustment',
            'user_agent' => 'Time Adjustment System',
            'adjustment_id' => $adjustment->id,
        ];
    }

    /**
     * Get adjustment history for a user
     */
    public function getAdjustmentHistory(Request $request, $userId): JsonResponse
    {
        $user = User::findOrFail($userId);

        $adjustments = TimeAdjustment::where('user_id', $userId)
            ->with(['timeEntry', 'breakEntry', 'requestedBy', 'approvedBy', 'rejectedBy'])
            ->when($request->filled('type'), function ($query) use ($request) {
                return $query->where('adjustment_type', $request->type);
            })
            ->when($request->filled('status'), function ($query) use ($request) {
                return $query->where('status', $request->status);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'adjustments' => $adjustments->items(),
            'pagination' => [
                'current_page' => $adjustments->currentPage(),
                'last_page' => $adjustments->lastPage(),
                'per_page' => $adjustments->perPage(),
                'total' => $adjustments->total(),
            ],
        ]);
    }
    /**
     * Get adjustment history for a specific time entry.
     */
    public function getHistoryForEntry(Request $request, TimeEntry $timeEntry): JsonResponse
    {
        // Optional: Add a permission check here if needed
        // ...

        $adjustments = TimeAdjustment::where('time_entry_id', $timeEntry->id)
            ->with([
                'requestedBy:id,name',
                'approvedBy:id,name',
                'rejectedBy:id,name'
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'adjustments' => $adjustments,
        ]);
    }


}
