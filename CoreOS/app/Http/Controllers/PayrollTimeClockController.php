<?php

namespace App\Http\Controllers;

use App\Models\Timesheet;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;

class PayrollTimeClockController extends Controller
{
    /**
     * Payroll dashboard
     */
    public function dashboard(Request $request)
    {
        // Get approved timesheets ready for processing
        $query = Timesheet::where('status', 'approved')
            ->with(['user.currentPosition', 'approvedBy']);

        // Apply filters
        if ($request->filled('week_start')) {
            $query->where('week_start_date', '>=', $request->week_start);
        }
        if ($request->filled('week_end')) {
            $query->where('week_end_date', '<=', $request->week_end);
        }
        if ($request->filled('employee_id')) {
            $query->where('user_id', $request->employee_id);
        }

        $approvedTimesheets = $query->orderBy('week_start_date', 'desc')
            ->paginate(20)
            ->withQueryString();

        // Get recent processed timesheets
        $processedTimesheets = Timesheet::where('status', 'processed')
            ->with(['user', 'processedBy'])
            ->orderBy('processed_at', 'desc')
            ->limit(10)
            ->get();

        // Get all employees for filter
        $employees = User::select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        // Calculate stats
        $stats = [
            'approved_count' => Timesheet::where('status', 'approved')->count(),
            'processed_this_week' => Timesheet::where('status', 'processed')
                ->where('processed_at', '>=', Carbon::now()->startOfWeek())
                ->count(),
            'total_approved_hours' => Timesheet::where('status', 'approved')->sum('total_hours'),
            'total_approved_overtime' => Timesheet::where('status', 'approved')->sum('overtime_hours'),
        ];

        return Inertia::render('TimeManagement/Payroll/Dashboard', [
            'approvedTimesheets' => $approvedTimesheets,
            'processedTimesheets' => $processedTimesheets,
            'employees' => $employees,
            'stats' => $stats,
            'filters' => $request->only(['week_start', 'week_end', 'employee_id']),
        ]);
    }

    /**
     * Process single timesheet
     */
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

    /**
     * Bulk process timesheets
     */
    public function bulkProcess(Request $request)
    {
        $request->validate([
            'timesheet_ids' => 'required|array',
            'timesheet_ids.*' => 'exists:timesheets,id',
            'payroll_notes' => 'nullable|string|max:500',
        ]);

        $processed = 0;
        $timesheets = Timesheet::whereIn('id', $request->timesheet_ids)
            ->where('status', 'approved')
            ->get();

        foreach ($timesheets as $timesheet) {
            if ($timesheet->process(Auth::id(), $request->payroll_notes)) {
                $processed++;
            }
        }

        return back()->with('success', "Successfully processed {$processed} timesheets!");
    }

    /**
     * Export approved timesheets
     */
    public function export(Request $request)
    {
        $format = $request->get('format', 'csv'); // csv or pdf

        $query = Timesheet::where('status', 'approved')
            ->with(['user.currentPosition']);

        if ($request->filled('week_start')) {
            $query->where('week_start_date', '>=', $request->week_start);
        }
        if ($request->filled('week_end')) {
            $query->where('week_end_date', '<=', $request->week_end);
        }

        $timesheets = $query->orderBy('week_start_date', 'desc')->get();

        if ($format === 'csv') {
            return $this->exportCsv($timesheets);
        } else {
            return $this->exportPdf($timesheets);
        }
    }

    /**
     * Export to CSV
     */
    private function exportCsv($timesheets)
    {
        $filename = 'approved_timesheets_' . now()->format('Y-m-d_H-i-s') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($timesheets) {
            $file = fopen('php://output', 'w');

            // Headers
            fputcsv($file, [
                'Employee ID',
                'Employee Name',
                'Email',
                'Position',
                'Week Start',
                'Week End',
                'Regular Hours',
                'Overtime Hours',
                'Total Hours',
                'Status',
                'Approved Date',
                'Manager Notes'
            ]);

            // Data
            foreach ($timesheets as $timesheet) {
                fputcsv($file, [
                    $timesheet->user->id,
                    $timesheet->user->name,
                    $timesheet->user->email,
                    $timesheet->user->currentPosition->title ?? 'N/A',
                    $timesheet->week_start_date->format('Y-m-d'),
                    $timesheet->week_end_date->format('Y-m-d'),
                    $timesheet->regular_hours,
                    $timesheet->overtime_hours,
                    $timesheet->total_hours,
                    ucfirst($timesheet->status),
                    $timesheet->approved_at ? $timesheet->approved_at->format('Y-m-d H:i:s') : '',
                    $timesheet->manager_notes ?? ''
                ]);
            }

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    /**
     * Export to PDF (basic implementation)
     */
    private function exportPdf($timesheets)
    {
        // Simple HTML to PDF conversion
        $html = '<h1>Approved Timesheets Report</h1>';
        $html .= '<p>Generated: ' . now()->format('Y-m-d H:i:s') . '</p>';
        $html .= '<table border="1" cellpadding="5" cellspacing="0">';
        $html .= '<tr><th>Employee</th><th>Week</th><th>Regular Hours</th><th>Overtime</th><th>Total</th></tr>';

        foreach ($timesheets as $timesheet) {
            $html .= '<tr>';
            $html .= '<td>' . $timesheet->user->name . '</td>';
            $html .= '<td>' . $timesheet->week_start_date->format('M j') . ' - ' . $timesheet->week_end_date->format('M j, Y') . '</td>';
            $html .= '<td>' . $timesheet->regular_hours . '</td>';
            $html .= '<td>' . $timesheet->overtime_hours . '</td>';
            $html .= '<td>' . $timesheet->total_hours . '</td>';
            $html .= '</tr>';
        }
        $html .= '</table>';

        $filename = 'approved_timesheets_' . now()->format('Y-m-d_H-i-s') . '.html';

        return Response::make($html, 200, [
            'Content-Type' => 'text/html',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Reports page
     */
    public function reports(Request $request)
    {
        $weekStart = $request->get('week_start', Carbon::now()->startOfWeek()->format('Y-m-d'));
        $weekEnd = $request->get('week_end', Carbon::now()->endOfWeek()->format('Y-m-d'));

        // Weekly summary
        $weeklySummary = Timesheet::whereBetween('week_start_date', [$weekStart, $weekEnd])
            ->where('status', 'processed')
            ->selectRaw('
                COUNT(*) as total_timesheets,
                SUM(regular_hours) as total_regular_hours,
                SUM(overtime_hours) as total_overtime_hours,
                SUM(total_hours) as total_hours
            ')
            ->first();

        // Employee totals
        $employeeTotals = Timesheet::whereBetween('week_start_date', [$weekStart, $weekEnd])
            ->where('status', 'processed')
            ->with('user')
            ->selectRaw('
                user_id,
                SUM(regular_hours) as total_regular,
                SUM(overtime_hours) as total_overtime,
                SUM(total_hours) as total_hours,
                COUNT(*) as timesheet_count
            ')
            ->groupBy('user_id')
            ->orderByDesc('total_hours')
            ->get();

        // Status breakdown
        $statusBreakdown = Timesheet::whereBetween('week_start_date', [$weekStart, $weekEnd])
            ->selectRaw('status, COUNT(*) as count, SUM(total_hours) as hours')
            ->groupBy('status')
            ->get();

        return Inertia::render('TimeManagement/Payroll/Reports', [
            'weeklySummary' => $weeklySummary,
            'employeeTotals' => $employeeTotals,
            'statusBreakdown' => $statusBreakdown,
            'filters' => compact('weekStart', 'weekEnd'),
        ]);
    }
}
