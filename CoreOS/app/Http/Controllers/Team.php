<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\TimeClock;
use App\Models\Timesheet;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;


class Team
{
    public function index(Request $request)
    {
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

            $query = Timesheet::with(['user.currentPosition', 'user.departments', 'approvedBy', 'processedBy']);
            $this->applyFilters($query, $request);

            $timesheets = $query->orderBy('week_start_date', 'desc')
                ->orderBy('user_id')
                ->paginate(20);
//            ->withQueryString();

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

                $totalWorkHours = $workPunches->sum(function ($tc) {
                    return $tc->getTotalHours();
                });

                $totalBreakHours = $breakPunches->sum(function ($tc) {
                    return $tc->getTotalHours();
                });

                $timesheet->total_hours = $totalWorkHours;
                $timesheet->regular_hours = $workPunches->sum('regular_hours');
                $timesheet->overtime_hours = $workPunches->sum('overtime_hours');
                $timesheet->break_hours = $totalBreakHours;

                return $timesheet;
            });

            $departments = Department::active()->orderBy('name')->get();

            return Inertia::render('Team/team', [
                'timesheets' => $timesheets,
                'departments' => $departments,
                'filters' => $request->only(['week_start', 'week_end', 'department_id', 'status']),
            ]);
        }
    }

    private function applyFilters(\Illuminate\Database\Eloquent\Builder $query, Request $request)
    {
        
    }


}
