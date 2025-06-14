<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;

class QueueStatusController extends Controller
{
    /**
     * Get the current status of the queues.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getStatus(): JsonResponse
    {
        $defaultQueueConnection = Config::get('queue.default');
        $queueConnectionConfig = Config::get("queue.connections.{$defaultQueueConnection}");
        $driver = $queueConnectionConfig['driver'] ?? 'sync';

        $pendingJobs = 0;
        $inProgressJobs = 0;
        $failedJobsCount = 0;
        $recentFailedJobs = [];
        $queueDetails = [];
        $currentJobs = []; // New: Track currently processing jobs

        try {
            if ($driver === 'redis') {
                $this->getRedisQueueStatus($queueConnectionConfig, $pendingJobs, $inProgressJobs, $queueDetails,
                    $currentJobs);
            } elseif ($driver === 'database') {
                $this->getDatabaseQueueStatus($queueConnectionConfig, $pendingJobs, $inProgressJobs, $currentJobs);
            } else {
                // For other drivers
                try {
                    $pendingJobs = Queue::connection($defaultQueueConnection)->size($queueConnectionConfig['queue'] ?? 'default');
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning("QueueStatusController: Could not get size for queue '{$defaultQueueConnection}' with driver '{$driver}': ".$e->getMessage());
                    $pendingJobs = -2;
                }
                $inProgressJobs = -1;
            }

            // Get failed jobs (works for both Redis and Database)
            $this->getFailedJobsStatus($failedJobsCount, $recentFailedJobs);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("QueueStatusController: Exception while fetching queue status: ".$e->getMessage(),
                ['exception' => $e]);
            return response()->json([
                'error' => 'Could not retrieve queue status.',
                'message' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'pending_jobs' => $pendingJobs,
            'in_progress_jobs' => $inProgressJobs,
            'failed_jobs_count' => $failedJobsCount,
            'recent_failed_jobs' => $recentFailedJobs,
            'queue_details' => $queueDetails,
            'current_jobs' => $currentJobs, // New: Include current jobs
            'default_queue_connection' => $defaultQueueConnection,
            'queue_driver' => $driver,
            'monitoring_time' => Carbon::now()->toDateTimeString(),
        ]);
    }

    private function getRedisQueueStatus(
        array $config,
        int &$pendingJobs,
        int &$inProgressJobs,
        array &$queueDetails,
        array &$currentJobs
    ): void {
        $redisConnection = $config['connection'] ?? 'default';

        $queuesToMonitor = [
            'default',
            'csv-processing',
            'high',
            'low'
        ];

        $totalPending = 0;
        $totalInProgress = 0;

        foreach ($queuesToMonitor as $queueName) {
            try {
                $redis = Redis::connection($redisConnection);

                // Redis queue key format
                $queueKey = "queues:{$queueName}";
                $delayedKey = "queues:{$queueName}:delayed";
                $reservedKey = "queues:{$queueName}:reserved";

                // Get counts safely
                $pending = 0;
                $processing = 0;
                $delayed = 0;

                try {
                    $pending = $redis->llen($queueKey) ?: 0;
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::debug("Could not get pending count for {$queueName}: ".$e->getMessage());
                }

                try {
                    $processing = $redis->zcard($reservedKey) ?: 0;
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::debug("Could not get processing count for {$queueName}: ".$e->getMessage());
                }

                try {
                    $delayed = $redis->zcard($delayedKey) ?: 0;
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::debug("Could not get delayed count for {$queueName}: ".$e->getMessage());
                }

                // Get current job details safely
                $queueCurrentJobs = [];
                if ($processing > 0) {
                    try {
                        // Get reserved jobs - use a safer approach
                        $reservedJobs = $redis->zrange($reservedKey, 0, -1, ['WITHSCORES' => true]);

                        if (is_array($reservedJobs) && !empty($reservedJobs)) {
                            foreach ($reservedJobs as $jobData => $timestamp) {
                                try {
                                    $payload = json_decode($jobData, true);
                                    if (is_array($payload)) {
                                        $displayName = $payload['displayName'] ?? 'Unknown Job';

                                        if (isset($payload['data']['commandName'])) {
                                            $displayName = class_basename($payload['data']['commandName']);
                                        }

                                        $queueCurrentJobs[] = [
                                            'queue' => $queueName,
                                            'name' => $displayName,
                                            'id' => $payload['id'] ?? 'unknown',
                                            'uuid' => $payload['uuid'] ?? null,
                                            'reserved_at' => Carbon::createFromTimestamp($timestamp)->toDateTimeString(),
                                            'reserved_ago' => Carbon::createFromTimestamp($timestamp)->diffForHumans(),
                                            'attempts' => $payload['attempts'] ?? 0,
                                            'timeout' => $payload['timeout'] ?? null,
                                        ];
                                    }
                                } catch (\Exception $e) {
                                    \Illuminate\Support\Facades\Log::debug("Could not parse job payload for {$queueName}: ".$e->getMessage());
                                    continue;
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::debug("Could not get reserved jobs for {$queueName}: ".$e->getMessage());
                    }
                }

                $totalPending += $pending;
                $totalInProgress += $processing;

                $queueDetails[] = [
                    'name' => $queueName,
                    'pending' => $pending,
                    'processing' => $processing,
                    'delayed' => $delayed,
                    'total' => $pending + $processing + $delayed,
                    'current_jobs' => $queueCurrentJobs
                ];

                $currentJobs = array_merge($currentJobs, $queueCurrentJobs);

            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning("Could not get Redis queue status for '{$queueName}': ".$e->getMessage());
                $queueDetails[] = [
                    'name' => $queueName,
                    'pending' => -1,
                    'processing' => -1,
                    'delayed' => -1,
                    'total' => -1,
                    'current_jobs' => [],
                    'error' => $e->getMessage()
                ];
            }
        }

        $pendingJobs = $totalPending;
        $inProgressJobs = $totalInProgress;
    }

    private function getDatabaseQueueStatus(
        array $config,
        int &$pendingJobs,
        int &$inProgressJobs,
        array &$currentJobs // New parameter
    ): void
    {
        $jobsTable = $config['table'] ?? 'jobs';
        $queueName = $config['queue'] ?? 'default';

        $pendingJobs = DB::table($jobsTable)
            ->where('queue', $queueName)
            ->whereNull('reserved_at')
            ->count();

        $inProgressJobs = DB::table($jobsTable)
            ->where('queue', $queueName)
            ->whereNotNull('reserved_at')
            ->count();

        // NEW: Get currently processing jobs for database driver
        try {
            $processingJobs = DB::table($jobsTable)
                ->where('queue', $queueName)
                ->whereNotNull('reserved_at')
                ->get();

            foreach ($processingJobs as $job) {
                try {
                    $payload = json_decode($job->payload, true);
                    $displayName = $payload['displayName'] ?? 'Unknown Job';

                    // Extract job class name for better identification
                    if (isset($payload['data']['commandName'])) {
                        $displayName = class_basename($payload['data']['commandName']);
                    }

                    $currentJobs[] = [
                        'queue' => $job->queue,
                        'name' => $displayName,
                        'id' => $job->id,
                        'uuid' => $payload['uuid'] ?? null,
                        'reserved_at' => $job->reserved_at ? Carbon::createFromTimestamp($job->reserved_at)->toDateTimeString() : null,
                        'reserved_ago' => $job->reserved_at ? Carbon::createFromTimestamp($job->reserved_at)->diffForHumans() : null,
                        'attempts' => $job->attempts ?? 0,
                        'timeout' => $payload['timeout'] ?? null,
                        'available_at' => $job->available_at ? Carbon::createFromTimestamp($job->available_at)->toDateTimeString() : null,
                    ];
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning("Could not parse job payload for job ID {$job->id}: ".$e->getMessage());
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Could not get current jobs for database queue: ".$e->getMessage());
        }
    }

    private function getFailedJobsStatus(int &$failedJobsCount, array &$recentFailedJobs): void
    {
        if (!Config::get('queue.failed.driver')) {
            $failedJobsCount = -1;
            return;
        }

        $failedJobsTable = Config::get('queue.failed.table', 'failed_jobs');

        try {
            $failedJobsCount = DB::table($failedJobsTable)->count();

            $recentFailedJobs = DB::table($failedJobsTable)
                ->orderBy('failed_at', 'desc')
                ->take(10) // Increased to 10 for better visibility
                ->get()
                ->map(function ($job) {
                    $payload = json_decode($job->payload, true);
                    $displayName = $payload['displayName'] ?? 'Unknown Job';

                    // Extract job class name for better identification
                    if (isset($payload['data']['commandName'])) {
                        $displayName = class_basename($payload['data']['commandName']);
                    }

                    $exceptionSnippet = 'N/A';
                    if (isset($job->exception)) {
                        $exceptionLines = explode("\n", $job->exception);
                        $exceptionSnippet = $exceptionLines[0] ?? 'Could not read exception.';
                    }

                    return [
                        'id' => $job->id,
                        'uuid' => $job->uuid ?? null,
                        'connection' => $job->connection,
                        'queue' => $job->queue,
                        'name' => $displayName,
                        'failed_at' => Carbon::parse($job->failed_at)->diffForHumans(),
                        'failed_at_exact' => Carbon::parse($job->failed_at)->toDateTimeString(),
                        'exception_preview' => substr($exceptionSnippet, 0,
                                200).(strlen($exceptionSnippet) > 200 ? '...' : ''),
                    ];
                })
                ->toArray();

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Could not get failed jobs status: ".$e->getMessage());
            $failedJobsCount = -2;
            $recentFailedJobs = [];
        }
    }

    /**
     * Get detailed Redis queue information
     */
    public function getRedisDetails(): JsonResponse
    {
        $defaultQueueConnection = Config::get('queue.default');
        $queueConnectionConfig = Config::get("queue.connections.{$defaultQueueConnection}");

        if ($queueConnectionConfig['driver'] !== 'redis') {
            return response()->json(['error' => 'Not using Redis queue driver'], 400);
        }

        try {
            $redisConnection = $queueConnectionConfig['connection'] ?? 'default';

            // Get Redis info
            $info = Redis::connection($redisConnection)->info();
            $memory = Redis::connection($redisConnection)->info('memory');

            // Get all Redis keys related to queues
            $queueKeys = Redis::connection($redisConnection)->keys('queues:*');

            $keyDetails = [];
            foreach ($queueKeys as $key) {
                $type = Redis::connection($redisConnection)->type($key);
                $size = 0;

                switch ($type) {
                    case 'list':
                        $size = Redis::connection($redisConnection)->llen($key);
                        break;
                    case 'zset':
                        $size = Redis::connection($redisConnection)->zcard($key);
                        break;
                    case 'set':
                        $size = Redis::connection($redisConnection)->scard($key);
                        break;
                    case 'hash':
                        $size = Redis::connection($redisConnection)->hlen($key);
                        break;
                }

                $keyDetails[] = [
                    'key' => $key,
                    'type' => $type,
                    'size' => $size
                ];
            }

            return response()->json([
                'redis_info' => [
                    'version' => $info['redis_version'] ?? 'Unknown',
                    'connected_clients' => $info['connected_clients'] ?? 'Unknown',
                    'used_memory_human' => $memory['used_memory_human'] ?? 'Unknown',
                    'uptime_in_seconds' => $info['uptime_in_seconds'] ?? 'Unknown',
                ],
                'queue_keys' => $keyDetails,
                'connection' => $redisConnection
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Could not get Redis details',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
