import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { router } from '@inertiajs/react';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { useEcho } from '@laravel/echo-react';

interface OnlineUser {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
}

interface OnlineUsersData {
    count: number;
    users: OnlineUser[];
}

export default function OnlineUsersComponent() {
    const [onlineData, setOnlineData] = useState<OnlineUsersData>({ count: 0, users: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const fetchOnlineUsers = async () => {
        try {
            const response = await fetch('/api/admin/online-users', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch online users');
            }

            const data = await response.json();
            setOnlineData(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const sendHeartbeat = async () => {
        if (!isOnline) return;

        try {
            await router.post('/api/admin/heartbeat', {}, {
                preserveScroll: true,
                preserveState: true,
                only: [],
            });
        } catch (err) {
            console.error('Heartbeat failed:', err);
        }
    };

    useEffect(() => {
        fetchOnlineUsers();
        
        const interval = setInterval(fetchOnlineUsers, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const heartbeatInterval = setInterval(sendHeartbeat, 30000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                sendHeartbeat();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        sendHeartbeat();

        return () => {
            clearInterval(heartbeatInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isOnline]);

    // Real-time updates via WebSocket
    useEcho('online-users', 'user.online', (e) => {
        console.log('User came online:', e.user);
        
        // Add user to the list if not already present
        setOnlineData((prevData) => {
            const existingUser = prevData.users.find(user => user.id === e.user.id);
            if (!existingUser) {
                return {
                    count: prevData.count + 1,
                    users: [...prevData.users, e.user]
                };
            }
            return prevData;
        });
    });

    useEcho('online-users', 'user.offline', (e) => {
        console.log('User went offline:', e.user);
        
        // Remove user from the list
        setOnlineData((prevData) => {
            const filteredUsers = prevData.users.filter(user => user.id !== e.user.id);
            return {
                count: filteredUsers.length,
                users: filteredUsers
            };
        });
    });

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    if (loading) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-6 w-20" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center space-y-2 text-sm">
                <WifiOff className="h-8 w-8 text-red-500" />
                <p className="text-red-600 dark:text-red-400">
                    Failed to load online users
                </p>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchOnlineUsers}
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with count */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        {isOnline ? (
                            <Wifi className="h-5 w-5 text-green-500" />
                        ) : (
                            <WifiOff className="h-5 w-5 text-red-500" />
                        )}
                        {isOnline && (
                            <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                    </div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {onlineData.count}
                    </span>
                </div>
                <Badge 
                    variant={isOnline ? "default" : "destructive"} 
                    className="text-xs"
                >
                    {isOnline ? "Live" : "Offline"}
                </Badge>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
                Users currently active
            </p>

            {onlineData.count > 0 && (
                <div className="space-y-3">
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Active Users ({onlineData.users.length})
                        </span>
                        {onlineData.users.length > 3 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpanded(!expanded)}
                                className="text-xs"
                            >
                                {expanded ? 'Show Less' : 'Show All'}
                            </Button>
                        )}
                    </div>

                    <ScrollArea className={`${expanded ? 'max-h-64' : 'max-h-32'} w-full`}>
                        <div className="space-y-2">
                            {onlineData.users
                                .slice(0, expanded ? undefined : 5)
                                .map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                                {getInitials(user.first_name, user.last_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {user.first_name} {user.last_name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                                    </div>
                                ))}
                        </div>
                    </ScrollArea>

                    {!expanded && onlineData.users.length > 5 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            +{onlineData.users.length - 5} more users
                        </p>
                    )}
                </div>
            )}

            {onlineData.count === 0 && (
                <div className="flex flex-col items-center space-y-2 text-center py-4">
                    <Users className="h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No users currently online
                    </p>
                </div>
            )}
        </div>
    );
}