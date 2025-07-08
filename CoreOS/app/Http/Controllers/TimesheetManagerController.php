<?php

namespace App\Http\Controllers;

use App\Models\TimeAdjustment;
use App\Models\TimeEntry;
use App\Models\TimesheetSubmission;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class TimesheetManagerController extends Controller
{
    /**
     * Display the timesheet manager dashboard
     */
    public function index(): \Inertia\Response
    {
        return Inertia::render('Timesheet/Manager');
    }

    /**
     * Get weekly timesheet data for all manageable users
     */
    public function getWeeklyData(Request $request): JsonResponse
    {
        $currentUser = Auth::user();
        $visibleUsers = $currentUser->getVisibleUsers();

        $weekStart = $request->filled('week_start')
            ? Carbon::parse($request->week_start)->startOfWeek()
            : Carbon::now()->startOfWeek();

        $weekEnd = $weekStart->copy()->endOfWeek();

        $weeklyData = [];

        foreach ($visibleUsers as $user) {
            // Get time entries for this week
            $timeEntries = TimeEntry::where('user_id', $user->id)
                ->whereBetween('clock_in_time', [$weekStart, $weekEnd])
                ->with(['breakEntries' => function ($query) {
                    $query->orderBy('break_start');
                }])
                ->orderBy('clock_in_time')
                ->get();

            // Get timesheet submission for this week
            $submission = TimesheetSubmission::where('user_id', $user->id)
                ->where('week_start_date', $weekStart->format('Y-m-d'))
                ->first();

            // Build daily breakdown
            $dailyData = [];
            $currentDate = $weekStart->copy();

            while ($currentDate <= $weekEnd) {
                $dateString = $currentDate->format('Y-m-d');

                // Get entries for this day
                $dayEntries = $timeEntries->filter(function ($entry) use ($currentDate) {
                    return $entry->clock_in_time->isSameDay($currentDate);
                });

                $totalHours = $dayEntries->sum('total_hours');
                $regularHours = $dayEntries->sum('regular_hours');
                $overtimeHours = $dayEntries->sum('overtime_hours');

                $dailyData[] = [
                    'date' => $dateString,
                    'day_name' => $currentDate->format('l'),
                    'is_weekend' => $currentDate->isWeekend(),
                    'total_hours' => $totalHours,
                    'regular_hours' => $regularHours,
                    'overtime_hours' => $overtimeHours,
                    'entries_count' => $dayEntries->count(),
                    'entries' => $dayEntries->map(function ($entry) {
                        return [
                            'id' => $entry->id,
                            'clock_in_time' => $entry->clock_in_time,
                            'clock_out_time' => $entry->clock_out_time,
                            'total_hours' => $entry->total_hours,
                            'status' => $entry->status,
                            'is_active' => $entry->isActive(),
                            'is_edited' => $entry->status === 'adjusted' || !empty($entry->adjustment_reason),
                            'edit_history' => [],
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
            ];

            $weeklyData[] = [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'position' => $user->currentPosition?->name,
                    'departments' => $user->departments->pluck('name')->toArray(),
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
                    'can_edit' => $submission->canEdit(),
                    'is_locked' => $submission->isLocked(),
                ] : null,
                'daily_data' => $dailyData,
                'weekly_totals' => $weeklyTotals,
            ];
        }

        return response()->json([
            'week_info' => [
                'start_date' => $weekStart->format('Y-m-d'),
                'end_date' => $weekEnd->format('Y-m-d'),
                'display' => $weekStart->format('M d') . ' - ' . $weekEnd->format('M d, Y'),
            ],
            'users_data' => $weeklyData,
        ]);
    }

    /**
     * Create a new time entry (Manager function)
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'clock_in_time' => 'required|date',
            'clock_out_time' => 'nullable|date|after:clock_in_time',
            'reason' => 'required|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ]);

        $currentUser = Auth::user();
        $targetUser = User::findOrFail($request->user_id);

        // Check if current user can manage this employee
        $visibleUserIds = $currentUser->getVisibleUsers()->pluck('id');

        if (!$visibleUserIds->contains($targetUser->id)) {
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

        // Validate times
        if ($clockOutTime && $clockInTime >= $clockOutTime) {
            return back()->withErrors(['message' => 'Clock out time must be after clock in time.']);
        }

        try {
            DB::transaction(function () use ($request, $targetUser, $currentUser, $clockInTime, $clockOutTime) {
                // Calculate hours if both times provided
                $totalHours = 0;
                $regularHours = 0;
                $overtimeHours = 0;

                if ($clockOutTime) {
                    $totalMinutes = $clockInTime->diffInMinutes($clockOutTime);
                    $totalHours = round($totalMinutes / 60, 2);

                    // Calculate regular vs overtime hours (assuming 8 hours is regular day)
                    $regularHours = min($totalHours, 8);
                    $overtimeHours = max(0, $totalHours - 8);
                }

                // Create the time entry
                $timeEntry = TimeEntry::create([
                    'user_id' => $targetUser->id,
                    'clock_in_time' => $clockInTime,
                    'clock_out_time' => $clockOutTime,
                    'total_hours' => $totalHours,
                    'regular_hours' => $regularHours,
                    'overtime_hours' => $overtimeHours,
                    'status' => $clockOutTime ? 'completed' : 'active',
                    'adjustment_reason' => "Manual entry created by manager: {$currentUser->name} - {$request->reason}",
                    'adjusted_by_user_id' => $currentUser->id,
                    'adjusted_at' => now(),
                    'clock_in_ip' => request()->ip(),
                    'clock_out_ip' => $clockOutTime ? request()->ip() : null,
                    'clock_in_device' => 'Manager Entry',
                    'clock_out_device' => $clockOutTime ? 'Manager Entry' : null,
                    'clock_in_user_agent' => request()->userAgent(),
                    'clock_out_user_agent' => $clockOutTime ? request()->userAgent() : null,
                ]);

                // Create adjustment record for audit trail
                TimeAdjustment::create([
                    'user_id' => $targetUser->id,
                    'time_entry_id' => $timeEntry->id,
                    'adjustment_type' => 'manual_entry',
                    'adjusted_clock_in' => $clockInTime,
                    'adjusted_clock_out' => $clockOutTime,
                    'adjusted_hours' => $totalHours,
                    'reason' => $request->reason,
                    'employee_notes' => $request->notes,
                    'requested_by_user_id' => $currentUser->id,
                    'approved_by_user_id' => $currentUser->id,
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approval_notes' => 'Manager created entry',
                ]);

                Log::info("Manager created time entry: Entry ID {$timeEntry->id}, Employee: {$targetUser->name}, Manager: {$currentUser->name}");
            });

            return back()->with('success', 'Time entry created successfully');

        } catch (\Exception $e) {
            Log::error("Failed to create time entry: " . $e->getMessage());
            Log::error("Stack trace: " . $e->getTraceAsString());

            return back()->withErrors(['message' => 'Failed to create time entry. Please try again.']);
        }
    }

    /**
     * Delete a time entry (Manager function)
     */
    public function destroy(Request $request, TimeEntry $timeEntry): RedirectResponse
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $currentUser = Auth::user();

        // Check if current user can manage this employee
        $visibleUserIds = $currentUser->getVisibleUsers()->pluck('id');

        if (!$visibleUserIds->contains($timeEntry->user_id)) {
            return back()->withErrors(['message' => 'You do not have permission to delete this time entry.']);
        }

        // Don't allow deletion of active entries
        if ($timeEntry->status === 'active') {
            return back()->withErrors(['message' => 'Cannot delete an active time entry. Please clock out the employee first.']);
        }

        try {
            DB::transaction(function () use ($timeEntry, $currentUser, $request) {
                // Store original data for audit
                $originalData = [
                    'clock_in_time' => $timeEntry->clock_in_time,
                    'clock_out_time' => $timeEntry->clock_out_time,
                    'total_hours' => $timeEntry->total_hours,
                    'regular_hours' => $timeEntry->regular_hours,
                    'overtime_hours' => $timeEntry->overtime_hours,
                ];

                // Create adjustment record for audit trail
                TimeAdjustment::create([
                    'user_id' => $timeEntry->user_id,
                    'time_entry_id' => $timeEntry->id,
                    'adjustment_type' => 'manual_entry',
                    'original_data' => $originalData,
                    'reason' => "Entry deleted by manager: {$request->reason}",
                    'employee_notes' => "Deleted by {$currentUser->name}",
                    'requested_by_user_id' => $currentUser->id,
                    'approved_by_user_id' => $currentUser->id,
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approval_notes' => 'Manager deleted entry',
                ]);

                // Delete related break entries first
                $timeEntry->breakEntries()->delete();

                // Delete the time entry
                $timeEntry->delete();

                Log::info("Manager deleted time entry: Entry ID {$timeEntry->id}, Employee: {$timeEntry->user->name}, Manager: {$currentUser->name}, Reason: {$request->reason}");
            });

            return back()->with('success', 'Time entry deleted successfully');

        } catch (\Exception $e) {
            Log::error("Failed to delete time entry {$timeEntry->id}: " . $e->getMessage());

            return back()->withErrors(['message' => 'Failed to delete time entry. Please try again.']);
        }
    }

    /**
     * Get manageable users (hierarchy + departments)
     */
    public function getManageableUsers(): JsonResponse
    {
        $currentUser = Auth::user();
        $users = $currentUser->getVisibleUsers();

        return response()->json([
            'users' => $users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'position' => $user->currentPosition?->name,
                    'departments' => $user->departments->pluck('name')->toArray(),
                ];
            }),
        ]);
    }

    /**
     * Get time entries for manager view with filtering
     */
    public function getTimeEntries(Request $request): JsonResponse
    {
        $currentUser = Auth::user();
        $visibleUserIds = $currentUser->getVisibleUsers()->pluck('id');

        $query = TimeEntry::whereIn('user_id', $visibleUserIds)
            ->with([
                'user:id,name,email,position_id,reports_to_user_id',
                'user.currentPosition:id,name',
                'user.departments:id,name',
                'breakEntries' => function ($q) {
                    $q->where('status', 'active');
                }
            ]);

        // Apply filters
        if ($request->filled('start_date')) {
            $query->where('clock_in_time', '>=', Carbon::parse($request->start_date)->startOfDay());
        }

        if ($request->filled('end_date')) {
            $query->where('clock_in_time', '<=', Carbon::parse($request->end_date)->endOfDay());
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }

        // Handle view type
        $viewType = $request->get('view_type', 'entries');
        $perPage = $request->get('per_page', 20);

        if ($viewType === 'daily') {
            return $this->getDailySummaries($query, $perPage, $visibleUserIds);
        }

        // Default entries view
        $query->orderBy('clock_in_time', 'desc');
        $timeEntries = $query->paginate($perPage);

        // Get summary statistics
        $summary = $this->getTimeEntriesSummary($visibleUserIds, $request);

        return response()->json([
            'data' => $timeEntries->items()->map(function ($entry) {
                $currentBreak = $entry->breakEntries->first();

                return [
                    'id' => $entry->id,
                    'user' => [
                        'id' => $entry->user->id,
                        'name' => $entry->user->name,
                        'email' => $entry->user->email,
                        'position' => $entry->user->currentPosition?->name,
                        'departments' => $entry->user->departments->pluck('name')->toArray(),
                    ],
                    'clock_in_time' => $entry->clock_in_time,
                    'clock_out_time' => $entry->clock_out_time,
                    'total_hours' => $entry->total_hours,
                    'regular_hours' => $entry->regular_hours,
                    'overtime_hours' => $entry->overtime_hours,
                    'status' => $entry->status,
                    'break_count' => $entry->breakEntries()->count(),
                    'total_break_minutes' => $entry->getTotalBreakMinutes(),
                    'is_on_break' => (bool) $currentBreak,
                    'current_break_type' => $currentBreak?->break_type,
                    'adjustment_reason' => $entry->adjustment_reason,
                    'submission_status' => $this->getSubmissionStatus($entry),
                ];
            }),
            'pagination' => [
                'current_page' => $timeEntries->currentPage(),
                'last_page' => $timeEntries->lastPage(),
                'per_page' => $timeEntries->perPage(),
                'total' => $timeEntries->total(),
                'from' => $timeEntries->firstItem(),
                'to' => $timeEntries->lastItem(),
            ],
            'summary' => $summary,
        ]);
    }

    /**
     * Get daily summaries view
     */
    private function getDailySummaries($baseQuery, $perPage, $visibleUserIds): JsonResponse
    {
        // Clone the query for summary stats
        $summaryQuery = clone $baseQuery;

        // Get daily summaries
        $dailySummaries = DB::table('time_entries')
            ->select([
                'user_id',
                DB::raw('DATE(clock_in_time) as date'),
                DB::raw('DAYNAME(clock_in_time) as day_name'),
                DB::raw('COUNT(*) as entries_count'),
                DB::raw('SUM(total_hours) as total_hours'),
                DB::raw('SUM(regular_hours) as regular_hours'),
                DB::raw('SUM(overtime_hours) as overtime_hours'),
                DB::raw('MIN(clock_in_time) as first_clock_in'),
                DB::raw('MAX(clock_out_time) as last_clock_out'),
                DB::raw('SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) > 0 as has_incomplete')
            ])
            ->whereIn('user_id', $visibleUserIds)
            ->groupBy('user_id', 'date')
            ->orderBy('date', 'desc')
            ->orderBy('user_id')
            ->paginate($perPage);

        // Get users data
        $userIds = collect($dailySummaries->items())->pluck('user_id')->unique();
        $users = User::whereIn('id', $userIds)
            ->with(['currentPosition:id,name', 'departments:id,name'])
            ->get()
            ->keyBy('id');

        // Transform data
        $transformedData = collect($dailySummaries->items())->map(function ($summary) use ($users) {
            $user = $users[$summary->user_id];

            return [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'position' => $user->currentPosition?->name,
                    'departments' => $user->departments->pluck('name')->toArray(),
                ],
                'date' => $summary->date,
                'day_name' => $summary->day_name,
                'entries_count' => $summary->entries_count,
                'total_hours' => (float) $summary->total_hours,
                'regular_hours' => (float) $summary->regular_hours,
                'overtime_hours' => (float) $summary->overtime_hours,
                'first_clock_in' => $summary->first_clock_in,
                'last_clock_out' => $summary->last_clock_out,
                'has_incomplete' => (bool) $summary->has_incomplete,
                'submission_status' => $this->getSubmissionStatusForDate($user->id, $summary->date),
            ];
        });

        $summary = $this->getTimeEntriesSummary($visibleUserIds, request());

        return response()->json([
            'data' => $transformedData,
            'pagination' => [
                'current_page' => $dailySummaries->currentPage(),
                'last_page' => $dailySummaries->lastPage(),
                'per_page' => $dailySummaries->perPage(),
                'total' => $dailySummaries->total(),
                'from' => $dailySummaries->firstItem(),
                'to' => $dailySummaries->lastItem(),
            ],
            'summary' => $summary,
        ]);
    }

    /**
     * Get currently active time entries
     */
    public function getCurrentlyActive(): JsonResponse
    {
        $currentUser = Auth::user();
        $visibleUserIds = $currentUser->getVisibleUsers()->pluck('id');

        $activeEntries = TimeEntry::whereIn('user_id', $visibleUserIds)
            ->where('status', 'active')
            ->whereNull('clock_out_time')
            ->with([
                'user:id,name,email',
                'breakEntries' => function ($q) {
                    $q->where('status', 'active');
                }
            ])
            ->orderBy('clock_in_time', 'desc')
            ->get();

        return response()->json([
            'data' => $activeEntries->map(function ($entry) {
                $currentBreak = $entry->breakEntries->first();

                return [
                    'id' => $entry->id,
                    'user' => [
                        'id' => $entry->user->id,
                        'name' => $entry->user->name,
                        'email' => $entry->user->email,
                    ],
                    'clock_in_time' => $entry->clock_in_time,
                    'status' => $entry->status,
                    'is_on_break' => (bool) $currentBreak,
                    'current_break_type' => $currentBreak?->break_type,
                ];
            }),
        ]);
    }

    /**
     * Export time entries to CSV
     */
    public function exportTimeEntries(Request $request): Response
    {
        $currentUser = Auth::user();
        $visibleUserIds = $currentUser->getVisibleUsers()->pluck('id');

        $query = TimeEntry::whereIn('user_id', $visibleUserIds)
            ->with(['user:id,name,email', 'user.departments:id,name']);

        // Apply same filters as getTimeEntries
        if ($request->filled('start_date')) {
            $query->where('clock_in_time', '>=', Carbon::parse($request->start_date)->startOfDay());
        }

        if ($request->filled('end_date')) {
            $query->where('clock_in_time', '<=', Carbon::parse($request->end_date)->endOfDay());
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $timeEntries = $query->orderBy('clock_in_time', 'desc')->get();

        // Generate CSV content
        $csvContent = "Employee Name,Email,Department,Clock In,Clock Out,Total Hours,Regular Hours,Overtime Hours,Status,Break Minutes,Date\n";

        foreach ($timeEntries as $entry) {
            $csvContent .= sprintf(
                '"%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s"' . "\n",
                $entry->user->name,
                $entry->user->email,
                $entry->user->departments->pluck('name')->join(', '),
                $entry->clock_in_time->format('Y-m-d H:i:s'),
                $entry->clock_out_time?->format('Y-m-d H:i:s') ?? 'Still Active',
                $entry->total_hours ?? '0.00',
                $entry->regular_hours ?? '0.00',
                $entry->overtime_hours ?? '0.00',
                ucfirst($entry->status),
                $entry->getTotalBreakMinutes(),
                $entry->clock_in_time->format('Y-m-d')
            );
        }

        $filename = 'time_entries_' . Carbon::now()->format('Y-m-d_H-i-s') . '.csv';

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Get summary statistics for time entries
     */
    private function getTimeEntriesSummary($visibleUserIds, Request $request): array
    {
        $query = TimeEntry::whereIn('user_id', $visibleUserIds);

        // Apply same date filters
        if ($request->filled('start_date')) {
            $query->where('clock_in_time', '>=', Carbon::parse($request->start_date)->startOfDay());
        }

        if ($request->filled('end_date')) {
            $query->where('clock_in_time', '<=', Carbon::parse($request->end_date)->endOfDay());
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $summary = $query->selectRaw('
            COUNT(*) as total_entries,
            SUM(total_hours) as total_hours,
            SUM(regular_hours) as total_regular,
            SUM(overtime_hours) as total_overtime,
            SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as active_entries,
            SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed_entries,
            SUM(CASE WHEN status = "adjusted" THEN 1 ELSE 0 END) as adjusted_entries,
            COUNT(DISTINCT user_id) as unique_employees
        ')->first();

        return [
            'total_entries' => (int) $summary->total_entries,
            'total_hours' => (float) $summary->total_hours,
            'total_regular' => (float) $summary->total_regular,
            'total_overtime' => (float) $summary->total_overtime,
            'active_entries' => (int) $summary->active_entries,
            'completed_entries' => (int) $summary->completed_entries,
            'adjusted_entries' => (int) $summary->adjusted_entries,
            'unique_employees' => (int) $summary->unique_employees,
        ];
    }

    /**
     * Get submission status for a time entry
     */
    private function getSubmissionStatus(TimeEntry $entry): ?string
    {
        $weekStart = $entry->clock_in_time->startOfWeek();

        $submission = TimesheetSubmission::where('user_id', $entry->user_id)
            ->where('week_start_date', $weekStart->format('Y-m-d'))
            ->first();

        return $submission?->status;
    }

    /**
     * Get submission status for a specific date
     */
    private function getSubmissionStatusForDate($userId, $date): ?string
    {
        $weekStart = Carbon::parse($date)->startOfWeek();

        $submission = TimesheetSubmission::where('user_id', $userId)
            ->where('week_start_date', $weekStart->format('Y-m-d'))
            ->first();

        return $submission?->status;
    }

    /**
     * Get dashboard statistics for manager
     */
    public function getDashboardStats(): JsonResponse
    {
        $currentUser = Auth::user();
        $visibleUserIds = $currentUser->getVisibleUsers()->pluck('id');

        $today = Carbon::today();
        $thisWeek = Carbon::now()->startOfWeek();

        $stats = [
            'currently_active' => TimeEntry::whereIn('user_id', $visibleUserIds)
                ->where('status', 'active')
                ->whereNull('clock_out_time')
                ->count(),

            'total_employees' => $visibleUserIds->count(),

            'today_hours' => TimeEntry::whereIn('user_id', $visibleUserIds)
                ->whereDate('clock_in_time', $today)
                ->sum('total_hours'),

            'week_hours' => TimeEntry::whereIn('user_id', $visibleUserIds)
                ->where('clock_in_time', '>=', $thisWeek)
                ->sum('total_hours'),

            'pending_submissions' => TimesheetSubmission::whereIn('user_id', $visibleUserIds)
                ->where('status', 'submitted')
                ->count(),
        ];

        return response()->json($stats);
    }
}
