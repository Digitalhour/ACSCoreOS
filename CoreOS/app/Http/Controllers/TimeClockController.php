<?php

namespace App\Http\Controllers;

use App\Models\BreakEntry;
use App\Models\TimeEntry;
use App\Models\TimesheetSubmission;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class TimeClockController extends Controller
{
    /**
     * Get current time clock status for user
     */
    public function getStatus(): JsonResponse
    {
        $user = Auth::user();

        // Get active time entry
        $activeEntry = TimeEntry::where('user_id', $user->id)
            ->where('status', 'active')
            ->whereNull('clock_out_time')
            ->with(['breakEntries' => function ($query) {
                $query->where('status', 'active');
            }])
            ->first();

        $status = [
            'is_clocked_in' => (bool) $activeEntry,
            'current_entry' => null,
            'current_break' => null,
            'total_time_today' => $this->getTotalTimeToday($user),
            'can_clock_in' => !$activeEntry,
            'can_clock_out' => (bool) $activeEntry,
            'can_start_break' => $activeEntry && !$activeEntry->getCurrentBreak(),
            'can_end_break' => $activeEntry && $activeEntry->getCurrentBreak(),
        ];

        if ($activeEntry) {
            $status['current_entry'] = [
                'id' => $activeEntry->id,
                'clock_in_time' => $activeEntry->clock_in_time,
                'duration' => $activeEntry->getFormattedDuration(),
                'total_break_minutes' => $activeEntry->getTotalBreakMinutes(),
            ];

            $currentBreak = $activeEntry->getCurrentBreak();
            if ($currentBreak) {
                $status['current_break'] = [
                    'id' => $currentBreak->id,
                    'break_type' => $currentBreak->break_type,
                    'break_label' => $currentBreak->break_label,
                    'break_start' => $currentBreak->break_start,
                    'duration' => $currentBreak->getFormattedDuration(),
                ];
            }
        }

        return response()->json($status);
    }

    /**
     * Clock in user
     */
    public function clockIn(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Check if user is already clocked in
        $activeEntry = TimeEntry::where('user_id', $user->id)
            ->where('status', 'active')
            ->whereNull('clock_out_time')
            ->first();

        if ($activeEntry) {
            return response()->json([
                'error' => 'You are already clocked in.',
                'current_entry' => $activeEntry,
            ], 422);
        }

        try {
            $metadata = $this->collectMetadata($request);

            $timeEntry = TimeEntry::create([
                'user_id' => $user->id,
                'clock_in_time' => now(),
                'status' => 'active',
                'clock_in_ip' => $metadata['ip'],
                'clock_in_device' => $metadata['device'],
                'clock_in_location' => $metadata['location'],
                'clock_in_user_agent' => $metadata['user_agent'],
            ]);

            Log::info("User clocked in: {$user->name} (ID: {$user->id}) at {$timeEntry->clock_in_time}");

            return response()->json([
                'message' => 'Successfully clocked in',
                'time_entry' => $timeEntry,
                'status' => $this->getStatusData($user),
            ], 201);

        } catch (\Exception $e) {
            Log::error("Clock in failed for user {$user->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to clock in. Please try again.',
            ], 500);
        }
    }

    /**
     * Clock out user
     */
    public function clockOut(Request $request): JsonResponse
    {
        $user = Auth::user();

        $activeEntry = TimeEntry::where('user_id', $user->id)
            ->where('status', 'active')
            ->whereNull('clock_out_time')
            ->first();

        if (!$activeEntry) {
            return response()->json([
                'error' => 'You are not currently clocked in.',
            ], 422);
        }

        try {
            $metadata = $this->collectMetadata($request);

            $success = $activeEntry->clockOut($metadata);

            if (!$success) {
                return response()->json([
                    'error' => 'Failed to clock out. Please try again.',
                ], 500);
            }

            // Refresh the entry to get updated values
            $activeEntry->refresh();

            Log::info("User clocked out: {$user->name} (ID: {$user->id}) at {$activeEntry->clock_out_time}, Total hours: {$activeEntry->total_hours}");

            return response()->json([
                'message' => 'Successfully clocked out',
                'time_entry' => $activeEntry->load('breakEntries'),
                'status' => $this->getStatusData($user),
            ]);

        } catch (\Exception $e) {
            Log::error("Clock out failed for user {$user->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to clock out. Please try again.',
            ], 500);
        }
    }

    /**
     * Start a break
     */
    public function startBreak(Request $request): JsonResponse
    {
        $request->validate([
            'break_type' => 'required|in:lunch,personal,extended,rest,other',
            'break_label' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:500',
        ]);

        $user = Auth::user();

        $activeEntry = TimeEntry::where('user_id', $user->id)
            ->where('status', 'active')
            ->whereNull('clock_out_time')
            ->first();

        if (!$activeEntry) {
            return response()->json([
                'error' => 'You must be clocked in to start a break.',
            ], 422);
        }

        // Check if user is already on break
        $activeBreak = $activeEntry->getCurrentBreak();
        if ($activeBreak) {
            return response()->json([
                'error' => 'You are already on a break.',
                'current_break' => $activeBreak,
            ], 422);
        }

        try {
            $metadata = $this->collectMetadata($request);

            $breakEntry = BreakEntry::create([
                'time_entry_id' => $activeEntry->id,
                'user_id' => $user->id,
                'break_start' => now(),
                'break_type' => $request->break_type,
                'break_label' => $request->break_label,
                'notes' => $request->notes,
                'status' => 'active',
                'start_ip' => $metadata['ip'],
                'start_location' => $metadata['location'],
            ]);

            Log::info("Break started: User {$user->name} (ID: {$user->id}), Type: {$request->break_type}");

            return response()->json([
                'message' => 'Break started successfully',
                'break_entry' => $breakEntry,
                'status' => $this->getStatusData($user),
            ], 201);

        } catch (\Exception $e) {
            Log::error("Start break failed for user {$user->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to start break. Please try again.',
            ], 500);
        }
    }

    /**
     * End current break
     */
    public function endBreak(Request $request): JsonResponse
    {
        $user = Auth::user();

        $activeEntry = TimeEntry::where('user_id', $user->id)
            ->where('status', 'active')
            ->whereNull('clock_out_time')
            ->first();

        if (!$activeEntry) {
            return response()->json([
                'error' => 'You must be clocked in to end a break.',
            ], 422);
        }

        $activeBreak = $activeEntry->getCurrentBreak();
        if (!$activeBreak) {
            return response()->json([
                'error' => 'You are not currently on a break.',
            ], 422);
        }

        try {
            $metadata = $this->collectMetadata($request);

            $success = $activeBreak->endBreak($metadata);

            if (!$success) {
                return response()->json([
                    'error' => 'Failed to end break. Please try again.',
                ], 500);
            }

            // Refresh to get updated values
            $activeBreak->refresh();

            Log::info("Break ended: User {$user->name} (ID: {$user->id}), Duration: {$activeBreak->duration_minutes} minutes");

            return response()->json([
                'message' => 'Break ended successfully',
                'break_entry' => $activeBreak,
                'status' => $this->getStatusData($user),
            ]);

        } catch (\Exception $e) {
            Log::error("End break failed for user {$user->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to end break. Please try again.',
            ], 500);
        }
    }

    /**
     * Get today's time entries for user
     */
    public function getTodayEntries(): JsonResponse
    {
        $user = Auth::user();
        $today = Carbon::today();

        $entries = TimeEntry::where('user_id', $user->id)
            ->whereDate('clock_in_time', $today)
            ->with(['breakEntries' => function ($query) {
                $query->orderBy('break_start');
            }])
            ->orderBy('clock_in_time')
            ->get()
            ->map(function ($entry) {
                return [
                    'id' => $entry->id,
                    'clock_in_time' => $entry->clock_in_time,
                    'clock_out_time' => $entry->clock_out_time,
                    'total_hours' => $entry->total_hours,
                    'regular_hours' => $entry->regular_hours,
                    'overtime_hours' => $entry->overtime_hours,
                    'status' => $entry->status,
                    'formatted_duration' => $entry->getFormattedDuration(),
                    'total_break_minutes' => $entry->getTotalBreakMinutes(),
                    'breaks' => $entry->breakEntries->map(function ($break) {
                        return [
                            'id' => $break->id,
                            'break_type' => $break->break_type,
                            'break_label' => $break->break_label,
                            'break_start' => $break->break_start,
                            'break_end' => $break->break_end,
                            'duration_minutes' => $break->duration_minutes,
                            'formatted_duration' => $break->getFormattedDuration(),
                            'status' => $break->status,
                        ];
                    }),
                ];
            });

        return response()->json([
            'entries' => $entries,
            'summary' => [
                'total_hours' => $entries->sum('total_hours'),
                'regular_hours' => $entries->sum('regular_hours'),
                'overtime_hours' => $entries->sum('overtime_hours'),
                'total_breaks' => $entries->sum('total_break_minutes'),
                'entries_count' => $entries->count(),
            ],
        ]);
    }

    /**
     * Get time entries for a date range
     */
    public function getEntriesForDateRange(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $user = Auth::user();
        $startDate = Carbon::parse($request->start_date)->startOfDay();
        $endDate = Carbon::parse($request->end_date)->endOfDay();

        $entries = TimeEntry::where('user_id', $user->id)
            ->whereBetween('clock_in_time', [$startDate, $endDate])
            ->with(['breakEntries' => function ($query) {
                $query->orderBy('break_start');
            }])
            ->orderBy('clock_in_time')
            ->get()
            ->map(function ($entry) {
                return [
                    'id' => $entry->id,
                    'date' => $entry->clock_in_time->format('Y-m-d'),
                    'clock_in_time' => $entry->clock_in_time,
                    'clock_out_time' => $entry->clock_out_time,
                    'total_hours' => $entry->total_hours,
                    'regular_hours' => $entry->regular_hours,
                    'overtime_hours' => $entry->overtime_hours,
                    'status' => $entry->status,
                    'formatted_duration' => $entry->getFormattedDuration(),
                    'total_break_minutes' => $entry->getTotalBreakMinutes(),
                    'breaks' => $entry->breakEntries->map(function ($break) {
                        return [
                            'id' => $break->id,
                            'break_type' => $break->break_type,
                            'break_label' => $break->break_label,
                            'break_start' => $break->break_start,
                            'break_end' => $break->break_end,
                            'duration_minutes' => $break->duration_minutes,
                            'formatted_duration' => $break->getFormattedDuration(),
                            'status' => $break->status,
                        ];
                    }),
                ];
            });

        // Group by date for easier display
        $groupedEntries = $entries->groupBy('date');

        return response()->json([
            'entries' => $groupedEntries,
            'summary' => [
                'total_hours' => $entries->sum('total_hours'),
                'regular_hours' => $entries->sum('regular_hours'),
                'overtime_hours' => $entries->sum('overtime_hours'),
                'total_breaks' => $entries->sum('total_break_minutes'),
                'entries_count' => $entries->count(),
                'date_range' => [
                    'start' => $startDate->format('Y-m-d'),
                    'end' => $endDate->format('Y-m-d'),
                ],
            ],
        ]);
    }

    /**
     * Force clock out (admin/manager function)
     */
    public function forceClockOut(Request $request, $userId): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $user = User::findOrFail($userId);
        $currentUser = Auth::user();

        $activeEntry = TimeEntry::where('user_id', $user->id)
            ->where('status', 'active')
            ->whereNull('clock_out_time')
            ->first();

        if (!$activeEntry) {
            return response()->json([
                'error' => 'User is not currently clocked in.',
            ], 422);
        }

        try {
            $metadata = $this->collectMetadata($request);
            $metadata['forced_by'] = $currentUser->id;

            $success = $activeEntry->clockOut($metadata);

            if ($success) {
                // Add adjustment reason
                $activeEntry->update([
                    'adjustment_reason' => "Force clock out by {$currentUser->name}: " . $request->reason,
                    'adjusted_by_user_id' => $currentUser->id,
                    'adjusted_at' => now(),
                    'status' => 'adjusted',
                ]);

                Log::info("Force clock out: User {$user->name} (ID: {$user->id}) by {$currentUser->name}, Reason: {$request->reason}");

                return response()->json([
                    'message' => 'User successfully clocked out',
                    'time_entry' => $activeEntry->refresh(),
                ]);
            }

            return response()->json(['error' => 'Failed to clock out user'], 500);

        } catch (\Exception $e) {
            Log::error("Force clock out failed for user {$user->id}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to clock out user. Please try again.',
            ], 500);
        }
    }

    /**
     * Get break types
     */
    public function getBreakTypes(): JsonResponse
    {
        return response()->json(BreakEntry::getBreakTypes());
    }

    /**
     * Helper methods
     */
    private function collectMetadata(Request $request): array
    {
        return [
            'ip' => $request->ip(),
            'device' => $request->header('User-Agent'),
            'user_agent' => $request->header('User-Agent'),
            'location' => $request->input('location'), // Frontend can send GPS coordinates
        ];
    }

    private function getStatusData(User $user): array
    {
        $activeEntry = TimeEntry::where('user_id', $user->id)
            ->where('status', 'active')
            ->whereNull('clock_out_time')
            ->with(['breakEntries' => function ($query) {
                $query->where('status', 'active');
            }])
            ->first();

        return [
            'is_clocked_in' => (bool) $activeEntry,
            'current_entry' => $activeEntry ? [
                'id' => $activeEntry->id,
                'clock_in_time' => $activeEntry->clock_in_time,
                'duration' => $activeEntry->getFormattedDuration(),
                'total_break_minutes' => $activeEntry->getTotalBreakMinutes(),
            ] : null,
            'current_break' => $activeEntry && $activeEntry->getCurrentBreak() ? [
                'id' => $activeEntry->getCurrentBreak()->id,
                'break_type' => $activeEntry->getCurrentBreak()->break_type,
                'break_label' => $activeEntry->getCurrentBreak()->break_label,
                'break_start' => $activeEntry->getCurrentBreak()->break_start,
                'duration' => $activeEntry->getCurrentBreak()->getFormattedDuration(),
            ] : null,
            'total_time_today' => $this->getTotalTimeToday($user),
            'can_clock_in' => !$activeEntry,
            'can_clock_out' => (bool) $activeEntry,
            'can_start_break' => $activeEntry && !$activeEntry->getCurrentBreak(),
            'can_end_break' => $activeEntry && $activeEntry->getCurrentBreak(),
        ];
    }

    private function getTotalTimeToday(User $user): string
    {
        $today = Carbon::today();

        $completedHours = TimeEntry::where('user_id', $user->id)
            ->whereDate('clock_in_time', $today)
            ->where('status', 'completed')
            ->sum('total_hours');

        // Add current active entry time if clocked in
        $activeEntry = TimeEntry::where('user_id', $user->id)
            ->where('status', 'active')
            ->whereNull('clock_out_time')
            ->first();

        if ($activeEntry) {
            $activeMinutes = $activeEntry->clock_in_time->diffInMinutes(now());
            $activeBreakMinutes = $activeEntry->getTotalBreakMinutes();
            $activeWorkMinutes = $activeMinutes - $activeBreakMinutes;
            $activeHours = $activeWorkMinutes / 60;
            $completedHours += $activeHours;
        }

        $totalMinutes = $completedHours * 60;
        $hours = floor($totalMinutes / 60);
        $minutes = $totalMinutes % 60;

        return sprintf('%d:%02d', $hours, $minutes);
    }


    /**
     * Get manageable users for current manager
     */
    public function getManageableUsers(): JsonResponse
    {
        $currentUser = Auth::user();

        // Get users that report to this manager (current active assignments)
        $manageableUsers = User::with(['currentPosition', 'departments'])
            ->whereHas('reportingAssignments', function ($query) use ($currentUser) {
                $query->where('manager_id', $currentUser->id)
                    ->whereNull('end_date'); // only active assignments
            })
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'position' => $user->currentPosition?->name ?? 'No Position',
                    'departments' => $user->departments->pluck('name')->toArray(),
                ];
            });

        return response()->json(['users' => $manageableUsers]);
    }

    /**
     * Get time entries for manageable users with comprehensive filtering
     */
    public function getManagerTimeEntries(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'user_id' => 'nullable|exists:users,id',
            'department' => 'nullable|string',
            'status' => 'nullable|in:active,completed,adjusted',
            'search' => 'nullable|string|max:255',
            'view_type' => 'nullable|in:entries,daily',
            'per_page' => 'nullable|integer|min:5|max:100',
        ]);

        $currentUser = Auth::user();

        // Get manageable user IDs
        $manageableUserIds = User::whereHas('reportingAssignments', function ($query) use ($currentUser) {
            $query->where('manager_id', $currentUser->id)
                ->whereNull('end_date');
        })->pluck('id');

        if ($manageableUserIds->isEmpty()) {
            return response()->json([
                'data' => [],
                'users' => [],
                'pagination' => null,
                'summary' => null
            ]);
        }

        // Base query for time entries
        $query = TimeEntry::with([
            'user:id,name,email',
            'user.departments:id,name',
            'breakEntries:id,time_entry_id,break_type,duration_minutes,status',
            'overtimeRule:id,name,daily_threshold',
        ])
            ->whereIn('user_id', $manageableUserIds);

        // Apply filters
        $this->applyManagerTimeEntryFilters($query, $request);

        $viewType = $request->get('view_type', 'entries');

        if ($viewType === 'daily') {
            return $this->getDailySummaryView($query, $request, $manageableUserIds);
        } else {
            return $this->getTimeEntriesView($query, $request, $manageableUserIds);
        }
    }

    /**
     * Apply filters to manager time entry query
     */
    private function applyManagerTimeEntryFilters($query, Request $request): void
    {
        // Date range filter
        if ($request->filled('start_date')) {
            $query->whereDate('clock_in_time', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('clock_in_time', '<=', $request->end_date);
        }

        // User filter
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Department filter
        if ($request->filled('department') && $request->department !== 'all') {
            $query->whereHas('user.departments', function ($q) use ($request) {
                $q->where('name', $request->department);
            });
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }
    }

    /**
     * Get individual time entries view
     */
    private function getTimeEntriesView($query, Request $request, $manageableUserIds): JsonResponse
    {
        $perPage = $request->get('per_page', 20);
        $timeEntries = $query->orderBy('clock_in_time', 'desc')
            ->paginate($perPage);

        // Get submission status for each entry
        $transformedEntries = $timeEntries->getCollection()->map(function ($entry) {
            $submission = $this->getTimesheetSubmissionForEntry($entry);

            return [
                'id' => $entry->id,
                'user' => [
                    'id' => $entry->user->id,
                    'name' => $entry->user->name,
                    'email' => $entry->user->email,
                    'departments' => $entry->user->departments->pluck('name')->toArray(),
                ],
                'clock_in_time' => $entry->clock_in_time,
                'clock_out_time' => $entry->clock_out_time,
                'total_hours' => $entry->total_hours,
                'regular_hours' => $entry->regular_hours,
                'overtime_hours' => $entry->overtime_hours,
                'status' => $entry->status,
                'break_count' => $entry->breakEntries->count(),
                'total_break_minutes' => $entry->breakEntries->sum('duration_minutes'),
                'adjustment_reason' => $entry->adjustment_reason,
                'submission_status' => $submission?->status,
                'submission_id' => $submission?->id,
            ];
        });

        // Get users for dropdown
        $users = User::whereIn('id', $manageableUserIds)
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $transformedEntries,
            'users' => $users,
            'pagination' => [
                'current_page' => $timeEntries->currentPage(),
                'last_page' => $timeEntries->lastPage(),
                'per_page' => $timeEntries->perPage(),
                'total' => $timeEntries->total(),
                'from' => $timeEntries->firstItem(),
                'to' => $timeEntries->lastItem(),
            ],
            'summary' => $this->getTimeEntriesSummary($query),
        ]);
    }

    /**
     * Get daily summary view
     */
    private function getDailySummaryView($query, Request $request, $manageableUserIds): JsonResponse
    {
        // Clone query for summary calculation
        $summaryQuery = clone $query;

        // Get all entries for date grouping
        $allEntries = $query->get();

        // Group by user and date
        $dailySummaries = $allEntries->groupBy(function ($entry) {
            return $entry->user_id . '_' . $entry->clock_in_time->format('Y-m-d');
        })->map(function ($dayEntries) {
            $firstEntry = $dayEntries->first();
            $user = $firstEntry->user;
            $date = $firstEntry->clock_in_time->format('Y-m-d');

            // Get submission for this week
            $weekStart = Carbon::parse($date)->startOfWeek();
            $submission = TimesheetSubmission::where('user_id', $user->id)
                ->where('week_start_date', $weekStart->format('Y-m-d'))
                ->first();

            return [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'departments' => $user->departments->pluck('name')->toArray(),
                ],
                'date' => $date,
                'day_name' => Carbon::parse($date)->format('l'),
                'entries_count' => $dayEntries->count(),
                'total_hours' => $dayEntries->sum('total_hours'),
                'regular_hours' => $dayEntries->sum('regular_hours'),
                'overtime_hours' => $dayEntries->sum('overtime_hours'),
                'total_break_minutes' => $dayEntries->sum(function ($entry) {
                    return $entry->breakEntries->sum('duration_minutes');
                }),
                'first_clock_in' => $dayEntries->min('clock_in_time'),
                'last_clock_out' => $dayEntries->max('clock_out_time'),
                'has_incomplete' => $dayEntries->contains('status', 'active'),
                'submission_status' => $submission?->status,
                'submission_id' => $submission?->id,
            ];
        })->values();

        // Apply pagination to daily summaries
        $perPage = $request->get('per_page', 20);
        $page = $request->get('page', 1);
        $total = $dailySummaries->count();
        $items = $dailySummaries->slice(($page - 1) * $perPage, $perPage)->values();

        // Get users for dropdown
        $users = User::whereIn('id', $manageableUserIds)
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $items,
            'users' => $users,
            'pagination' => [
                'current_page' => $page,
                'last_page' => ceil($total / $perPage),
                'per_page' => $perPage,
                'total' => $total,
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total),
            ],
            'summary' => $this->getTimeEntriesSummary($summaryQuery),
        ]);
    }

    /**
     * Get timesheet submission for a time entry
     */
    private function getTimesheetSubmissionForEntry(TimeEntry $entry): ?TimesheetSubmission
    {
        $weekStart = $entry->clock_in_time->startOfWeek();

        return TimesheetSubmission::where('user_id', $entry->user_id)
            ->where('week_start_date', $weekStart->format('Y-m-d'))
            ->first();
    }

    /**
     * Get summary statistics for time entries
     */
    private function getTimeEntriesSummary($query): array
    {
        $entries = $query->get();

        return [
            'total_entries' => $entries->count(),
            'total_hours' => round($entries->sum('total_hours'), 2),
            'total_regular' => round($entries->sum('regular_hours'), 2),
            'total_overtime' => round($entries->sum('overtime_hours'), 2),
            'active_entries' => $entries->where('status', 'active')->count(),
            'completed_entries' => $entries->where('status', 'completed')->count(),
            'adjusted_entries' => $entries->where('status', 'adjusted')->count(),
            'unique_employees' => $entries->pluck('user_id')->unique()->count(),
        ];
    }


