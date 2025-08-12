<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BillyConversation;
use App\Models\CsvUpload;
use App\Models\Part;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

// Adjust model names as needed

// Adjust model names as needed

// Adjust model names as needed

class AdminStatsController extends Controller
{
    /**
     * Get admin dashboard statistics
     */
    public function getStats()
    {
        // Cache stats for 5 minutes to improve performance
        $stats = Cache::remember('admin_dashboard_stats', 300, function () {
            return $this->calculateStats();
        });

        return response()->json($stats);
    }

    /**
     * Calculate all dashboard statistics
     */
    private function calculateStats(): array
    {
        $now = Carbon::now();
        $lastMonth = $now->copy()->subMonth();
        $twoMonthsAgo = $now->copy()->subMonths(2);

        return [
            'totalUsers' => $this->getTotalUsers(),
            'activeUsers' => $this->getActiveUsers(),
            'totalParts' => $this->getTotalParts(),
            'billyConversations' => $this->getBillyConversations(),
            'csvUploads' => $this->getCsvUploads(),
            'systemHealth' => $this->getSystemHealth(),
            'userGrowth' => $this->getUserGrowth($lastMonth, $twoMonthsAgo),
            'partsGrowth' => $this->getPartsGrowth($lastMonth, $twoMonthsAgo),
            'conversationGrowth' => $this->getConversationGrowth($lastMonth, $twoMonthsAgo),
            'uploadGrowth' => $this->getUploadGrowth($lastMonth, $twoMonthsAgo),
        ];
    }

    /**
     * Get total number of users
     */
    private function getTotalUsers(): int
    {
        return User::count();
    }

    /**
     * Get number of active users (logged in within last 30 days)
     */
    private function getActiveUsers(): int
    {
//        return User::where('last_login_at', '>=', Carbon::now()->subDays(30))
//            ->orWhere('updated_at', '>=', Carbon::now()->subDays(30))
//            ->count();
    }

    /**
     * Get total number of parts
     */
    private function getTotalParts(): int
    {
        // Adjust table/model name as needed
        try {
            return Part::count();
        } catch (\Exception $e) {
            // Fallback if Parts table doesn't exist or has different name
            return DB::table('parts')->count() ?? 0;
        }
    }

    /**
     * Get Billy conversations count for current month
     */
    private function getBillyConversations(): int
    {
        try {
            return BillyConversation::whereMonth('created_at', Carbon::now()->month)
                ->whereYear('created_at', Carbon::now()->year)
                ->count();
        } catch (\Exception $e) {
            // Fallback if table doesn't exist
            return 0;
        }
    }

    /**
     * Get CSV uploads count for current month
     */
    private function getCsvUploads(): int
    {
        try {
            return CsvUpload::whereMonth('created_at', Carbon::now()->month)
                ->whereYear('created_at', Carbon::now()->year)
                ->count();
        } catch (\Exception $e) {
            // Fallback if table doesn't exist
            return 0;
        }
    }

    /**
     * Calculate system health percentage
     */
    private function getSystemHealth(): int
    {
        $factors = [];

        // Database connectivity (25%)
        try {
            DB::connection()->getPdo();
            $factors['database'] = 25;
        } catch (\Exception $e) {
            $factors['database'] = 0;
        }

        // Cache connectivity (15%)
        try {
            Cache::put('health_check', 'ok', 60);
            $factors['cache'] = Cache::get('health_check') === 'ok' ? 15 : 0;
        } catch (\Exception $e) {
            $factors['cache'] = 0;
        }

        // Disk space (20%)
        $diskUsage = $this->getDiskUsage();
        $factors['disk'] = $diskUsage < 90 ? 20 : ($diskUsage < 95 ? 10 : 0);

        // Recent errors (20%)
        $recentErrors = $this->getRecentErrors();
        $factors['errors'] = $recentErrors < 10 ? 20 : ($recentErrors < 50 ? 10 : 0);

        // User activity (20%)
        $activeUsersRatio = $this->getActiveUsers() / max($this->getTotalUsers(), 1);
        $factors['activity'] = $activeUsersRatio > 0.5 ? 20 : ($activeUsersRatio > 0.2 ? 15 : 10);

        return array_sum($factors);
    }

    /**
     * Get disk usage percentage
     */
    private function getDiskUsage(): float
    {
        $bytes = disk_total_space('/');
        $free = disk_free_space('/');

        if ($bytes && $free) {
            return (($bytes - $free) / $bytes) * 100;
        }

        return 0;
    }

