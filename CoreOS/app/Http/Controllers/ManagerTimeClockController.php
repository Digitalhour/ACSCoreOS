<?php

namespace App\Http\Controllers;

use App\Models\TimeClock;
use App\Models\Timesheet;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ManagerTimeClockController extends Controller
{
    /**
     * Display the manager dashboard
     */
    public function dashboard(Request $request)
    {
        $manager = Auth::user();

        // Get all subordinates in hierarchy (direct reports + their reports) + manager themselves
        $managedUserIds = $this->getAllManagedUserIds($manager);

        if (empty($managedUserIds)) {
            return Inertia::render('TimeManagement/Manager/Dashboard', [
                'pendingTimesheets' => [],
                'allTimesheets' => ['data' => [], 'links' => [], 'meta' => []],
                'subordinates' => [],
                'dashboardStats' => [
                    'pending_count' => 0,
                    'total_employees' => 0,
                    'this_week_submissions' => 0,
                    'approved_this_week' => 0,
                ],
                'filters' => [],
                'teamHoursData' => [],
            ]);
        }

        // Get pending timesheets for approval (include manager's own + all subordinates, any week)
        $pendingTimesheets = Timesheet::whereIn('user_id', $managedUserIds)
            ->where('status', 'submitted')
            ->with(['user', 'submittedBy'])
            ->orderBy('submitted_at', 'asc')
            ->get();

        // Build query for all timesheets with filters (include manager's own)
        $query = Timesheet::whereIn('user_id', $managedUserIds)
            ->with(['user', 'submittedBy', 'approvedBy']);

        // Apply filters
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('employee_id') && $request->employee_id !== 'all') {
            $query->where('user_id', $request->employee_id);
        }

        if ($request->filled('week_start')) {
            $query->where('week_start_date', '>=', $request->week_start);
        }

        // Get all timesheets with pagination
        $allTimesheets = $query->orderBy('week_start_date', 'desc')
            ->orderBy('submitted_at', 'asc')
            ->paginate(20)
            ->withQueryString();

        // Get managed users (subordinates + manager) for filter dropdown
        $subordinates = User::whereIn('id', $managedUserIds)
            ->with(['currentPosition', 'departments'])
            ->orderBy('name')
            ->get();

        // Generate team hours data for current week (include manager)
        $teamHoursData = $this->generateTeamHoursData($managedUserIds);

        // Calculate dashboard stats
        $dashboardStats = [
            'pending_count' => $pendingTimesheets->count(), // Now includes manager's own
            'total_employees' => count($managedUserIds), // Include manager in count
            'this_week_submissions' => Timesheet::whereIn('user_id', $managedUserIds)
                ->where('submitted_at', '>=', Carbon::now()->startOfWeek())
                ->count(),
            'approved_this_week' => Timesheet::whereIn('user_id', $this->getAllSubordinateIds($manager)) // Only subordinates can be "approved"
            ->where('status', 'approved')
                ->where('approved_at', '>=', Carbon::now()->startOfWeek())
                ->count(),
        ];

        return Inertia::render('TimeManagement/Manager/Dashboard', [
            'pendingTimesheets' => $pendingTimesheets,
            'allTimesheets' => $allTimesheets,
            'subordinates' => $subordinates,
            'dashboardStats' => $dashboardStats,
            'filters' => $request->only(['status', 'employee_id', 'week_start']),
            'teamHoursData' => $teamHoursData,
            'currentManagerId' => $manager->id, // Add manager ID for frontend logic
        ]);
    }

    /**
     * Display all timesheets for managed employees
     */
    public function timesheets(Request $request)
    {
        $manager = Auth::user();
        $managedUserIds = $this->getAllManagedUserIds($manager);

        if (empty($managedUserIds)) {
            return Inertia::render('TimeManagement/Manager/Timesheets', [
                'timesheets' => [],
                'filters' => [],
                'subordinates' => [],
            ]);
        }

        // Build query for timesheets
        $query = Timesheet::whereIn('user_id', $managedUserIds)
            ->with(['user', 'submittedBy', 'approvedBy']);

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('employee_id')) {
            $query->where('user_id', $request->employee_id);
        }

        if ($request->filled('week_start')) {
            $query->where('week_start_date', '>=', $request->week_start);
        }

        if ($request->filled('week_end')) {
            $query->where('week_end_date', '<=', $request->week_end);
        }

        // Get timesheets with pagination
        $timesheets = $query->orderBy('week_start_date', 'desc')
            ->orderBy('submitted_at', 'asc')
            ->paginate(20)
            ->withQueryString();

        // Get managed users for filter dropdown
        $subordinates = User::whereIn('id', $managedUserIds)
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return Inertia::render('TimeManagement/Manager/Timesheets', [
            'timesheets' => $timesheets,
            'subordinates' => $subordinates,
            'filters' => $request->only(['status', 'employee_id', 'week_start', 'week_end']),
        ]);
    }

    /**
     * Approve or reject a timesheet
     */
    public function approve(Request $request, Timesheet $timesheet)
    {
        $request->validate([
            'action' => 'required|in:approve,reject',
            'manager_notes' => 'nullable|string|max:1000',
        ]);

        $manager = Auth::user();

        // Verify manager has authority over this timesheet
        $managedUserIds = $this->getAllManagedUserIds($manager);

        if (!in_array($timesheet->user_id, $managedUserIds)) {
            return back()->withErrors(['message' => 'Unauthorized: You cannot manage this employee\'s timesheet.']);
        }

        // Check if timesheet is in correct status
        if (!$timesheet->isSubmitted()) {
            return back()->withErrors(['message' => 'Timesheet is not available for approval.']);
        }

        if ($request->action === 'approve') {
            // Approve the timesheet
            if ($timesheet->approve($manager->id, $request->manager_notes)) {
                return back()->with('success', 'Timesheet approved successfully!');
            }
        } else {
            // Reject the timesheet (withdraw back to draft)
            $rejectionReason = "Rejected by manager: " . ($request->manager_notes ?? 'No reason provided');

            if ($timesheet->withdraw($manager->id, $rejectionReason)) {
                return back()->with('success', 'Timesheet rejected and returned to employee.');
            }
        }

        return back()->withErrors(['message' => 'Failed to process timesheet action.']);
    }

    /**
     * Get detailed view of a specific timesheet
     */
    public function show(Timesheet $timesheet)
    {
        $manager = Auth::user();
        $managedUserIds = $this->getAllManagedUserIds($manager);

        // Verify access (can view own timesheets and subordinates')
        if (!in_array($timesheet->user_id, $managedUserIds)) {
            return back()->withErrors(['message' => 'Unauthorized access.']);
        }

        // Get ALL time entries for this user for the timesheet week (not just linked ones)
        $weekStart = Carbon::parse($timesheet->week_start_date)->startOfDay();
        $weekEnd = Carbon::parse($timesheet->week_end_date)->endOfDay();

        $timeEntries = TimeClock::where('user_id', $timesheet->user_id)
            ->whereBetween('clock_in_at', [$weekStart, $weekEnd])
            ->with(['breakType', 'audits'])
            ->orderBy('clock_in_at', 'asc')
            ->get();

        return Inertia::render('TimeManagement/Manager/TimesheetDetail', [
            'timesheet' => $timesheet->load(['user', 'submittedBy', 'approvedBy', 'processedBy']),
            'timeEntries' => $timeEntries,
            'currentManagerId' => $manager->id,
        ]);
    }
    /**
     * Generate team hours data for the specified week (default: current week)
     */
    private function generateTeamHoursData(array $userIds, Carbon $weekStart = null): array
    {
        if (!$weekStart) {
            $weekStart = Carbon::now()->startOfWeek(Carbon::SUNDAY);
        }

        $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SATURDAY);
        $today = Carbon::today();

        $teamData = [];

        // Get all users with their positions
        $users = User::whereIn('id', $userIds)
            ->with('currentPosition')
            ->orderBy('name')
            ->get();

        foreach ($users as $employee) {
            // Get time clock entries for this employee for the specified week
            $timeEntries = TimeClock::where('user_id', $employee->id)
                ->where('punch_type', 'work') // Only work punches, not breaks
                ->whereBetween('clock_in_at', [$weekStart, $weekEnd->endOfDay()])
                ->where('status', 'completed')
                ->get();

            // Initialize days array
            $days = [
                'sunday' => 0,
                'monday' => 0,
                'tuesday' => 0,
                'wednesday' => 0,
                'thursday' => 0,
                'friday' => 0,
                'saturday' => 0,
            ];

            $totalRegularHours = 0;
            $totalOvertimeHours = 0;

            // Calculate hours for each day
            foreach ($timeEntries as $entry) {
                $dayOfWeek = strtolower($entry->clock_in_at->format('l')); // 'monday', 'tuesday', etc.

                // Use calculated hours if available, otherwise calculate from timestamps
                $regularHours = is_numeric($entry->regular_hours) ? $entry->regular_hours : 0;
                $overtimeHours = is_numeric($entry->overtime_hours) ? $entry->overtime_hours : 0;

                // If no calculated hours, use total time
                if ($regularHours === 0 && $overtimeHours === 0 && $entry->clock_out_at) {
                    $totalMinutes = $entry->clock_in_at->diffInMinutes($entry->clock_out_at);
                    $regularHours = round($totalMinutes / 60, 2);
                }

                $dailyHours = $regularHours + $overtimeHours;

                $days[$dayOfWeek] += $dailyHours;
                $totalRegularHours += $regularHours;
                $totalOvertimeHours += $overtimeHours;
            }

            $weekTotal = $totalRegularHours + $totalOvertimeHours;

            // Get current status for this employee
            $currentStatus = TimeClock::getUserCurrentStatus($employee->id);

            // Get today's hours worked so far
            $todayHours = 0;
            $todayEntries = TimeClock::where('user_id', $employee->id)
                ->where('punch_type', 'work')
                ->whereBetween('clock_in_at', [$today->startOfDay(), $today->endOfDay()])
                ->get();

            foreach ($todayEntries as $entry) {
                if ($entry->clock_out_at) {
                    $todayHours += $entry->clock_in_at->diffInMinutes($entry->clock_out_at) / 60;
                } elseif ($entry->status === 'active') {
                    // Currently active entry - calculate time so far
                    $todayHours += $entry->clock_in_at->diffInMinutes(now()) / 60;
                }
            }

            // Prepare current status data
            $statusData = [
                'is_clocked_in' => $currentStatus['is_clocked_in'] ?? false,
                'is_on_break' => $currentStatus['is_on_break'] ?? false,
                'current_hours_today' => round($todayHours, 2),
            ];

            // Add clock-in time if available
            if ($currentStatus['is_clocked_in'] && isset($currentStatus['current_work_punch'])) {
                $statusData['clock_in_time'] = $currentStatus['current_work_punch']->clock_in_at->toISOString();
            }

            // Add break information if on break
            if ($currentStatus['is_on_break'] && isset($currentStatus['current_break_punch'])) {
                $breakPunch = $currentStatus['current_break_punch'];
                $statusData['break_start_time'] = $breakPunch->clock_in_at->toISOString();

                if ($breakPunch->breakType) {
                    $statusData['break_type'] = $breakPunch->breakType->label;
                }
            }

            $teamData[] = [
                'employee' => [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'position' => $employee->currentPosition->name ?? 'N/A',
                    'avatar' => $employee->avatar,
                ],
                'days' => $days,
                'weekTotal' => round($weekTotal, 2),
                'regularHours' => round($totalRegularHours, 2),
                'overtimeHours' => round($totalOvertimeHours, 2),
                'currentStatus' => $statusData,
            ];
        }

        return $teamData;
    }
    /**
     * Get day entries for a specific user and date
     */
    public function getDayEntries(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
        ]);

        $manager = Auth::user();
        $managedUserIds = $this->getAllManagedUserIds($manager);

        if (!in_array($request->user_id, $managedUserIds)) {
            return back()->withErrors(['message' => 'Unauthorized access.']);
        }

        $date = Carbon::parse($request->date);

        $dayEntries = TimeClock::where('user_id', $request->user_id)
            ->whereBetween('clock_in_at', [$date->startOfDay(), $date->endOfDay()])
            ->with(['breakType'])
            ->orderBy('clock_in_at', 'asc')
            ->get();

        return Inertia::render('TimeManagement/Manager/Dashboard', [
            'dayEntries' => $dayEntries
        ]);
    }
    public function getDayEntriesModal(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
        ]);

        $manager = Auth::user();
        $managedUserIds = $this->getAllManagedUserIds($manager);

        if (!in_array($request->user_id, $managedUserIds)) {
            return back()->withErrors(['message' => 'Unauthorized access.']);
        }

        $date = Carbon::parse($request->date);
        $isToday = $date->isToday();

        $startOfDay = $date->copy()->startOfDay();
        $endOfDay = $date->copy()->endOfDay();

        // Get entries for the specific date
        $dayEntries = TimeClock::where('user_id', $request->user_id)
            ->whereBetween('clock_in_at', [$startOfDay, $endOfDay])
            ->with(['breakType'])
            ->orderBy('clock_in_at', 'asc')
            ->get();

        // If it's today and no entries found, also check for active entries that might span multiple days
        if ($isToday && $dayEntries->isEmpty()) {
            $activeEntries = TimeClock::where('user_id', $request->user_id)
                ->where('status', 'active')
                ->with(['breakType'])
                ->orderBy('clock_in_at', 'asc')
                ->get();

            // Filter active entries that started today or are still active from yesterday
            $todayActiveEntries = $activeEntries->filter(function ($entry) use ($date) {
                return $entry->clock_in_at->isToday() ||
                    ($entry->clock_in_at->isYesterday() && $entry->status === 'active');
            });

            $dayEntries = $dayEntries->merge($todayActiveEntries);
        }

        // Log for debugging
        \Log::info('Day entries query', [
            'user_id' => $request->user_id,
            'date' => $request->date,
            'is_today' => $isToday,
            'start' => $startOfDay->toISOString(),
            'end' => $endOfDay->toISOString(),
            'found_entries' => $dayEntries->count(),
            'entries' => $dayEntries->toArray()
        ]);

        return response()->json($dayEntries->values());
    }
    /**
     * Clock out an active entry
     */
    public function clockOutEntry(TimeClock $timeClock)
    {
        $manager = Auth::user();
        $managedUserIds = $this->getAllManagedUserIds($manager);

        if (!in_array($timeClock->user_id, $managedUserIds)) {
            return back()->withErrors(['message' => 'Unauthorized access.']);
        }

        if ($timeClock->status !== 'active' || $timeClock->clock_out_at) {
            return back()->withErrors(['message' => 'Entry is not active.']);
        }

        $timeClock->update([
            'clock_out_at' => now(),
            'status' => 'completed',
        ]);

        $timeClock->calculateOvertime();

        // Use manual_edit with manager-specific data
        $timeClock->createAudit('manual_edit', [
            'edited_by' => $manager->id,
            'edit_reason' => 'Manager clocked out employee',
            'manager_action' => 'clock_out',
            'manager_id' => $manager->id
        ]);

        return back()->with('success', 'Employee clocked out successfully.');
    }

    /**
     * Add a new time entry
     */
    public function addEntry(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'clock_in_at' => 'required|date',
            'clock_out_at' => 'nullable|date|after:clock_in_at',
            'punch_type' => 'required|in:work,break',
            'break_type_id' => 'nullable|exists:break_types,id',
            'notes' => 'nullable|string|max:500',
        ]);

        $manager = Auth::user();
        $managedUserIds = $this->getAllManagedUserIds($manager);

        if (!in_array($request->user_id, $managedUserIds)) {
            return back()->withErrors(['message' => 'Unauthorized access.']);
        }

        $clockInTime = Carbon::parse($request->clock_in_at);
        $clockOutTime = $request->clock_out_at ? Carbon::parse($request->clock_out_at) : null;

        $timeClock = TimeClock::create([
            'user_id' => $request->user_id,
            'punch_type' => $request->punch_type,
            'break_type_id' => $request->break_type_id,
            'clock_in_at' => $clockInTime,
            'clock_out_at' => $clockOutTime,
            'status' => $clockOutTime ? 'completed' : 'active',
            'notes' => $request->notes,
        ]);

        if ($clockOutTime) {
            $timeClock->calculateOvertime();
        }

        // Use manual_edit with manager-specific data
        $timeClock->createAudit('manual_edit', [
            'edited_by' => $manager->id,
            'edit_reason' => 'Manager added new time entry',
            'manager_action' => 'add_entry',
            'manager_id' => $manager->id
        ]);

        return back()->with('success', 'Time entry added successfully.');
    }

    /**
     * Update an existing time entry
     */
    public function updateEntry(Request $request, TimeClock $timeClock)
    {
        $request->validate([
            'clock_in_at' => 'required|date',
            'clock_out_at' => 'nullable|date|after:clock_in_at',
            'punch_type' => 'required|in:work,break',
            'break_type_id' => 'nullable|exists:break_types,id',
            'notes' => 'nullable|string|max:500',
        ]);

        $manager = Auth::user();
        $managedUserIds = $this->getAllManagedUserIds($manager);

        if (!in_array($timeClock->user_id, $managedUserIds)) {
            return back()->withErrors(['message' => 'Unauthorized access.']);
        }

        // Store previous data for audit
        $previousData = $timeClock->only([
            'punch_type', 'break_type_id', 'clock_in_at', 'clock_out_at', 'notes', 'status'
        ]);

        $clockInTime = Carbon::parse($request->clock_in_at);
        $clockOutTime = $request->clock_out_at ? Carbon::parse($request->clock_out_at) : null;

        $timeClock->update([
            'punch_type' => $request->punch_type,
            'break_type_id' => $request->break_type_id,
            'clock_in_at' => $clockInTime,
            'clock_out_at' => $clockOutTime,
            'status' => $clockOutTime ? 'completed' : 'active',
            'notes' => $request->notes,
        ]);

        if ($clockOutTime) {
            $timeClock->calculateOvertime();
        }

        // Use manual_edit with manager-specific data and change tracking
        $timeClock->createAudit('manual_edit', [
            'edited_by' => $manager->id,
            'edit_reason' => 'Manager updated time entry',
            'manager_action' => 'edit_entry',
            'manager_id' => $manager->id,
            'previous_data' => $previousData,
            'new_data' => $timeClock->only([
                'punch_type', 'break_type_id', 'clock_in_at', 'clock_out_at', 'notes', 'status'
            ])
        ]);

        return back()->with('success', 'Time entry updated successfully.');
    }

    /**
     * Delete a time entry
     */
    public function deleteEntry(TimeClock $timeClock)
    {
        $manager = Auth::user();
        $managedUserIds = $this->getAllManagedUserIds($manager);

        if (!in_array($timeClock->user_id, $managedUserIds)) {
            return back()->withErrors(['message' => 'Unauthorized access.']);
        }

        // Create audit record before deletion
        $timeClock->createAudit('manual_edit', [
            'edited_by' => $manager->id,
            'edit_reason' => 'Manager deleted time entry',
            'manager_action' => 'delete_entry',
            'manager_id' => $manager->id,
            'previous_data' => $timeClock->toArray()
        ]);

        $timeClock->delete();

        return back()->with('success', 'Time entry deleted successfully.');
    }
    /**
     * Get all subordinate IDs recursively (does NOT include manager)
     */
    private function getAllSubordinateIds(User $manager): array
    {
        $subordinateIds = [];

        // Get direct subordinates
        $directSubordinates = $manager->subordinates()->pluck('id')->toArray();
        $subordinateIds = array_merge($subordinateIds, $directSubordinates);

        // Get subordinates of subordinates (recursive)
        foreach ($directSubordinates as $subordinateId) {
            $subordinate = User::find($subordinateId);
            if ($subordinate) {
                $nestedIds = $this->getAllSubordinateIds($subordinate);
                $subordinateIds = array_merge($subordinateIds, $nestedIds);
            }
        }

        return array_unique($subordinateIds);
    }

    /**
     * Get all managed user IDs (subordinates + manager themselves)
     */
    private function getAllManagedUserIds(User $manager): array
    {
        $subordinateIds = $this->getAllSubordinateIds($manager);

        // Add manager's own ID to the list
        $managedUserIds = array_merge([$manager->id], $subordinateIds);

        return array_unique($managedUserIds);
    }

    /**
     * Get summary statistics for manager dashboard
     */
    private function getManagerStats(array $subordinateIds): array
    {
        $currentWeek = Carbon::now()->startOfWeek();

        return [
            'total_employees' => count($subordinateIds),
            'pending_approvals' => Timesheet::whereIn('user_id', $subordinateIds)
                ->where('status', 'submitted')
                ->count(),
            'this_week_timesheets' => Timesheet::whereIn('user_id', $subordinateIds)
                ->where('week_start_date', $currentWeek)
                ->count(),
            'approved_this_week' => Timesheet::whereIn('user_id', $subordinateIds)
                ->where('status', 'approved')
                ->where('approved_at', '>=', $currentWeek)
                ->count(),
        ];
    }
}
