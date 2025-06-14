<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = Activity::with(['subject', 'causer'])
            ->when($request->filled('search'), function (Builder $query) use ($request) {
                $search = $request->input('search');
                $query->where(function (Builder $q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                        ->orWhere('log_name', 'like', "%{$search}%")
                        ->orWhere('event', 'like', "%{$search}%")
                        ->orWhereHas('causer', function (Builder $causerQuery) use ($search) {
                            $causerQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->when($request->filled('log_name'), function (Builder $query) use ($request) {
                $query->where('log_name', $request->input('log_name'));
            })
            ->when($request->filled('date_from'), function (Builder $query) use ($request) {
                $query->whereDate('created_at', '>=', $request->input('date_from'));
            })
            ->when($request->filled('date_to'), function (Builder $query) use ($request) {
                $query->whereDate('created_at', '<=', $request->input('date_to'));
            })
            ->when($request->filled('event'), function (Builder $query) use ($request) {
                $query->where('event', $request->input('event'));
            })
            ->latest('created_at');

        $activities = $query->paginate(
            perPage: $request->input('per_page', 20),
            pageName: 'page'
        )->withQueryString();

        $logNames = Activity::distinct()
            ->whereNotNull('log_name')
            ->pluck('log_name')
            ->sort()
            ->values();

        $events = Activity::distinct()
            ->whereNotNull('event')
            ->pluck('event')
            ->sort()
            ->values();

        return Inertia::render('Admin/ActivityLog/Index', [
            'activities' => $activities,
            'logNames' => $logNames,
            'events' => $events,
            'filters' => $request->only(['search', 'log_name', 'date_from', 'date_to', 'event', 'per_page']),
        ]);
    }

    public function show(Activity $activity)
    {
        $activity->load(['subject', 'causer']);

        return Inertia::render('Admin/ActivityLog/Show', [
            'activity' => $activity->makeHidden(['batch_uuid']), // Hide sensitive data if needed
        ]);
    }

    public function export(Request $request)
    {
        $activities = Activity::with(['subject', 'causer'])
            ->when($request->filled('search'), function (Builder $query) use ($request) {
                $search = $request->input('search');
                $query->where(function (Builder $q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                        ->orWhere('log_name', 'like', "%{$search}%")
                        ->orWhere('event', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('log_name'), function (Builder $query) use ($request) {
                $query->where('log_name', $request->input('log_name'));
            })
            ->when($request->filled('date_from'), function (Builder $query) use ($request) {
                $query->whereDate('created_at', '>=', $request->input('date_from'));
            })
            ->when($request->filled('date_to'), function (Builder $query) use ($request) {
                $query->whereDate('created_at', '<=', $request->input('date_to'));
            })
            ->latest('created_at')
            ->get();

        return response()->json([
            'activities' => $activities->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'log_name' => $activity->log_name,
                    'description' => $activity->description,
                    'event' => $activity->event,
                    'causer_name' => $activity->causer?->name ?? 'System',
                    'causer_email' => $activity->causer?->email ?? 'N/A',
                    'subject_type' => $activity->subject_type ? class_basename($activity->subject_type) : 'N/A',
                    'subject_id' => $activity->subject_id ?? 'N/A',
                    'created_at' => $activity->created_at->format('Y-m-d H:i:s'),
                ];
            })
        ]);
    }

    public function stats()
    {
        $stats = [
            'total_activities' => Activity::count(),
            'today_activities' => Activity::whereDate('created_at', today())->count(),
            'this_week_activities' => Activity::whereBetween('created_at', [
                now()->startOfWeek(),
                now()->endOfWeek()
            ])->count(),
            'activities_by_event' => Activity::selectRaw('event, COUNT(*) as count')
                ->whereNotNull('event')
                ->groupBy('event')
                ->pluck('count', 'event'),
            'activities_by_log_name' => Activity::selectRaw('log_name, COUNT(*) as count')
                ->whereNotNull('log_name')
                ->groupBy('log_name')
                ->pluck('count', 'log_name'),
        ];

        return response()->json($stats);
    }
}
