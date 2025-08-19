<?php

namespace App\Http\Controllers;

use App\Models\TimeClock;
use App\Models\Timesheet;
use App\Models\TimesheetAction;
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

        // Set default week if not provided
        if (!$request->has('week_start') || !$request->has('week_end')) {
            $today = Carbon::now();
            $weekStart = $today->copy()->startOfWeek(Carbon::SUNDAY);
            $weekEnd = $today->copy()->endOfWeek(Carbon::SATURDAY);

            $request->merge([
                'week_start' => $weekStart->format('Y-m-d'),
                'week_end' => $weekEnd->format('Y-m-d')
            ]);
        }

        // Get the selected week dates
        $selectedWeekStart = Carbon::parse($request->week_start)->startOfWeek(Carbon::SUNDAY);
        $selectedWeekEnd = Carbon::parse($request->week_end)->endOfWeek(Carbon::SATURDAY);

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
                'filters' => $request->only(['status', 'employee_id', 'week_start', 'week_end']),
                'teamHoursData' => [],
                'currentManagerId' => $manager->id,
                'selectedWeek' => [
                    'start' => $selectedWeekStart->format('Y-m-d'),
                    'end' => $selectedWeekEnd->format('Y-m-d'),
                    'label' => $this->getWeekLabel($selectedWeekStart, $selectedWeekEnd)
                ],
            ]);
        }

        // Get pending timesheets for approval (include manager's own + all subordinates, any week)
        $pendingTimesheets = Timesheet::whereIn('user_id', $managedUserIds)
            ->whereIn('status', ['submitted', 'rejected'])  // Include rejected timesheets
            ->with(['user', 'submissionAction.user', 'rejectionAction.user'])
            ->orderBy('updated_at', 'asc')
            ->get()
            ->each(function ($timesheet) {
                $timesheet->assignTimeClocks(); // Links orphaned entries
                $timesheet->calculateTotals();  // Recalculates hours
            });

        // Build query for all timesheets with filters (include manager's own)
        $query = Timesheet::whereIn('user_id', $managedUserIds)
            ->with(['user', 'submissionAction.user', 'approvalAction.user']);

        // Apply week filter if provided
        if ($request->filled('week_start') && $request->filled('week_end')) {
            $query->where(function($q) use ($request) {
                $q->where('week_start_date', '<=', $request->week_end)
                    ->where('week_end_date', '>=', $request->week_start);
            });
        }

        // Apply other filters
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('employee_id') && $request->employee_id !== 'all') {
            $query->where('user_id', $request->employee_id);
        }

        // Get all timesheets with pagination
        $allTimesheets = $query->orderBy('week_start_date', 'desc')
            ->orderBy('updated_at', 'asc')
            ->paginate(20)
            ->withQueryString();

        // Get managed users (subordinates + manager) for filter dropdown
        $subordinates = User::whereIn('id', $managedUserIds)
            ->with(['currentPosition', 'departments'])
            ->orderBy('name')
            ->get();

        // Generate team hours data for selected week (include manager)
        $teamHoursData = $this->generateTeamHoursData($managedUserIds, $selectedWeekStart);

        // Calculate dashboard stats for selected week
        $dashboardStats = [
            'pending_count' => $pendingTimesheets->count(), // Now includes manager's own
            'total_employees' => count($managedUserIds), // Include manager in count
            'this_week_submissions' => Timesheet::whereIn('user_id', $managedUserIds)
                ->where('week_start_date', '>=', $selectedWeekStart)
                ->where('week_end_date', '<=', $selectedWeekEnd)
                ->count(),
            'approved_this_week' => TimesheetAction::where('action', TimesheetAction::ACTION_APPROVED)
                ->whereHas('timesheet', function($q) use ($manager, $managedUserIds, $selectedWeekStart, $selectedWeekEnd) {
                    $q->whereIn('user_id', $this->getAllSubordinateIds($manager)) // Only subordinates can be "approved"
                    ->where('week_start_date', '>=', $selectedWeekStart)
                        ->where('week_end_date', '<=', $selectedWeekEnd);
                })
                ->whereBetween('created_at', [$selectedWeekStart, $selectedWeekEnd->endOfDay()])
                ->count(),
        ];

        return Inertia::render('TimeManagement/Manager/Dashboard', [
            'pendingTimesheets' => $pendingTimesheets,
            'allTimesheets' => $allTimesheets,
            'subordinates' => $subordinates,
            'dashboardStats' => $dashboardStats,
            'filters' => $request->only(['status', 'employee_id', 'week_start', 'week_end']),
            'teamHoursData' => $teamHoursData,
            'currentManagerId' => $manager->id,
            'selectedWeek' => [
                'start' => $selectedWeekStart->format('Y-m-d'),
                'end' => $selectedWeekEnd->format('Y-m-d'),
                'label' => $this->getWeekLabel($selectedWeekStart, $selectedWeekEnd)
            ],
        ]);
    }

    /**
     * Generate team hours data for the specified week
     */
    /**
     * Generate team hours data for the specified week
     */
    private function generateTeamHoursData(array $userIds, Carbon $weekStart): array
    {
        $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SATURDAY);
        $today = Carbon::today();

        $teamData = [];

        // Get all users with their positions
        $users = User::whereIn('id', $userIds)
            ->with('currentPosition')
            ->orderBy('name')
            ->get();

        foreach ($users as $employee) {
            // Get ALL time clock entries for this employee for the specified week
            $allEntries = TimeClock::where('user_id', $employee->id)
                ->whereBetween('clock_in_at', [$weekStart, $weekEnd->endOfDay()])
                ->where('status', 'completed')
                ->with('breakType')
                ->orderBy('clock_in_at', 'asc')
                ->get();

            // Separate work and break entries
            $workEntries = $allEntries->where('punch_type', 'work');
            $breakEntries = $allEntries->where('punch_type', 'break');

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
            $totalWorkHours = 0;

            // Calculate hours for each day
            foreach ($workEntries as $workEntry) {
                $dayOfWeek = strtolower($workEntry->clock_in_at->format('l'));

                // Calculate work hours for this entry
                $workHours = 0;
                if ($workEntry->clock_out_at) {
                    $totalMinutes = $workEntry->clock_in_at->diffInMinutes($workEntry->clock_out_at);
                    $workHours = round($totalMinutes / 60, 2);
                }

                // Find overlapping breaks and subtract them
                $breakDeduction = 0;
                foreach ($breakEntries as $breakEntry) {
                    if ($breakEntry->clock_out_at) {
                        // Check if break overlaps with this work entry
                        $breakStart = $breakEntry->clock_in_at;
                        $breakEnd = $breakEntry->clock_out_at;
                        $workStart = $workEntry->clock_in_at;
                        $workEnd = $workEntry->clock_out_at;

                        // Only deduct if break is within work time
                        if ($breakStart >= $workStart && $breakEnd <= $workEnd) {
                            $breakMinutes = $breakStart->diffInMinutes($breakEnd);
                            $breakDeduction += round($breakMinutes / 60, 2);
                        }
                    }
                }

                // Subtract break time from work time
                $netWorkHours = max(0, $workHours - $breakDeduction);

                $days[$dayOfWeek] += $netWorkHours;
                $totalWorkHours += $netWorkHours;
            }

            // Apply weekly overtime rule (40+ hours)
            if ($totalWorkHours > 40) {
                $totalRegularHours = 40;
                $totalOvertimeHours = $totalWorkHours - 40;
            } else {
                $totalRegularHours = $totalWorkHours;
                $totalOvertimeHours = 0;
            }

            $weekTotal = $totalWorkHours;

            // Get current status for this employee (only if viewing current week)
            $currentStatus = [
                'is_clocked_in' => false,
                'is_on_break' => false,
                'current_hours_today' => 0,
            ];

            $isCurrentWeek = $weekStart->isSameWeek($today, Carbon::SUNDAY);

            if ($isCurrentWeek) {
                $currentStatus = TimeClock::getUserCurrentStatus($employee->id);

                // Get today's hours worked so far (with break deduction)
                $todayWorkEntries = TimeClock::where('user_id', $employee->id)
                    ->where('punch_type', 'work')
                    ->whereBetween('clock_in_at', [$today->startOfDay(), $today->endOfDay()])
                    ->get();

                $todayBreakEntries = TimeClock::where('user_id', $employee->id)
                    ->where('punch_type', 'break')
                    ->whereBetween('clock_in_at', [$today->startOfDay(), $today->endOfDay()])
                    ->where('status', 'completed')
                    ->get();

                $todayHours = 0;
                foreach ($todayWorkEntries as $entry) {
                    $workHours = 0;
                    if ($entry->clock_out_at) {
                        $workHours = $entry->clock_in_at->diffInMinutes($entry->clock_out_at) / 60;
                    } elseif ($entry->status === 'active') {
                        // Currently active entry - calculate time so far
                        $workHours = $entry->clock_in_at->diffInMinutes(now()) / 60;
                    }

                    // Deduct overlapping breaks
                    $breakDeduction = 0;
                    foreach ($todayBreakEntries as $breakEntry) {
                        if ($breakEntry->clock_out_at) {
                            $breakStart = $breakEntry->clock_in_at;
                            $breakEnd = $breakEntry->clock_out_at;
                            $workStart = $entry->clock_in_at;
                            $workEnd = $entry->clock_out_at ?: now();

                            if ($breakStart >= $workStart && $breakEnd <= $workEnd) {
                                $breakDeduction += $breakStart->diffInMinutes($breakEnd) / 60;
                            }
                        }
                    }

                    $todayHours += max(0, $workHours - $breakDeduction);
                }

                $currentStatus['current_hours_today'] = round($todayHours, 2);

                // Add clock-in time if available
                if ($currentStatus['is_clocked_in'] && isset($currentStatus['current_work_punch'])) {
                    $currentStatus['clock_in_time'] = $currentStatus['current_work_punch']->clock_in_at->toISOString();
                }

                // Add break information if on break
                if ($currentStatus['is_on_break'] && isset($currentStatus['current_break_punch'])) {
                    $breakPunch = $currentStatus['current_break_punch'];
                    $currentStatus['break_start_time'] = $breakPunch->clock_in_at->toISOString();

                    if ($breakPunch->breakType) {
                        $currentStatus['break_type'] = $breakPunch->breakType->label;
                    }
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
                'currentStatus' => $currentStatus,
            ];
        }

        return $teamData;
    }
    /**
     * Split work entries at break boundaries for accurate time calculation
     */
    private function splitWorkEntriesAtBreaks(array $userIds, Carbon $weekStart): array
    {
        $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SATURDAY);
        $today = Carbon::today();

        $teamData = [];

        $users = User::whereIn('id', $userIds)
            ->with('currentPosition')
            ->orderBy('name')
            ->get();

        foreach ($users as $employee) {
            // Get ALL completed time entries for this week
            $allEntries = TimeClock::where('user_id', $employee->id)
                ->whereBetween('clock_in_at', [$weekStart, $weekEnd->endOfDay()])
                ->where('status', 'completed')
                ->with('breakType')
                ->orderBy('clock_in_at', 'asc')
                ->get();

            $workEntries = $allEntries->where('punch_type', 'work');
            $breakEntries = $allEntries->where('punch_type', 'break');

            // Initialize days
            $days = [
                'sunday' => 0, 'monday' => 0, 'tuesday' => 0, 'wednesday' => 0,
                'thursday' => 0, 'friday' => 0, 'saturday' => 0,
            ];

            $totalWorkHours = 0;

            // Process each work entry and split it by breaks
            foreach ($workEntries as $workEntry) {
                if (!$workEntry->clock_out_at) continue;

                $dayOfWeek = strtolower($workEntry->clock_in_at->format('l'));
                $workStart = $workEntry->clock_in_at;
                $workEnd = $workEntry->clock_out_at;

                // Find breaks that occur within this work period
                $overlappingBreaks = $breakEntries->filter(function($break) use ($workStart, $workEnd) {
                    return $break->clock_out_at &&
                        $break->clock_in_at >= $workStart &&
                        $break->clock_out_at <= $workEnd;
                })->sortBy('clock_in_at');

                if ($overlappingBreaks->isEmpty()) {
                    // No breaks - count full work time
                    $workMinutes = $workStart->diffInMinutes($workEnd);
                    $workHours = round($workMinutes / 60, 2);
                    $days[$dayOfWeek] += $workHours;
                    $totalWorkHours += $workHours;
                } else {
                    // Split work entry by breaks
                    $currentStart = $workStart;

                    foreach ($overlappingBreaks as $break) {
                        // Add work time before this break
                        if ($currentStart < $break->clock_in_at) {
                            $segmentMinutes = $currentStart->diffInMinutes($break->clock_in_at);
                            $segmentHours = round($segmentMinutes / 60, 2);
                            $days[$dayOfWeek] += $segmentHours;
                            $totalWorkHours += $segmentHours;
                        }

                        // Move past this break
                        $currentStart = $break->clock_out_at;
                    }

                    // Add remaining work time after last break
                    if ($currentStart < $workEnd) {
                        $segmentMinutes = $currentStart->diffInMinutes($workEnd);
                        $segmentHours = round($segmentMinutes / 60, 2);
                        $days[$dayOfWeek] += $segmentHours;
                        $totalWorkHours += $segmentHours;
                    }
                }
            }

            // Apply overtime rule
            $regularHours = min($totalWorkHours, 40);
            $overtimeHours = max(0, $totalWorkHours - 40);

            // Current status (unchanged)
            $currentStatus = [
                'is_clocked_in' => false,
                'is_on_break' => false,
                'current_hours_today' => 0,
            ];

            $isCurrentWeek = $weekStart->isSameWeek($today, Carbon::SUNDAY);
            if ($isCurrentWeek) {
                $currentStatus = TimeClock::getUserCurrentStatus($employee->id);

                // Calculate today's hours with same split logic
                $todayWorkEntries = TimeClock::where('user_id', $employee->id)
                    ->where('punch_type', 'work')
                    ->whereBetween('clock_in_at', [$today->startOfDay(), $today->endOfDay()])
                    ->get();

                $todayBreakEntries = TimeClock::where('user_id', $employee->id)
                    ->where('punch_type', 'break')
                    ->whereBetween('clock_in_at', [$today->startOfDay(), $today->endOfDay()])
                    ->where('status', 'completed')
                    ->get();

                $todayHours = 0;
                foreach ($todayWorkEntries as $entry) {
                    $workStart = $entry->clock_in_at;
                    $workEnd = $entry->clock_out_at ?: now();

                    $overlappingBreaks = $todayBreakEntries->filter(function($break) use ($workStart, $workEnd) {
                        return $break->clock_out_at &&
                            $break->clock_in_at >= $workStart &&
                            $break->clock_out_at <= $workEnd;
                    })->sortBy('clock_in_at');

                    if ($overlappingBreaks->isEmpty()) {
                        $todayHours += $workStart->diffInMinutes($workEnd) / 60;
                    } else {
                        $currentStart = $workStart;
                        foreach ($overlappingBreaks as $break) {
                            if ($currentStart < $break->clock_in_at) {
                                $todayHours += $currentStart->diffInMinutes($break->clock_in_at) / 60;
                            }
                            $currentStart = $break->clock_out_at;
                        }
                        if ($currentStart < $workEnd) {
                            $todayHours += $currentStart->diffInMinutes($workEnd) / 60;
                        }
                    }
                }

                $currentStatus['current_hours_today'] = round($todayHours, 2);

                if ($currentStatus['is_clocked_in'] && isset($currentStatus['current_work_punch'])) {
                    $currentStatus['clock_in_time'] = $currentStatus['current_work_punch']->clock_in_at->toISOString();
                }

                if ($currentStatus['is_on_break'] && isset($currentStatus['current_break_punch'])) {
                    $breakPunch = $currentStatus['current_break_punch'];
                    $currentStatus['break_start_time'] = $breakPunch->clock_in_at->toISOString();
                    if ($breakPunch->breakType) {
                        $currentStatus['break_type'] = $breakPunch->breakType->label;
                    }
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
                'weekTotal' => round($totalWorkHours, 2),
                'regularHours' => round($regularHours, 2),
                'overtimeHours' => round($overtimeHours, 2),
                'currentStatus' => $currentStatus,
            ];
        }

        return $teamData;
    }
    /**
     * Get week label for display
     */
    private function getWeekLabel(Carbon $startDate, Carbon $endDate): string
    {
        return $startDate->format('M j') . ' - ' . $endDate->format('M j, Y');
    }

    /**
     * Resubmit a rejected timesheet
     */
    public function resubmit(Timesheet $timesheet)
    {
        $manager = Auth::user();
        $managedUserIds = $this->getAllManagedUserIds($manager);

        // Verify manager has authority over this timesheet
        if (!in_array($timesheet->user_id, $managedUserIds)) {
            return back()->withErrors(['message' => 'Unauthorized: You cannot manage this employee\'s timesheet.']);
        }

        // Check if timesheet is rejected
        if ($timesheet->status !== 'rejected') {
            return back()->withErrors(['message' => 'Timesheet is not in rejected status.']);
        }

        // Recalculate totals before resubmission
        $timesheet->assignTimeClocks();
        $timesheet->calculateTotals();

        // Resubmit the timesheet
        if ($timesheet->submit($manager->id, true, 'Corrected and resubmitted by manager after payroll rejection')) {
            return back()->with('success', 'Timesheet resubmitted to payroll successfully!');
        }

        return back()->withErrors(['message' => 'Failed to resubmit timesheet.']);
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
            ->with(['user', 'submissionAction.user', 'approvalAction.user']);

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
            ->orderBy('updated_at', 'asc')
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
            'timesheet' => $timesheet->load([
                'user',
                'actions' => function($query) {
                    $query->orderBy('created_at', 'asc');
                },
                'actions.user'
            ]),
            'timeEntries' => $timeEntries,
            'currentManagerId' => $manager->id,
        ]);
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

        return back()->with('success', 'Employees clocked out successfully.');
    }

    /**
     * Add a new time entry with automatic splitting
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

        // Handle overlapping entries
        if ($clockOutTime) {
            $this->handleTimeEntryOverlaps($request->user_id, $clockInTime, $clockOutTime, $request->punch_type, null, $manager->id);
        }

        // Create the new entry
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

        $timeClock->createAudit('manual_edit', [
            'edited_by' => $manager->id,
            'edit_reason' => 'Manager added new time entry',
            'manager_action' => 'add_entry',
            'manager_id' => $manager->id
        ]);

        return back()->with('success', 'Time entry added successfully.');
    }

    /**
     * Update an existing time entry with automatic splitting
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

        $previousData = $timeClock->only([
            'punch_type', 'break_type_id', 'clock_in_at', 'clock_out_at', 'notes', 'status'
        ]);

        $clockInTime = Carbon::parse($request->clock_in_at);
        $clockOutTime = $request->clock_out_at ? Carbon::parse($request->clock_out_at) : null;

        // Handle overlapping entries (exclude current entry from overlap check)
        if ($clockOutTime) {
            $this->handleTimeEntryOverlaps($timeClock->user_id, $clockInTime, $clockOutTime, $request->punch_type, $timeClock->id, $manager->id);}

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
     * Handle overlapping time entries by splitting them
     */
    private function handleTimeEntryOverlaps($userId, Carbon $newStart, Carbon $newEnd, $newPunchType, $excludeEntryId = null, $managerId = null)
    {
        // Find overlapping entries
        $query = TimeClock::where('user_id', $userId)
            ->where('status', 'completed')
            ->where(function($q) use ($newStart, $newEnd) {
                $q->where(function($subQ) use ($newStart, $newEnd) {
                    // Entry starts before new entry and ends after new entry starts
                    $subQ->where('clock_in_at', '<', $newEnd)
                        ->where('clock_out_at', '>', $newStart);
                });
            });

        if ($excludeEntryId) {
            $query->where('id', '!=', $excludeEntryId);
        }

        $overlappingEntries = $query->get();

        foreach ($overlappingEntries as $entry) {
            $entryStart = $entry->clock_in_at;
            $entryEnd = $entry->clock_out_at;

            // Case 1: New entry completely contains existing entry - delete existing
            if ($newStart <= $entryStart && $newEnd >= $entryEnd) {
                $entry->createAudit('manual_edit', [
                    'reason' => 'Entry completely overlapped by new entry',
                    'new_entry_type' => $newPunchType,
                    'original_data' => $entry->toArray(),
                    'edited_by' => $managerId,
                    'manager_action' => 'auto_split'
                ]);
                $entry->delete();
                continue;
            }

            // Case 2: Existing entry completely contains new entry - split into two
            if ($entryStart < $newStart && $entryEnd > $newEnd) {
                // Create first part (before new entry)
                TimeClock::create([
                    'user_id' => $entry->user_id,
                    'punch_type' => $entry->punch_type,
                    'break_type_id' => $entry->break_type_id,
                    'clock_in_at' => $entryStart,
                    'clock_out_at' => $newStart,
                    'status' => 'completed',
                    'notes' => $entry->notes . ' (auto-split before due to edit)',
                ]);

                // Update original to be second part (after new entry)
                $entry->update([
                    'clock_in_at' => $newEnd,
                    'notes' => $entry->notes . ' (auto-split after due to edit)',
                ]);

                $entry->createAudit('manual_edit', [
                    'reason' => 'Entry completely overlapped by new entry',
                    'new_entry_type' => $newPunchType,
                    'original_data' => $entry->toArray(),
                    'edited_by' => $managerId,
                    'manager_action' => 'auto_split'
                ]);
                continue;
            }

            // Case 3: Partial overlap - truncate existing entry
            if ($entryStart < $newStart && $entryEnd > $newStart) {
                // Truncate end of existing entry
                $entry->update([
                    'clock_out_at' => $newStart,
                    'notes' => $entry->notes . ' (auto-truncated)',
                ]);

                $entry->createAudit('manual_edit', [
                    'reason' => 'Entry completely overlapped by new entry',
                    'new_entry_type' => $newPunchType,
                    'original_data' => $entry->toArray(),
                    'edited_by' => $managerId,
                    'manager_action' => 'auto_split'
                ]);
            } elseif ($entryStart < $newEnd && $entryEnd > $newEnd) {
                // Truncate start of existing entry
                $entry->update([
                    'clock_in_at' => $newEnd,
                    'notes' => $entry->notes . ' (auto-truncated)',
                ]);

                $entry->createAudit('manual_edit', [
                    'reason' => 'Entry completely overlapped by new entry',
                    'new_entry_type' => $newPunchType,
                    'original_data' => $entry->toArray(),
                    'edited_by' => $managerId,
                    'manager_action' => 'auto_split'
                ]);
            }
        }
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
            'approved_this_week' => TimesheetAction::where('action', TimesheetAction::ACTION_APPROVED)
                ->whereHas('timesheet', function($q) use ($subordinateIds) {
                    $q->whereIn('user_id', $subordinateIds);
                })
                ->where('created_at', '>=', $currentWeek)
                ->count(),
        ];
    }
}
