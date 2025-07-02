import React from 'react';
import {Head, Link} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {
    Activity,
    Award,
    BarChart3,
    BookOpen,
    ChevronRight,
    Clock,
    Download,
    Target,
    TrendingUp,
    Users
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {Progress} from '@/components/ui/progress';

interface User {
    id: number;
    name: string;
    email: string;
    completion_rate: number;
}

interface Module {
    id: number;
    title: string;
    completion_rate: number;
    enrollments_count: number;
}

interface Enrollment {
    id: number;
    enrolled_at: string;
    completed_at?: string;
    user: User;
    module: Module;
}

interface Stats {
    total_users: number;
    total_modules: number;
    total_enrollments: number;
    completed_enrollments: number;
    completion_rate: number;
    total_quiz_attempts: number;
    total_test_attempts: number;
}

interface Props {
    stats: Stats;
    recent_enrollments: Enrollment[];
    recent_completions: Enrollment[];
    top_students: User[];
    module_performance: Module[];
}

export default function ReportsIndex({
                                         stats,
                                         recent_enrollments = [],
                                         recent_completions = [],
                                         top_students = [],
                                         module_performance = []
                                     }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Training Dashboard', href: '/admin/reports' },
    ];

    const reportCards = [
        {
            title: 'Modules Report',
            description: 'View module performance, enrollment statistics, and completion rates',
            href: '/admin/reports/modules',
            icon: BookOpen,
            stats: `${stats.total_modules} modules`,

        },
        {
            title: 'Students Report',
            description: 'Analyze student performance and individual completion rates',
            href: '/admin/reports/students',
            icon: Users,
            stats: `${stats.total_users} students`
        },
        {
            title: 'Progress Report',
            description: 'Detailed progress tracking with quiz attempts and test scores',
            href: '/admin/reports/progress',
            icon: TrendingUp,
            stats: `${stats.total_enrollments} enrollments`
        }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Training Reports" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Training Reports</h1>
                        <p className="text-muted-foreground mt-2">Monitor training progress and performance across your organization</p>
                    </div>
                    <Button className="gap-2">
                        <Download className="w-4 h-4" />
                        Export All Data
                    </Button>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Users className="w-6 h-6 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                                    <p className="text-2xl font-bold">{stats.total_users}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <BookOpen className="w-6 h-6 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Active Modules</p>
                                    <p className="text-2xl font-bold">{stats.total_modules}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Award className="w-6 h-6 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                                    <p className="text-2xl font-bold">{stats.completion_rate}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Activity className="w-6 h-6 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Quiz Attempts</p>
                                    <p className="text-2xl font-bold">{stats.total_quiz_attempts}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Report Navigation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {reportCards.map((report) => {
                        const Icon = report.icon;
                        return (
                            <Link key={report.title} href={route(report.href.replace('/admin/', 'admin.').replace('/', '.'))}>
                                <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between">
                                            <div className="p-3 rounded-lg bg-primary/10">
                                                <Icon className="w-6 h-6 text-primary" />
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                        </div>
                                        <div className="space-y-2">
                                            <CardTitle className="text-lg">{report.title}</CardTitle>
                                            <CardDescription>{report.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <Badge variant="secondary" className="font-medium">
                                            {report.stats}
                                        </Badge>

                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>

                {/* Dashboard Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" />
                                Recent Enrollments
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recent_enrollments.length > 0 ? (
                                <div className="space-y-4">
                                    {recent_enrollments.map((enrollment, index) => (
                                        <div key={index}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{enrollment.user.name}</p>
                                                    <p className="text-sm text-muted-foreground">{enrollment.module.title}</p>
                                                </div>
                                                <Badge variant="outline">
                                                    {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                                </Badge>
                                            </div>
                                            {index < recent_enrollments.length - 1 && <Separator className="mt-4" />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No recent enrollments</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Completions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-primary" />
                                Recent Completions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recent_completions.length > 0 ? (
                                <div className="space-y-4">
                                    {recent_completions.map((completion, index) => (
                                        <div key={index}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{completion.user.name}</p>
                                                    <p className="text-sm text-muted-foreground">{completion.module.title}</p>
                                                </div>
                                                <Badge variant="default">
                                                    {completion.completed_at ? new Date(completion.completed_at).toLocaleDateString() : ''}
                                                </Badge>
                                            </div>
                                            {index < recent_completions.length - 1 && <Separator className="mt-4" />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No recent completions</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Performing Students */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-primary" />
                                Top Performing Students
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {top_students.length > 0 ? (
                                <div className="space-y-4">
                                    {top_students.map((student, index) => (
                                        <div key={student.id}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                                                        {index + 1}
                                                    </Badge>
                                                    <div>
                                                        <p className="font-medium">{student.name}</p>
                                                        <p className="text-sm text-muted-foreground">{student.email}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="default">
                                                    {student.completion_rate}%
                                                </Badge>
                                            </div>
                                            {index < top_students.length - 1 && <Separator className="mt-4" />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No student data available</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Module Performance */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary" />
                                Module Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {module_performance.length > 0 ? (
                                <div className="space-y-4">
                                    {module_performance.map((module, index) => (
                                        <div key={module.id}>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-medium">{module.title}</p>
                                                    <Badge variant="secondary">{module.completion_rate}%</Badge>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Progress value={module.completion_rate} className="flex-1" />
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {module.enrollments_count} enrolled
                                                    </span>
                                                </div>
                                            </div>
                                            {index < module_performance.length - 1 && <Separator className="mt-4" />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No module data available</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
