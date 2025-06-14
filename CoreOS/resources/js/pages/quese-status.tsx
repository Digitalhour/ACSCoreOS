import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertCircle, AlertTriangle, Clock, Database, HelpCircle, Inbox, Loader2, Play, RefreshCw, ServerCrash, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

// Define types for the API response
interface FailedJob {
    id: string | number;
    uuid?: string;
    connection: string;
    queue: string;
    name: string;
    failed_at: string;
    failed_at_exact: string;
    exception_preview: string;
}

interface CurrentJob {
    queue: string;
    name: string;
    id: string | number;
    uuid?: string;
    reserved_at: string;
    reserved_ago: string;
    attempts: number;
    timeout?: number;
    available_at?: string;
}

interface QueueDetail {
    name: string;
    pending: number;
    processing: number;
    delayed: number;
    total: number;
    current_jobs: CurrentJob[];
    error?: string;
}

interface QueueStatusData {
    pending_jobs: number;
    in_progress_jobs: number;
    failed_jobs_count: number;
    recent_failed_jobs: FailedJob[];
    queue_details: QueueDetail[];
    current_jobs: CurrentJob[];
    default_queue_connection: string;
    queue_driver: string;
    monitoring_time: string;
}

interface RedisDetails {
    redis_info: {
        version: string;
        connected_clients: string;
        used_memory_human: string;
        uptime_in_seconds: string;
    };
    queue_keys: Array<{
        key: string;
        type: string;
        size: number;
    }>;
    connection: string;
}

interface ApiError {
    error: string;
    message?: string;
}

