<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\TimeClock;
use App\Models\TimeClockBreak;
use App\Models\Timesheet;
use App\Models\TimesheetAction;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PayrollTimeClockController extends Controller
{
    public function dashboard(Request $request)
    {
        // Set default week if not provided
        if (!$request->has('week_start') || !$request->has('week_end')) {
            $today = Carbon::now();
            $weekStart = $today->copy()->startOfWeek();
            $weekEnd = $today->copy()->endOfWeek();

            $request->merge([
                'week_start' => $weekStart->format('Y-m-d'),
                'week_end' => $weekEnd->format('Y-m-d')
            ]);
        }

        $query = Timesheet::with([
            'user.currentPosition',
            'user.departments',
            'approvalAction.user',
            'processingAction.user'
        ]);

        $this->applyFilters($query, $request);

        $timesheets = $query->orderBy('week_start_date', 'desc')
            ->orderBy('user_id')
            ->paginate(20);

        $timesheets->getCollection()->transform(function ($timesheet) {
            // Get all punches for this timesheet period
            $timeClocks = TimeClock::where('user_id', $timesheet->user_id)
                ->whereBetween('clock_in_at', [
                    $timesheet->week_start_date->startOfDay(),
                    $timesheet->week_end_date->endOfDay()
                ])
                ->get();

            // Calculate totals from work punches only
            $workPunches = $timeClocks->where('punch_type', 'work');
            $breakPunches = $timeClocks->where('punch_type', 'break');

            $totalWorkHours = $workPunches->sum(function($tc) {
                return $tc->getTotalHours();
            });

            $totalBreakHours = $breakPunches->sum(function($tc) {
                return $tc->getTotalHours();
            });

            // Calculate weekly overtime (40+ hours = overtime)
            $regularHours = min($totalWorkHours, 40);
            $overtimeHours = max(0, $totalWorkHours - 40);

            $timesheet->total_hours = $totalWorkHours;
            $timesheet->regular_hours = $regularHours;
            $timesheet->overtime_hours = $overtimeHours;
            $timesheet->break_hours = $totalBreakHours;

            return $timesheet;
        });

        $departments = Department::active()->orderBy('name')->get();

        return Inertia::render('TimeManagement/Payroll/Dashboard', [
            'timesheets' => $timesheets,
            'departments' => $departments,
            'filters' => $request->only(['week_start', 'week_end', 'department_id', 'status']),
        ]);
    }

    public function clockOut(TimeClock $timeClock)
    {
        if ($timeClock->status !== 'active' || $timeClock->clock_out_at) {
            return back()->withErrors(['message' => 'Punch is not active.']);
        }

        try {
            DB::transaction(function() use ($timeClock) {
                $timeClock->update([
                    'clock_out_at' => now(),
                    'status' => 'completed',
                ]);

                if ($timeClock->punch_type === 'work') {
                    $timeClock->calculateOvertime();
                }

                $timeClock->createAudit('manual_edit', [
                    'edited_by' => Auth::id(),
                    'edit_reason' => 'payroll_clock_out',
                    'payroll_action' => 'clock_out',
                ]);
            });

            return back()->with('success', 'Clocked out successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['message' => 'Failed to clock out: ' . $e->getMessage()]);
        }
    }

    /**
     * Add a new time entry with automatic splitting (matches ManagerTimeClockController)
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

        $clockInTime = Carbon::parse($request->clock_in_at);
        $clockOutTime = $request->clock_out_at ? Carbon::parse($request->clock_out_at) : null;

        // Handle overlapping entries
        if ($clockOutTime) {
            $this->handleTimeEntryOverlaps($request->user_id, $clockInTime, $clockOutTime, $request->punch_type, null, Auth::id());
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
            'edited_by' => Auth::id(),
            'edit_reason' => 'Payroll added new time entry',
            'payroll_action' => 'add_entry',
            'payroll_id' => Auth::id()
        ]);

        return back()->with('success', 'Time entry added successfully.');
    }

    /**
     * Update an existing time entry with automatic splitting (matches ManagerTimeClockController)
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

        $previousData = $timeClock->only([
            'punch_type', 'break_type_id', 'clock_in_at', 'clock_out_at', 'notes', 'status'
        ]);

        $clockInTime = Carbon::parse($request->clock_in_at);
        $clockOutTime = $request->clock_out_at ? Carbon::parse($request->clock_out_at) : null;

        // Handle overlapping entries (exclude current entry from overlap check)
        if ($clockOutTime) {
            $this->handleTimeEntryOverlaps($timeClock->user_id, $clockInTime, $clockOutTime, $request->punch_type, $timeClock->id, Auth::id());
        }

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
            'edited_by' => Auth::id(),
            'edit_reason' => 'Payroll updated time entry',
            'payroll_action' => 'edit_entry',
            'payroll_id' => Auth::id(),
            'previous_data' => $previousData,
            'new_data' => $timeClock->only([
                'punch_type', 'break_type_id', 'clock_in_at', 'clock_out_at', 'notes', 'status'
            ])
        ]);

        return back()->with('success', 'Time entry updated successfully.');
    }

    /**
     * Clock out an active entry (matches ManagerTimeClockController)
     */
    public function clockOutEntry(TimeClock $timeClock)
    {
        if ($timeClock->status !== 'active' || $timeClock->clock_out_at) {
            return back()->withErrors(['message' => 'Entry is not active.']);
        }

        $timeClock->update([
            'clock_out_at' => now(),
            'status' => 'completed',
        ]);

        $timeClock->calculateOvertime();

        $timeClock->createAudit('manual_edit', [
            'edited_by' => Auth::id(),
            'edit_reason' => 'Payroll clocked out employee',
            'payroll_action' => 'clock_out',
            'payroll_id' => Auth::id()
        ]);

        return back()->with('success', 'Employees clocked out successfully.');
    }

    /**
     * Delete a time entry (matches ManagerTimeClockController)
     */
    public function deleteEntry(TimeClock $timeClock)
    {
        // Create audit record before deletion
        $timeClock->createAudit('manual_edit', [
            'edited_by' => Auth::id(),
            'edit_reason' => 'Payroll deleted time entry',
            'payroll_action' => 'delete_entry',
            'payroll_id' => Auth::id(),
            'previous_data' => $timeClock->toArray()
        ]);

        $timeClock->delete();

        return back()->with('success', 'Time entry deleted successfully.');
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
                'notes' => $punch->notes,
            ];
        }

        $punches = collect($punches)->sortBy('sort_time')->values();

        return Inertia::render('TimeManagement/Payroll/TimesheetPunches', [
            'timesheet' => $timesheet->load([
                'user.departments',
                'user.currentPosition',
                'actions' => function($query) {
                    $query->orderBy('created_at', 'asc');
                },
                'actions.user'
            ]),
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

        $clockInTime = Carbon::parse($request->time_in);
        $clockOutTime = $request->time_out ? Carbon::parse($request->time_out) : null;

        try {
            DB::transaction(function() use ($timeClock, $request, $originalData, $clockInTime, $clockOutTime) {
                // Handle overlapping entries if both times are provided (exclude current entry)
                if ($clockOutTime) {
                    $this->handleTimeEntryOverlaps($timeClock->user_id, $clockInTime, $clockOutTime, $timeClock->punch_type, $timeClock->id, Auth::id());
                }

                $timeClock->update([
                    'clock_in_at' => $clockInTime,
                    'clock_out_at' => $clockOutTime,
                    'status' => $clockOutTime ? 'completed' : 'active',
                ]);

                // Only calculate overtime for work punches
                if ($timeClock->isWorkPunch() && $clockOutTime) {
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
                    'payroll_action' => 'edit_punch',
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

    /**
     * Handle overlapping time entries by splitting them
     */
    private function handleTimeEntryOverlaps($userId, Carbon $newStart, Carbon $newEnd, $newPunchType, $excludeEntryId = null, $payrollUserId = null)
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
                    'edited_by' => $payrollUserId,
                    'payroll_action' => 'auto_split'
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
                    'notes' => $entry->notes . ' (auto-split before due to payroll edit)',
                ]);

                // Update original to be second part (after new entry)
                $entry->update([
                    'clock_in_at' => $newEnd,
                    'notes' => $entry->notes . ' (auto-split after due to payroll edit)',
                ]);

                $entry->createAudit('manual_edit', [
                    'reason' => 'Entry split due to overlapping new entry',
                    'new_entry_type' => $newPunchType,
                    'original_data' => $entry->toArray(),
                    'edited_by' => $payrollUserId,
                    'payroll_action' => 'auto_split'
                ]);
                continue;
            }

            // Case 3: Partial overlap - truncate existing entry
            if ($entryStart < $newStart && $entryEnd > $newStart) {
                // Truncate end of existing entry
                $entry->update([
                    'clock_out_at' => $newStart,
                    'notes' => $entry->notes . ' (auto-truncated by payroll)',
                ]);

                $entry->createAudit('manual_edit', [
                    'reason' => 'Entry truncated due to overlapping new entry',
                    'new_entry_type' => $newPunchType,
                    'original_data' => $entry->toArray(),
                    'edited_by' => $payrollUserId,
                    'payroll_action' => 'auto_split'
                ]);
            } elseif ($entryStart < $newEnd && $entryEnd > $newEnd) {
                // Truncate start of existing entry
                $entry->update([
                    'clock_in_at' => $newEnd,
                    'notes' => $entry->notes . ' (auto-truncated by payroll)',
                ]);

                $entry->createAudit('manual_edit', [
                    'reason' => 'Entry truncated due to overlapping new entry',
                    'new_entry_type' => $newPunchType,
                    'original_data' => $entry->toArray(),
                    'edited_by' => $payrollUserId,
                    'payroll_action' => 'auto_split'
                ]);
            }
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
                    'payroll_action' => 'delete_punch',
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
                    'payroll_action' => 'edit_break',
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
                    'payroll_action' => 'delete_break',
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

        if (!in_array($timesheet->status, ['approved', 'open', 'draft'])) {
            return back()->withErrors(['message' => 'Timesheet is not ready for processing.']);
        }

        try {
            if ($timesheet->process(Auth::id(), $request->payroll_notes)) {
                return back()->with('success', 'Timesheet processed successfully!');
            }
        } catch (\Exception $e) {
            return back()->withErrors(['message' => 'Failed to process timesheet: ' . $e->getMessage()]);
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
            ->whereIn('status', ['approved', 'open', 'draft'])
            ->get();

        DB::transaction(function() use ($timesheets, $request, &$processed, &$totalHours) {
            foreach ($timesheets as $timesheet) {
                try {
                    if ($timesheet->process(Auth::id(), $request->payroll_notes)) {
                        $processed++;
                        $totalHours += $timesheet->total_hours;
                    }
                } catch (\Exception $e) {
                    // Skip this timesheet if it fails
                }
            }
        });

        return back()->with('success', "Successfully processed {$processed} timesheets totaling " . number_format($totalHours, 2) . " hours!");
    }

    /**
     * Reject a timesheet
     */
    public function reject(Request $request, Timesheet $timesheet)
    {
        $request->validate([
            'rejection_reason' => 'required|string|in:incomplete_data,missing_punches,policy_violation,incorrect_hours,documentation_missing,other',
            'rejection_notes' => 'nullable|string|max:1000',
        ]);

        if (!$timesheet->canBeRejected()) {
            return back()->withErrors(['message' => 'This timesheet cannot be rejected in its current state.']);
        }

        try {
            if ($timesheet->reject(Auth::id(), $request->rejection_reason, $request->rejection_notes)) {
                return back()->with('success', 'Timesheet rejected successfully. Employees will be notified.');
            }
        } catch (\Exception $e) {
            return back()->withErrors(['message' => 'Failed to reject timesheet: ' . $e->getMessage()]);
        }

        return back()->withErrors(['message' => 'Failed to reject timesheet.']);
    }

    /**
     * Bulk reject timesheets
     */
    public function bulkReject(Request $request)
    {
        $request->validate([
            'timesheet_ids' => 'required|array',
            'timesheet_ids.*' => 'exists:timesheets,id',
            'rejection_reason' => 'required|string|in:incomplete_data,missing_punches,policy_violation,incorrect_hours,documentation_missing,other',
            'rejection_notes' => 'nullable|string|max:1000',
        ]);

        $rejected = 0;
        $timesheets = Timesheet::whereIn('id', $request->timesheet_ids)->get();

        DB::transaction(function() use ($timesheets, $request, &$rejected) {
            foreach ($timesheets as $timesheet) {
                if ($timesheet->canBeRejected()) {
                    try {
                        if ($timesheet->reject(Auth::id(), $request->rejection_reason, $request->rejection_notes)) {
                            $rejected++;
                        }
                    } catch (\Exception $e) {
                        // Skip this timesheet if it fails
                    }
                }
            }
        });

        return back()->with('success', "Successfully rejected {$rejected} timesheets!");
    }

    private function applyFilters($query, Request $request): void
    {
        if ($request->filled('week_start') && $request->filled('week_end')) {
            // Show timesheets that overlap with the selected period
            $query->where(function($q) use ($request) {
                $q->where('week_start_date', '<=', $request->week_end)
                    ->where('week_end_date', '>=', $request->week_start);
            });
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

        $open = (clone $query)->whereIn('status', ['open', 'draft'])->count();
        $approved = (clone $query)->where('status', 'approved')->count();
        $processed = (clone $query)->where('status', 'processed')->count();
        $submitted = (clone $query)->where('status', 'submitted')->count();

        $approvedHours = (clone $query)->where('status', 'approved')
            ->selectRaw('SUM(total_hours) as total, SUM(overtime_hours) as overtime')
            ->first();

        $processedThisWeek = TimesheetAction::where('action', TimesheetAction::ACTION_PROCESSED)
            ->where('created_at', '>=', Carbon::now()->startOfWeek())
            ->count();

        return [
            'open_count' => $open,
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

    /**
     * Export dashboard data
     */
    public function exportDashboard(Request $request)
    {
        $request->validate([
            'format' => 'required|in:csv,pdf',
            'week_start' => 'nullable|date',
            'week_end' => 'nullable|date',
            'department_id' => 'nullable|integer',
            'status' => 'nullable|string',
        ]);

        $query = Timesheet::with([
            'user.currentPosition',
            'user.departments',
            'approvalAction.user',
            'processingAction.user'
        ]);

        $this->applyFilters($query, $request);

        $timesheets = $query->orderBy('week_start_date', 'desc')
            ->orderBy('user_id')
            ->get();

        // Calculate totals for each timesheet
        $timesheets->each(function ($timesheet) {
            $timeClocks = TimeClock::where('user_id', $timesheet->user_id)
                ->whereBetween('clock_in_at', [
                    $timesheet->week_start_date->startOfDay(),
                    $timesheet->week_end_date->endOfDay()
                ])
                ->get();

            $workPunches = $timeClocks->where('punch_type', 'work');
            $breakPunches = $timeClocks->where('punch_type', 'break');

            $totalWorkHours = $workPunches->sum(function($tc) {
                return $tc->getTotalHours();
            });

            $totalBreakHours = $breakPunches->sum(function($tc) {
                return $tc->getTotalHours();
            });

            $regularHours = min($totalWorkHours, 40);
            $overtimeHours = max(0, $totalWorkHours - 40);

            $timesheet->total_hours = $totalWorkHours;
            $timesheet->regular_hours = $regularHours;
            $timesheet->overtime_hours = $overtimeHours;
            $timesheet->break_hours = $totalBreakHours;
        });

        if ($request->format === 'csv') {
            return $this->exportCSV($timesheets, $request);
        } else {
            return $this->exportPDF($timesheets, $request);
        }
    }

    private function exportCSV($timesheets, $request)
    {
        $filename = 'payroll_timesheets_' . now()->format('Y-m-d_H-i-s') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($timesheets) {
            $file = fopen('php://output', 'w');

            // CSV Headers
            fputcsv($file, [
                'Employees Name',
                'Email',
                'Department',
                'Position',
                'Week Period',
                'Status',
                'Regular Hours',
                'Overtime Hours',
                'Break Hours',
                'Total Hours',
                'Approved By',
                'Approved Date',
                'Processed By',
                'Processed Date'
            ]);

            // Data rows
            foreach ($timesheets as $timesheet) {
                fputcsv($file, [
                    $timesheet->user->name,
                    $timesheet->user->email,
                    $timesheet->user->departments->pluck('name')->implode(', ') ?: 'No Department',
                    $timesheet->user->current_position->title ?? 'No Position',
                    $timesheet->week_start_date->format('M j') . ' - ' . $timesheet->week_end_date->format('M j, Y'),
                    ucfirst($timesheet->status),
                    number_format($timesheet->regular_hours, 2),
                    number_format($timesheet->overtime_hours, 2),
                    number_format($timesheet->break_hours, 2),
                    number_format($timesheet->total_hours, 2),
                    $timesheet->approvalAction?->user->name ?? '',
                    $timesheet->approved_at ? $timesheet->approved_at->format('M j, Y H:i') : '',
                    $timesheet->processingAction?->user->name ?? '',
                    $timesheet->processed_at ? $timesheet->processed_at->format('M j, Y H:i') : '',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function exportPDF($timesheets, $request)
    {
        // Basic PDF implementation - you might want to use a library like DomPDF
        $filename = 'payroll_timesheets_' . now()->format('Y-m-d_H-i-s') . '.pdf';

        $html = view('payroll.timesheets-pdf', compact('timesheets'))->render();

        // If you have DomPDF installed:
        // $pdf = app('dompdf.wrapper');
        // $pdf->loadHTML($html);
        // return $pdf->download($filename);

        // For now, return HTML version
        return response($html)
            ->header('Content-Type', 'text/html')
            ->header('Content-Disposition', "attachment; filename=\"$filename\"");
    }
    public function exportPunches(Request $request)
    {
        $request->validate([
            'timesheet_id' => 'required|exists:timesheets,id',
            'format' => 'required|in:csv,excel'
        ]);

        $timesheet = Timesheet::findOrFail($request->timesheet_id);

        // Get all punch entries for this timesheet
        $punchEntries = TimeClock::where('user_id', $timesheet->user_id)
            ->whereBetween('clock_in_at', [
                $timesheet->week_start_date->startOfDay(),
                $timesheet->week_end_date->endOfDay()
            ])
            ->with(['user.departments', 'user.currentPosition', 'breakType'])
            ->orderBy('clock_in_at')
            ->get();

        $data = [];
        $workHours = 0;
        $breakHours = 0;

        foreach ($punchEntries as $punch) {
            $wasEdited = $punch->audits()->where('action', 'manual_edit')->exists();
            $hours = $punch->getTotalHours();

            if ($punch->punch_type === 'work') {
                $workHours += $hours;
            } else {
                $breakHours += $hours;
            }

            $data[] = [
                'Employees' => $punch->user->name,
                'Department' => $punch->user->departments->pluck('name')->implode(', ') ?: 'N/A',
                'Type' => $punch->punch_type === 'work' ? 'Work' : 'Break',
                'Break Type' => $punch->breakType?->label ?? '',
                'Time In' => $punch->clock_in_at->format('n/j/Y g:i:s A'),
                'Time Out' => $punch->clock_out_at?->format('n/j/Y g:i:s A') ?? 'Active',
                'Hours' => number_format($hours, 2),
                'Modified Date' => $punch->updated_at->format('n/j/Y g:i:s A'),
                'Edited' => $wasEdited ? 'Yes' : 'No',
                'Notes' => $punch->notes ?? '',
            ];
        }

        // Add summary totals
        $regularHours = min($workHours, 40);
        $overtimeHours = max(0, $workHours - 40);

        $data[] = []; // Empty row
        $data[] = [
            'Employees' => 'TOTALS',
            'Department' => '',
            'Type' => '',
            'Break Type' => '',
            'Time In' => '',
            'Time Out' => '',
            'Hours' => '',
            'Modified Date' => '',
            'Edited' => '',
            'Notes' => '',
        ];
        $data[] = [
            'Employees' => 'Regular Hours',
            'Department' => '',
            'Type' => '',
            'Break Type' => '',
            'Time In' => '',
            'Time Out' => '',
            'Hours' => number_format($regularHours, 2),
            'Modified Date' => '',
            'Edited' => '',
            'Notes' => '',
        ];
        $data[] = [
            'Employees' => 'Overtime Hours',
            'Department' => '',
            'Type' => '',
            'Break Type' => '',
            'Time In' => '',
            'Time Out' => '',
            'Hours' => number_format($overtimeHours, 2),
            'Modified Date' => '',
            'Edited' => '',
            'Notes' => '',
        ];
        $data[] = [
            'Employees' => 'Break Hours',
            'Department' => '',
            'Type' => '',
            'Break Type' => '',
            'Time In' => '',
            'Time Out' => '',
            'Hours' => number_format($breakHours, 2),
            'Modified Date' => '',
            'Edited' => '',
            'Notes' => '',
        ];

        $filename = "punches_{$timesheet->user->name}_{$timesheet->week_start_date->format('Y-m-d')}.csv";

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($data) {
            $file = fopen('php://output', 'w');

            // Add header row
            if (!empty($data)) {
                fputcsv($file, array_keys($data[0]));
            }

            // Add data rows
            foreach ($data as $row) {
                fputcsv($file, $row);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
