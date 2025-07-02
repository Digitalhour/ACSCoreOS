// resources/js/pages/Admin/Reports/Modules.tsx
import React from 'react';
import {Head, Link} from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Award, BookOpen, Download, EllipsisVertical, Eye, SquarePen, TrendingUp, Users} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Progress} from '@/components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import AdminModulesIndex from "@/pages/Admin/Modules";

interface Module {
    id: number;
    title: string;
    description: string;
    is_active: boolean;
    enrollments_count: number;
    lessons_count: number;
    completed_enrollments_count: number;
    completion_rate: number;
}

interface Props {
    modules: Module[];
}

export default function ModulesReport({ modules = [] }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Admin', href: '/admin' },
        { title: 'Reports', href: '/admin/reports' },
        { title: 'Modules Report', href: '/admin/reports/modules' },
    ];

    const totalModules = modules.length;
    const totalEnrollments = modules.reduce((sum, m) => sum + m.enrollments_count, 0);
    const averageCompletion = modules.length > 0
        ? Math.round(modules.reduce((sum, m) => sum + m.completion_rate, 0) / modules.length)
        : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Modules Report" />

            <div className="flex h-full max-h-screen flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Modules Report</h1>
                        <p className="text-muted-foreground mt-2">Training module performance and enrollment statistics</p>
                    </div>
                    <Button asChild className="gap-2">
                        <Link href={route('admin.modules.create')}>
                        <Download className="w-4 h-4" />
                        Create Module
                        </Link>
                    </Button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Modules</p>
                                    <p className="text-2xl font-bold">{totalModules}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>


                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Enrollments</p>
                                    <p className="text-2xl font-bold">{totalEnrollments}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Award className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                                    <p className="text-2xl font-bold">{averageCompletion}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active Modules</p>
                                    <p className="text-2xl font-bold">
                                        {modules.filter(m => m.is_active).length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Modules Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Module Performance Overview</CardTitle>
                        <CardDescription>Detailed statistics for all training modules</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {modules.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Module</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Lessons</TableHead>
                                        <TableHead>Enrollments</TableHead>
                                        <TableHead>Completed</TableHead>
                                        <TableHead>Completion Rate</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {modules.map((module) => (
                                        <TableRow key={module.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{module.title}</div>
                                                    {module.description && (
                                                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                                                            {module.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={module.is_active ? "default" : "secondary"}>
                                                    {module.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{module.lessons_count}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{module.enrollments_count}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{module.completed_enrollments_count}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Progress value={module.completion_rate} className="w-16" />
                                                    <span className="text-sm font-medium">{module.completion_rate}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger>
                                                        <EllipsisVertical />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem>
                                                            <Button variant="ghost" size="sm" asChild>
                                                                <Link href={route('admin.modules.show', module.id)}>
                                                                    <Eye className="w-4 h-4" />
                                                                    View Module

                                                                </Link>
                                                            </Button>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Button variant="ghost" size="sm" asChild>
                                                                <Link href={route('admin.modules.edit', module.id)}>
                                                                    <SquarePen className="w-4 h-4" />
                                                                    Edit Module
                                                                </Link>
                                                            </Button>
                                                        </DropdownMenuItem>

                                                    </DropdownMenuContent>
                                                </DropdownMenu>


                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-12">
                                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No modules found</h3>
                                <p className="text-muted-foreground">No training modules to display.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <AdminModulesIndex modules={[]} />
            </div>
        </AppLayout>
    );
}