// Add this method to your TimeClockController class

    /**
     * Get comprehensive manager dashboard with real-time status and time entries
     */
    public function getManagerDashboard(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'search' => 'nullable|string|max:255',
            'department' => 'nullable|string',
            'per_page' => 'nullable|integer|min:5|max:100',
        ]);

        $currentUser = Auth::user();

        // Get manageable users with their current status
        $manageableUsers = User::with([
            'currentPosition',
            'departments',
            'currentTimeEntry' => function ($query) {
                $query->where('status', 'active')->whereNull('clock_out_time');
            },
            'currentTimeEntry.breakEntries' => function ($query) {
                $query->where('status', 'active');
            }
        ])
            ->whereHas('reportingAssignments', function ($query) use ($currentUser) {
                $query->where('manager_id', $currentUser->id)
                    ->whereNull('end_date');
            })
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('department') && $request->department !== 'all', function ($query) use ($request) {
                $query->whereHas('departments', function ($q) use ($request) {
                    $q->where('name', $request->department);
                });
            })
            ->orderBy('name')
            ->get();

        // Get date range for historical data
        $startDate = $request->start_date ? Carbon::parse($request->start_date)->startOfDay() : Carbon::today();
        $endDate = $request->end_date ? Carbon::parse($request->end_date)->endOfDay() : Carbon::today()->endOfDay();

        // Transform users with comprehensive status
        $transformedUsers = $manageableUsers->map(function ($user) use ($startDate, $endDate) {
            // Current status
            $currentEntry = $user->currentTimeEntry;
            $isClocked = (bool) $currentEntry;
            $currentBreak = $currentEntry?->breakEntries?->first();

            // Get today's completed entries
            $todayEntries = TimeEntry::where('user_id', $user->id)
                ->whereDate('clock_in_time', Carbon::today())
                ->where('status', '!=', 'active')
                ->with('breakEntries')
                ->get();

            // Get date range entries for summary
            $dateRangeEntries = TimeEntry::where('user_id', $user->id)
                ->whereBetween('clock_in_time', [$startDate, $endDate])
                ->get();

            // Calculate totals
            $totalHours = $dateRangeEntries->sum('total_hours');
            $totalRegular = $dateRangeEntries->sum('regular_hours');
            $totalOvertime = $dateRangeEntries->sum('overtime_hours');

            // Current session duration
            $currentSessionDuration = null;
            $currentBreakDuration = null;

            if ($currentEntry) {
                $sessionMinutes = $currentEntry->clock_in_time->diffInMinutes(now());
                $breakMinutes = $currentEntry->getTotalBreakMinutes();
                $workMinutes = $sessionMinutes - $breakMinutes;
                $currentSessionDuration = sprintf('%d:%02d', floor($workMinutes / 60), $workMinutes % 60);

                if ($currentBreak) {
                    $breakMins = $currentBreak->break_start->diffInMinutes(now());
                    $currentBreakDuration = sprintf('%d:%02d', floor($breakMins / 60), $breakMins % 60);
                }
            }

            // Today's total (including current session)
            $todayTotal = $todayEntries->sum('total_hours');
            if ($currentEntry) {
                $sessionMinutes = $currentEntry->clock_in_time->diffInMinutes(now());
                $breakMinutes = $currentEntry->getTotalBreakMinutes();
                $workMinutes = $sessionMinutes - $breakMinutes;
                $todayTotal += $workMinutes / 60;
            }

            // Get current week timesheet submission status
            $weekStart = Carbon::now()->startOfWeek();
            $submission = TimesheetSubmission::where('user_id', $user->id)
                ->where('week_start_date', $weekStart->format('Y-m-d'))
                ->first();

            return [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'position' => $user->currentPosition?->name ?? 'No Position',
                    'departments' => $user->departments->pluck('name')->toArray(),
                ],
                'current_status' => [
                    'is_clocked_in' => $isClocked,
                    'clock_in_time' => $currentEntry?->clock_in_time,
                    'session_duration' => $currentSessionDuration,
                    'is_on_break' => (bool) $currentBreak,
                    'break_type' => $currentBreak?->break_type,
                    'break_start' => $currentBreak?->break_start,
                    'break_duration' => $currentBreakDuration,
                    'status_text' => $this->getStatusText($isClocked, $currentBreak),
                ],
                'today_summary' => [
                    'total_hours' => round($todayTotal, 2),
                    'completed_entries' => $todayEntries->count(),
                    'first_clock_in' => $todayEntries->min('clock_in_time'),
                    'last_clock_out' => $todayEntries->max('clock_out_time'),
                ],
                'period_summary' => [
                    'total_hours' => round($totalHours, 2),
                    'regular_hours' => round($totalRegular, 2),
                    'overtime_hours' => round($totalOvertime, 2),
                    'entries_count' => $dateRangeEntries->count(),
                ],
                'submission_status' => $submission?->status,
                'last_activity' => $this->getLastActivity($user, $currentEntry, $todayEntries),
            ];
        });

        // Calculate summary statistics
        $totalUsers = $transformedUsers->count();
        $clockedInCount = $transformedUsers->where('current_status.is_clocked_in', true)->count();
        $onBreakCount = $transformedUsers->where('current_status.is_on_break', true)->count();
        $totalHoursToday = $transformedUsers->sum('today_summary.total_hours');
        $totalHoursPeriod = $transformedUsers->sum('period_summary.total_hours');

        return response()->json([
            'users' => $transformedUsers->values(),
            'summary' => [
                'total_users' => $totalUsers,
                'clocked_in_count' => $clockedInCount,
                'on_break_count' => $onBreakCount,
                'clocked_out_count' => $totalUsers - $clockedInCount,
                'total_hours_today' => round($totalHoursToday, 2),
                'total_hours_period' => round($totalHoursPeriod, 2),
                'date_range' => [
                    'start' => $startDate->format('Y-m-d'),
                    'end' => $endDate->format('Y-m-d'),
                ],
            ],
            'departments' => $this->getAvailableDepartments($manageableUsers),
        ]);
    }

    /**
     * Get status text for display
     */
    private function getStatusText(bool $isClocked, $currentBreak): string
    {
        if (!$isClocked) {
            return 'Clocked Out';
        }

        if ($currentBreak) {
            return 'On Break ('.ucfirst($currentBreak->break_type).')';
        }

        return 'Working';
    }

    /**
     * Get last activity timestamp
     */
    private function getLastActivity(User $user, $currentEntry, $todayEntries)
    {
        if ($currentEntry) {
            // If currently clocked in, last activity is now
            return now();
        }

        // Otherwise, get the most recent clock out from today or recent entries
        $recentEntry = TimeEntry::where('user_id', $user->id)
            ->whereNotNull('clock_out_time')
            ->orderBy('clock_out_time', 'desc')
            ->first();

        return $recentEntry?->clock_out_time;
    }

    /**
     * Get available departments for filter
     */
    private function getAvailableDepartments($users): array
    {
        return $users->flatMap(function ($user) {
            return $user->departments->pluck('name');
        })->unique()->sort()->values()->toArray();
    }
}
