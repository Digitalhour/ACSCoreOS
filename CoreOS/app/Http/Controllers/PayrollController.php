<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\TimesheetSubmission;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;

class PayrollController extends Controller
{
    /**
     * Get timesheets for payroll processing
     */
    public function getTimesheets(Request $request): JsonResponse
    {
        $query = TimesheetSubmission::with(['user', 'submittedBy', 'approvedBy', 'lockedBy']);

        // Apply filters
        $this->applyFilters($query, $request);

        $timesheets = $query->orderBy('week_start_date', 'desc')
            ->paginate($request->get('per_page', 20));

        // Transform the data
        $transformedTimesheets = $timesheets->getCollection()->map(function ($timesheet) {
            return [
                'id' => $timesheet->id,
                'user_id' => $timesheet->user_id,
                'user_name' => $timesheet->user->name,
                'user_email' => $timesheet->user->email,
                'week_start_date' => $timesheet->week_start_date->format('Y-m-d'),
                'week_end_date' => $timesheet->week_end_date->format('Y-m-d'),
                'total_hours' => $timesheet->total_hours,
                'regular_hours' => $timesheet->regular_hours,
                'overtime_hours' => $timesheet->overtime_hours,
                'break_hours' => $timesheet->break_hours,
                'status' => $timesheet->status,
                'submitted_at' => $timesheet->submitted_at,
                'approved_at' => $timesheet->approved_at,
                'locked_at' => $timesheet->locked_at,
                'self_submitted' => $timesheet->self_submitted,
                'submitted_by' => $timesheet->submittedBy?->name,
                'approved_by' => $timesheet->approvedBy?->name,
                'locked_by' => $timesheet->lockedBy?->name,
                'departments' => $timesheet->user->departments->pluck('name')->toArray(),
            ];
        });

        return response()->json([
            'timesheets' => $transformedTimesheets,
            'pagination' => [
                'current_page' => $timesheets->currentPage(),
                'last_page' => $timesheets->lastPage(),
                'per_page' => $timesheets->perPage(),
                'total' => $timesheets->total(),
                'from' => $timesheets->firstItem(),
                'to' => $timesheets->lastItem(),
            ],
        ]);
    }

    /**
     * Get summary statistics for payroll
     */
    public function getSummary(Request $request): JsonResponse
    {
        $query = TimesheetSubmission::query();
        $this->applyFilters($query, $request);

        $timesheets = $query->get();

        // Get unique users
        $totalEmployees = $timesheets->pluck('user_id')->unique()->count();

        // Calculate totals
        $totalHours = $timesheets->sum('total_hours');
        $totalRegular = $timesheets->sum('regular_hours');
        $totalOvertime = $timesheets->sum('overtime_hours');
        $pendingApproval = $timesheets->where('status', 'submitted')->count();
        $lockedCount = $timesheets->where('status', 'locked')->count();

        // Calculate estimated costs (this would typically come from employee rates)
        $estimatedRegularCost = $totalRegular * 25; // $25/hour average
        $estimatedOvertimeCost = $totalOvertime * 37.50; // 1.5x overtime
        $estimatedTotalCost = $estimatedRegularCost + $estimatedOvertimeCost;

        return response()->json([
            'total_employees' => $totalEmployees,
            'total_hours' => round($totalHours, 2),
            'total_regular' => round($totalRegular, 2),
            'total_overtime' => round($totalOvertime, 2),
            'pending_approval' => $pendingApproval,
            'locked_count' => $lockedCount,
            'estimated_costs' => [
                'regular_cost' => $estimatedRegularCost,
                'overtime_cost' => $estimatedOvertimeCost,
                'total_cost' => $estimatedTotalCost,
            ],
            'status_breakdown' => [
                'draft' => $timesheets->where('status', 'draft')->count(),
                'submitted' => $timesheets->where('status', 'submitted')->count(),
                'approved' => $timesheets->where('status', 'approved')->count(),
                'rejected' => $timesheets->where('status', 'rejected')->count(),
                'locked' => $timesheets->where('status', 'locked')->count(),
            ],
        ]);
    }

    /**
     * Export timesheets to CSV or PDF
     */
    public function exportTimesheets(Request $request)
    {
        $format = $request->get('format', 'csv');

        $query = TimesheetSubmission::with(['user', 'submittedBy', 'approvedBy', 'lockedBy']);
        $this->applyFilters($query, $request);

        $timesheets = $query->orderBy('week_start_date', 'desc')->get();

        if ($format === 'csv') {
            return $this->exportToCsv($timesheets);
        } elseif ($format === 'pdf') {
            return $this->exportToPdf($timesheets);
        }

        return response()->json(['error' => 'Invalid format specified'], 400);
    }

