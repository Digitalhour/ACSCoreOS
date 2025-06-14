import { Card, CardContent } from '@/components/ui/card';
import { Activity, BarChart3, Users } from 'lucide-react';

interface UserStatsProps {
    totalUsers: number;
    activeUsers: number;
    totalLogins: number;
}

export default function UserCount({ totalUsers, activeUsers, totalLogins }: UserStatsProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Total Users */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers.toLocaleString()}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Active Users */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                            <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeUsers.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Last 30 days</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Total Logins */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
                            <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Logins</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalLogins.toLocaleString()}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
