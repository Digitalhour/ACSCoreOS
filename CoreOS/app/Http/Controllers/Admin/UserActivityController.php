<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class UserActivityController extends Controller
{
    /**
     * Display the user activity monitoring page
     */
    public function index(Request $request)
    {
        $activities = $this->getActivities($request);
        $stats = $this->getActivityStats($request);

        return Inertia::render('Admin/UserActivityPage', [
            'activities' => $activities,
            'stats' => $stats,
        ]);
    }

    /**
     * Get paginated activities with filters
     */
    private function getActivities(Request $request)
    {
        $query = Activity::with('user:id,name,email')
            ->orderBy('created_at', 'desc');

        // Apply filters if provided
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('action', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'LIKE', "%{$search}%")
                            ->orWhere('email', 'LIKE', "%{$search}%");
                    });
            });
        }

        if ($request->has('action') && $request->action) {
            $query->where('action', 'LIKE', "%{$request->action}%");
        }

        if ($request->has('timeRange') && $request->timeRange) {
            $startDate = $this->getStartDateFromRange($request->timeRange);
            if ($startDate) {
                $query->where('created_at', '>=', $startDate);
            }
        }

        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        // Limit to last 1000 activities for performance
        return $query->limit(1000)->get();
    }

    /**
     * Get activity statistics
     */
    private function getActivityStats(Request $request)
    {
        $timeRange = $request->get('timeRange', 'today');
        $startDate = $this->getStartDateFromRange($timeRange);

        $query = Activity::query();
        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }

        $totalActivities = $query->count();
        $uniqueUsers = $query->distinct('user_id')->count();

        // Most active user
        $mostActiveUser = $query->select('user_id', DB::raw('COUNT(*) as activity_count'))
            ->groupBy('user_id')
            ->orderBy('activity_count', 'desc')
            ->with('user:id,name')
            ->first();

        // Most popular action
        $popularAction = $query->select('action', DB::raw('COUNT(*) as action_count'))
            ->groupBy('action')
            ->orderBy('action_count', 'desc')
            ->first();

        return [
            'total_activities' => $totalActivities,
            'unique_users' => $uniqueUsers,
            'most_active_user' => $mostActiveUser ? $mostActiveUser->user->name : null,
            'popular_action' => $popularAction ? str_replace('_', ' ', ucwords($popularAction->action, '_')) : null,
        ];
    }

    /**
     * Get start date based on time range
     */
    private function getStartDateFromRange(string $range): ?Carbon
    {
        return match ($range) {
            'today' => Carbon::today(),
            'week' => Carbon::now()->subWeek(),
            'month' => Carbon::now()->subMonth(),
            'year' => Carbon::now()->subYear(),
            default => null,
        };
    }

    /**
     * Get real-time activity data (for AJAX polling)
     */
    public function realTimeData(Request $request)
    {
        $latestId = $request->get('latest_id', 0);

        $newActivities = Activity::with('user:id,name,email')
            ->where('id', '>', $latestId)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'activities' => $newActivities,
            'latest_id' => $newActivities->isNotEmpty() ? $newActivities->first()->id : $latestId,
        ]);
    }

    /**
     * Get user-specific activity
     */
    public function userActivity(Request $request, User $user)
    {
        $activities = Activity::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        $stats = [
            'total_activities' => $user->activities()->count(),
            'last_activity' => $user->activities()->latest()->first()?->created_at,
            'most_used_action' => $user->activities()
                ->select('action', DB::raw('COUNT(*) as count'))
                ->groupBy('action')
                ->orderBy('count', 'desc')
                ->first()?->action,
        ];

        return response()->json([
            'user' => $user,
            'activities' => $activities,
            'stats' => $stats,
        ]);
    }

    /**
     * Get activity summary by day/hour
     */
    public function activityChart(Request $request)
    {
        $days = $request->get('days', 7);
        $startDate = Carbon::now()->subDays($days);

        $activities = Activity::where('created_at', '>=', $startDate)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json($activities);
    }

    /**
     * Get top actions
     */
    public function topActions(Request $request)
    {
        $limit = $request->get('limit', 10);
        $timeRange = $request->get('timeRange', 'week');
        $startDate = $this->getStartDateFromRange($timeRange);

        $query = Activity::select('action', DB::raw('COUNT(*) as count'))
            ->groupBy('action')
            ->orderBy('count', 'desc')
            ->limit($limit);

        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }

        return response()->json($query->get());
    }

    /**
     * Delete old activities (cleanup)
     */
    public function cleanup(Request $request)
    {
        $days = $request->get('days', 90); // Default keep 90 days
        $cutoffDate = Carbon::now()->subDays($days);

        $deletedCount = Activity::where('created_at', '<', $cutoffDate)->delete();

        return response()->json([
            'message' => "Deleted {$deletedCount} old activities",
            'deleted_count' => $deletedCount,
        ]);
    }
}