    /**
     * Get detailed reports
     */
    public function getReports(Request $request): JsonResponse
    {
        $reportType = $request->get('type', 'summary');

        switch ($reportType) {
            case 'overtime':
                return $this->getOvertimeReport($request);
            case 'department':
                return $this->getDepartmentReport($request);
            case 'employee':
                return $this->getEmployeeReport($request);
            default:
                return $this->getSummaryReport($request);
        }
    }

    /**
     * Bulk lock timesheets
     */
    public function bulkLock(Request $request): JsonResponse
    {
        $request->validate([
            'timesheet_ids' => 'required|array',
            'timesheet_ids.*' => 'exists:timesheet_submissions,id',
            'lock_reason' => 'nullable|string|max:500',
        ]);

        try {
            $timesheets = TimesheetSubmission::whereIn('id', $request->timesheet_ids)
                ->where('status', 'approved')
                ->get();

            if ($timesheets->count() !== count($request->timesheet_ids)) {
                return response()->json([
                    'error' => 'Some timesheets are not available for locking or do not exist.',
                ], 422);
            }

            DB::transaction(function () use ($timesheets, $request) {
                foreach ($timesheets as $timesheet) {
                    $timesheet->update([
                        'status' => 'locked',
                        'locked_at' => now(),
                        'locked_by_user_id' => Auth::id(),
                        'lock_reason' => $request->lock_reason ?? 'Bulk locked for payroll processing',
                    ]);
                }
            });

            Log::info("Bulk lock timesheets: " . count($timesheets) . " timesheets locked by " . Auth::user()->name);

            return response()->json([
                'message' => count($timesheets) . ' timesheets locked successfully',
                'locked_count' => count($timesheets),
            ]);

        } catch (\Exception $e) {
            Log::error("Bulk lock failed: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to lock timesheets. Please try again.',
            ], 500);
        }
    }

    /**
     * Bulk unlock timesheets
     */
    public function bulkUnlock(Request $request): JsonResponse
    {
        $request->validate([
            'timesheet_ids' => 'required|array',
            'timesheet_ids.*' => 'exists:timesheet_submissions,id',
            'unlock_reason' => 'required|string|max:500',
        ]);

        try {
            $timesheets = TimesheetSubmission::whereIn('id', $request->timesheet_ids)
                ->where('status', 'locked')
                ->get();

            if ($timesheets->count() !== count($request->timesheet_ids)) {
                return response()->json([
                    'error' => 'Some timesheets are not locked or do not exist.',
                ], 422);
            }

            DB::transaction(function () use ($timesheets, $request) {
                foreach ($timesheets as $timesheet) {
                    $timesheet->update([
                        'status' => 'approved',
                        'locked_at' => null,
                        'locked_by_user_id' => null,
                        'lock_reason' => null,
                    ]);
                }
            });

            Log::info("Bulk unlock timesheets: " . count($timesheets) . " timesheets unlocked by " . Auth::user()->name . ", Reason: {$request->unlock_reason}");

            return response()->json([
                'message' => count($timesheets) . ' timesheets unlocked successfully',
                'unlocked_count' => count($timesheets),
            ]);

        } catch (\Exception $e) {
            Log::error("Bulk unlock failed: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to unlock timesheets. Please try again.',
            ], 500);
        }
    }

    /**
     * Apply filters to the query
     */
    private function applyFilters($query, Request $request): void
    {
        // Period filter
        $period = $request->get('period', 'current');
        if ($period === 'current') {
            $startOfWeek = Carbon::now()->startOfWeek();
            $query->where('week_start_date', '>=', $startOfWeek);
        } elseif ($period === 'previous') {
            $startOfWeek = Carbon::now()->subWeek()->startOfWeek();
            $endOfWeek = Carbon::now()->subWeek()->endOfWeek();
            $query->whereBetween('week_start_date', [$startOfWeek, $endOfWeek]);
        } elseif ($period === 'custom') {
            if ($request->filled('start_date')) {
                $query->where('week_start_date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->where('week_end_date', '<=', $request->end_date);
            }
        }

        // Status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Department filter
        if ($request->filled('department') && $request->department !== 'all') {
            $query->whereHas('user.departments', function ($q) use ($request) {
                $q->where('departments.name', $request->department);
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
     * Export to CSV
     */
    private function exportToCsv($timesheets)
    {
        $csvData = [];

        // Header
        $csvData[] = [
            'Employees Name',
            'Employees Email',
            'Department',
            'Week Start',
            'Week End',
            'Total Hours',
            'Regular Hours',
            'Overtime Hours',
            'Break Hours',
            'Status',
            'Submitted Date',
            'Submitted By',
            'Approved Date',
            'Approved By',
            'Locked Date',
            'Locked By'
        ];

        // Data rows
        foreach ($timesheets as $timesheet) {
            $csvData[] = [
                $timesheet->user->name,
                $timesheet->user->email,
                $timesheet->user->departments->pluck('name')->implode(', '),
                $timesheet->week_start_date->format('Y-m-d'),
                $timesheet->week_end_date->format('Y-m-d'),
                $timesheet->total_hours,
                $timesheet->regular_hours,
                $timesheet->overtime_hours,
                $timesheet->break_hours,
                ucfirst($timesheet->status),
                $timesheet->submitted_at?->format('Y-m-d H:i:s'),
                $timesheet->submittedBy?->name ?? 'Self',
                $timesheet->approved_at?->format('Y-m-d H:i:s'),
                $timesheet->approvedBy?->name,
                $timesheet->locked_at?->format('Y-m-d H:i:s'),
                $timesheet->lockedBy?->name,
            ];
        }

        // Create CSV content
        $csvContent = '';
        foreach ($csvData as $row) {
            $csvContent .= implode(',', array_map(function ($field) {
                    return '"' . str_replace('"', '""', $field ?? '') . '"';
                }, $row)) . "\n";
        }

        $filename = 'timesheets_' . Carbon::now()->format('Y-m-d_H-i-s') . '.csv';

        return Response::make($csvContent, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Export to PDF (placeholder - implement with a PDF library like TCPDF or DomPDF)
     */
    private function exportToPdf($timesheets)
    {
        // This is a placeholder. You would implement this with a PDF library
        // For now, return CSV with PDF headers
        return $this->exportToCsv($timesheets);
    }

    /**
     * Get overtime report
     */
    private function getOvertimeReport(Request $request): JsonResponse
    {
        $query = TimesheetSubmission::with('user')
            ->where('overtime_hours', '>', 0);

        $this->applyFilters($query, $request);

        $overtimeData = $query->get()->groupBy('user_id')->map(function ($timesheets, $userId) {
            $user = $timesheets->first()->user;
            return [
                'user_id' => $userId,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'total_overtime_hours' => $timesheets->sum('overtime_hours'),
                'total_weeks' => $timesheets->count(),
                'average_overtime' => round($timesheets->avg('overtime_hours'), 2),
                'max_overtime_week' => $timesheets->max('overtime_hours'),
            ];
        })->sortByDesc('total_overtime_hours')->values();

        return response()->json([
            'overtime_summary' => $overtimeData,
            'total_overtime_hours' => $overtimeData->sum('total_overtime_hours'),
            'employees_with_overtime' => $overtimeData->count(),
        ]);
    }

    /**
     * Get department report
     */
    private function getDepartmentReport(Request $request): JsonResponse
    {
        $departments = Department::with(['users.timesheetSubmissions' => function ($query) use ($request) {
            $this->applyFilters($query, $request);
        }])->get();

        $departmentData = $departments->map(function ($department) {
            $timesheets = $department->users->flatMap->timesheetSubmissions;

            return [
                'department_id' => $department->id,
                'department_name' => $department->name,
                'employee_count' => $department->users->count(),
                'total_hours' => $timesheets->sum('total_hours'),
                'regular_hours' => $timesheets->sum('regular_hours'),
                'overtime_hours' => $timesheets->sum('overtime_hours'),
                'average_hours_per_employee' => $department->users->count() > 0
                    ? round($timesheets->sum('total_hours') / $department->users->count(), 2)
                    : 0,
            ];
        });

        return response()->json(['department_summary' => $departmentData]);
    }

    /**
     * Get employee report
     */
    private function getEmployeeReport(Request $request): JsonResponse
    {
        $query = User::with(['timesheetSubmissions' => function ($query) use ($request) {
            $this->applyFilters($query, $request);
        }]);

        if ($request->filled('user_id')) {
            $query->where('id', $request->user_id);
        }

        $users = $query->get();

        $employeeData = $users->map(function ($user) {
            $timesheets = $user->timesheetSubmissions;

            return [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'departments' => $user->departments->pluck('name')->toArray(),
                'total_hours' => $timesheets->sum('total_hours'),
                'regular_hours' => $timesheets->sum('regular_hours'),
                'overtime_hours' => $timesheets->sum('overtime_hours'),
                'timesheet_count' => $timesheets->count(),
                'average_weekly_hours' => $timesheets->count() > 0
                    ? round($timesheets->avg('total_hours'), 2)
                    : 0,
                'on_time_submissions' => $timesheets->where('self_submitted', true)->count(),
                'manager_submissions' => $timesheets->where('self_submitted', false)->count(),
            ];
        });

        return response()->json(['employee_summary' => $employeeData]);
    }

    /**
     * Get summary report
     */
    private function getSummaryReport(Request $request): JsonResponse
    {
        return $this->getSummary($request);
    }
}
