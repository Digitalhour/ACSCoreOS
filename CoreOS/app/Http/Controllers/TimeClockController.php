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
    public function employee()
    {
        $user = Auth::user();
        $today = Carbon::today();
        $weekStart = Carbon::now()->startOfWeek();

        // Get current status
        $status = TimeClock::getUserCurrentStatus($user->id);

        // Get today's entries
        $todayEntries = TimeClock::forUser($user->id)
            ->whereBetween('clock_in_at', [$today, $today->copy()->endOfDay()])
            ->with('breakType')
            ->orderBy('clock_in_at', 'desc')
            ->get();

        // Get week entries
        $weekEntries = TimeClock::forUser($user->id)
            ->forWeek($weekStart)
            ->with('breakType')
            ->orderBy('clock_in_at', 'desc')
            ->get();

        $currentTimesheet = Timesheet::getOrCreateForWeek($user->id, $weekStart);
        $weeklyStats = $this->calculateWeeklyStats($weekEntries);
        $breakTypes = BreakType::active()->ordered()->get();

        return Inertia::render('TimeManagement/Employee/Index', [
            'currentStatus' => $status,
            'todayEntries' => $todayEntries,
            'weekEntries' => $weekEntries,
            'weeklyStats' => $weeklyStats,
            'breakTypes' => $breakTypes,
            'currentTimesheet' => $currentTimesheet,
            'availableWeeks' => Timesheet::getAvailableWeeks($user->id),
            'currentDate' => $today->format('Y-m-d'),
            'weekStart' => $weekStart->format('Y-m-d'),
            'weekEnd' => $weekStart->copy()->endOfWeek()->format('Y-m-d'),
        ]);
    }

    public function clockIn(Request $request)
    {
        $user = Auth::user();
        $status = TimeClock::getUserCurrentStatus($user->id);

        if ($status['is_clocked_in']) {
            return back()->withErrors(['message' => 'Already clocked in.']);
        }

        $timeClock = TimeClock::create([
            'user_id' => $user->id,
            'punch_type' => 'work',
            'clock_in_at' => now(),
            'status' => 'active',
            'location_data' => $request->input('location_data'),
        ]);

        $timeClock->createAudit('clock_in', ['location_data' => $request->input('location_data')]);

        return back()->with('success', 'Clocked in!');
    }

    public function clockOut(Request $request)
    {
        $user = Auth::user();
        $workPunch = TimeClock::getUserActiveWorkPunch($user->id);

        if (!$workPunch) {
            return back()->withErrors(['message' => 'No active work punch found.']);
        }

        // If on break, end break first
        $breakPunch = TimeClock::getUserActiveBreakPunch($user->id);
        if ($breakPunch) {
            $this->endBreakPunch($breakPunch);
        }

        $workPunch->update([
            'clock_out_at' => now(),
            'status' => 'completed',
        ]);

        $workPunch->calculateOvertime();
        $workPunch->createAudit('clock_out', ['location_data' => $request->input('location_data')]);

        return back()->with('success', 'Clocked out!');
    }

    public function startBreak(Request $request)
    {
        $request->validate(['break_type_id' => 'required|exists:break_types,id']);

        $user = Auth::user();
        $status = TimeClock::getUserCurrentStatus($user->id);

        if (!$status['is_clocked_in']) {
            return back()->withErrors(['message' => 'Must be clocked in to start break.']);
        }

        if ($status['is_on_break']) {
            return back()->withErrors(['message' => 'Already on break.']);
        }

        // Clock out of work
        $workPunch = $status['current_work_punch'];
        $workPunch->update([
            'clock_out_at' => now(),
            'status' => 'completed',
        ]);
        $workPunch->calculateOvertime();

        // Clock into break
        $breakPunch = TimeClock::create([
            'user_id' => $user->id,
            'punch_type' => 'break',
            'break_type_id' => $request->break_type_id,
            'clock_in_at' => now(),
            'status' => 'active',
        ]);

        $workPunch->createAudit('break_start', ['break_type_id' => $request->break_type_id]);
        $breakPunch->createAudit('clock_in', ['punch_type' => 'break']);

        return back()->with('success', 'Break started!');
    }

    public function endBreak(Request $request)
    {
        $user = Auth::user();
        $breakPunch = TimeClock::getUserActiveBreakPunch($user->id);

        if (!$breakPunch) {
            return back()->withErrors(['message' => 'No active break found.']);
        }

        // End break punch
        $this->endBreakPunch($breakPunch);

        // Clock back into work
        $workPunch = TimeClock::create([
            'user_id' => $user->id,
            'punch_type' => 'work',
            'clock_in_at' => now(),
            'status' => 'active',
        ]);

        $breakPunch->createAudit('break_end');
        $workPunch->createAudit('clock_in', ['punch_type' => 'work', 'after_break' => true]);

        return back()->with('success', 'Break ended!');
    }

    public function status()
    {
        $user = Auth::user();
        $status = TimeClock::getUserCurrentStatus($user->id);

        return response()->json($status);
    }

    public function submitTimesheet(Request $request)
    {
        $request->validate([
            'timesheet_id' => 'required|exists:timesheets,id',
            'legal_acknowledgment' => 'required|boolean|accepted',
            'notes' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();
        $timesheet = Timesheet::findOrFail($request->timesheet_id);

        if ($timesheet->user_id !== $user->id) {
            return back()->withErrors(['message' => 'Unauthorized action.']);
        }

        if (!$timesheet->isDraft()) {
            return back()->withErrors(['message' => 'Timesheet cannot be submitted in its current state.']);
        }

        // Update notes if provided
        if ($request->notes) {
            $timesheet->update(['notes' => $request->notes]);
        }

        if ($timesheet->submit($user->id, $request->legal_acknowledgment)) {
            return back()->with('success', 'Timesheet submitted successfully!');
        }

        return back()->withErrors(['message' => 'Failed to submit timesheet.']);
    }

    public function withdrawTimesheet(Request $request)
    {
        $request->validate([
            'timesheet_id' => 'required|exists:timesheets,id',
            'withdrawal_reason' => 'required|string|min:10|max:500',
        ]);

        $user = Auth::user();
        $timesheet = Timesheet::findOrFail($request->timesheet_id);

        if ($timesheet->user_id !== $user->id) {
            return back()->withErrors(['message' => 'Unauthorized action.']);
        }

        if (!$timesheet->canBeWithdrawn()) {
            return back()->withErrors(['message' => 'Timesheet cannot be withdrawn in its current state.']);
        }

        if ($timesheet->withdraw($user->id, $request->withdrawal_reason)) {
            return back()->with('success', 'Timesheet withdrawn successfully!');
        }

        return back()->withErrors(['message' => 'Failed to withdraw timesheet.']);
    }

    public function getWeekTimesheet(Request $request)
    {
        $request->validate(['week_start' => 'required|date']);

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

    private function endBreakPunch(TimeClock $breakPunch): void
    {
        $breakPunch->update([
            'clock_out_at' => now(),
            'status' => 'completed',
        ]);
    }

    private function calculateWeeklyStats($weekEntries)
    {
        $workPunches = $weekEntries->where('punch_type', 'work');
        $breakPunches = $weekEntries->where('punch_type', 'break');

        $totalWorkHours = $workPunches->sum(fn($entry) => $entry->getTotalHours());
        $totalBreakHours = $breakPunches->sum(fn($entry) => $entry->getTotalHours());

        return [
            'total_hours' => round($totalWorkHours, 2),
            'regular_hours' => round($workPunches->sum('regular_hours'), 2),
            'overtime_hours' => round($workPunches->sum('overtime_hours'), 2),
            'break_hours' => round($totalBreakHours, 2),
            'entries_count' => $weekEntries->count(),
        ];
    }
}
