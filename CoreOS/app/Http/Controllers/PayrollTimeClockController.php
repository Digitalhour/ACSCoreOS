<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\TimeClock;
use App\Models\TimeClockBreak;
use App\Models\Timesheet;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PayrollTimeClockController extends Controller
{
    public function dashboard(Request $request)
    {
        $approvedQuery = Timesheet::where('status', 'approved')
            ->with(['user.currentPosition', 'user.departments', 'approvedBy']);

        $this->applyFilters($approvedQuery, $request);

        $approvedTimesheets = $approvedQuery->orderBy('week_start_date', 'desc')
            ->paginate(20)
            ->withQueryString();

        $processedTimesheets = Timesheet::where('status', 'processed')
            ->with(['user.currentPosition', 'user.departments', 'processedBy'])
            ->orderBy('processed_at', 'desc')
            ->limit(10)
            ->get();

        $departments = Department::active()->orderBy('name')->get();
        $employees = User::select('id', 'name', 'email')
            ->whereHas('timesheets')
            ->orderBy('name')
            ->get();

        return Inertia::render('TimeManagement/Payroll/Dashboard', [
            'approvedTimesheets' => $approvedTimesheets,
            'processedTimesheets' => $processedTimesheets,
            'departments' => $departments,
            'employees' => $employees,
            'stats' => $this->calculatePayrollStats($request),
            'statusBreakdown' => $this->getStatusBreakdown($request),
            'departmentSummary' => $this->getDepartmentSummary($request),
            'filters' => $request->only(['week_start', 'week_end', 'employee_id', 'department_id']),
        ]);
    }

    public function departments(Request $request)
    {
        $query = Timesheet::with(['user.currentPosition', 'user.departments', 'approvedBy', 'processedBy']);
        $this->applyFilters($query, $request);

        $timesheets = $query->orderBy('week_start_date', 'desc')
            ->orderBy('user_id')
            ->paginate(20)
            ->withQueryString();

        $timesheets->getCollection()->transform(function ($timesheet) {
            // Get all punches for this timesheet period
            $timeClocks = TimeClock::where('user_id', $timesheet->user_id)
                ->whereBetween('clock_in_at', [
                    $timesheet->week_start_date->startOfDay(),
                    $timesheet->week_end_date->endOfDay()
                ])
                ->get(); // Remove ->with('breaks')

            // Calculate totals from work punches only
            $workPunches = $timeClocks->where('punch_type', 'work');
            $breakPunches = $timeClocks->where('punch_type', 'break');

            $totalWorkHours = $workPunches->sum(function($tc) {
                return $tc->getTotalHours();
            });

            $totalBreakHours = $breakPunches->sum(function($tc) {
                return $tc->getTotalHours();
            });

            $timesheet->total_hours = $totalWorkHours;
            $timesheet->regular_hours = $workPunches->sum('regular_hours');
            $timesheet->overtime_hours = $workPunches->sum('overtime_hours');
            $timesheet->break_hours = $totalBreakHours;

            return $timesheet;
        });

        $departments = Department::active()->orderBy('name')->get();

        return Inertia::render('TimeManagement/Payroll/Timesheets', [
            'timesheets' => $timesheets,
            'departments' => $departments,
            'filters' => $request->only(['week_start', 'week_end', 'department_id', 'status']),
        ]);
    }

    public function timesheetPunches(Request $request, Timesheet $timesheet)
    {
        // Get all punch entries for this user during the timesheet period
        $punchEntries = TimeClock::where('user_id', $timesheet->user_id)
            ->whereBetween('clock_in_at', [
                $timesheet->week_start_date->startOfDay(),
                $timesheet->week_end_date->endOfDay()
            ])
            ->with(['user.departments', 'user.currentPosition', 'breakType'])
            ->orderBy('clock_in_at')
            ->get();

        $punches = [];

        foreach ($punchEntries as $punch) {
            $wasEdited = $punch->audits()->where('action', 'manual_edit')->exists();

            // Determine punch type and status
            if ($punch->punch_type === 'work') {
                $type = match(true) {
                    !$punch->clock_out_at => 'Open Work',
                    $wasEdited => 'Work (Edited)',
                    default => 'Work'
                };
            } else {
                $type = match(true) {
                    !$punch->clock_out_at => 'Break (Active)',
                    $wasEdited => 'Break (Edited)',
                    default => 'Break'
                };
            }

            $punches[] = [
                'id' => $punch->id,
                'row_type' => $punch->punch_type, // 'work' or 'break'
                'type' => $type,
                'employee' => $punch->user->name,
                'location' => $punch->user->departments->pluck('name')->implode(', ') ?: 'N/A',
                'task' => $punch->punch_type === 'work'
                    ? ($punch->user->currentPosition->title ?? 'Work')
                    : ($punch->breakType?->label ?? 'Break'),
                'time_in' => $punch->clock_in_at->format('n/j/Y g:i:s A'),
                'time_out' => $punch->clock_out_at?->format('n/j/Y g:i:s A') ?? '',
                'hours' => $punch->getTotalHours(),
                'break_duration' => $punch->punch_type === 'break' ? $punch->getTotalHours() : 0,
                'modified_date' => $punch->updated_at->format('n/j/Y g:i:s A'),
                'was_edited' => $wasEdited,
                'sort_time' => $punch->clock_in_at,
                'is_active_break' => $punch->punch_type === 'break' && !$punch->clock_out_at,
                'break_type' => $punch->breakType?->label ?? null,
            ];
        }

        $punches = collect($punches)->sortBy('sort_time')->values();

        return Inertia::render('TimeManagement/Payroll/TimesheetPunches', [
            'timesheet' => $timesheet->load(['user.departments', 'user.currentPosition']),
            'punches' => $punches,
            'departments' => Department::active()->orderBy('name')->get(),
            'filters' => $request->only(['location', 'employee', 'source']),
        ]);
    }

    public function editPunch(Request $request, TimeClock $timeClock)
    {
        $request->validate([
            'time_in' => 'required|date',
            'time_out' => 'nullable|date|after:time_in',
            'edit_reason' => 'required|string|in:time_correction,missed_punch,system_error,manager_adjustment,other',
            'notes' => 'nullable|string|max:500',
        ]);

        $originalData = [
            'clock_in_at' => $timeClock->clock_in_at,
            'clock_out_at' => $timeClock->clock_out_at,
            'regular_hours' => $timeClock->regular_hours,
            'overtime_hours' => $timeClock->overtime_hours,
        ];

        try {
            DB::transaction(function() use ($timeClock, $request, $originalData) {
                $timeClock->update([
                    'clock_in_at' => $request->time_in,
                    'clock_out_at' => $request->time_out,
                ]);

                // Only calculate overtime for work punches
                if ($timeClock->isWorkPunch()) {
                    $timeClock->calculateOvertime();
                }

                $timeClock->createAudit('manual_edit', [
                    'edited_by' => Auth::id(),
                    'previous_data' => $originalData,
                    'new_data' => [
                        'clock_in_at' => $timeClock->fresh()->clock_in_at,
                        'clock_out_at' => $timeClock->fresh()->clock_out_at,
                        'regular_hours' => $timeClock->fresh()->regular_hours,
                        'overtime_hours' => $timeClock->fresh()->overtime_hours,
                    ],
                    'edit_reason' => $request->edit_reason,
                ]);

                if ($request->filled('notes')) {
                    $timeClock->update(['notes' => $request->notes]);
                }
            });

            return back()->with('success', 'Punch updated successfully!');

        } catch (\Exception $e) {
            return back()->withErrors(['message' => 'Failed to update punch: ' . $e->getMessage()]);
        }
    }

    public function deletePunch(TimeClock $timeClock)
    {
        try {
            DB::transaction(function() use ($timeClock) {
                $timeClock->createAudit('manual_edit', [
                    'edited_by' => Auth::id(),
                    'previous_data' => $timeClock->toArray(),
                    'new_data' => ['deleted' => true],
                    'edit_reason' => 'record_deletion',
                ]);

                $timeClock->delete();
            });

            return back()->with('success', 'Punch record deleted successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['message' => 'Failed to delete punch: ' . $e->getMessage()]);
        }
    }



    public function editBreak(Request $request, TimeClockBreak $break)
    {
        $request->validate([
            'break_start' => 'required|date',
            'break_end' => 'nullable|date|after:break_start',
            'edit_reason' => 'required|string|in:time_correction,missed_punch,system_error,manager_adjustment,other',
            'notes' => 'nullable|string|max:500',
        ]);

        $validationErrors = $break->validateTimes(
            $request->break_start,
            $request->break_end
        );

        if (!empty($validationErrors)) {
            return back()->withErrors([
                'message' => 'Cannot save break: ' . implode(', ', $validationErrors)
            ]);
        }

        $originalData = [
            'break_start_at' => $break->break_start_at,
            'break_end_at' => $break->break_end_at,
            'duration_minutes' => $break->duration_minutes,
        ];

        try {
            DB::transaction(function() use ($break, $request, $originalData) {
                $startTime = Carbon::parse($request->break_start);
                $endTime = $request->break_end ? Carbon::parse($request->break_end) : null;

                $durationMinutes = $endTime ? $startTime->diffInMinutes($endTime) : 0;
                $status = $endTime ? 'completed' : 'active';

                $break->update([
                    'break_start_at' => $startTime,
                    'break_end_at' => $endTime,
                    'duration_minutes' => $durationMinutes,
                    'status' => $status,
                ]);

                // Recalculate parent time clock break duration
                $break->timeClock->recalculateBreakDuration();

                $break->timeClock->createAudit('manual_edit', [
                    'edited_by' => Auth::id(),
                    'previous_data' => $originalData,
                    'new_data' => [
                        'break_start_at' => $break->break_start_at,
                        'break_end_at' => $break->break_end_at,
                        'duration_minutes' => $break->duration_minutes,
                    ],
                    'edit_reason' => $request->edit_reason,
                    'break_id' => $break->id,
                ]);

                if ($request->filled('notes')) {
                    $break->update(['notes' => $request->notes]);
                }
            });

            return back()->with('success', 'Break updated successfully!');

        } catch (\Exception $e) {
            return back()->withErrors(['message' => 'Failed to update break: ' . $e->getMessage()]);
        }
    }



    public function deleteBreak(TimeClockBreak $break)
    {
        try {
            DB::transaction(function() use ($break) {
                $timeClock = $break->timeClock;

                $timeClock->createAudit('manual_edit', [
                    'edited_by' => Auth::id(),
                    'previous_data' => $break->toArray(),
                    'new_data' => ['deleted' => true],
                    'edit_reason' => 'break_deletion',
                    'break_id' => $break->id,
                ]);

                $break->delete();
                $timeClock->recalculateBreakDuration();
            });

            return back()->with('success', 'Break record deleted successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['message' => 'Failed to delete break: ' . $e->getMessage()]);
        }
    }

    public function process(Request $request, Timesheet $timesheet)
    {
        $request->validate([
            'payroll_notes' => 'nullable|string|max:500',
        ]);

        if (!$timesheet->isApproved()) {
            return back()->withErrors(['message' => 'Timesheet is not ready for processing.']);
        }

        if ($timesheet->process(Auth::id(), $request->payroll_notes)) {
            return back()->with('success', 'Timesheet processed successfully!');
        }

        return back()->withErrors(['message' => 'Failed to process timesheet.']);
    }

    public function bulkProcess(Request $request)
    {
        $request->validate([
            'timesheet_ids' => 'required|array',
            'timesheet_ids.*' => 'exists:timesheets,id',
            'payroll_notes' => 'nullable|string|max:500',
        ]);

        $processed = 0;
        $totalHours = 0;

        $timesheets = Timesheet::whereIn('id', $request->timesheet_ids)
            ->where('status', 'approved')
            ->get();

        DB::transaction(function() use ($timesheets, $request, &$processed, &$totalHours) {
            foreach ($timesheets as $timesheet) {
                if ($timesheet->process(Auth::id(), $request->payroll_notes)) {
                    $processed++;
                    $totalHours += $timesheet->total_hours;
                }
            }
        });

        return back()->with('success', "Successfully processed {$processed} timesheets totaling " . number_format($totalHours, 2) . " hours!");
    }

    private function applyFilters($query, Request $request): void
    {
        if ($request->filled('week_start')) {
            $query->where('week_start_date', '>=', $request->week_start);
        }
        if ($request->filled('week_end')) {
            $query->where('week_end_date', '<=', $request->week_end);
        }
        if ($request->filled('employee_id')) {
            $query->where('user_id', $request->employee_id);
        }
        if ($request->filled('department_id') && $request->department_id !== 'all') {
            $query->whereHas('user.departments', function($q) use ($request) {
                $q->where('departments.id', $request->department_id);
            });
        }
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
    }

    private function calculatePayrollStats(Request $request)
    {
        $query = Timesheet::query();

        if ($request->filled('week_start')) {
            $query->where('week_start_date', '>=', $request->week_start);
        }
        if ($request->filled('week_end')) {
            $query->where('week_end_date', '<=', $request->week_end);
        }

        $approved = (clone $query)->where('status', 'approved')->count();
        $processed = (clone $query)->where('status', 'processed')->count();
        $submitted = (clone $query)->where('status', 'submitted')->count();

        $approvedHours = (clone $query)->where('status', 'approved')
            ->selectRaw('SUM(total_hours) as total, SUM(overtime_hours) as overtime')
            ->first();

        $processedThisWeek = Timesheet::where('status', 'processed')
            ->where('processed_at', '>=', Carbon::now()->startOfWeek())
            ->count();

        return [
            'approved_count' => $approved,
            'processed_count' => $processed,
            'submitted_count' => $submitted,
            'processed_this_week' => $processedThisWeek,
            'total_approved_hours' => $approvedHours->total ?? 0,
            'total_approved_overtime' => $approvedHours->overtime ?? 0,
        ];
    }

    private function getStatusBreakdown(Request $request)
    {
        $query = Timesheet::query();

        if ($request->filled('week_start')) {
            $query->where('week_start_date', '>=', $request->week_start);
        }
        if ($request->filled('week_end')) {
            $query->where('week_end_date', '<=', $request->week_end);
        }

        return $query->selectRaw('status, COUNT(*) as count, SUM(total_hours) as hours')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->status => [
                    'count' => $item->count,
                    'hours' => round($item->hours, 2)
                ]];
            });
    }

    private function getDepartmentSummary(Request $request)
    {
        $departments = Department::active()
            ->with(['users.timesheets' => function($query) use ($request) {
                if ($request->filled('week_start')) {
                    $query->where('week_start_date', '>=', $request->week_start);
                }
                if ($request->filled('week_end')) {
                    $query->where('week_end_date', '<=', $request->week_end);
                }
            }])
            ->get()
            ->map(function($department) {
                $timesheets = $department->users->flatMap->timesheets;

                return [
                    'name' => $department->name,
                    'approved_count' => $timesheets->where('status', 'approved')->count(),
                    'processed_count' => $timesheets->where('status', 'processed')->count(),
                    'total_hours' => round($timesheets->sum('total_hours'), 2),
                    'overtime_hours' => round($timesheets->sum('overtime_hours'), 2),
                ];
            })
            ->where('approved_count', '>', 0)
            ->sortByDesc('total_hours')
            ->take(5)
            ->values();

        return $departments;
    }
}