    /**
     * Get recent errors count (last 24 hours)
     */
    private function getRecentErrors(): int
    {
        // This would depend on your logging setup
        // You might check Laravel logs, database error logs, etc.
        try {
            $logFile = storage_path('logs/laravel.log');
            if (file_exists($logFile)) {
                $lines = file($logFile);
                $recentLines = array_slice($lines, -1000); // Last 1000 lines
                $errorCount = 0;
                $yesterday = Carbon::now()->subDay()->format('Y-m-d');

                foreach ($recentLines as $line) {
                    if (strpos($line, $yesterday) !== false &&
                        (strpos($line, 'ERROR') !== false || strpos($line, 'CRITICAL') !== false)) {
                        $errorCount++;
                    }
                }

                return $errorCount;
            }
        } catch (\Exception $e) {
            // Ignore errors in error checking
        }

        return 0;
    }

    /**
     * Calculate user growth percentage
     */
    private function getUserGrowth(Carbon $lastMonth, Carbon $twoMonthsAgo): float
    {
        $lastMonthUsers = User::whereBetween('created_at', [$twoMonthsAgo, $lastMonth])->count();
        $currentMonthUsers = User::where('created_at', '>=', $lastMonth)->count();

        if ($lastMonthUsers == 0) {
            return $currentMonthUsers > 0 ? 100 : 0;
        }

        return round((($currentMonthUsers - $lastMonthUsers) / $lastMonthUsers) * 100, 1);
    }

    /**
     * Calculate parts growth percentage
     */
    private function getPartsGrowth(Carbon $lastMonth, Carbon $twoMonthsAgo): float
    {
        try {
            $lastMonthParts = Part::whereBetween('created_at', [$twoMonthsAgo, $lastMonth])->count();
            $currentMonthParts = Part::where('created_at', '>=', $lastMonth)->count();

            if ($lastMonthParts == 0) {
                return $currentMonthParts > 0 ? 100 : 0;
            }

            return round((($currentMonthParts - $lastMonthParts) / $lastMonthParts) * 100, 1);
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Calculate conversation growth percentage
     */
    private function getConversationGrowth(Carbon $lastMonth, Carbon $twoMonthsAgo): float
    {
        try {
            $lastMonthConversations = BillyConversation::whereBetween('created_at',
                [$twoMonthsAgo, $lastMonth])->count();
            $currentMonthConversations = BillyConversation::where('created_at', '>=', $lastMonth)->count();

            if ($lastMonthConversations == 0) {
                return $currentMonthConversations > 0 ? 100 : 0;
            }

            return round((($currentMonthConversations - $lastMonthConversations) / $lastMonthConversations) * 100, 1);
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Calculate upload growth percentage
     */
    private function getUploadGrowth(Carbon $lastMonth, Carbon $twoMonthsAgo): float
    {
        try {
            $lastMonthUploads = CsvUpload::whereBetween('created_at', [$twoMonthsAgo, $lastMonth])->count();
            $currentMonthUploads = CsvUpload::where('created_at', '>=', $lastMonth)->count();

            if ($lastMonthUploads == 0) {
                return $currentMonthUploads > 0 ? 100 : 0;
            }

            return round((($currentMonthUploads - $lastMonthUploads) / $lastMonthUploads) * 100, 1);
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get detailed stats for specific time periods
     */
    public function getDetailedStats(Request $request)
    {
        $period = $request->get('period', '30'); // days
        $startDate = Carbon::now()->subDays((int) $period);

        $stats = [
            'users_over_time' => $this->getUsersOverTime($startDate),
            'parts_over_time' => $this->getPartsOverTime($startDate),
            'conversations_over_time' => $this->getConversationsOverTime($startDate),
            'uploads_over_time' => $this->getUploadsOverTime($startDate),
        ];

        return response()->json($stats);
    }

    /**
     * Get users created over time
     */
    private function getUsersOverTime(Carbon $startDate): array
    {
        return User::where('created_at', '>=', $startDate)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date')
            ->toArray();
    }

    /**
     * Get parts created over time
     */
    private function getPartsOverTime(Carbon $startDate): array
    {
        try {
            return Part::where('created_at', '>=', $startDate)
                ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
                ->groupBy('date')
                ->orderBy('date')
                ->pluck('count', 'date')
                ->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Get conversations over time
     */
    private function getConversationsOverTime(Carbon $startDate): array
    {
        try {
            return BillyConversation::where('created_at', '>=', $startDate)
                ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
                ->groupBy('date')
                ->orderBy('date')
                ->pluck('count', 'date')
                ->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Get uploads over time
     */
    private function getUploadsOverTime(Carbon $startDate): array
    {
        try {
            return CsvUpload::where('created_at', '>=', $startDate)
                ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
                ->groupBy('date')
                ->orderBy('date')
                ->pluck('count', 'date')
                ->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }
}
