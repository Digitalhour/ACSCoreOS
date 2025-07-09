<?php

namespace App\Http\Controllers;

use App\Models\BreakType;
use App\Models\TimeClock;
use App\Models\Timesheet;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TimeClockController extends Controller
{
    /**
     * Display the employee time clock interface
     */
    public function employee()
    {
        $user = Auth::user();
        $today = Carbon::today();
        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();

        // Get current active time clock entry
        $currentEntry = TimeClock::forUser($user->id)
            ->active()
            ->orderBy('clock_in_at', 'desc')
            ->first();

        // Get today's completed entries
        $todayEntries = TimeClock::forUser($user->id)
            ->whereBetween('clock_in_at', [$today, $today->copy()->endOfDay()])
            ->with('breakType')
            ->orderBy('clock_in_at', 'desc')
            ->get();

        // Get this week's entries for timesheet
        $weekEntries = TimeClock::forUser($user->id)
            ->forWeek($weekStart)
            ->with('breakType')
            ->orderBy('clock_in_at', 'desc')
            ->get();

        // Get current week's timesheet
        $currentTimesheet = Timesheet::getOrCreateForWeek($user->id, $weekStart);

        // Get available weeks for submission
        $availableWeeks = Timesheet::getAvailableWeeks($user->id);

        // Calculate week totals
        $weeklyStats = $this->calculateWeeklyStats($weekEntries);

        // Get break types for break selection
        $breakTypes = BreakType::active()->ordered()->get();

        return Inertia::render('TimeManagement/Employee/Index', [
            'currentEntry' => $currentEntry,
            'todayEntries' => $todayEntries,
            'weekEntries' => $weekEntries,
            'weeklyStats' => $weeklyStats,
            'breakTypes' => $breakTypes,
            'currentTimesheet' => $currentTimesheet,
            'availableWeeks' => $availableWeeks,
            'currentDate' => $today->format('Y-m-d'),
            'weekStart' => $weekStart->format('Y-m-d'),
            'weekEnd' => $weekEnd->format('Y-m-d'),
        ]);
    }

    /**
     * Clock in the user
     */
    public function clockIn(Request $request)
    {
        $user = Auth::user();

        // Check if user already has an active clock entry
        $existingEntry = TimeClock::forUser($user->id)->active()->first();

        if ($existingEntry) {
            return back()->withErrors(['message' => 'You are already clocked in.']);
        }

        // Create new time clock entry
        $timeClock = TimeClock::create([
            'user_id' => $user->id,
            'clock_in_at' => now(),
            'status' => 'active',
            'location_data' => $request->input('location_data'),
        ]);

        // Create audit record
        $timeClock->createAudit('clock_in', [
            'location_data' => $request->input('location_data'),
        ]);

        return back()->with('success', 'Successfully clocked in!');
    }

    /**
     * Clock out the user
     */
    public function clockOut(Request $request)
    {
        $user = Auth::user();

        // Get the active time clock entry
        $timeClock = TimeClock::forUser($user->id)->active()->first();

        if (!$timeClock) {
            return back()->withErrors(['message' => 'No active clock entry found.']);
        }

        // If user is on break, end the break first
        if ($timeClock->isOnBreak()) {
            $this->endCurrentBreak($timeClock);
        }

        // Update clock out time
        $timeClock->update([
            'clock_out_at' => now(),
            'status' => 'completed',
        ]);

        // Calculate hours and overtime
        $timeClock->calculateOvertime();

        // Create audit record
        $timeClock->createAudit('clock_out', [
            'location_data' => $request->input('location_data'),
        ]);

        return back()->with('success', 'Successfully clocked out!');
    }

    /**
     * Start a break
     */
    public function startBreak(Request $request)
    {
        $request->validate([
            'break_type_id' => 'required|exists:break_types,id',
        ]);

        $user = Auth::user();

        // Get the active time clock entry
        $timeClock = TimeClock::forUser($user->id)->active()->first();

        if (!$timeClock) {
            return back()->withErrors(['message' => 'No active clock entry found.']);
        }

        if ($timeClock->isOnBreak()) {
            return back()->withErrors(['message' => 'You are already on a break.']);
        }

        // Update break start time
        $timeClock->update([
            'break_start_at' => now(),
            'break_type_id' => $request->break_type_id,
        ]);

        // Create audit record
        $timeClock->createAudit('break_start', [
            'location_data' => $request->input('location_data'),
        ]);

        return back()->with('success', 'Break started!');
    }

    /**
     * End a break
     */
    public function endBreak(Request $request)
    {
        $user = Auth::user();

        // Get the active time clock entry
        $timeClock = TimeClock::forUser($user->id)->active()->first();

        if (!$timeClock) {
            return back()->withErrors(['message' => 'No active clock entry found.']);
        }

        if (!$timeClock->isOnBreak()) {
            return back()->withErrors(['message' => 'You are not currently on a break.']);
        }

        $this->endCurrentBreak($timeClock);

        // Create audit record
        $timeClock->createAudit('break_end', [
            'location_data' => $request->input('location_data'),
        ]);

        return back()->with('success', 'Break ended!');
    }

    /**
     * Get current status for the user
     */
    public function status()
    {
        $user = Auth::user();

        $currentEntry = TimeClock::forUser($user->id)->active()->first();

        return response()->json([
            'hasActiveEntry' => $currentEntry !== null,
            'isOnBreak' => $currentEntry ? $currentEntry->isOnBreak() : false,
            'currentEntry' => $currentEntry,
            'breakDuration' => $currentEntry ? $currentEntry->getCurrentBreakDuration() : 0,
        ]);
    }

    /**
     * Submit timesheet for approval
     */
    public function submitTimesheet(Request $request)
    {
        $request->validate([
            'timesheet_id' => 'required|exists:timesheets,id',
            'legal_acknowledgment' => 'required|boolean|accepted',
            'notes' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();
        $timesheet = Timesheet::findOrFail($request->timesheet_id);

        // Verify ownership
        if ($timesheet->user_id !== $user->id) {
            return back()->withErrors(['message' => 'Unauthorized action.']);
        }

        // Check if timesheet can be submitted
        if (!$timesheet->isDraft()) {
            return back()->withErrors(['message' => 'Timesheet cannot be submitted in its current state.']);
        }

        // Update notes if provided
        if ($request->notes) {
            $timesheet->update(['notes' => $request->notes]);
        }

        // Submit the timesheet
        if ($timesheet->submit($user->id, $request->legal_acknowledgment)) {
            return back()->with('success', 'Timesheet submitted successfully!');
        }

        return back()->withErrors(['message' => 'Failed to submit timesheet.']);
    }

    /**
     * Withdraw timesheet from submission
     */
    public function withdrawTimesheet(Request $request)
    {
        $request->validate([
            'timesheet_id' => 'required|exists:timesheets,id',
            'withdrawal_reason' => 'required|string|min:10|max:500',
        ]);

        $user = Auth::user();
        $timesheet = Timesheet::findOrFail($request->timesheet_id);

        // Verify ownership
        if ($timesheet->user_id !== $user->id) {
            return back()->withErrors(['message' => 'Unauthorized action.']);
        }

        // Check if timesheet can be withdrawn
        if (!$timesheet->canBeWithdrawn()) {
            return back()->withErrors(['message' => 'Timesheet cannot be withdrawn in its current state.']);
        }

        // Withdraw the timesheet
        if ($timesheet->withdraw($user->id, $request->withdrawal_reason)) {
            return back()->with('success', 'Timesheet withdrawn successfully!');
        }

        return back()->withErrors(['message' => 'Failed to withdraw timesheet.']);
    }

    /**
     * Get timesheet data for a specific week
     */
    public function getWeekTimesheet(Request $request)
    {
        $request->validate([
            'week_start' => 'required|date',
        ]);

        $user = Auth::user();
        $weekStart = Carbon::parse($request->week_start)->startOfWeek(Carbon::SUNDAY);

        $timesheet = Timesheet::getOrCreateForWeek($user->id, $weekStart);
        $timesheet->calculateTotals();

        $weekEntries = TimeClock::forUser($user->id)
            ->forWeek($weekStart)
            ->with('breakType')
            ->orderBy('clock_in_at', 'desc')
            ->get();

        $weeklyStats = $this->calculateWeeklyStats($weekEntries);

        return response()->json([
            'timesheet' => $timesheet,
            'weekEntries' => $weekEntries,
            'weeklyStats' => $weeklyStats,
        ]);
    }

    /**
     * Helper method to end current break
     */
    private function endCurrentBreak(TimeClock $timeClock): void
    {
        $breakEndTime = now();
        $breakDurationMinutes = $timeClock->break_start_at->diffInMinutes($breakEndTime);
        $breakDurationHours = round($breakDurationMinutes / 60, 2);

        // Add to existing break duration
        $totalBreakDuration = $timeClock->break_duration + $breakDurationHours;

        $timeClock->update([
            'break_end_at' => $breakEndTime,
            'break_duration' => $totalBreakDuration,
        ]);

        // Clear break start time for next break
        $timeClock->update([
            'break_start_at' => null,
            'break_end_at' => null,
        ]);
    }

    /**
     * Calculate weekly statistics
     */
    private function calculateWeeklyStats($weekEntries)
    {
        $totalHours = 0;
        $totalRegularHours = 0;
        $totalOvertimeHours = 0;
        $totalBreakHours = 0;

        foreach ($weekEntries as $entry) {
            $totalHours += $entry->getTotalHours();
            $totalRegularHours += $entry->regular_hours;
            $totalOvertimeHours += $entry->overtime_hours;
            $totalBreakHours += $entry->break_duration;
        }

        return [
            'total_hours' => round($totalHours, 2),
            'regular_hours' => round($totalRegularHours, 2),
            'overtime_hours' => round($totalOvertimeHours, 2),
            'break_hours' => round($totalBreakHours, 2),
            'entries_count' => $weekEntries->count(),
        ];
    }

    /**
     * Format hours for display
     */
    private function formatHours(float $hours): string
    {
        $h = floor($hours);
        $m = ($hours - $h) * 60;
        return sprintf('%d:%02d', $h, $m);
    }








    

}