const QueueDashboardPage = () => {
    const [status, setStatus] = useState<QueueStatusData | null>(null);
    const [redisDetails, setRedisDetails] = useState<RedisDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/queue-status');

            if (!response.ok) {
                let errorMsg = `Error: ${response.status} ${response.statusText}`;
                try {
                    const errorData: ApiError = await response.json();
                    errorMsg = errorData.message || errorData.error || errorMsg;
                } catch (e) {
                    /* Could not parse error JSON */
                }
                throw new Error(errorMsg);
            }
            const data: QueueStatusData = await response.json();
            setStatus(data);
            setLastUpdated(new Date());

            // Fetch Redis details if using Redis driver
            if (data.queue_driver === 'redis') {
                try {
                    const redisResponse = await fetch('/api/queue-status/redis-details');
                    if (redisResponse.ok) {
                        const redisData: RedisDetails = await redisResponse.json();
                        setRedisDetails(redisData);
                    }
                } catch (e) {
                    console.warn('Could not fetch Redis details:', e);
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch queue status:', err);
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 5000); // Poll every 5 seconds for Redis
        return () => clearInterval(intervalId);
    }, []);

    const renderStatusValue = (value: number, type: 'pending' | 'in-progress' | 'failed' | 'delayed' | 'default' = 'default') => {
        if (value === -1) {
            return (
                <Badge variant="outline" className="flex items-center">
                    <HelpCircle className="mr-1 h-3 w-3" /> N/A
                </Badge>
            );
        }
        if (value === -2) {
            return (
                <Badge variant="destructive" className="flex items-center">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Error
                </Badge>
            );
        }

        if (value > 0) {
            switch (type) {
                case 'pending':
                    return <Badge variant="destructive">{value}</Badge>;
                case 'failed':
                    return <Badge variant="destructive">{value}</Badge>;
                case 'in-progress':
                    return (
                        <Badge variant="default" className="bg-blue-500 text-white hover:bg-blue-600">
                            {value}
                        </Badge>
                    );
                case 'delayed':
                    return (
                        <Badge variant="default" className="bg-orange-500 text-white hover:bg-orange-600">
                            {value}
                        </Badge>
                    );
            }
        }
        return <Badge variant="secondary">{value}</Badge>;
    };

    const formatUptime = (seconds: string) => {
        const sec = parseInt(seconds);
        const days = Math.floor(sec / 86400);
        const hours = Math.floor((sec % 86400) / 3600);
        const minutes = Math.floor((sec % 3600) / 60);
        return `${days}d ${hours}h ${minutes}m`;
    };

    return (
        <div className="container mx-auto space-y-6 p-4 md:p-8">
            <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Queue Status Dashboard</h1>
                    <p className="text-muted-foreground">
                        Live monitoring of your Laravel job queues. Connection:
                        <Badge variant="secondary" className="mr-1 ml-1">
                            {status?.default_queue_connection || '...'}
                        </Badge>
                        Driver:
                        {/*<Badge variant="outline" className="ml-1">*/}
                        {/*    {status?.queue_driver || '...'}*/}
                        {/*</Badge>*/}
                        {status?.queue_driver === 'redis' && (
                            <Badge variant="destructive" className="ml-1">
                                <Database className="mr-1 h-3 w-3" />
                                Redis
                            </Badge>
                        )}
                    </p>
                </div>
                <div className="mt-2 sm:mt-0">
                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="ring-offset-background focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Fetching Data</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="current">Current Jobs</TabsTrigger>
                    <TabsTrigger value="queues">Queue Details</TabsTrigger>
                    {status?.queue_driver === 'redis' && <TabsTrigger value="redis">Redis Info</TabsTrigger>}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
                                <Inbox className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading && !status ? (
                                    <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                                ) : (
                                    <div className="text-2xl font-bold">{status ? renderStatusValue(status.pending_jobs, 'pending') : 'N/A'}</div>
                                )}
                                <p className="text-muted-foreground text-xs">Jobs waiting in the queue.</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Jobs In Progress</CardTitle>
                                <Activity className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading && !status ? (
                                    <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        {status ? renderStatusValue(status.in_progress_jobs, 'in-progress') : 'N/A'}
                                    </div>
                                )}
                                <p className="text-muted-foreground text-xs">Jobs currently being processed.</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
                                <ServerCrash className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading && !status ? (
                                    <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                                ) : (
                                    <div className="text-2xl font-bold">{status ? renderStatusValue(status.failed_jobs_count, 'failed') : 'N/A'}</div>
                                )}
                                <p className="text-muted-foreground text-xs">Total jobs that have failed.</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Last Update</CardTitle>
                                <RefreshCw className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                {isLoading && !lastUpdated ? (
                                    <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                                ) : (
                                    <div className="text-2xl font-bold">{lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}</div>
                                )}
                                <p className="text-muted-foreground text-xs">
                                    {status?.monitoring_time
                                        ? `Server: ${new Date(status.monitoring_time).toLocaleTimeString()}`
                                        : 'Polled from server.'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Failed Jobs</CardTitle>
                            <CardDescription>
                                Showing the last {status?.recent_failed_jobs?.length || 0} failed jobs.
                                {status?.recent_failed_jobs?.length === 0 && !isLoading && ' No recent failed jobs found.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading && (!status || !status.recent_failed_jobs) ? (
                                <div className="flex h-32 items-center justify-center">
                                    <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                                    <p className="text-muted-foreground ml-2">Loading failed jobs...</p>
                                </div>
                            ) : status && status.recent_failed_jobs.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">ID</TableHead>
                                            <TableHead>Job Name</TableHead>
                                            <TableHead>Queue</TableHead>
                                            <TableHead>Failed At</TableHead>
                                            <TableHead>Exception Preview</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {status.recent_failed_jobs.map((job) => (
                                            <TableRow key={job.id}>
                                                <TableCell className="font-medium">{job.id}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{job.name}</div>
                                                    {job.uuid && <div className="text-muted-foreground text-xs">{job.uuid}</div>}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{job.queue}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div>{job.failed_at}</div>
                                                    <div className="text-muted-foreground text-xs">{job.failed_at_exact}</div>
                                                </TableCell>
                                                <TableCell className="max-w-xs">
                                                    <div className="truncate text-xs" title={job.exception_preview}>
                                                        {job.exception_preview}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <Inbox className="text-muted-foreground mb-3 h-12 w-12" />
                                    <p className="text-muted-foreground">No recent failed jobs to display.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="current" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Play className="mr-2 h-5 w-5 text-green-500" />
                                Currently Processing Jobs
                            </CardTitle>
                            <CardDescription>
                                Showing {status?.current_jobs?.length || 0} jobs currently being processed across all queues.
                                {status?.current_jobs?.length === 0 && !isLoading && ' No jobs are currently being processed.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading && (!status || !status.current_jobs) ? (
                                <div className="flex h-32 items-center justify-center">
                                    <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                                    <p className="text-muted-foreground ml-2">Loading current jobs...</p>
                                </div>
                            ) : status && status.current_jobs.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Job ID</TableHead>
                                            <TableHead>Job Name</TableHead>
                                            <TableHead>Queue</TableHead>
                                            <TableHead>Started At</TableHead>
                                            <TableHead>Duration</TableHead>
                                            <TableHead>Attempts</TableHead>
                                            <TableHead>Timeout</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {status.current_jobs.map((job, index) => (
                                            <TableRow key={`${job.queue}-${job.id}-${index}`}>
                                                <TableCell className="font-medium">{job.id}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{job.name}</div>
                                                    {job.uuid && <div className="text-muted-foreground text-xs">{job.uuid}</div>}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{job.queue}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{job.reserved_ago}</div>
                                                    <div className="text-muted-foreground text-xs">{job.reserved_at}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="default" className="bg-blue-500 text-white">
                                                        <Clock className="mr-1 h-3 w-3" />
                                                        {job.reserved_ago}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={job.attempts > 1 ? 'destructive' : 'secondary'}>{job.attempts}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {job.timeout ? (
                                                        <Badge variant="outline">{job.timeout}s</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">None</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <Activity className="text-muted-foreground mb-3 h-12 w-12" />
                                    <p className="text-muted-foreground">No jobs are currently being processed.</p>
                                    <p className="text-muted-foreground text-sm">Jobs will appear here when workers pick them up from the queue.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="queues" className="space-y-4">
                    <div className="grid gap-4">
                        {status?.queue_details?.map((queue) => (
                            <Card key={queue.name}>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span>Queue: {queue.name}</span>
                                        <Badge variant="outline">{queue.total} total</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600">{renderStatusValue(queue.pending, 'pending')}</div>
                                            <p className="text-muted-foreground text-xs">Pending</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {renderStatusValue(queue.processing, 'in-progress')}
                                            </div>
                                            <p className="text-muted-foreground text-xs">Processing</p>
                                        </div>
                                        {status.queue_driver === 'redis' && (
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-orange-600">
                                                    {renderStatusValue(queue.delayed, 'delayed')}
                                                </div>
                                                <p className="text-muted-foreground text-xs">Delayed</p>
                                            </div>
                                        )}
                                        {queue.error && (
                                            <div className="col-span-full">
                                                <Alert variant="destructive">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription>{queue.error}</AlertDescription>
                                                </Alert>
                                            </div>
                                        )}
                                    </div>

                                    {/* Show current jobs for this specific queue */}
                                    {queue.current_jobs && queue.current_jobs.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="mb-2 flex items-center text-sm font-medium">
                                                <Play className="mr-1 h-4 w-4 text-green-500" />
                                                Currently Processing in {queue.name}
                                            </h4>
                                            <div className="space-y-2">
                                                {queue.current_jobs.map((job, index) => (
                                                    <div
                                                        key={`${queue.name}-${job.id}-${index}`}
                                                        className="flex items-center justify-between rounded border p-2 text-sm"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium">{job.name}</div>
                                                            <div className="text-muted-foreground text-xs">ID: {job.id}</div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Badge variant="default" className="bg-blue-500 text-xs text-white">
                                                                <Clock className="mr-1 h-3 w-3" />
                                                                {job.reserved_ago}
                                                            </Badge>
                                                            {job.attempts > 1 && (
                                                                <Badge variant="destructive" className="text-xs">
                                                                    Attempt {job.attempts}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {status?.queue_driver === 'redis' && (
                    <TabsContent value="redis" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Database className="mr-2 h-5 w-5 text-red-500" />
                                        Redis Server Info
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {redisDetails ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Version:</span>
                                                <Badge variant="outline">{redisDetails.redis_info.version}</Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Connected Clients:</span>
                                                <Badge variant="secondary">{redisDetails.redis_info.connected_clients}</Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Memory Used:</span>
                                                <Badge variant="secondary">{redisDetails.redis_info.used_memory_human}</Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Uptime:</span>
                                                <Badge variant="secondary">{formatUptime(redisDetails.redis_info.uptime_in_seconds)}</Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm font-medium">Connection:</span>
                                                <Badge variant="outline">{redisDetails.connection}</Badge>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex h-24 items-center justify-center">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Zap className="mr-2 h-5 w-5 text-yellow-500" />
                                        Redis Queue Keys
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {redisDetails ? (
                                        <div className="max-h-64 space-y-2 overflow-y-auto">
                                            {redisDetails.queue_keys.map((key, index) => (
                                                <div key={index} className="flex items-center justify-between rounded border p-2">
                                                    <div className="flex-1">
                                                        <div className="font-mono text-sm text-blue-600">{key.key}</div>
                                                        <div className="text-muted-foreground text-xs">{key.type}</div>
                                                    </div>
                                                    <Badge variant={key.size > 0 ? 'default' : 'secondary'}>{key.size}</Badge>
                                                </div>
                                            ))}
                                            {redisDetails.queue_keys.length === 0 && (
                                                <div className="text-muted-foreground py-4 text-center">No queue keys found</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex h-24 items-center justify-center">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};

export default QueueDashboardPage;
