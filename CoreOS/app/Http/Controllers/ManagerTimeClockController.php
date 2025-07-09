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

        // Get all subordinates in hierarchy (direct reports + their reports)
        $subordinateIds = $this->getAllSubordinateIds($manager);

        if (empty($subordinateIds)) {
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

        // Get pending timesheets for approval
        $pendingTimesheets = Timesheet::whereIn('user_id', $subordinateIds)
            ->where('status', 'submitted')
            ->with(['user', 'submittedBy'])
            ->orderBy('submitted_at', 'asc')
            ->get();

        // Build query for all timesheets with filters
        $query = Timesheet::whereIn('user_id', $subordinateIds)
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

        // Get subordinate users with their current week status
        $subordinates = User::whereIn('id', $subordinateIds)
            ->with(['currentPosition', 'departments'])
            ->orderBy('name')
            ->get();

        // Generate team hours data for current week
        $teamHoursData = $this->generateTeamHoursData($subordinateIds);

        // Calculate dashboard stats
        $dashboardStats = [
            'pending_count' => $pendingTimesheets->count(),
            'total_employees' => $subordinates->count(),
            'this_week_submissions' => Timesheet::whereIn('user_id', $subordinateIds)
                ->where('submitted_at', '>=', Carbon::now()->startOfWeek())
                ->count(),
            'approved_this_week' => Timesheet::whereIn('user_id', $subordinateIds)
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
        ]);
    }

    /**
     * Display all timesheets for managed employees
     */
    public function timesheets(Request $request)
    {
        $manager = Auth::user();
        $subordinateIds = $this->getAllSubordinateIds($manager);

        if (empty($subordinateIds)) {
            return Inertia::render('TimeManagement/Manager/Timesheets', [
                'timesheets' => [],
                'filters' => [],
                'subordinates' => [],
            ]);
        }

        // Build query for timesheets
        $query = Timesheet::whereIn('user_id', $subordinateIds)
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

        // Get subordinates for filter dropdown
        $subordinates = User::whereIn('id', $subordinateIds)
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
        $subordinateIds = $this->getAllSubordinateIds($manager);

        if (!in_array($timesheet->user_id, $subordinateIds)) {
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
        $subordinateIds = $this->getAllSubordinateIds($manager);

        // Verify access
        if (!in_array($timesheet->user_id, $subordinateIds)) {
            return back()->withErrors(['message' => 'Unauthorized access.']);
        }

        // Get time entries for this timesheet
        $timeEntries = TimeClock::where('timesheet_id', $timesheet->id)
            ->with(['breakType', 'audits'])
            ->orderBy('clock_in_at', 'asc')
            ->get();

        return Inertia::render('TimeManagement/Manager/TimesheetDetail', [
            'timesheet' => $timesheet->load(['user', 'submittedBy', 'approvedBy', 'processedBy']),
            'timeEntries' => $timeEntries,
        ]);
    }

    /**
     * Generate team hours data for the current week
     */
    private function generateTeamHoursData(array $subordinateIds): array
    {
        $currentWeek = Carbon::now()->startOfWeek(Carbon::SUNDAY);
        $weekEnd = $currentWeek->copy()->endOfWeek(Carbon::SATURDAY);

        $teamData = [];

        // Get all subordinates with their positions
        $subordinates = User::whereIn('id', $subordinateIds)
            ->with('currentPosition')
            ->orderBy('name')
            ->get();

        foreach ($subordinates as $employee) {
            // Get time clock entries for this employee for the current week
            $timeEntries = TimeClock::where('user_id', $employee->id)
                ->whereBetween('clock_in_at', [$currentWeek, $weekEnd->endOfDay()])
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
                $dailyHours = $entry->regular_hours + $entry->overtime_hours;

                $days[$dayOfWeek] += $dailyHours;
                $totalRegularHours += $entry->regular_hours;
                $totalOvertimeHours += $entry->overtime_hours;
            }

            $weekTotal = $totalRegularHours + $totalOvertimeHours;

            $teamData[] = [
                'employee' => [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'position' => $employee->currentPosition->name ?? 'N/A',
                ],
                'days' => $days,
                'weekTotal' => round($weekTotal, 2),
                'regularHours' => round($totalRegularHours, 2),
                'overtimeHours' => round($totalOvertimeHours, 2),
            ];
        }

        return $teamData;
    }

    /**
     * Get all subordinate IDs recursively
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
