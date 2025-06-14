import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Activity, BarChart3, Database, Eye, Plus, TrendingUp, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'KPI', href: '/kpi' }];

export default function KpiIndex() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="KPI Dashboard" />

            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">KPI Dashboard</h2>
                        <p className="text-muted-foreground">Monitor your key performance indicators and business metrics</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Link href="/kpi/builder">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                New Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Dashboards</CardTitle>
                            <BarChart3 className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <p className="text-muted-foreground text-xs">No dashboards created yet</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Public Dashboards</CardTitle>
                            <Eye className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <p className="text-muted-foreground text-xs">Shared with team</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
                            <Database className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">1</div>
                            <p className="text-muted-foreground text-xs">acsdatawarehouse connected</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active KPIs</CardTitle>
                            <Activity className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <p className="text-muted-foreground text-xs">Monitoring metrics</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    {/* Getting Started */}
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Get Started with KPI Analytics</CardTitle>
                            <CardDescription>Create powerful dashboards to track your business performance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center space-y-6 py-8">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-xl"></div>
                                    <BarChart3 className="text-primary relative h-16 w-16" />
                                </div>

                                <div className="space-y-2 text-center">
                                    <h3 className="text-xl font-semibold">Create Your First KPI Dashboard</h3>
                                    <p className="text-muted-foreground max-w-md">
                                        Connect to your acsdatawarehouse database and create powerful KPI cards to monitor your business metrics in
                                        real-time.
                                    </p>
                                </div>

                                <Link href="/kpi/builder">
                                    <Button size="lg" className="px-8">
                                        <Plus className="mr-2 h-5 w-5" />
                                        Create Dashboard
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>Common tasks and shortcuts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Link href="/kpi/builder" className="block">
                                <Button variant="outline" className="h-auto w-full justify-start p-4">
                                    <div className="flex items-center space-x-3">
                                        <Plus className="h-5 w-5" />
                                        <div className="text-left">
                                            <div className="font-medium">Create Dashboard</div>
                                            <div className="text-muted-foreground text-xs">Build a new KPI dashboard</div>
                                        </div>
                                    </div>
                                </Button>
                            </Link>

                            <Button variant="outline" className="h-auto w-full justify-start p-4" disabled>
                                <div className="flex items-center space-x-3">
                                    <Database className="h-5 w-5" />
                                    <div className="text-left">
                                        <div className="font-medium">Connect Data Source</div>
                                        <div className="text-muted-foreground text-xs">Add new database connection</div>
                                    </div>
                                </div>
                            </Button>

                            <Button variant="outline" className="h-auto w-full justify-start p-4" disabled>
                                <div className="flex items-center space-x-3">
                                    <Users className="h-5 w-5" />
                                    <div className="text-left">
                                        <div className="font-medium">Browse Public</div>
                                        <div className="text-muted-foreground text-xs">View shared dashboards</div>
                                    </div>
                                </div>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* How It Works */}
                <Card>
                    <CardHeader>
                        <CardTitle>How It Works</CardTitle>
                        <CardDescription>Simple steps to create your analytics dashboard</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="space-y-3 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                                    <Database className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold">1. Choose Data Source</h3>
                                    <p className="text-muted-foreground text-sm">Select tables and columns from your acsdatawarehouse database</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                                    <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-300" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold">2. Configure KPIs</h3>
                                    <p className="text-muted-foreground text-sm">Set up aggregations, date filters, and visualization options</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold">3. Monitor & Share</h3>
                                    <p className="text-muted-foreground text-sm">Track performance metrics and share insights with your team</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity - Empty State */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Your latest dashboard activities and updates</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Activity className="text-muted-foreground h-12 w-12 opacity-50" />
                            <h3 className="mt-4 text-lg font-semibold">No activity yet</h3>
                            <p className="text-muted-foreground mt-2">Create your first dashboard to see activity here</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
