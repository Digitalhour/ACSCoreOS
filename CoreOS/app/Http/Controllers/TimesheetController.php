<?php

namespace App\Http\Controllers;

use App\Models\PtoModels\PtoRequest;
use App\Models\TimeEntry;
use App\Models\TimesheetSubmission;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TimesheetController extends Controller
{
    /**
     * Get timesheet data for current user
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $weekStart = $request->filled('week_start')
            ? Carbon::parse($request->week_start)->startOfWeek()
            : Carbon::now()->startOfWeek();

        return $this->getTimesheetForUser($user, $weekStart);
    }

    /**
     * Get timesheet for specific user (manager/admin view)
     */
    public function show(Request $request, $userId): JsonResponse
    {
        $currentUser = Auth::user();
        $targetUser = User::findOrFail($userId);

        // Check if current user can view this user's timesheet
        if (!$currentUser->canManageTimeEntriesFor($targetUser)) {
            return response()->json([
                'error' => 'Access denied. You cannot view this user\'s timesheet.'
            ], 403);
        }

        $weekStart = $request->filled('week_start')
            ? Carbon::parse($request->week_start)->startOfWeek()
            : Carbon::now()->startOfWeek();

        return $this->getTimesheetForUser($targetUser, $weekStart);
    }

    /**
     * Get timesheet data for a specific user and week
     */
    private function getTimesheetForUser(User $user, Carbon $weekStart): JsonResponse
    {
        $weekEnd = $weekStart->copy()->endOfWeek();

        // Get or create timesheet submission
        $submission = TimesheetSubmission::where('user_id', $user->id)
            ->where('week_start_date', $weekStart->format('Y-m-d'))
            ->first();

        // Get time entries for the week
        $timeEntries = TimeEntry::where('user_id', $user->id)
            ->whereBetween('clock_in_time', [$weekStart, $weekEnd])
            ->with(['breakEntries' => function ($query) {
                $query->orderBy('break_start');
            }])
            ->orderBy('clock_in_time')
            ->get();

        // Get PTO requests that overlap with this week
        $ptoRequests = PtoRequest::where('user_id', $user->id)
            ->where('status', 'approved')
            ->where(function ($query) use ($weekStart, $weekEnd) {
                $query->whereBetween('start_date', [$weekStart->format('Y-m-d'), $weekEnd->format('Y-m-d')])
                    ->orWhereBetween('end_date', [$weekStart->format('Y-m-d'), $weekEnd->format('Y-m-d')])
                    ->orWhere(function ($q) use ($weekStart, $weekEnd) {
                        $q->where('start_date', '<=', $weekStart->format('Y-m-d'))
                            ->where('end_date', '>=', $weekEnd->format('Y-m-d'));
                    });
            })
            ->with('ptoType')
            ->get();

        // Build daily breakdown
        $dailyData = [];
        $currentDate = $weekStart->copy();

        while ($currentDate <= $weekEnd) {
            $dateString = $currentDate->format('Y-m-d');

            // Get entries for this day
            $dayEntries = $timeEntries->filter(function ($entry) use ($currentDate) {
                return $entry->clock_in_time->isSameDay($currentDate);
            });

            // Get PTO for this day
            $dayPto = $ptoRequests->filter(function ($pto) use ($currentDate) {
                return $currentDate->between(
                    Carbon::parse($pto->start_date),
                    Carbon::parse($pto->end_date)
                );
            });

            $totalHours = $dayEntries->sum('total_hours');
            $regularHours = $dayEntries->sum('regular_hours');
            $overtimeHours = $dayEntries->sum('overtime_hours');
            $breakMinutes = $dayEntries->sum(function ($entry) {
                return $entry->getTotalBreakMinutes();
            });

            $dailyData[] = [
                'date' => $dateString,
                'day_name' => $currentDate->format('l'),
                'is_weekend' => $currentDate->isWeekend(),
                'total_hours' => $totalHours,
                'regular_hours' => $regularHours,
                'overtime_hours' => $overtimeHours,
                'break_minutes' => $breakMinutes,
                'break_hours' => round($breakMinutes / 60, 2),
                'entries' => $dayEntries->map(function ($entry) {
                    return [
                        'id' => $entry->id,
                        'clock_in_time' => $entry->clock_in_time,
                        'clock_out_time' => $entry->clock_out_time,
                        'total_hours' => $entry->total_hours,
                        'regular_hours' => $entry->regular_hours,
                        'overtime_hours' => $entry->overtime_hours,
                        'status' => $entry->status,
                        'formatted_duration' => $entry->getFormattedDuration(),
                        'adjustment_reason' => $entry->adjustment_reason,
                        'breaks' => $entry->breakEntries->map(function ($break) {
                            return [
                                'id' => $break->id,
                                'break_type' => $break->break_type,
                                'break_label' => $break->break_label,
                                'break_start' => $break->break_start,
                                'break_end' => $break->break_end,
                                'duration_minutes' => $break->duration_minutes,
                                'status' => $break->status,
                            ];
                        }),
                    ];
                })->values(),
                'pto' => $dayPto->map(function ($pto) {
                    return [
                        'id' => $pto->id,
                        'type' => $pto->ptoType->name,
                        'hours' => $pto->total_days * 8, // Assuming 8-hour days
                        'start_time' => $pto->start_time,
                        'end_time' => $pto->end_time,
                    ];
                })->values(),
            ];

            $currentDate->addDay();
        }

        // Calculate weekly totals
        $weeklyTotals = [
            'total_hours' => $timeEntries->sum('total_hours'),
            'regular_hours' => $timeEntries->sum('regular_hours'),
            'overtime_hours' => $timeEntries->sum('overtime_hours'),
            'break_hours' => round($timeEntries->sum(function ($entry) {
                    return $entry->getTotalBreakMinutes();
                }) / 60, 2),
            'pto_hours' => $ptoRequests->sum(function ($pto) {
                return $pto->total_days * 8; // Assuming 8-hour days
            }),
        ];

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'week_info' => [
                'start_date' => $weekStart->format('Y-m-d'),
                'end_date' => $weekEnd->format('Y-m-d'),
                'display' => $weekStart->format('M d') . ' - ' . $weekEnd->format('M d, Y'),
            ],
            'submission' => $submission ? [
                'id' => $submission->id,
                'status' => $submission->status,
                'submitted_at' => $submission->submitted_at,
                'submitted_by' => $submission->submittedBy?->name,
                'self_submitted' => $submission->self_submitted,
                'approved_at' => $submission->approved_at,
                'approved_by' => $submission->approvedBy?->name,
                'rejected_at' => $submission->rejected_at,
                'rejected_by' => $submission->rejectedBy?->name,
                'rejection_reason' => $submission->rejection_reason,
                'locked_at' => $submission->locked_at,
                'can_edit' => $submission->canEdit(),
                'is_locked' => $submission->isLocked(),
            ] : null,
            'daily_data' => $dailyData,
            'weekly_totals' => $weeklyTotals,
            'can_submit' => !$submission || $submission->canEdit(),
            'needs_submission' => !$submission || $submission->status === 'draft',
        ]);
    }

    /**
     * Submit timesheet
     */
    public function submit(Request $request)
    {
        $request->validate([
            'week_start_date' => 'required|date',
            'user_id' => 'nullable|exists:users,id',
            'submission_notes' => 'nullable|string|max:1000',
            'legal_acknowledgment' => 'required|string',
        ]);

        $currentUser = Auth::user();
        $targetUserId = $request->user_id ?? $currentUser->id;
        $targetUser = User::findOrFail($targetUserId);
        $weekStart = Carbon::parse($request->week_start_date)->startOfWeek();

        // Check permissions for submitting on behalf of another user
        if ($targetUserId !== $currentUser->id && !$currentUser->canManageTimeEntriesFor($targetUser)) {
            return redirect()->back()->withErrors([
                'timesheet' => 'You do not have permission to submit timesheet for this user.'
            ]);
        }

        // Check if submission already exists
        $existingSubmission = TimesheetSubmission::where('user_id', $targetUserId)
            ->where('week_start_date', $weekStart->format('Y-m-d'))
            ->first();

        if ($existingSubmission && !$existingSubmission->canEdit()) {
            return redirect()->back()->withErrors([
                'timesheet' => 'Timesheet has already been submitted and cannot be modified.'
            ]);
        }

        try {
            DB::transaction(function () use ($request, $currentUser, $targetUser, $weekStart, $existingSubmission) {
                if ($existingSubmission) {
                    $submission = $existingSubmission;
                } else {
                    $submission = TimesheetSubmission::createForWeek($targetUser, $weekStart);
                }

                $selfSubmitted = $currentUser->id === $targetUser->id;

                $submission->update([
                    'status' => 'submitted',
                    'submitted_at' => now(),
                    'submitted_by_user_id' => $currentUser->id,
                    'self_submitted' => $selfSubmitted,
                    'submission_notes' => $request->submission_notes,
                    'legal_acknowledgment' => $request->legal_acknowledgment,
                ]);

                $submitterName = $selfSubmitted ? 'self' : $currentUser->name;
                Log::info("Timesheet submitted: User {$targetUser->name} (ID: {$targetUser->id}), Week: {$weekStart->format('Y-m-d')}, Submitted by: {$submitterName}");
            });

            return redirect()->back()->with('success', 'Timesheet submitted successfully');

        } catch (\Exception $e) {
            Log::error("Timesheet submission failed: " . $e->getMessage());
            return redirect()->back()->withErrors([
                'timesheet' => 'Failed to submit timesheet. Please try again.'
            ]);
        }
    }

    /**
     * Approve timesheet (manager/admin)
     */
    public function approve(Request $request, $submissionId): JsonResponse
    {
        $request->validate([
            'approval_notes' => 'nullable|string|max:1000',
        ]);

        $currentUser = Auth::user();
        $submission = TimesheetSubmission::with('user')->findOrFail($submissionId);

        // Check if current user can approve for this user
        if (!$currentUser->canApproveTimesheetFor($submission->user)) {
            return response()->json([
                'error' => 'You do not have permission to approve this timesheet.',
            ], 403);
        }

        if ($submission->status !== 'submitted') {
            return response()->json([
                'error' => 'Only submitted timesheets can be approved.',
            ], 422);
        }

        try {
            $submission->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by_user_id' => Auth::id(),
                'approval_notes' => $request->approval_notes,
            ]);

            Log::info("Timesheet approved: ID {$submission->id}, User: {$submission->user->name}, Approved by: " . Auth::user()->name);

            return response()->json([
                'message' => 'Timesheet approved successfully',
                'submission' => $submission->fresh()->load(['user', 'approvedBy']),
            ]);

        } catch (\Exception $e) {
            Log::error("Timesheet approval failed for ID {$submissionId}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to approve timesheet. Please try again.',
            ], 500);
        }
    }

    /**
     * Reject timesheet (manager/admin)
     */
    public function reject(Request $request, $submissionId): JsonResponse
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $currentUser = Auth::user();
        $submission = TimesheetSubmission::with('user')->findOrFail($submissionId);

        // Check if current user can reject for this user
        if (!$currentUser->canApproveTimesheetFor($submission->user)) {
            return response()->json([
                'error' => 'You do not have permission to reject this timesheet.',
            ], 403);
        }

        if ($submission->status !== 'submitted') {
            return response()->json([
                'error' => 'Only submitted timesheets can be rejected.',
            ], 422);
        }

        try {
            $submission->update([
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejected_by_user_id' => Auth::id(),
                'rejection_reason' => $request->rejection_reason,
            ]);

            Log::info("Timesheet rejected: ID {$submission->id}, User: {$submission->user->name}, Rejected by: " . Auth::user()->name);

            return response()->json([
                'message' => 'Timesheet rejected successfully',
                'submission' => $submission->fresh()->load(['user', 'rejectedBy']),
            ]);

        } catch (\Exception $e) {
            Log::error("Timesheet rejection failed for ID {$submissionId}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to reject timesheet. Please try again.',
            ], 500);
        }
    }

    /**
     * Lock timesheet for payroll (payroll admin only)
     */
    public function lock(Request $request, $submissionId): JsonResponse
    {
        $request->validate([
            'lock_reason' => 'nullable|string|max:500',
        ]);

        $currentUser = Auth::user();

        // Only payroll and admin roles can lock timesheets
        if (!$currentUser->hasRole(['admin', 'payroll'])) {
            return response()->json([
                'error' => 'Only payroll administrators can lock timesheets.',
            ], 403);
        }

        $submission = TimesheetSubmission::findOrFail($submissionId);

        if ($submission->status !== 'approved') {
            return response()->json([
                'error' => 'Only approved timesheets can be locked.',
            ], 422);
        }

        try {
            $submission->update([
                'status' => 'locked',
                'locked_at' => now(),
                'locked_by_user_id' => Auth::id(),
                'lock_reason' => $request->lock_reason ?? 'Locked for payroll processing',
            ]);

            Log::info("Timesheet locked: ID {$submission->id}, User: {$submission->user->name}, Locked by: " . Auth::user()->name);

            return response()->json([
                'message' => 'Timesheet locked for payroll processing',
                'submission' => $submission->fresh()->load(['user', 'lockedBy']),
            ]);

        } catch (\Exception $e) {
            Log::error("Timesheet lock failed for ID {$submissionId}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to lock timesheet. Please try again.',
            ], 500);
        }
    }

    /**
     * Unlock timesheet (payroll admin only)
     */
    public function unlock(Request $request, $submissionId): JsonResponse
    {
        $request->validate([
            'unlock_reason' => 'required|string|max:500',
        ]);

        $currentUser = Auth::user();

        // Only payroll and admin roles can unlock timesheets
        if (!$currentUser->hasRole(['admin', 'payroll'])) {
            return response()->json([
                'error' => 'Only payroll administrators can unlock timesheets.',
            ], 403);
        }

        $submission = TimesheetSubmission::findOrFail($submissionId);

        if ($submission->status !== 'locked') {
            return response()->json([
                'error' => 'Only locked timesheets can be unlocked.',
            ], 422);
        }

        try {
            $submission->update([
                'status' => 'approved',
                'locked_at' => null,
                'locked_by_user_id' => null,
                'lock_reason' => null,
            ]);

            Log::info("Timesheet unlocked: ID {$submission->id}, User: {$submission->user->name}, Unlocked by: " . Auth::user()->name . ", Reason: {$request->unlock_reason}");

            return response()->json([
                'message' => 'Timesheet unlocked successfully',
                'submission' => $submission->fresh()->load(['user']),
            ]);

        } catch (\Exception $e) {
            Log::error("Timesheet unlock failed for ID {$submissionId}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to unlock timesheet. Please try again.',
            ], 500);
        }
    }

    /**
     * Get pending submissions for manager review
     */
    public function getPendingSubmissions(Request $request): JsonResponse
    {
        $currentUser = Auth::user();

        // Use the enhanced getVisibleUsers method
        $visibleUserIds = $currentUser->getVisibleUsers()->pluck('id');

        $submissions = TimesheetSubmission::with(['user', 'submittedBy'])
            ->whereIn('user_id', $visibleUserIds)
            ->where('status', 'submitted')
            ->orderBy('submitted_at', 'desc')
            ->paginate(20);

        return response()->json([
            'submissions' => $submissions->items(),
            'pagination' => [
                'current_page' => $submissions->currentPage(),
                'last_page' => $submissions->lastPage(),
                'per_page' => $submissions->perPage(),
                'total' => $submissions->total(),
            ],
        ]);
    }

    /**
     * Get submission history for a user
     */
    public function getSubmissionHistory(Request $request, $userId): JsonResponse
    {
        $currentUser = Auth::user();
        $targetUser = User::findOrFail($userId);

        // Check if current user can view this user's submission history
        if (!$currentUser->canManageTimeEntriesFor($targetUser)) {
            return response()->json([
                'error' => 'Access denied. You cannot view this user\'s submission history.'
            ], 403);
        }

        $submissions = TimesheetSubmission::where('user_id', $userId)
            ->with(['submittedBy', 'approvedBy', 'rejectedBy', 'lockedBy'])
            ->orderBy('week_start_date', 'desc')
            ->paginate(10);

        return response()->json([
            'user' => [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
            ],
            'submissions' => $submissions->items(),
            'pagination' => [
                'current_page' => $submissions->currentPage(),
                'last_page' => $submissions->lastPage(),
                'per_page' => $submissions->perPage(),
                'total' => $submissions->total(),
            ],
        ]);
    }

    /**
     * Get legal acknowledgment text
     */
    public function getLegalAcknowledgment(): JsonResponse
    {
        $text = "I hereby certify that the time recorded on this timesheet is true and accurate to the best of my knowledge. I understand that any false statements or misrepresentation of time worked may result in disciplinary action, up to and including termination of employment. I acknowledge that I have reviewed all time entries, break periods, and any adjustments made during this pay period.";

        return response()->json([
            'legal_text' => $text,
            'timestamp' => now()->toISOString(),
        ]);
    }
}
